<?php
/**
 * Uninstall handler for CF7 Nova Lite.
 *
 * Removes the plugin's options and submissions table, but only where the site
 * enabled "Delete all data on uninstall" (Settings → General).
 *
 * On a network, every site is visited. Each one keeps its own submissions table,
 * its own options and its own uploads directory, so cleaning only the site that
 * happened to run the uninstall left the rest of the network holding entries —
 * and the IP addresses in them — with nothing left to read or delete them.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Erase this one site's data, if this one site asked for that.
 *
 * The setting is read per site rather than once: opting in on the site running
 * the uninstall is not consent to wipe a sibling that never turned it on.
 */
function cf7nl_uninstall_site(): void {
	global $wpdb;

	$settings = get_option( 'cf7nl_settings', array() );

	if ( empty( $settings['general']['delete_on_uninstall'] ) ) {
		return;
	}

	delete_option( 'cf7nl_settings' );
	delete_option( 'cf7nl_modules' );
	delete_option( 'cf7nl_db_version' );
	delete_option( 'cf7nl_submission_seq' );
	// The schema-upgrade lock. An option rather than a transient since it has to
	// be claimed atomically, which means the transient sweep below no longer
	// reaches it and it has to be named here.
	delete_option( 'cf7nl_db_upgrading' );

	// Per-form settings we attached to CF7's own posts.
	delete_post_meta_by_key( '_cf7nl_redirect' );
	delete_post_meta_by_key( '_cf7nl_steps' );
	delete_post_meta_by_key( '_cf7nl_revision' );

	// Short-lived markers: duplicate-submission keys and the schema-upgrade lock.
	// They expire by themselves, but a site uninstalling right after a burst of
	// traffic — or mid-upgrade — would keep the rows.
	//
	// esc_like() rather than backslashes typed into the string: the underscores
	// in `_transient_` are LIKE wildcards, and getting one of those escapes wrong
	// is a DELETE that matches more option rows than it was meant to.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
			$wpdb->esc_like( '_transient_cf7nl_' ) . '%',
			$wpdb->esc_like( '_transient_timeout_cf7nl_' ) . '%'
		)
	);

	// Spelled out rather than read from Schema::TABLE: WordPress runs this file on
	// its own, with the plugin never loaded and no autoloader. tests/php/uninstall.php
	// checks the two names still match.
	$table = $wpdb->prefix . 'cf7nl_submissions';
	$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL -- a table name built from $wpdb->prefix and a literal; prepare() cannot placeholder an identifier anyway.

	// The files people attached. Dropping the table alone would leave every upload
	// this plugin ever kept sitting under uploads with nothing left pointing at it.
	$uploads = wp_upload_dir();

	if ( empty( $uploads['error'] ) && ! empty( $uploads['basedir'] ) ) {
		$attachments = rtrim( (string) $uploads['basedir'], '/\\' ) . '/cf7nl-attachments';

		// WP_Filesystem's recursive delete, rather than a hand-rolled glob and
		// rmdir walk. It goes all the way down — the old loop only descended one
		// level, so a directory inside a submission folder stopped it and left
		// the whole tree behind — and it needs no wp-admin screen to work,
		// because uninstall.php already runs inside the admin.
		//
		// Src/Core/Filesystem.php does the same thing for the running plugin.
		// It cannot be reused here: WordPress runs this file with the plugin
		// never loaded and no autoloader.
		require_once ABSPATH . 'wp-admin/includes/file.php';

		global $wp_filesystem;

		if ( WP_Filesystem( false, $uploads['basedir'], true ) && $wp_filesystem ) {
			$wp_filesystem->delete( $attachments, true );
		}
	}
}

if ( ! is_multisite() ) {
	cf7nl_uninstall_site();
	return;
}

// Batched rather than one get_sites() call: a large network would otherwise ask
// for every site row at once, and this runs on a request that already has the
// plugin's whole teardown to get through.
// Prefixed because this file has no function to hold them: at the bottom of
// uninstall.php these are globals, and a bare $offset belongs to whoever else
// is in the global scope.
$cf7nl_offset = 0;

do {
	$cf7nl_sites = get_sites(
		array(
			'fields' => 'ids',
			'number' => 100,
			'offset' => $cf7nl_offset,
		)
	);

	foreach ( $cf7nl_sites as $cf7nl_site_id ) {
		switch_to_blog( (int) $cf7nl_site_id );
		cf7nl_uninstall_site();
		restore_current_blog();
	}

	$cf7nl_offset += 100;
	$cf7nl_batch   = count( $cf7nl_sites );
} while ( 100 === $cf7nl_batch );
