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
    [{ hl: 'todoistTitle', text: '     Inbox     ' }],
    [],
  ],
  tasks: [],
}

module.exports = { full, line, lineToTaskIndex }

async function full(nvim, state) {
  content.tasks = []

  for (const t of state.tasks) {
    content.tasks.push(renderTask(t))
  }

  const lines = [
    ...content.header,
    ...content.tasks,
  ]

  await nvim.callFunction('todoist#set_lines', [lines])
}

async function line(nvim, state, index) {
  const t = state.tasks[index]
  const parts = renderTask(t)

  content.tasks[index] = parts

  await nvim.callFunction('todoist#set_line', [parts, index + OFFSET])
}


function lineToTaskIndex(lineNumber) {
  return lineNumber - content.header.length
}

/*
 * Rendering functions
 */

function renderTask(t) {
  return [
    renderIndent(t),
    renderCheckbox(t),
    { hl: 'todoistSeparator', text: ' ' },
    renderContent(t),
    { hl: 'todoistSeparator', text: ' ' },
    renderDueDate(t.due)
  ]
}

function renderIndent(t) {
  return { hl: 'Normal', text: ' '.repeat(t.depth * 4) }
}

function renderCheckbox(t) {
  const hl = t.error ? 'todoistError' : 'todoistCheckbox'
  const text =
    t.error ? '  ' :
    t.completing ? '  ' :
    t.completed ? '[x]' : '[ ]'

  return { hl, text }
}

function renderContent(t) {
  return {
    hl: 'todoistContent' + (t.completed ? 'Completed' : ''),
    text: t.content,
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
