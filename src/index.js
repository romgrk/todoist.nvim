/*
 * index.js
 */

const Todoist = require('todoist')
const render = require('./render')
const { processItems } = require('./models')

let nvim = undefined
let todoist = undefined

const state = {
  lastSync: undefined,
  bufferId: undefined,
  buffer: undefined,

  errorMessage: undefined,

  projectId: undefined,
  projects: [],
  items: [],

  setErrorMessage: (errorMessage) => {
    state.errorMessage = errorMessage
    if (errorMessage)
      showErrorMessage(errorMessage)
  }
}

async function initialize() {
  const apiKey = await nvim.getVar('todoist_api_key')
  todoist = Todoist(apiKey)

  await createTodoistBuffer()
  await synchronize()
  await render.full(nvim, state)
}

async function synchronize() {
  await todoist.v8.sync()

  const projects = todoist.v8.projects.get()
  const items    = todoist.v8.items.get()

  const mainProject = projects.find(p => p.name === 'Inbox') || projects[0]

  state.lastSync = new Date()
  state.projectId = mainProject.id
  state.projects = projects
  state.items = processItems(items.filter(i => i.project_id === mainProject.id))

  console.log(process.pid, { len: state.items.length })
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
    'nnoremap <buffer><silent> O  :call Todoist__onCreate(-1)<CR>',
    'nnoremap <buffer><silent> o  :call Todoist__onCreate(+1)<CR>',
    'nnoremap <buffer><silent> x  :call Todoist__onComplete()<CR>',
    'nnoremap <buffer><silent> DD :call Todoist__onDelete()<CR>',
    'nnoremap <buffer><silent> <  :call Todoist__onUnindent()<CR>',
    'nnoremap <buffer><silent> >  :call Todoist__onIndent()<CR>',
    'nnoremap <buffer><silent> cc :call Todoist__onChangeContent()<CR>',
    'nnoremap <buffer><silent> cd :call Todoist__onChangeDate()<CR>',
    'nnoremap <buffer><silent> r  :TodoistInit<CR>',
  ])

  state.buffer = await nvim.buffer
  state.bufferId = await state.buffer.id

  await render.full(nvim, state)
}

async function getCurrentItemIndex() {
  const zLineNumber = await nvim.callFunction('line', ['.']) - 1
  return render.lineToItemIndex(zLineNumber)
}

/*
 * Action handlers
 */

async function onCreate(direction) {
  const index = await getCurrentItemIndex()
  const nextIndex = index + +direction
  const maxIndex = state.items.length - 1
  const currentItem = state.items[index]
  const nextItem = state.items[nextIndex < 0 ? 0 : nextIndex > maxIndex ? maxIndex : nextIndex]

  const content = await input('Question', 'Content: ')
  if (!content)
    return

  const dueDate = await input('Question', 'Date: ')

  const newItemDraft = {
    content,
    due: { string: dueDate },
    child_order: +currentItem.child_order + +direction,
    parent_id: nextItem.parent_id,
  }
  console.log({newItemDraft, nextIndex, currentItem})

  let newItem
  try {
    newItem = await todoist.v8.items.add(newItemDraft)
    state.items.splice(nextIndex, 0, newItem)
    const items = state.items.map((item, i) => ({ id: item.id, child_order: i }))
    await todoist.v8.items.reorder({ items })
    state.setErrorMessage()
  } catch(err) {
    state.setErrorMessage(err.message)
    console.log(err)
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
      await todoist.v8.items.uncomplete({ id: item.id })
    else
      await todoist.v8.items.close({ id: item.id })
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
    await todoist.v8.items.delete({ id: item.id })
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
    await todoist.v8.items.move(itemUpdate)
    // await todoist.v8.items.reorder(orders)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
    console.log(err)
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
    await todoist.v8.items.move(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
    console.log(err)
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
    await todoist.v8.items.update(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
    console.log(err)
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
    await todoist.v8.items.update(patch)
    state.setErrorMessage()
  } catch(err) {
    currentItem.loading = false
    state.setErrorMessage(err.message)
    console.log(err)
  }

  await synchronize()
  await render.full(nvim, state)
}


module.exports = plugin => {
  nvim = global.nvim = plugin.nvim

  plugin.setOptions({ dev: false });
  plugin.registerCommand('TodoistInit', pcall(initialize), { sync: false })

  plugin.registerFunction('Todoist__onCreate',        pcall(onCreate),        { sync: false })
  plugin.registerFunction('Todoist__onComplete',      pcall(onComplete),      { sync: false })
  plugin.registerFunction('Todoist__onDelete',        pcall(onDelete),        { sync: false })
  plugin.registerFunction('Todoist__onIndent',        pcall(onIndent),        { sync: false })
  plugin.registerFunction('Todoist__onUnindent',      pcall(onUnindent),      { sync: false })
  plugin.registerFunction('Todoist__onChangeContent', pcall(onChangeContent), { sync: false })
  plugin.registerFunction('Todoist__onChangeDate',    pcall(onChangeDate),    { sync: false })

  /*
   * plugin.registerAutocmd('BufEnter', async (fileName) => {
   *   await plugin.nvim.buffer.append('BufEnter for a JS File?')
   * }, {sync: false, pattern: '*.js', eval: 'expand("<afile>")'})
   */
};


// Helpers

async function input(hl, prompt, text) {
  await commands(['echohl ' + hl])
  const input = await nvim.callFunction('input', text ? [prompt, text] : [prompt])
  await commands(['echohl Normal'])
  return input
}

async function showErrorMessage(message) {
  await commands([
    'echohl todoistErrorMessage',
    `echo "${message.replace(/"/g, '\\"')}"`,
    'echohl Normal',
  ])
}

async function commands(cmds) {
  await nvim.callFunction('todoist#commands', [cmds])
}

function pcall(fn) {
  return async (...args) => {
    try {
      await fn(...args)
    } catch(e) {
      await nvim.outWriteLine(e.toString())
      throw e
    }
  }
}

