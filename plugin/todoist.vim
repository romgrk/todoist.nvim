"!::exe [So]

" Highlights namespace
let todoist_namespace = nvim_create_namespace('todoist')


" Highlights

" hi def link todoistTitle       Title
hi! todoistTitle       guifg=white guibg=#e84644 gui=bold

hi def link todoistCheckbox    Delimiter

hi def link todoistDate        Comment
hi! todoistDateOverdue guifg=#FF6D6D
hi! todoistDateToday   guifg=#52E054

hi! todoistContent          gui=bold
hi! todoistContentCompleted gui=strikethrough

hi! link todoistError ErrorMsg
