<?php
/**
 * Title: Code sample
 * Slug: acme/code-sample
 */
?>
<!-- wp:group {"className":"acme-code"} -->
<div class="wp-block-group acme-code">
	<!-- wp:heading -->
	<h2 class="wp-block-heading">Register a pattern category</h2>
	<!-- /wp:heading -->
	<!-- wp:paragraph -->
	<p>Patterns live in the theme's patterns folder and load on their own.</p>
	<!-- /wp:paragraph -->
	<!-- wp:paragraph -->
	<p>Each file needs a header with a title and a slug before any markup.</p>
	<!-- /wp:paragraph -->
	<!-- wp:paragraph -->
	<p>Categories group them in the inserter so editors can find them later.</p>
	<!-- /wp:paragraph -->
	<!-- wp:html -->
	<pre><span class="tok-fn">register_block_pattern_category</span>( 'acme' );</pre>
	<!-- /wp:html -->
</div>
<!-- /wp:group -->
