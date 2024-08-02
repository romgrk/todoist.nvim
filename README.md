# todoist.nvim

> A hopefully usable todoist extension for neovim

> [!WARNING]
> This repository should work as it is but doesn't receive much maintenance.

![alt text](./static/demo.gif)

For integration with vim-clap (fuzzy finder) [see below](#integration-with-clap).

#### Install

Find your API key here: https://todoist.com/prefs/integrations

For security reasons, it is recommended to use [pass](https://www.passwordstore.org/) to store it:

```bash
$ pass insert Todoist/API
Enter password for Todoist/API: XXXXXXXXX
```

Export it in your `~/.config/environment.d/*.conf`/`~/.profile`/`~/.bashrc`

```bash
export TODOIST_API_KEY="$(pass Todoist/API)"
```

```vim
Plug 'romgrk/todoist.nvim', { 'do': ':TodoistInstall' }
```

If you don't use [vim-plug](https://github.com/junegunn/vim-plug), run the `TodoistInstall`
command manually to complete the installation.

#### Requirements

 - neovim 0.4.0
 - nodejs 10.0.0
 - `npm install -g neovim@latest` (**NOTE**: needs to be at v4.9.0 at least!)

Make sure your nodejs provider works (`:checkhealth` to confirm).

## Usage

`:Todoist [project_name]` (default: `Inbox`. Creates project if it doesn't exist)

### Mappings

|Keys|Effect|
|---|---|
|`x`|Toggle current task completion|
|`cc`|Change current task text|
|`cd`|Change current task date ([date formats](https://get.todoist.help/hc/en-us/articles/205325931-Due-Dates-Times))|
|`p1`|Make task Priority 1|
|`p2`|Make task Priority 2|
|`p3`|Make task Priority 3|
|`p4`|Make task Priority 4|
|`DD`|Delete current task|
|`O`|Add new task before|
|`o`|Add new task after|
|`<`|Unindent|
|`>`|Indent|
|`r`|Refresh|
|`pcc`|Change current project color|
|`pcn`|Change current project name|
|`pdd`|Archive current project *premium users only :/*|
|`pDD`|Delete current project|

### Options

Below are the default options:

```vim
let todoist = {
\  'icons': {
\    'unchecked': ' [ ] ',
\    'checked':   ' [x] ',
\    'loading':   ' […] ',
\    'error':     ' [!] ',
\  },
\  'defaultProject': 'Inbox',
\  'useMarkdownSyntax': v:true,
\}
```

If you have a [NerdFont](https://www.nerdfonts.com/) installed, you can use the icons
below, that will render like in the gif above.

```vim
let todoist = {
\ 'icons': {
\   'unchecked': '  ',
\   'checked':   '  ',
\   'loading':   '  ',
\   'error':     '  ',
\ },
\}
```

### Integration with Clap

This plugin implements a [vim-clap](https://github.com/liuchengxu/vim-clap) provider
for selecting your projects.

```vim
Clap todoist
```

![alt text](./static/clap-integration.png)
