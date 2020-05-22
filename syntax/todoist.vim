let b:todoist_syntax = 1

" syn match todoistTitle /\v^\[.*]$/
" syn region todoistTask matchgroup=todoistTask start=/^ / end=/$/ contains=@todoistTaskCluster
" syn match todoistCheckbox contained /\v\[( |x)\]/ nextgroup=todoistSeparator1
" syn match todoistSeparator1 contained /\v%u00a0:%u00a0/ conceal cchar=  nextgroup=todoistContent
" syn match todoistContent contained /\v(%u00a0:%u00a0)@<=.*(%u00a0\@%u00a0)@=/ nextgroup=todoistSeparator2
" syn match todoistSeparator2 contained /\v%u00a0\@%u00a0/ conceal cchar=  nextgroup=todoistContent
" syn match todoistDate contained /\v(%u00a0\@%u00a0)@<=.*(%u00a0)@=/ nextgroup=todoistSeparator3
" syn match todoistSeparator3 contained /\v%u00a0$/ conceal cchar= 

" syn cluster todoistTaskCluster contains=
            " \todoistCheckbox,todoistContent,todoistDate,
            " \todoistSeparator1,todoistSeparator2,todoistSeparator3

hi def link todoistTitle       Title
hi def link todoistCheckbox    Delimiter
hi def link todoistContent     Bold
hi def link todoistDate        Comment
hi def link todoistDateOverdue ErrorMsg
hi def link todoistDateToday   Question
