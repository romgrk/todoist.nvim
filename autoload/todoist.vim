"!::exe [So]

" Utils

function! todoist#commands (commands)
  for cmd in a:commands
    execute cmd
  endfor
endfunc


" Rendering

function! todoist#set_lines (bufferId, lines, ...)
  let saved_position = getpos('.')
  call nvim_buf_set_lines(a:bufferId, 0, -1, v:true, [])
  call nvim_buf_clear_namespace(a:bufferId, g:todoist_namespace, 0, -1)

  for parts in a:lines
    call append(line('$'), '')
    let lineNumber = line('$') - 1 - 1
    call todoist#set_line(a:bufferId, parts, lineNumber, v:false)
  endfor
  call setpos('.', saved_position)
endfunc

function! todoist#set_line (bufferId, parts, lineNumber, clearHighlights)
  let saved_position = getpos('.')
  let zLineNumber = a:lineNumber
  let oLineNumber = a:lineNumber + 1
  let columnNumber = 0

  if a:clearHighlights
    call nvim_buf_clear_namespace(
          \ a:bufferId,
          \ g:todoist_namespace,
          \ zLineNumber,
          \ zLineNumber + 1)
  end

  " Clear line
  call nvim_buf_set_lines(a:bufferId, zLineNumber, zLineNumber + 1, v:true, [''])

  let lineText = ''
  for part in a:parts
    let lineText .= part['text']
  endfor
  call nvim_buf_set_lines(
        \ a:bufferId, zLineNumber, zLineNumber + 1, v:true, [lineText])

  for part in a:parts
    call nvim_buf_add_highlight(a:bufferId,
          \ g:todoist_namespace,
          \ part['hl'],
          \ zLineNumber,
          \ columnNumber,
          \ columnNumber + len(part['text']))
    let columnNumber += len(part['text'])
  endfor
  call setpos('.', saved_position)
endfunc


