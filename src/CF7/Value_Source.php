<?php
/**
 * Resolves a source token to a value at render time. Shared by the dynamic-text
 * field and the pre-fill option, so both understand exactly the same tokens.
 *
 * Supported: `url:KEY`, `cookie:KEY`, `post:title|id|url|slug`,
 * `user:email|name|login|id|first|last`, `referrer`, `today`, `now`.
 * Anything else is returned as a literal.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Value_Source {

	/**
	 * @param string $source A `kind:key` reference, e.g. `url:ref` or `user:email`.
	 * @return string The resolved value, or an empty string when there is none.
	 */
	public static function resolve( string $source ): string {
		$source = trim( $source );
		if ( '' === $source ) {
			return '';
		}

		if ( 0 === strpos( $source, 'url:' ) ) {
			$key = substr( $source, 4 );
			return isset( $_GET[ $key ] ) // phpcs:ignore WordPress.Security.NonceVerification
				? sanitize_text_field( wp_unslash( $_GET[ $key ] ) ) // phpcs:ignore WordPress.Security.NonceVerification
				: '';
		}

		if ( 0 === strpos( $source, 'cookie:' ) ) {
			$key = substr( $source, 7 );
			return isset( $_COOKIE[ $key ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ $key ] ) ) : '';
		}

		if ( 0 === strpos( $source, 'post:' ) ) {
			return self::from_post( substr( $source, 5 ) );
		}

		if ( 0 === strpos( $source, 'user:' ) ) {
			return self::from_user( substr( $source, 5 ) );
		}

		if ( 'referrer' === $source ) {
			// The *raw* referer on purpose. wp_get_referer() validates the address
			// against this site and returns false for anything else, which is
			// right for a redirect target and wrong for this: "where did this
			// visitor come from" is a question whose interesting answers are all
			// off-site. It still unslashes, which is the half worth having.
			$referer = wp_get_raw_referer();

			return is_string( $referer ) ? esc_url_raw( $referer ) : '';
		}

		// wp_date(), not date_i18n(): both translate month and day names, but
		// date_i18n() reads the offset out of a timestamp it built itself and
		// lands an hour out either side of a daylight-saving change. wp_date()
		// asks the site's actual timezone.
		if ( 'today' === $source ) {
			return (string) wp_date( (string) get_option( 'date_format' ) );
		}

		if ( 'now' === $source ) {
			return (string) wp_date( (string) get_option( 'date_format' ) . ' ' . (string) get_option( 'time_format' ) );
		}

		return $source;
	}

	private static function from_post( string $key ): string {
		$post = get_post();
		if ( ! $post ) {
			return '';
		}

		switch ( $key ) {
			case 'title':
				return (string) get_the_title( $post );
			case 'id':
				return (string) $post->ID;
			case 'url':
				return (string) get_permalink( $post );
			case 'slug':
				return (string) $post->post_name;
		}
		return '';
	}

	private static function from_user( string $key ): string {
		$user = wp_get_current_user();
		if ( ! $user || 0 === (int) $user->ID ) {
			return '';
		}

		switch ( $key ) {
			case 'email':
				return (string) $user->user_email;
			case 'name':
				return (string) $user->display_name;
			case 'login':
				return (string) $user->user_login;
			case 'id':
				return (string) $user->ID;
			case 'first':
				return (string) $user->first_name;
			case 'last':
				return (string) $user->last_name;
		}
		return '';
	}
}
