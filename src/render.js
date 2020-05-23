/*
 * render.js
 */
/* global nvim */

const startOfDay = require('date-fns/startOfDay')
const isToday = require('date-fns/isToday')

const OFFSET = 2
const NO_BREAK_SPACE = ' '

const content = {
  header: [
    [{ hl: 'todoistTitle', text: '    Inbox     ' }],
    [],
  ],
  items: [],
}

module.exports = { full, line, lineToItemIndex }

async function full(nvim, state) {
  content.items = []

  for (const i of state.items) {
    content.items.push(renderItem(i))
  }

  const lines = [
    ...content.header,
    ...content.items,
  ]

  await nvim.callFunction('todoist#set_lines', [lines])
}

async function line(nvim, state, index) {
  const i = state.items[index]
  const parts = renderItem(i)

  content.items[index] = parts

  await nvim.callFunction('todoist#set_line', [parts, index + OFFSET, true])
}


function lineToItemIndex(lineNumber) {
  const index = lineNumber - content.header.length
  if (index < 0)
    return 0
  if (index > (content.items.length - 1))
    return content.items.length - 1
  return index
}

/*
 * Rendering functions
 */

function renderItem(i) {
  return [
    renderIndent(i),
    renderCheckbox(i),
    renderContent(i),
    { hl: 'todoistSeparator', text: ' ' },
    renderDueDate(i.due)
  ]
}

function renderIndent(i) {
  return { hl: 'Normal', text: ' '.repeat(i.depth * 4) }
}

function renderCheckbox(i) {
  const hl = i.error ? 'todoistError' : 'todoistCheckbox'
  const text =
    i.error ?      '  ' :
    i.completing ? '  ' :
    i.checked ?    '  ' :
                   '  '

  return { hl, text }
}

function renderContent(i) {
  return {
    hl: 'todoistContent' + (i.checked ? 'Completed' : ''),
    text: i.content,
  }
}

function renderDueDate(due) {
  if (!due)
    return { hl: 'todoistDate', text: '' }
  const date = new Date(due.date)
  const hl =
    isOverdue(date) ? 'todoistDateOverdue' :
    isToday(date) ? 'todoistDateToday' :
                    'todoistDate'
  return { hl, text: `(${due.date})` }
}

/*
 * Helpers
 */

function isOverdue(date) {
  return date < startOfDay(new Date())
}
