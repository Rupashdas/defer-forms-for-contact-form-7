<?php
/**
 * Plugin Name:       Defer Forms for Contact Form 7
 * Plugin URI:        https://github.com/Rupashdas/defer-forms-for-contact-form-7
 * Description:       The missing modern layer for Contact Form 7 — visual builder, multi-step, submissions DB, conditional logic, and more. Free.
 * Version:           2.7.1
 * Requires at least: 6.5
 * Requires PHP:      8.0
 * Requires Plugins:  contact-form-7
 * Author:            Defer Studio
 * Author URI:        https://profiles.wordpress.org/deferstudio/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       defer-forms-for-contact-form-7
 * Domain Path:       /languages
 *
 * This file is a bootstrap and nothing else: constants, an autoloader, the
 * activation hooks, and one call into DEFERFORMS\Core\Plugin. Everything the plugin
 * actually does lives under src/ — including the admin menu and the admin
 * bundles, which used to be two hundred lines of near-identical render
 * functions here (see src/Admin/Menu.php and src/Admin/Assets.php).
 *
 * No load_plugin_textdomain(). It was here to register this plugin's own
 * languages/ folder, because WordPress searches only WP_LANG_DIR/plugins and
 * WP_LANG_DIR/themes unless a path is registered — so without it a .mo sitting
 * beside the .pot would never be found. Nothing turns on that: no .mo ships,
 * translations from wordpress.org arrive in WP_LANG_DIR/plugins where they are
 * found anyway, and the JS half passes its own path to
 * wp_set_script_translations(). What the call did do was earn a Plugin Check
 * warning on every run, for a case nobody should rely on — a .mo inside the
 * plugin folder is deleted by the next update.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

defined( 'ABSPATH' ) || exit;

define( 'DEFERFORMS_VERSION', '2.7.1' );
define( 'DEFERFORMS_DB_VERSION', '6' );
define( 'DEFERFORMS_FILE', __FILE__ );
define( 'DEFERFORMS_PATH', plugin_dir_path( __FILE__ ) );
define( 'DEFERFORMS_URL', plugin_dir_url( __FILE__ ) );
define( 'DEFERFORMS_BASENAME', plugin_basename( __FILE__ ) );
define( 'DEFERFORMS_SLUG', 'defer-forms-for-contact-form-7' );
define( 'DEFERFORMS_TEXT_DOMAIN', 'defer-forms-for-contact-form-7' );

// PSR-4 autoloader: DEFERFORMS\Foo\Bar → src/Foo/Bar.php.
spl_autoload_register(
	static function ( string $class ): void {
		if ( 0 !== strpos( $class, 'DEFERFORMS\\' ) ) {
			return;
		}
		$relative = substr( $class, strlen( 'DEFERFORMS\\' ) );
		$path     = DEFERFORMS_PATH . 'src' . DIRECTORY_SEPARATOR
			. str_replace( '\\', DIRECTORY_SEPARATOR, $relative ) . '.php';

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
);

if ( is_readable( DEFERFORMS_PATH . 'vendor/autoload.php' ) ) {
	require_once DEFERFORMS_PATH . 'vendor/autoload.php';
}

register_activation_hook( __FILE__, array( '\DEFERFORMS\Core\Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( '\DEFERFORMS\Core\Deactivator', 'deactivate' ) );

/*
 * Guarded, unlike the other three below it. All four are prefixed, so a clash
 * with an unrelated plugin is far-fetched; the realistic case is a second copy
 * of *this* plugin — a Pro edition sharing the bootstrap, or a folder-renamed
 * duplicate left behind by a botched update — and then PHP fatals on
 * redeclaration rather than the second copy quietly losing. This is the one
 * with reach: every class under src/ calls it.
 */
if ( ! function_exists( 'deferforms_asset_ver' ) ) :

	/**
	 * Cache-busting version for one of our own asset files.
	 *
	 * `DEFERFORMS_VERSION` alone is not enough: it does not move while you are working,
	 * so the browser keeps serving yesterday's JS, and it does not move on a release
	 * where somebody forgot to bump it either — leaving every existing visitor on
	 * the old file. The file's own modification time cannot be forgotten.
	 *
	 * Lives here, as a plain function, because every class under src/ calls it and
	 * none of them should have to reach for an object to ask what version a
	 * stylesheet is.
	 *
	 * @param string $relative Path under the plugin folder, e.g. 'assets/js/steps.js'.
	 * @return string Version string for wp_enqueue_script()/wp_enqueue_style().
	 */
	function deferforms_asset_ver( string $relative ): string {
		// A page with two forms on it asks for the same handful of files twice over,
		// and each miss is a stat call. The answer cannot change within a request.
		static $cache = array();

		if ( isset( $cache[ $relative ] ) ) {
			return $cache[ $relative ];
		}

		$path  = DEFERFORMS_PATH . $relative;
		$mtime = is_readable( $path ) ? filemtime( $path ) : false;

		$cache[ $relative ] = $mtime ? DEFERFORMS_VERSION . '.' . $mtime : DEFERFORMS_VERSION;

		return $cache[ $relative ];
	}
endif;

function deferforms_is_cf7_active(): bool {
	return defined( 'WPCF7_VERSION' ) || class_exists( 'WPCF7' );
}

function deferforms_render_cf7_missing_notice(): void {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	printf(
		'<div class="notice notice-error"><p>%s</p></div>',
		esc_html__(
			'Defer Forms for Contact Form 7 requires Contact Form 7. Please install and activate it.',
			'defer-forms-for-contact-form-7'
		)
	);
}

function deferforms_boot(): void {
	if ( ! deferforms_is_cf7_active() ) {
		add_action( 'admin_notices', 'deferforms_render_cf7_missing_notice' );
		return;
	}

	// Before anything can query the tables: an update does not re-run the
	// activation hook, so this is the only thing that keeps the schema honest.
	\DEFERFORMS\DB\Schema::maybe_upgrade();

	( new \DEFERFORMS\Core\Plugin() )->boot();
}
add_action( 'plugins_loaded', 'deferforms_boot', 5 );
