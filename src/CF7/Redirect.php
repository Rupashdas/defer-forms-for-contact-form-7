<?php
/**
 * Redirect after submit.
 *
 * The settings live in one `_df7_redirect` post meta and are handed to the
 * browser as data attributes on a hidden marker, which assets/js/redirect.js
 * acts on once CF7 fires its `wpcf7mailsent` success event.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Redirect {

	private const META = '_df7_redirect';

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'inject' ), 9 );
	}

	/**
	 * Read a form's redirect settings.
	 *
	 * Early versions stored just the URL as a string, so a plain string is still
	 * accepted and filled out with defaults.
	 *
	 * @return array{url: string, page_id: int, delay: int, target: string, method: string, params: array<int, array{key: string, value: string}>}
	 */
	public static function config( int $form_id ): array {
		$stored = get_post_meta( $form_id, self::META, true );

		if ( is_string( $stored ) ) {
			$stored = array( 'url' => $stored );
		}
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		return self::sanitize( $stored );
	}

	/**
	 * Store a form's redirect settings, or clear them.
	 *
	 * The meta key stays private and the emptiness rule lives beside sanitize(),
	 * which is the only thing that knows what an empty destination looks like.
	 * Either kind of destination counts — testing the url alone threw the whole
	 * setting away whenever a page was chosen, because choosing one clears the url.
	 *
	 * @param array<string, mixed> $input Raw settings from the request.
	 * @return array<string, mixed> The sanitised settings, as stored.
	 */
	public static function save( int $form_id, array $input ): array {
		$clean = self::sanitize( $input );

		if ( '' !== $clean['url'] || $clean['page_id'] > 0 ) {
			update_post_meta( $form_id, self::META, $clean );
		} else {
			delete_post_meta( $form_id, self::META );
		}

		return $clean;
	}

	/** More than this many query parameters is a mistake, not a configuration. */
	private const MAX_PARAMS = 20;

	/**
	 * @param array<string, mixed> $input
	 * @return array{url: string, page_id: int, delay: int, target: string, method: string, params: array<int, array{key: string, value: string}>}
	 */
	public static function sanitize( array $input ): array {
		$target = ( 'blank' === ( $input['target'] ?? '' ) ) ? 'blank' : 'same';

		return array(
			// Square brackets survive esc_url_raw, so a `[field-name]` written
			// into the path or query reaches the browser intact.
			'url'     => esc_url_raw( trim( (string) ( $input['url'] ?? '' ) ) ),
			// A chosen page is stored by id, not by address: the permalink is
			// resolved at render time so renaming the page cannot break this.
			'page_id' => max( 0, (int) ( $input['page_id'] ?? 0 ) ),
			// A long wait looks broken, so cap it rather than trust the input.
			'delay'   => max( 0, min( 60, (int) ( $input['delay'] ?? 0 ) ) ),
			'target'  => $target,
			// `replace` drops the form page from history so Back doesn't return
			// to a submitted form. Meaningless when opening a new tab.
			'method'  => ( 'same' === $target && 'replace' === ( $input['method'] ?? '' ) ) ? 'replace' : 'assign',
			'params'  => self::sanitize_params( $input['params'] ?? array() ),
		);
	}

	/**
	 * Extra query parameters to hang off the destination.
	 *
	 * Values are left as typed so a `[field-name]` can survive to the browser,
	 * which fills it in from the submission. Encoding happens there, at the point
	 * the value is actually known.
	 *
	 * @param mixed $input
	 * @return array<int, array{key: string, value: string}>
	 */
	private static function sanitize_params( $input ): array {
		if ( ! is_array( $input ) ) {
			return array();
		}

		$out = array();

		foreach ( $input as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			// A query key has no business holding anything but a name.
			$key = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) ( $row['key'] ?? '' ) );
			if ( '' === $key ) {
				continue;
			}

			$out[] = array(
				'key'   => $key,
				'value' => sanitize_text_field( (string) ( $row['value'] ?? '' ) ),
			);

			if ( count( $out ) >= self::MAX_PARAMS ) {
				break;
			}
		}

		return $out;
	}

	/**
	 * Where this form actually sends people, page choice taking precedence.
	 *
	 * Returns '' when nothing is configured, or when the chosen page has since
	 * been deleted — better to leave the visitor on the success message than to
	 * send them to a 404.
	 */
	public static function destination( int $form_id ): string {
		$config = self::config( $form_id );

		if ( $config['page_id'] > 0 ) {
			// get_permalink() returns false for a page that has since been
			// deleted, and false casts to the empty string we want anyway.
			return (string) get_permalink( $config['page_id'] );
		}

		return $config['url'];
	}

	public function inject( string $elements ): string {
		$form = function_exists( 'wpcf7_get_current_contact_form' ) ? wpcf7_get_current_contact_form() : null;
		if ( ! $form ) {
			return $elements;
		}

		$form_id     = (int) $form->id();
		$config      = self::config( $form_id );
		$destination = self::destination( $form_id );

		if ( '' === $destination ) {
			return $elements;
		}

		wp_enqueue_script( 'df7-redirect', DF7_URL . 'assets/js/redirect.js', array(), df7_asset_ver( 'assets/js/redirect.js' ), true );

		return $elements . sprintf(
			'<input type="hidden" class="df7-redirect" value="%1$s" data-delay="%2$d" data-target="%3$s" data-method="%4$s" data-params="%5$s" />',
			esc_attr( $destination ),
			$config['delay'],
			esc_attr( $config['target'] ),
			esc_attr( $config['method'] ),
			esc_attr( (string) wp_json_encode( $config['params'] ) )
		);
	}
}
