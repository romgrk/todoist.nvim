/*
 * render.js
 */
/* global nvim */

const startOfDay = require('date-fns/startOfDay')
const isToday = require('date-fns/isToday')

const OFFSET = 2
const NO_BREAK_SPACE = ' '

async function full(nvim, state) {
  const lines = [
    [{ hl: 'todoistTitle', text: '[Inbox]' }],
    [],
  ]

  for (const t of state.tasks) {
    lines.push(renderTask(t))
  }

  await nvim.callFunction('todoist#set_lines', [lines])
}

async function line(nvim, state, index) {
  const t = state.tasks[index]
  const parts = renderTask(t)

  await nvim.callFunction('todoist#set_line', [parts, index + OFFSET])
}


function renderTask(t) {
  return [
    renderCheckbox(t),
    { hl: 'todoistSeparator', text: ' ' },
    renderContent(t),
    { hl: 'todoistSeparator', text: ' ' },
    renderDueDate(t.due)
  ]
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

function isOverdue(date) {
  return date < startOfDay(new Date())
}

module.exports = { full, line }
