<?php
/**
 * The built admin bundles, and getting one of them onto a page.
 *
 * There used to be seven copies of this — one inside each page's render
 * function — differing only in a handle and an entry name. Two hundred lines
 * saying the same thing seven times, in the file a reviewer opens first, where a
 * fix to one copy silently left the other six behind.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Admin;

defined( 'ABSPATH' ) || exit;

final class Assets {

	/** What every one of our React entries is built against. */
	private const DEPS = array( 'wp-element', 'wp-api-fetch', 'wp-i18n' );

	/**
	 * Handles that must be emitted as `<script type="module">`.
	 *
	 * Filled by enqueue() rather than listed by hand: the old hard-coded array of
	 * seven names was a second place to remember a new screen, and forgetting it
	 * produced a bundle the browser refused to run with no error worth reading.
	 *
	 * @var array<int, string>
	 */
	private static array $modules = array();

	/**
	 * Stylesheet handles enqueue() registered, in the order it registered them.
	 *
	 * Anything wanting to hang inline CSS off the bundle needs the handle, and
	 * the handle is built here from a name and a counter — spelling that
	 * convention out a second time somewhere else is how the two drift.
	 *
	 * @var array<int, string>
	 */
	private static array $styles = array();

	public function register_hooks(): void {
		add_filter( 'script_loader_tag', array( $this, 'as_module' ), 10, 2 );
	}

	/**
	 * Vite writes a manifest keyed by source path; this reads one entry out of it,
	 * together with the CSS of any chunk that entry imports.
	 *
	 * @return array<string, mixed>|null Null when the plugin has not been built.
	 */
	public static function entry( string $entry ): ?array {
		$manifest = self::manifest();
		$asset    = $manifest[ "ui/apps/{$entry}/index.jsx" ] ?? null;

		if ( ! $asset ) {
			return null;
		}

		$css = (array) ( $asset['css'] ?? array() );
		foreach ( (array) ( $asset['imports'] ?? array() ) as $import_key ) {
			$chunk = $manifest[ $import_key ] ?? null;
			if ( $chunk && ! empty( $chunk['css'] ) ) {
				$css = array_merge( $css, (array) $chunk['css'] );
			}
		}

		$asset['css'] = array_values( array_unique( $css ) );

		return $asset;
	}

	/**
	 * The parsed manifest, once per request.
	 *
	 * Each of the seven render functions read and decoded this file for itself.
	 * Only one of them runs per request today, but the read is still a file hit
	 * and a json_decode on a page load that has an admin waiting for it.
	 *
	 * @return array<string, mixed>
	 */
	private static function manifest(): array {
		static $manifest = null;

		if ( null !== $manifest ) {
			return $manifest;
		}

		$path = DEFERFORMS_PATH . 'build/manifest.json';

		// The readable check stays in front of it: an unbuilt checkout is a
		// normal state for a developer, and wp_json_file_decode() announces a
		// missing file through wp_trigger_error().
		if ( ! is_readable( $path ) ) {
			$manifest = array();
			return $manifest;
		}

		// Core's own read-and-parse — the one theme.json goes through — rather
		// than file_get_contents() piped into json_decode(). It reads the file
		// and reports a malformed one, which a build interrupted halfway through
		// leaves behind.
		$decoded  = wp_json_file_decode( $path, array( 'associative' => true ) );
		$manifest = is_array( $decoded ) ? $decoded : array();

		return $manifest;
	}

	/**
	 * Put one app's script and stylesheets on the current page.
	 *
	 * @return string The script handle, so a caller can localise against it.
	 */
	public static function enqueue( string $entry ): string {
		$handle = 'deferforms-' . $entry;
		$asset  = self::entry( $entry );

		if ( ! $asset || ! isset( $asset['file'] ) ) {
			return $handle;
		}

		wp_enqueue_script(
			$handle,
			DEFERFORMS_URL . 'build/' . $asset['file'],
			self::DEPS,
			DEFERFORMS_VERSION,
			true
		);

		self::$modules[] = $handle;

		// Every screen is React, so nearly all of this plugin's interface is
		// strings inside a bundle. Without this WordPress never sends their
		// translations to the browser and `__()` hands back the English it was
		// given — on a fully translated site, in every language. `wp-i18n` is
		// already in DEPS, which is what this needs to attach to.
		wp_set_script_translations( $handle, 'defer-forms-for-contact-form-7', DEFERFORMS_PATH . 'languages' );

		// One entry can pull in several stylesheets, and each needs a handle of its
		// own or the later ones silently replace the first.
		foreach ( (array) ( $asset['css'] ?? array() ) as $sheet_number => $css_file ) {
			$style = $handle . '-' . $sheet_number;

			wp_enqueue_style(
				$style,
				DEFERFORMS_URL . 'build/' . $css_file,
				array(),
				DEFERFORMS_VERSION
			);

			self::$styles[] = $style;
		}

		return $handle;
	}

	/**
	 * The last stylesheet enqueue() registered, or '' if it registered none.
	 *
	 * The last rather than the first: a caller adding inline CSS is doing it to
	 * override something the bundle declares, and inline CSS prints directly
	 * after the sheet it is attached to. Attached to an earlier sheet it would
	 * be overridden right back by a later one.
	 */
	public static function last_style_handle(): string {
		return empty( self::$styles ) ? '' : (string) end( self::$styles );
	}

	/**
	 * The bundles are ES modules, and WordPress has no way to say so.
	 */
	public function as_module( string $tag, string $handle ): string {
		if ( ! in_array( $handle, self::$modules, true ) ) {
			return $tag;
		}

		return str_replace( '<script ', '<script type="module" ', $tag );
	}
}
