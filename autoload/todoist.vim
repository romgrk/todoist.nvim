"!::exe [So]

function! todoist#set_lines (lines, ...)
  for parts in a:lines
    call append(line('$'), '')
    let lineNumber = line('$') - 1 - 1
    call todoist#set_line(parts, lineNumber)
  endfor
endfunc

function! todoist#set_line (parts, lineNumber)
  let oLineNumber = a:lineNumber + 1
  let columnNumber = 0

  call setline(oLineNumber, '')

  for part in a:parts
    call setline(oLineNumber, getline(oLineNumber) . part['text'])
    call nvim_buf_add_highlight(0,
          \ -1,
          \ part['hl'],
          \ oLineNumber - 1,
          \ columnNumber,
          \ columnNumber + len(part['text']))
    let columnNumber += len(part['text'])
  endfor
endfunc
