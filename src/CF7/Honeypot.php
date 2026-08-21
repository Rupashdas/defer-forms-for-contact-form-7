<?php
/**
 * Honeypot spam protection: injects a hidden field and rejects submissions
 * that fill it (only bots do).
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

use CF7NL\DB\Settings_Repository;

defined( 'ABSPATH' ) || exit;

final class Honeypot {

	/**
	 * The trap's name, per site.
	 *
	 * It used to be the constant `cf7nl_hp`, which any bot that had met this
	 * plugin once could skip by name. Hashing it per site means a list of field
	 * names learned from one install says nothing about the next.
	 *
	 * The `cf7nl_` prefix stays: it is what Submission_Listener strips before
	 * writing a row, and what the dedup key ignores, so a name without it would
	 * quietly start being stored and shown as though somebody had typed it.
	 */
	private static function field(): string {
		static $name = null;

		if ( null === $name ) {
			$name = 'cf7nl_hp_' . substr( wp_hash( 'cf7nl_honeypot_field' ), 0, 10 );
		}

		return $name;
	}

	private Settings_Repository $settings;

	public function __construct( Settings_Repository $settings ) {
		$this->settings = $settings;
	}

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_elements', array( $this, 'inject_field' ) );
		add_filter( 'wpcf7_spam', array( $this, 'check' ), 10, 2 );
	}

	public function inject_field( string $elements ): string {
		if ( empty( $this->settings->get_section( 'spam' )['honeypot_enabled'] ) ) {
			return $elements;
		}

		$field = sprintf(
			'<span class="cf7nl-hp" aria-hidden="true" style="position:absolute !important;left:-9999px !important;top:-9999px !important;">'
				. '<label>%s<input type="text" name="%s" value="" tabindex="-1" autocomplete="off"></label></span>',
			esc_html__( 'Leave this field empty', 'cf7-nova-lite' ),
			esc_attr( self::field() )
		);

		return $elements . $field;
	}

	/**
	 * @param bool  $spam       What earlier spam checks concluded.
	 * @param mixed $submission The WPCF7_Submission, unused here but part of the filter.
	 * @return bool Whether the submission is spam.
	 */
	public function check( bool $spam, $submission = null ): bool {
		if ( $spam ) {
			return $spam;
		}

		if ( empty( $this->settings->get_section( 'spam' )['honeypot_enabled'] ) ) {
			return false;
		}

		// Only ever asked whether it is empty — the value is neither stored nor
		// printed, so there is nothing for sanitising to protect. The nonce is
		// CF7's, already checked by the time the spam filters run.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$value = isset( $_POST[ self::field() ] ) ? trim( (string) wp_unslash( $_POST[ self::field() ] ) ) : '';

		return '' !== $value;
	}
}
