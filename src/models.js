/*
 * models.js
 */

const { indexBy, prop } = require('rambda')

module.exports = { processTasks }

function processTasks(tasks) {
  const byId = indexBy(prop('id'), tasks)
  const rootTasks = []
  for (let t of tasks) {
    t.children = []
    if (!t.parent) {
      rootTasks.push(t)
    }
    else {
      const parent = byId[t.parent]
      if (!parent.children)
        parent.children = []
      parent.children.push(t)
    }
  }
  rootTasks.sort(compareByOrder)
  sortChildrenRecursive(rootTasks)
  return flatten(rootTasks)
}

function flatten(tasks, result = [], depth = 0) {
  for (let t of tasks) {
    t.depth = depth
    result.push(t)
    flatten(t.children, result, depth + 1)
  }
  return result
}

function sortChildrenRecursive(tasks) {
  for (let t of tasks) {
    t.children.sort(compareByOrder)
    t.children.forEach(st => {
      sortChildrenRecursive(st.children)
    })
  }
}
function compareByOrder(a, b) {
  return a.order - b.order
}
