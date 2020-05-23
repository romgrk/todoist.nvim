/*
 * models.js
 */

const { indexBy, prop } = require('rambda')

module.exports = { processItems }

function processItems(items) {
  const byId = indexBy(prop('id'), items)
  const rootItems = []
  for (let i of items) {
    i.children = []
    if (!i.parent_id) {
      rootItems.push(i)
    }
    else {
      const parent = byId[i.parent_id]
      if (!parent.children)
        parent.children = []
      parent.children.push(i)
    }
  }
  rootItems.sort(compareByOrder)
  sortChildrenRecursive(rootItems)
  return flatten(rootItems)
}

function flatten(items, result = [], depth = 0) {
  for (let i of items) {
    i.depth = depth
    result.push(i)
    flatten(i.children, result, depth + 1)
  }
  return result
}

function sortChildrenRecursive(items) {
  for (let i of items) {
    i.children.sort(compareByOrder)
    i.children.forEach(st => {
      sortChildrenRecursive(st.children)
    })
  }
}
function compareByOrder(a, b) {
  return a.child_order - b.child_order
}
