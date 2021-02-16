/*
 * render.js
 */
/* global nvim */

const parse = require('date-fns/parse')
const addDays = require('date-fns/addDays')
const endOfDay = require('date-fns/endOfDay')
const isToday = require('date-fns/isToday')
const isTomorrow = require('date-fns/isTomorrow')

const content = {
  header: [],
  items: [],
}

module.exports = { full, line, lineToItemIndex }

async function full(nvim, state) {
  content.header = renderHeader(state)
  content.items = []

  for (const i of state.items) {
    content.items.push(renderItem(state, i))
  }

  const lines = [
    ...content.header,
    ...content.items,
  ]

  await nvim.callFunction('todoist#set_lines', [state.bufferId, lines])
}

async function line(nvim, state, index) {
  const i = state.items[index]
  const parts = renderItem(state, i)

  content.items[index] = parts

  await nvim.callFunction('todoist#set_line', [
    state.bufferId,
    parts,
    index + content.header.length, /* lineNumber */
    true /* clearHighlights */
  ])
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

function renderHeader(state) {
  const { currentProjectName, currentProject = {} } = state

  const titleHl =
    currentProject.color === 48 && currentProjectName === 'Inbox' ?
      'todoistTitle' :
    currentProject.color ?
      `todoistColor${currentProject.color}` :
      'todoistTitle'

  const title = [{
    hl: titleHl,
    text: ` ${currentProjectName} (${state.items.length} tasks) `,
  }]

  const errorMessage = state.errorMessage ?
    state.errorMessage.map(m => [{ hl: 'todoistErrorMessage', text: m }]) : []

  const otherMessage =
    state.isLoading ?
      [[{ hl: 'todoistMessage', text: 'Loading…' }]] : []

  const emptyMessage =
    state.items.length === 0 && !state.isLoading ?
      [[{ hl: 'todoistMessage', text: 'No items' }]] : []

  const lines = [title]
  lines.push(...errorMessage)
  lines.push(...otherMessage)
  lines.push(...emptyMessage)
  if (lines.length < 2)
    lines.push([])
  return lines
}

function renderItem(state, i) {
  return [
    renderIndent(state, i),
    renderCheckbox(state, i),
    renderContent(state, i),
    { hl: 'todoistSeparator', text: ' ' },
    renderDueDate(state, i.due)
  ]
}

function renderIndent(state, i) {
  return { hl: 'Normal', text: ' '.repeat(i.depth * (state.options.icons.checked.length - 1)) }
}

function renderCheckbox(state, i) {
  var col;
  switch (i.priority) {
    case 4 :
      col = 'todoistPri1'
      break;
    case 3 :
      col = 'todoistPri2'
      break;
    case 2 :
      col = 'todoistPri3'
      break;
    default:
      col = 'todoistCheckbox'
  }
  const hl = i.error ? 'todoistError' : col
  const text =
    i.loading ? state.options.icons.loading :
    i.error ?   state.options.icons.error :
    i.checked ? state.options.icons.checked :
                state.options.icons.unchecked
  return { hl, text }
}

function renderContent(state, i) {
  return {
    hl: 'todoistContent' + (i.checked ? 'Completed' : ''),
    text: i.content,
  }
}

function renderDueDate(state, due) {
  if (!due)
    return { hl: 'todoistDate', text: '' }

  const date = parseDate(due.date)
  const hl =
    isOverdue(date) ?  'todoistDateOverdue' :
    isToday(date) ?    'todoistDateToday' :
    isTomorrow(date) ? 'todoistDateTomorrow' :
    isThisWeek(date) ? 'todoistDateThisWeek' :
                       'todoistDate'

  return { hl, text: `(${due.date})` }
}

/*
 * Helpers
 */

function isOverdue(date) {
  return date < new Date()
}

function isThisWeek(date) {
  return date < addDays(new Date(), 7)
}

function centerText(text, width = 80, filler = ' ') {
  const start = Math.floor((width / 2) - (text.length / 2))
  const end = start + text.length
  return filler.repeat(start) + text + filler.repeat(width - end)
}

function parseDate(input) {
  let date
  if (input.length === 10)
    date = endOfDay(parse(input, 'yyyy-MM-dd', new Date()))
  else
    date = parse(input.replace('T', ' '), 'yyyy-MM-dd HH:mm:ss', new Date())
  return date
}
