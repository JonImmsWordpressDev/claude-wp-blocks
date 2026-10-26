---
name: block-patterns
description: Rules for writing WordPress block markup that stays editable. Use when creating or editing block theme patterns (patterns/*.php), templates, template parts, or any Gutenberg block markup (<!-- wp:... --> comments) in a WordPress block theme.
---

# Block patterns that stay editable

Left alone, block markup goes wrong in a few predictable ways. Patterns turn into `wp:html` boxes nobody can edit. Stray comments become Classic blocks in the editor, then empty paragraphs in the page. Edited pattern files don't change the pages already using them.

Follow these five rules on every pattern, template and template part.

## 1. Default to native blocks

Use `wp:paragraph`, `wp:heading`, `wp:group`, `wp:image`, `wp:buttons`, `wp:quote` and the rest. Add `className` for BEM-style hooks. Native blocks render as they will look in the editor and stay editable. A pattern built mostly from `wp:html` shows up as unstyled raw text in the editor canvas.

Before:

```html
<!-- wp:html -->
<div class="acme-card">
	<h3 class="acme-card__title">Fast setup</h3>
	<p class="acme-card__text">Ready in five minutes.</p>
</div>
<!-- /wp:html -->
```

After:

```html
<!-- wp:group {"className":"acme-card"} -->
<div class="wp-block-group acme-card">
	<!-- wp:heading {"level":3,"className":"acme-card__title"} -->
	<h3 class="wp-block-heading acme-card__title">Fast setup</h3>
	<!-- /wp:heading -->
	<!-- wp:paragraph {"className":"acme-card__text"} -->
	<p class="acme-card__text">Ready in five minutes.</p>
	<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

## 2. Use wp:html only when it earns its keep

Each `wp:html` block is a monospace textarea in the editor. Use one only for:

- Inline custom-classed `<span>`s the rich-text editor would strip — syntax-highlight tokens inside `<pre>`, for example
- Elements native blocks can't express — custom data attributes, embedded SVG with attributes
- Dynamic PHP markup that's awkward to put inside a native block

Keep those chunks small and surround them with native blocks.

Before — a whole section as one `wp:html` block, like rule 1's "before".

After:

```html
<!-- wp:group {"className":"acme-snippet"} -->
<div class="wp-block-group acme-snippet">
	<!-- wp:paragraph -->
	<p>Register the category once in functions.php.</p>
	<!-- /wp:paragraph -->
	<!-- wp:html -->
	<pre class="acme-snippet__code"><span class="tok-fn">register_block_pattern_category</span>( 'acme' );</pre>
	<!-- /wp:html -->
</div>
<!-- /wp:group -->
```

## 3. NEVER put bare HTML comments between blocks

Gutenberg's parser doesn't skip a plain `<!-- ... -->` between blocks. The page renders fine until someone opens it in the editor. The editor turns the comment into a Classic block (`core/freeform`). The first save then writes it back as `<p><!-- Hero --></p>` — a stray empty paragraph in the page content. Use a PHP comment for section dividers. It never reaches the page.

Before:

```html
<!-- wp:group -->
<div class="wp-block-group"><!-- wp:paragraph --><p>Intro</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
<!-- Hero -->
<!-- wp:group -->
<div class="wp-block-group"><!-- wp:paragraph --><p>Hero</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

After:

```php
<!-- wp:group -->
<div class="wp-block-group"><!-- wp:paragraph --><p>Intro</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
<?php /* Hero */ ?>
<!-- wp:group -->
<div class="wp-block-group"><!-- wp:paragraph --><p>Hero</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

## 4. Watch theme.json's default paragraph margins

Turning a `<div>` or `<span>` into a `wp:paragraph` makes it a `<p>`. theme.json usually gives `<p>` a default margin, and the layout shifts. Add an explicit margin reset to the affected selectors.

```scss
.acme-card__meta {
	margin: 0;
}
```

## 5. Patterns are templates, not live references

Inserting a pattern copies its evaluated HTML into the page's `post_content`. Editing the pattern's PHP file afterwards does NOT update pages that already use it. To update an existing page, either re-insert the pattern from the inserter or rebuild the page from the file:

```bash
wp eval 'ob_start(); include get_theme_file_path("/patterns/NAME.php"); $c = ob_get_clean(); kses_remove_filters(); wp_update_post(wp_slash(["ID" => POST_ID, "post_content" => $c]));'
```

Keep `wp_slash()` and `kses_remove_filters()`. Without them WordPress strips the backslashes from block attributes and filters out SVG and iframes. WordPress saves a revision first, so it can be undone. `/wp-blocks:refresh-page <pattern-slug> <post-id>` does this for you and asks you to confirm the post before changing it. Target posts by ID, never by title.

## The Classic block isn't the Classic Editor

The "Classic block" (`core/freeform`) prompt is the parser's fallback for content it doesn't recognise. It has nothing to do with the deprecated Classic Editor plugin. If you see it, the markup confused the parser. Find the cause in the source — don't just click "Convert to blocks".

## The plugin checks your work

After every write to `patterns/*.php`, this plugin's hook checks the file for bare comments between blocks (`bare-comment`; a warning when the comment is inside a block's markup), delimiters missing their spaces (`delimiter-spacing`), blocks that don't open and close in order (`unbalanced`), and patterns that are mostly `wp:html` (`mostly-html`, a warning). Fix what it reports before moving on.
