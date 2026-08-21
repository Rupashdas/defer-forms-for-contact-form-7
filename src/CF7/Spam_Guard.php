<?php
/**
 * Extra spam checks beyond the honeypot, both via the `wpcf7_spam` filter:
 *  - Time-trap: a signed render timestamp; submissions sent faster than a human
 *    could fill the form are bots. (Fails open on cached pages.)
 *  - Dedup: an identical submission repeated within a short window is a flood /
 *    double-post, tracked with a short-lived transient (no DB schema needed).
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

use CF7NL\DB\Settings_Repository;

defined( 'ABSPATH' ) || exit;

final class Spam_Guard {

	private const TS_FIELD    = 'cf7nl_ts';
	private const MIN_SECONDS = 3;
	private const DUP_WINDOW  = 60;

	/**
	 * How old a render stamp may be and still be believed.
	 *
	 * Deliberately generous. The obvious number would be an hour, and it would be
	 * wrong: a full-page cache serves the same rendered form — and so the same
	 * stamp — to everybody for as long as its own TTL, so a short ceiling here
	 * marks real visitors on a cached site as spam. A month stops a stamp being
	 * minted once and replayed forever without ever reaching a cache's lifetime.
	 */
	private const MAX_AGE = 30 * DAY_IN_SECONDS;

	private Settings_Repository $settings;

	public function __construct( Settings_Repository $settings ) {
		$this->settings = $settings;
	}

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'inject_timestamp' ) );
		add_filter( 'wpcf7_spam', array( $this, 'check' ), 10, 2 );
	}

	public function inject_timestamp( string $elements ): string {
		if ( empty( $this->settings->get_section( 'spam' )['time_trap_enabled'] ) ) {
			return $elements;
		}

		return $elements . sprintf(
			'<input type="hidden" name="%s" value="%s" autocomplete="off" />',
			esc_attr( self::TS_FIELD ),
			esc_attr( $this->make_token( self::current_form_id() ) )
		);
	}

	/** The form being rendered or submitted, or 0 when there is not one. */
	private static function current_form_id(): int {
		$form = function_exists( 'wpcf7_get_current_contact_form' ) ? wpcf7_get_current_contact_form() : null;

		return $form ? (int) $form->id() : 0;
	}

	/**
	 * @param bool                   $spam       Whether the submission is already flagged.
	 * @param \WPCF7_Submission|null $submission Current submission.
	 */
	public function check( bool $spam, $submission = null ): bool {
		if ( $spam ) {
			return $spam;
		}

		$config = $this->settings->get_section( 'spam' );

		if ( ! empty( $config['time_trap_enabled'] ) ) {
			$token = isset( $_POST[ self::TS_FIELD ] ) ? (string) wp_unslash( $_POST[ self::TS_FIELD ] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
			$time  = $this->token_time( $token, self::form_id_of( $submission ) );
			if ( null === $time || ( time() - $time ) < self::MIN_SECONDS ) {
				return true;
			}
		}

		if ( ! empty( $config['dedup_enabled'] ) ) {
			$key = $this->dup_key( $submission );
			if ( '' !== $key ) {
				if ( get_transient( $key ) ) {
					return true;
				}
				set_transient( $key, 1, self::DUP_WINDOW );
			}
		}

		return false;
	}

	/**
	 * The signature over a render time, tied to the form it was rendered for.
	 *
	 * The form id is in the signed material so a stamp taken from one form cannot
	 * be posted to another — collecting a single token from the easiest page on
	 * the site and replaying it everywhere used to work.
	 */
	private static function signature( int $time, int $form_id ): string {
		return substr( wp_hash( $time . '|' . $form_id . '|' . self::TS_FIELD ), 0, 16 );
	}

	private function make_token( int $form_id ): string {
		$time = time();

		return $time . '.' . self::signature( $time, $form_id );
	}

	private function token_time( string $token, int $form_id ): ?int {
		$parts = explode( '.', $token, 2 );
		if ( 2 !== count( $parts ) || ! ctype_digit( $parts[0] ) ) {
			return null;
		}

		$time = (int) $parts[0];

		// A stamp from the future is a forgery attempt or a clock nobody can act
		// on; one from long ago is a replay. Neither is a form somebody just filled.
		$age = time() - $time;
		if ( $age < 0 || $age > self::MAX_AGE ) {
			return null;
		}

		return hash_equals( self::signature( $time, $form_id ), $parts[1] ) ? $time : null;
	}

	/**
	 * A stable key for the submission's content, so an identical repeat collides.
	 *
	 * @param \WPCF7_Submission|null $submission
	 */
	private function dup_key( $submission ): string {
		$data = $_POST; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
		foreach ( array_keys( $data ) as $key ) {
			if ( 0 === strpos( $key, '_' ) || 0 === strpos( $key, 'cf7nl_' ) ) {
				unset( $data[ $key ] );
			}
		}
		ksort( $data );

		// The sender is part of what makes a repeat a repeat. Without it, two
		// people who genuinely answer a short form the same way within the minute
		// — a yes/no poll, an RSVP — collide, and the second one is filed as spam
		// with nothing to tell them why.
		$who = (string) ( $submission && method_exists( $submission, 'get_meta' ) ? $submission->get_meta( 'remote_ip' ) : '' );

		return 'cf7nl_dup_' . md5( self::form_id_of( $submission ) . '|' . $who . '|' . wp_json_encode( $data ) );
	}

	/**
	 * @param \WPCF7_Submission|null $submission
	 */
	private static function form_id_of( $submission ): int {
		if ( $submission && method_exists( $submission, 'get_contact_form' ) ) {
			$form = $submission->get_contact_form();
			if ( $form ) {
				return (int) $form->id();
			}
		}

		return self::current_form_id();
	}
}
