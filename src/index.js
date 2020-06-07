/*
 * index.js
 */

const fs = require('fs')
const Color = require('color')
const merge = require('deepmerge')
const Todoist = require('todoist')
const render = require('./render')
const { processItems } = require('./models')

let nvim = undefined
let todoist = undefined
let didSetup = false

const defaultOptions = {
  key: undefined,
  icons: {
    unchecked: ' [ ] ',
    checked:   ' [x] ',
    loading:   ' […] ',
    error:     ' [!] ',
  },
}

const state = {
  options: defaultOptions,

  isLoading: true,
  lastSync: undefined,
  bufferId: undefined,
  buffer: undefined,

  errorMessage: undefined,

  currentProjectName: 'Inbox',
  currentProject: undefined,
  projects: [],
  items: [],

  setErrorMessage: (errorMessage) => {
    if (typeof errorMessage === 'string')
      errorMessage = [errorMessage]
    state.errorMessage = errorMessage
    if (errorMessage)
      showErrorMessage(errorMessage)
  }
}


async function initialize(currentProjectName = state.currentProjectName) {
  state.options = merge(defaultOptions, await nvim.eval('get(g:, "todoist", {})'))
  state.isLoading = state.options.key ? true : false

  if (!state.options.key) {
    state.setErrorMessage([
      `Couldn't find API key: make sure to set it:`,
      `  let g:todoist = { 'key': $MY_TODOIST_API_KEY }`,
    ])
  }

  if (currentProjectName)
    state.currentProjectName = currentProjectName

  await createTodoistBuffer()

  if (state.options.key) {
    todoist = Todoist(state.options.key)
    await setupColors()
    await synchronize()
    await render.full(nvim, state)
  }
}

async function synchronize() {
  await todoist.sync()

  const projects = todoist.projects.get()
  const items    = todoist.items.get()

  const currentProject = projects.find(p => p.name === state.currentProjectName) || projects[0]

  state.lastSync = new Date()
  state.currentProjectName = currentProject.name
  state.currentProject = currentProject
  state.projects = projects
  state.items = processItems(items.filter(i => i.project_id === currentProject.id))
  state.isLoading = false
}

async function createTodoistBuffer() {
  const existingBufferId = await nvim.callFunction('bufnr', 'Todoist')
  if (existingBufferId !== -1) {
    await commands([
      'b ' + existingBufferId,
    ])
  }
  else {
    await commands([
      'enew',
      'file Todoist',
    ])
  }
  await commands([
    'setfiletype todoist',
    'setlocal buflisted',
    'setlocal buftype=nofile',
    'setlocal nolist',
    'setlocal nonumber',
    'setlocal signcolumn=no',
    'nnoremap <buffer><silent> O  :call Todoist__onCreate(-1)<CR>',
    'nnoremap <buffer><silent> o  :call Todoist__onCreate(+1)<CR>',
    'nnoremap <buffer><silent> x  :call Todoist__onComplete()<CR>',
    'nnoremap <buffer><silent> DD :call Todoist__onDelete()<CR>',
    'nnoremap <buffer><silent> <  :call Todoist__onUnindent()<CR>',
    'nnoremap <buffer><silent> >  :call Todoist__onIndent()<CR>',
    'nnoremap <buffer><silent> cc :call Todoist__onChangeContent()<CR>',
    'nnoremap <buffer><silent> cd :call Todoist__onChangeDate()<CR>',
    'nnoremap <buffer><silent> r  :Todoist<CR>',
  ])

  state.buffer = await nvim.buffer
  state.bufferId = await state.buffer.id

  await render.full(nvim, state)
}

async function getCurrentItemIndex() {
  const zLineNumber = await nvim.callFunction('line', ['.']) - 1
  return render.lineToItemIndex(zLineNumber)
}

function listProjects() {
  return state.projects.map(p => p.name)
}

function completeProjects(start, line, position) {
  return state.projects
    .map(p => p.name)
    .filter(name => name.toLowerCase().startsWith(start.toLowerCase()))
}

async function setupColors() {
  if (didSetup)
    return
  didSetup = true

  const definitions = Object.keys(todoist.colorsById).map(id => {
    const bg = todoist.colorsById[id]
    const fg = Color(bg).isLight() ? 'black' : 'white'

    return `hi! todoistColor${id} guifg=${fg} guibg=${bg} gui=bold`
  })

  await commands(definitions)
}

/*
 * Action handlers
 */

async function onCreate(direction) {
  const index = await getCurrentItemIndex()
  const nextIndex = index + +direction
  const maxIndex = state.items.length - 1
  const currentItem = state.items[index] || { child_order: 0 }
  const nextItem = state.items[nextIndex < 0 ? 0 : nextIndex > maxIndex ? maxIndex : nextIndex] || { parent_id: null }

  const content = await input('Question', 'Content: ')
  if (!content)
    return

  const dueDate = await input('Question', 'Date: ')

  const newItemDraft = {
    content,
    due: { string: dueDate },
    child_order: +currentItem.child_order + +direction,
    parent_id: nextItem.parent_id,
    project_id: state.currentProject.id,
  }
  console.log({newItemDraft, nextIndex, currentItem})

  let newItem
  try {
    newItem = await todoist.items.add(newItemDraft)
    state.items.splice(nextIndex, 0, newItem)
    const items = state.items.map((item, i) => ({ id: item.id, child_order: i }))
    await todoist.items.reorder({ items })
    state.setErrorMessage()
  } catch(err) {
    state.setErrorMessage(err.message)
    return
  }

  await synchronize()
  await render.full(nvim, state)
}

async function onComplete() {
  const index = await getCurrentItemIndex()
  const item = state.items[index]

  let success = true
  let message
  try {
    item.loading = true
    await render.line(nvim, state, index)
    if (item.checked)
      await todoist.items.uncomplete({ id: item.id })
    else
      await todoist.items.close({ id: item.id })
  } catch(err) {
    success = false
    message = err.message
    console.log(err)
  }

  if (!success) {
    item.loading = false
    item.error = true
    state.setErrorMessage(message)
  }
  else {
    item.loading = false
    item.checked = !item.checked
    item.error = false
    item.errorMessage = undefined
    state.setErrorMessage()
  }

  await render.line(nvim, state, index)
}

async function onDelete() {
  const index = await getCurrentItemIndex()
  const item = state.items[index]

  let success = true
  let message
  try {
    item.loading = true
    await render.line(nvim, state, index)
    await todoist.items.delete({ id: item.id })
  } catch(err) {
    success = false
    message = err.message
    console.log(err)
  }

  if (!success) {
    item.loading = false
    item.error = true
    state.setErrorMessage(message)
  }
  else {
    item.loading = false
    state.setErrorMessage()
  }

  await synchronize()
  await render.full(nvim, state)
}

async function onIndent() {
  const index = await getCurrentItemIndex()

  const currentItem = state.items[index]

  let previousIndex = index - 1
  let previousItem = state.items[previousIndex]
  while (previousIndex > 0 && previousItem.depth > currentItem.depth) {
    previousIndex -= 1
    previousItem = state.items[previousIndex]
  }
  if (!previousItem)
    return

  const itemUpdate = {
    id: currentItem.id,
    parent_id: previousItem.id,
  }

  console.log('indent', itemUpdate)

  try {
    currentItem.loading = true
    await render.line(nvim, state, index)
    await todoist.items.move(itemUpdate)
    // await todoist.items.reorder(orders)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
  }

  await synchronize()
  await render.full(nvim, state)
}

async function onUnindent() {
  const index = await getCurrentItemIndex()

  const currentItem = state.items[index]
  if (!currentItem.parent_id)
    return

  const parentItem = state.items.find(i => i.id === currentItem.parent_id)

  const patch = {
    id: currentItem.id,
    parent_id: parentItem.parent_id || undefined,
    project_id: parentItem.parent_id === null ? parentItem.project_id : undefined,
  }

  console.log('unindent', patch)

  try {
    currentItem.loading = true
    await render.line(nvim, state, index)
    await todoist.items.move(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
  }

  await synchronize()
  await render.full(nvim, state)
}

async function onChangeContent() {
  const index = await getCurrentItemIndex()
  const currentItem = state.items[index]

  const content = await input('Question', 'Content: ', currentItem.content)
  if (!content || content === currentItem.content)
    return

  const patch = {
    id: currentItem.id,
    content,
  }

  console.log('change-content', patch)

  try {
    currentItem.loading = true
    await render.line(nvim, state, index)
    await todoist.items.update(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
  }

  await synchronize()
  await render.full(nvim, state)
}

async function onChangeDate() {
  const index = await getCurrentItemIndex()
  const currentItem = state.items[index]

  const date = await input('Question', 'Date: ')
  if (!date)
    return

  const patch = {
    id: currentItem.id,
    due: { string: date },
  }

  console.log('change-date', patch)

  try {
    currentItem.loading = true
    await render.line(nvim, state, index)
    await todoist.items.update(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
  }

  await synchronize()
  await render.full(nvim, state)
}


module.exports = plugin => {
  nvim = global.nvim = plugin.nvim

  const _command  = (...args) => plugin.registerCommand(...args)
  const _function = (...args) => plugin.registerFunction(...args)


  _command('Todoist', pcall(initialize), {
    sync: false,
    nargs: '?',
    complete: 'customlist,Todoist__completeProjects',
  })
  _command('TodoistEval', pcall(input => eval(input)), { sync: false, nargs: 1 })

  _function('Todoist__onCreate',         pcall(onCreate),         { sync: false })
  _function('Todoist__onComplete',       pcall(onComplete),       { sync: false })
  _function('Todoist__onDelete',         pcall(onDelete),         { sync: false })
  _function('Todoist__onIndent',         pcall(onIndent),         { sync: false })
  _function('Todoist__onUnindent',       pcall(onUnindent),       { sync: false })
  _function('Todoist__onChangeContent',  pcall(onChangeContent),  { sync: false })
  _function('Todoist__onChangeDate',     pcall(onChangeDate),     { sync: false })

  _function('Todoist__listProjects',     pcallSync(listProjects), { sync: true })
  _function('Todoist__completeProjects', pcallSync(completeProjects), { sync: true })

  // Deprecated

  _command('TodoistInit', pcall(() =>
    showWarningMessage('TodoistInit deprecated. Use `:Todoist [project name]` (default "Inbox")')), { sync: false })

  /*
   * plugin.registerAutocmd('BufEnter', async (fileName) => {
   *   await plugin.nvim.buffer.append('BufEnter for a JS File?')
   * }, {sync: false, pattern: '*.js', eval: 'expand("<afile>")'})
   */
};

process.on('uncaughtException', (error, origin) => dumpError({ error, origin }))
process.on('unhandledRejection', (error, promise) => dumpError({ error, promise }))

function dumpError(message) {
  showErrorMessage(message.error.toString())
  showErrorMessage(message.error.stack)
  fs.writeSync('todoist-error.json', JSON.stringify({ message, state }))
}


// Helpers

async function input(hl, prompt, text) {
  let input = undefined

  await commands(['echohl ' + hl])
  try {
    input = await nvim.callFunction('input', text ? [prompt, text] : [prompt])
  } catch (_) {
    // ctrl-c interrupt
  }
  await commands(['echohl Normal'])
  return input
}

async function showErrorMessage(lines) {
  if (typeof lines === 'string')
    lines = [lines]
  console.log('Error', lines)
  await commands([
    'echohl todoistErrorMessage',
    ...lines.map(m => `echom "Todoist: ${m.replace(/"/g, '\\"')}"`),
    'echohl Normal',
  ])
}

async function showWarningMessage(lines) {
  if (typeof lines === 'string')
    lines = [lines]
  await commands([
    'echohl todoistWarningMessage',
    ...lines.map(m => `echom "Todoist: ${m.replace(/"/g, '\\"')}"`),
    'echohl Normal',
  ])
}

async function commands(cmds) {
  await nvim.callFunction('todoist#commands', [cmds])
}

function pcall(fn) {
  return async (args = []) => {
    try {
      await fn(...args)
    } catch(error) {
      dumpError({ error })
      throw error
    }
  }
}

function pcallSync(fn) {
  return (args = []) => {
    try {
      return fn(...args)
    } catch(error) {
      dumpError({ error })
      throw error
    }
  }
}
