"!::exe [So]

" Utils

function! todoist#commands (commands)
  for cmd in a:commands
    execute cmd
  endfor
endfunc


" Rendering

function! todoist#set_lines (lines, ...)
  let saved_position = getpos('.')
  call nvim_buf_set_lines(0, 0, -1, v:true, [])
  call nvim_buf_clear_namespace(0, g:todoist_namespace, 0, -1)

  for parts in a:lines
    call append(line('$'), '')
    let lineNumber = line('$') - 1 - 1
    call todoist#set_line(parts, lineNumber, v:false)
  endfor
  call setpos('.', saved_position)
endfunc

function! todoist#set_line (parts, lineNumber, clearHighlights)
  let saved_position = getpos('.')
  let zLineNumber = a:lineNumber
  let oLineNumber = a:lineNumber + 1
  let columnNumber = 0

  if a:clearHighlights
    call nvim_buf_clear_namespace(
          \ 0,
          \ g:todoist_namespace,
          \ zLineNumber,
          \ zLineNumber + 1)
  end

  call setline(oLineNumber, '')

  for part in a:parts
    call setline(oLineNumber, getline(oLineNumber) . part['text'])
    call nvim_buf_add_highlight(0,
          \ g:todoist_namespace,
          \ part['hl'],
          \ zLineNumber,
          \ columnNumber,
          \ columnNumber + len(part['text']))
    let columnNumber += len(part['text'])
  endfor
  call setpos('.', saved_position)
endfunc


