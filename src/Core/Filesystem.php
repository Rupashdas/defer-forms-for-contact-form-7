<?php
/**
 * WordPress's filesystem API, on demand.
 *
 * Everything this plugin writes goes under uploads: the attachment copies, and
 * the two guard files above them. All of it used to go through PHP's own
 * `copy()`, `file_put_contents()` and `rmdir()`, each with a phpcs:ignore over
 * it — which is the codebase admitting it knows better and doing it anyway.
 *
 * `WP_Filesystem` is the answer WordPress already has. It is not loaded on a
 * normal request, and `WP_Filesystem()` itself lives in a wp-admin include, so
 * this is the one place that knows how to reach it.
 *
 * The context matters. `get_filesystem_method()` decides between direct writes
 * and FTP by looking at who owns the target, so asking about ABSPATH — the
 * default — answers a question about the WordPress install when what we write
 * to is uploads. Every caller passes the directory it is about, and relaxed
 * ownership is allowed: a writable uploads directory is a precondition for
 * storing an attachment at all, so anything that can hold the file can be
 * written to directly.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Core;

defined( 'ABSPATH' ) || exit;

final class Filesystem {

	/**
	 * Booted once per request, per context.
	 *
	 * `WP_Filesystem()` fills one global, so a second call for a different
	 * directory would replace the object the first caller is holding. Keyed by
	 * context so a failure for one directory is not remembered as a failure for
	 * every other.
	 *
	 * @var array<string, \WP_Filesystem_Base|null>
	 */
	private static array $booted = array();

	/**
	 * The filesystem object, or null when this host will not grant one without
	 * credentials nobody is here to type.
	 *
	 * @param string $context Directory the caller is about to write in.
	 */
	public static function get( string $context = '' ): ?\WP_Filesystem_Base {
		$key = $context;

		if ( array_key_exists( $key, self::$booted ) ) {
			return self::$booted[ $key ];
		}

		global $wp_filesystem;

		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}

		// False for args, so a host that needs FTP credentials is refused here
		// rather than prompting: this runs on a visitor's form submission, where
		// there is no screen to put a credentials form on.
		$ready = WP_Filesystem( false, '' !== $context ? $context : false, true );

		self::$booted[ $key ] = ( $ready && $wp_filesystem instanceof \WP_Filesystem_Base ) ? $wp_filesystem : null;

		return self::$booted[ $key ];
	}
}
