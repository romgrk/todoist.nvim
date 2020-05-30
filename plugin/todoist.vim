"!::exe [So]

" Highlights namespace
let todoist_namespace = nvim_create_namespace('todoist')


" Highlights

" Highlighting function
function! s:hl (name, ...)
  if hlexists(a:name)
    return
  end

  let fg = ''
  let bg = ''
  let attr = ''

  if type(a:1) == 3
    let fg   = get(a:1, 0, '')
    let bg   = get(a:1, 1, '')
    let attr = get(a:1, 2, '')
  else
    let fg   = get(a:000, 0, '')
    let bg   = get(a:000, 1, '')
    let attr = get(a:000, 2, '')
  end

  let cmd = 'hi! ' . a:name
  if !empty(fg)
    let cmd .= ' guifg=' . fg
  end
  if !empty(bg)
    let cmd .= ' guibg=' . bg
  end
  if !empty(attr)
    let cmd .= ' gui=' . attr
  end
  execute cmd
endfunc

call s:hl('todoistTitle',            'white', '#e84644', 'bold')
call s:hl('todoistDateOverdue',      '#FF6D6D')
call s:hl('todoistDateToday',        '#52E054')
call s:hl('todoistDateTomorrow',     '#ff8700')
call s:hl('todoistDateThisWeek',     '#A873FC')
call s:hl('todoistContent',          '',      '',        'bold')
call s:hl('todoistContentCompleted', '',      '',        'strikethrough')

hi def link todoistCheckbox    Delimiter
hi def link todoistDate        Comment

hi def link todoistErrorIcon    ErrorMsg
hi def link todoistErrorMessage ErrorMsg
