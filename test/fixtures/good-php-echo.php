<?php
/**
 * Title: Greeting
 * Slug: acme/greeting
 */
?>
<!-- wp:paragraph --><p><?php echo esc_html__( 'Hi', 'acme' ); ?></p><!-- /wp:paragraph -->
<!-- wp:image {"sizeSlug":"large"} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/hero.jpg' ) ); ?>" alt=""/></figure>
<!-- /wp:image -->
