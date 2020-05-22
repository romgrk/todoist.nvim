"!::exe [So]

" hi def link todoistTitle       Title
" hi def link todoistCheckbox    Delimiter
" hi def link todoistContent     Bold
" hi def link todoistDate        Comment
hi! todoistdateoverdue guifg=#FF6D6D
hi! todoistdatetoday   guifg=#52E054

hi! todoistContent          gui=bold
hi! todoistContentCompleted gui=bold,strikethrough

hi! link todoistError ErrorMsg
