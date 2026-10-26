# WP Blocks for Claude Code

Claude Code writes WordPress block patterns that break in the editor: `wp:html` boxes nobody can edit, stray comments that become Classic blocks and then empty paragraphs, edits that never reach the pages using them. This plugin gives Claude the rules, checks every pattern file it writes, and adds a command to refresh a page from its pattern.

## Install

```
/plugin marketplace add JonImmsWordpressDev/claude-dashboard
/plugin install wp-blocks@jonimms
```

Restart Claude Code after installing. Requires Node.js 18 or newer for the check. The refresh command also needs WP-CLI.

## The rules

Claude loads these when it works on patterns, templates or template parts. Full reasons and examples are in [skills/block-patterns/SKILL.md](skills/block-patterns/SKILL.md).

1. Default to native blocks, with `className` for BEM-style hooks.
2. Use `wp:html` only when it earns its keep, and keep it small.
3. NEVER put bare HTML comments between blocks. Use `<?php /* ... */ ?>`.
4. Reset theme.json's default `<p>` margin when a `div` or `span` becomes a paragraph.
5. Patterns are templates, not live references. Editing the file doesn't update existing pages.

## What the check catches

After Claude writes or edits a `.php` file directly inside a `patterns/` folder, the plugin checks it:

- **bare-comment** (error) — an HTML comment between blocks.
- **unbalanced** (error) — a block that isn't closed, or a closer for the wrong block.
- **mostly-html** (warning) — most of the pattern is `wp:html`.

Errors go straight back to Claude, which fixes the file in the same turn. Warnings are passed along without blocking. Every other file is skipped, and if anything goes wrong the check stays quiet rather than getting in the way.

## Refreshing a page from its pattern

```
/wp-blocks:refresh-page hero 42
```

This rebuilds post 42 from `patterns/hero.php` in the active theme. Claude shows you the post's title, type and status first, and changes nothing until you confirm the ID. WordPress saves a revision, so you can undo it from the post's Revisions screen.

Run Claude from the site's root folder, or tell it the WordPress path. On Local, start Claude from the site shell.

## Pairs well with

- [WordPress/agent-skills](https://github.com/WordPress/agent-skills) — the WordPress project's own skills for block development, themes, plugins, WP-CLI and the REST API.

## Also by me

[Claude Mission Control](https://github.com/JonImmsWordpressDev/claude-dashboard) — one page that shows every Claude Code session on your machine, what it costs, and which one is waiting on you.

## License

MIT
