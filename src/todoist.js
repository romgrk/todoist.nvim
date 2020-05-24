/*
 * todoist.js
 */

const got = require('got')
const uuid = require('uuid')
const stringify = JSON.stringify

const BASE = 'https://api.todoist.com/sync/v8'
const ENDPOINT = `${BASE}/sync`

const ARRAY_KEYS = [
  'collaborators',
  'collaborator_states',
  'due_exceptions',
  'filters',
  'items',
  'labels',
  'live_notifications',
  'notes',
  'project_notes',
  'projects',
  'reminders',
  'sections',
]


module.exports = Todoist


function Todoist(token) {
  if (!/^[0-9A-Fa-f]{40}$/.test(token))
      throw new Error(`Invalid API token. A token should be 40 characters long and exist of hexadecimals, was ${apiKey} (${apiKey.length} characters)`);

  const client = got.extend({ method: 'POST', responseType: 'json' })

  let syncToken = '*'
  let data = {
    collaborator_states: undefined,
    collaborators: undefined,
    day_orders_timestamp: undefined,
    day_orders: undefined,
    due_exceptions: undefined,
    filters: undefined,
    incomplete_item_ids: undefined,
    incomplete_project_ids: undefined,
    items: undefined,
    labels: undefined,
    live_notifications_last_read_id: undefined,
    live_notifications: undefined,
    locations: undefined,
    notes: undefined,
    project_notes: undefined,
    projects: undefined,
    reminders: undefined,
    sections: undefined,
    stats: undefined,
    temp_id_mapping: undefined,
    tooltips: undefined,
    user_settings: undefined,
    user: undefined,
  }

  function request(data) {
    return client(ENDPOINT, { form: { token, ...data } })
  }

  function command(type, action, args) {
    const id = uuid.v4()
    const tempId = uuid.v4()
    const command = { type: `${type}_${action}`, args, uuid: id, temp_id: tempId }
    const form = { token, commands: stringify([command]) }
    return client(ENDPOINT, { form })
    .then(res => {
      console.log(res.body)
      const ok = res.body.sync_status[id] === 'ok'

      if (!ok) {
        const status = res.body.sync_status[id]
        const error = new Error(`${status.error_tag}: ${status.error}`)
        return Promise.reject(error)
      }

      const newId = res.body.temp_id_mapping[tempId]

      // Ignore the sync_token because we do a sync() right here
      // syncToken = res.body.sync_token

      return sync().then(() => {
        return data[type + 's'].find(i => i.id === newId)
      })
    })
  }

  function sync(resourceTypes = ['all']) {
    return request({ sync_token: syncToken, resource_types: stringify(resourceTypes) })
    .then(res => res.body)
    .then(res => {
      syncToken = res.sync_token

      /* Case 1: full_sync: replace whole state */
      if (res.full_sync) {
        Object.assign(data, res)
        return
      }

      /* Case 2: need to replace part of the state that changed */
      for (let key of ARRAY_KEYS) {
        const items = data[key]
        const newItems = res[key]
        if (newItems.length === 0)
          continue
        data[key] =
          items.filter(i => !newItems.some(ni => ni.id === i.id))
               .concat(newItems.filter(i => !i.is_deleted))
      }
    })
  }

  const projects = {
    get:     () => data.projects,
    add:     (options) => command('project', 'add', options),
    update:  (options) => command('project', 'update', options),
    move:    (options) => command('project', 'move', options),
    delete:  (options) => command('project', 'delete', options),
    archive:  (options) => command('project', 'archive', options),
    unarchive:  (options) => command('project', 'unarchive', options),
    reorder: (options) => command('project', 'reorder', options),
  }

  const items = {
    get:     () => data.items,
    getAll:  () => client(`${BASE}/completed/get_all`, { form: { token } }),
    add:     (options) => command('item', 'add', options),
    update:  (options) => command('item', 'update', options),
    move:    (options) => command('item', 'move', options),
    reorder: (options) => command('item', 'reorder', options),
    delete:  (options) => command('item', 'delete', options),
    complete:  (options) => command('item', 'complete', options),
    uncomplete:  (options) => command('item', 'uncomplete', options),
    archive:  (options) => command('item', 'archive', options),
    unarchive:  (options) => command('item', 'unarchive', options),
    updateDateCompleted:  (options) => command('item', 'update_date_complete', options),
    close:  (options) => command('item', 'close', options),
    updateDayOrders:  (options) => command('item', 'update_day_orders', options),
  }

  const labels = {
    get:     () => data.labels,
    add:     (options) => command('label', 'add', options),
    update:  (options) => command('label', 'update', options),
    delete:  (options) => command('label', 'delete', options),
    updateOrders: (options) => command('label', 'update_orders', options),
  }

  const notes = {
    get:     () => data.notes,
    add:     (options) => command('note', 'add', options),
    update:  (options) => command('note', 'update', options),
    delete:  (options) => command('note', 'delete', options),
  }

  const sections = {
    get:     () => data.sections,
    add:     (options) => command('section', 'add', options),
    update:  (options) => command('section', 'update', options),
    move:    (options) => command('section', 'move', options),
    reorder: (options) => command('section', 'reorder', options),
    delete:  (options) => command('section', 'delete', options),
    archive:  (options) => command('section', 'archive', options),
    unarchive:  (options) => command('section', 'unarchive', options),
  }

  const filters = {
    get:     () => data.filters,
    add:     (options) => command('filter', 'add', options),
    update:  (options) => command('filter', 'update', options),
    delete:  (options) => command('filter', 'delete', options),
    updateOrders: (options) => command('filter', 'update_orders', options),
  }

  const reminders = {
    get:     () => data.reminders,
    add:     (options) => command('reminder', 'add', options),
    update:  (options) => command('reminder', 'update', options),
    delete:  (options) => command('reminder', 'delete', options),
    clearLocations: (options) => command('reminder', 'clear_locations', options),
  }

  const v8 = {
    sync,
    projects,
    items,
    notes,
    sections,
    filters,
    reminders,
  }

  return { v8 }
}
