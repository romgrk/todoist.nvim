
# todoist.vim (neovim only)

> A hopefully usable todoist extension for neovim

#### Install

```vim
Plug 'romgrk/todoist.vim', { 'do': 'npm install' }
```

#### Requirements

 - neovim 0.4.0
 - nodejs 10.0.0
 - a working nodejs provider (`:checkhealth` to confirm)

## Usage

`:TodoistInit`

![alt text](./static/demo.png)

### Mappings

|Keys|Effect|
|---|---|
|`x`|Toggle current task completion|

## Missing

 - Everything except listing & completing (re-opening is actually broken)

