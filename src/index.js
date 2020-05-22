/*
 * index.js
 */

const TodoistAPI = require('todoist-rest-api').default
const render = require('./render')

let nvim = undefined
let todoist = undefined

const state = {
  lastSync: undefined,
  bufferId: undefined,
  buffer: undefined,

  projects: [],
  tasks: [],
}

async function initialize() {
  const apiKey = await nvim.getVar('todoist_api_key')
  todoist = TodoistAPI(apiKey)

  await synchronize()
  await createTodoistBuffer()
}

async function synchronize() {
  const [projects, tasks] = await Promise.all([
    todoist.v1.project.findAll(),
    todoist.v1.task.findAll(),
  ])

  state.lastSync = new Date()
  state.projects = projects
  state.tasks = tasks

  console.log(process.pid, { len: state.tasks.length })
}

async function createTodoistBuffer() {
  const existingBufferId = await nvim.callFunction('bufnr', 'Todoist')
  if (existingBufferId !== -1) {
    await commands([
      'b ' + existingBufferId,
      'bdelete',
    ])
  }
  await commands([
    'enew',
    'file Todoist',
    'setfiletype todoist',
    'setlocal buflisted',
    'setlocal buftype=nofile',
    'nnoremap <buffer><silent> x :call Todois__onComplete()<CR>',
  ])

  state.buffer = await nvim.buffer
  state.bufferId = await state.buffer.id

  await render.full(nvim, state)
}

async function getCurrentTaskIndex() {
  const line = await nvim.callFunction('line', ['.']) - 1
  const offset = 2
  const index = line - offset
  return index
}

async function onComplete() {
  const index = await getCurrentTaskIndex()
  const task = state.tasks[index]
  console.log(process.pid, { index, task })
  task.completing = true
  let success
  let message
  try {
    console.log('before render', task)
    await render.line(nvim, state, index)
    console.log('after render', task)
    if (task.completed === false)
      success = await todoist.v1.task.close(task.id)
    else
      success = await todoist.v1.task.reopen(task.id)
  } catch(err) {
    success = false
    message = err.message
    console.log(err)
  }
  if (!success) {
    task.completing = false
    task.error = true
    task.errorMessage = message
  }
  else {
    task.completing = false
    task.completed = !task.completed
    task.error = false
    task.errorMessage = undefined
  }
  await render.line(nvim, state, index)
}

module.exports = plugin => {
  nvim = global.nvim = plugin.nvim

  plugin.setOptions({ dev: false });
  plugin.registerCommand('TodoistInit', pcall(initialize), { sync: false })

  plugin.registerFunction('Todois__onComplete', pcall(onComplete), { sync: false })

  /*
   * plugin.registerFunction('SetLines',() => {
   *   return plugin.nvim.setLine('May I offer you an egg in these troubling times')
   *     .then(() => console.log('Line should be set'))
   * }, {sync: false})
   */

  /*
   * plugin.registerAutocmd('BufEnter', async (fileName) => {
   *   await plugin.nvim.buffer.append('BufEnter for a JS File?')
   * }, {sync: false, pattern: '*.js', eval: 'expand("<afile>")'})
   */
};


// Helpers

async function commands(cmds) {
  for (let cmd of cmds) {
    await nvim.command(cmd)
  }
}

function pcall(fn) {
  return async () => {
    try {
      await fn()
    } catch(e) {
      await nvim.outWriteLine(e.toString())
      throw e
    }
  }
}

