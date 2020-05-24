# todoist.nvim

> A hopefully usable todoist extension for neovim

![alt text](./static/demo.gif)

#### Install

```vim
" find your key here: https://todoist.com/prefs/integrations
let todoist_api_key = 'YOUR_SECRET_KEY'

" NOTE: keep your key in an env var for more safety; you don't want it in your
"       vim config because you'll end up pushing it to github like I did
let todoist_api_key = $TODOIST_API_KEY


Plug 'romgrk/todoist.vim', { 'do': 'UpdateRemotePlugins' }
```

You might need to `npm install`, haven't polished the installation process yet.

#### Requirements

 - neovim 0.4.0
 - nodejs 10.0.0 (*NOTE*: due to an issue in the npm `neovim` package, node 12 and up don't work for now [#1](https://github.com/romgrk/todoist.nvim/issues/1))

Make sure your nodejs provider works (`:checkhealth` to confirm).

## Usage

`:TodoistInit`

### Mappings

|Keys|Effect|
|---|---|
|`x`|Toggle current task completion|
|`cc`|Change current task text|
|`cd`|Change current task date ([date formats](https://get.todoist.help/hc/en-us/articles/205325931-Due-Dates-Times))|
|`DD`|Delete current task|
|`O`|Add new task before|
|`o`|Add new task after|
|`<`|Unindent|
|`>`|Indent|
|`r`|Refresh|

## Missing

 - Everything except listing & completing (re-opening is actually broken)

