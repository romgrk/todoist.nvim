"!::exe [So]

hi! todoistTitle       guifg=white guibg=#e84644 gui=bold

" hi def link todoistCheckbox    Delimiter
" hi def link todoistContent     Bold
" hi def link todoistDate        Comment
hi! todoistdateoverdue guifg=#FF6D6D
hi! todoistdatetoday   guifg=#52E054

hi! todoistContent          gui=bold
hi! todoistContentCompleted gui=strikethrough

hi! link todoistError ErrorMsg
