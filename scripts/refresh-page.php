<?php
/**
 * Rebuild a post's content from a block pattern file in the active theme.
 *
 * Patterns are copied into post_content when inserted, so editing the pattern
 * file never updates pages that already use it. This re-copies it.
 *
 * Usage: wp eval-file refresh-page.php <pattern-slug> <post-id> [confirm]
 * Without "confirm" it only shows which post would change.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	return;
}

$wpb_slug    = isset( $args[0] ) ? (string) $args[0] : '';
$wpb_id      = isset( $args[1] ) ? (string) $args[1] : '';
$wpb_confirm = isset( $args[2] ) && 'confirm' === $args[2];

if ( ! preg_match( '/^[a-z0-9-]+$/', $wpb_slug ) ) {
	WP_CLI::error( 'Pattern slug must be lowercase letters, numbers and hyphens, like "hero".' );
}

if ( ! preg_match( '/^[1-9][0-9]*$/', $wpb_id ) ) {
	WP_CLI::error( 'Post ID must be a positive whole number.' );
}
$wpb_id = (int) $wpb_id;

$wpb_file = get_theme_file_path( "/patterns/{$wpb_slug}.php" );
if ( ! is_file( $wpb_file ) ) {
	WP_CLI::error( "No patterns/{$wpb_slug}.php in the active theme." );
}

$wpb_post = get_post( $wpb_id );
if ( ! $wpb_post ) {
	WP_CLI::error( "No post with ID {$wpb_id}." );
}

if ( ! $wpb_confirm ) {
	WP_CLI::log( sprintf( 'Post %d: "%s" (%s, %s)', $wpb_post->ID, $wpb_post->post_title, $wpb_post->post_type, $wpb_post->post_status ) );
	WP_CLI::log( "Pattern file: patterns/{$wpb_slug}.php" );
	return;
}

ob_start();
include $wpb_file;
$wpb_content = ob_get_clean();

$wpb_result = wp_update_post(
	array(
		'ID'           => $wpb_id,
		'post_content' => $wpb_content,
	),
	true
);

if ( is_wp_error( $wpb_result ) ) {
	WP_CLI::error( $wpb_result->get_error_message() );
}

WP_CLI::log( "Updated post {$wpb_id}. WordPress saved a revision; restore it from the post's Revisions screen to undo." );
