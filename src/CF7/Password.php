<?php
/**
 * Password field. Contact Form 7 ships no `[password]` form-tag, so a builder
 * form using one would print the tag as literal text. We register it here and
 * render a masked text input that honours the same options as CF7's text field.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Password {

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_password', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_password*', array( $this, 'validate' ), 10, 2 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'password', 'password*' ),
			array( $this, 'render' ),
			array( 'name-attr' => true )
		);
	}

	/**
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 */
	public function render( $tag ): string {
		$tag = new \WPCF7_FormTag( $tag );
		if ( '' === $tag->name ) {
			return '';
		}

		$validation_error = wpcf7_get_validation_error( $tag->name );
		$class            = wpcf7_form_controls_class( $tag->type, 'wpcf7-text' );
		if ( $validation_error ) {
			$class .= ' wpcf7-not-valid';
		}

		$atts = array(
			'type'         => 'password',
			'name'         => $tag->name,
			'size'         => $tag->get_size_option( '40' ),
			'maxlength'    => $tag->get_maxlength_option( '400' ),
			'minlength'    => $tag->get_minlength_option(),
			'class'        => $tag->get_class_option( $class ),
			'id'           => $tag->get_id_option(),
			'tabindex'     => $tag->get_option( 'tabindex', 'signed_int', true ),
			'autocomplete' => $tag->get_autocomplete_option(),
		);

		if ( $atts['maxlength'] && $atts['minlength'] && $atts['maxlength'] < $atts['minlength'] ) {
			unset( $atts['maxlength'], $atts['minlength'] );
		}

		if ( $tag->is_required() ) {
			$atts['aria-required'] = 'true';
		}
		$atts['aria-invalid'] = $validation_error ? 'true' : 'false';

		$value = (string) reset( $tag->values );
		if ( $tag->has_option( 'placeholder' ) || $tag->has_option( 'watermark' ) ) {
			$atts['placeholder'] = $value;
			$value               = '';
		}
		// A password is never re-filled from a failed submission on purpose.
		$atts['value'] = $tag->get_default_option( $value );

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><input %2$s />%3$s</span>',
			esc_attr( $tag->name ),
			wpcf7_format_atts( $atts ),
			$validation_error
		);
	}

	/**
	 * @param \WPCF7_Validation                   $result
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 * @return \WPCF7_Validation
	 */
	public function validate( $result, $tag ) {
		$tag   = new \WPCF7_FormTag( $tag );
		$value = isset( $_POST[ $tag->name ] ) ? trim( (string) wp_unslash( $_POST[ $tag->name ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput

		if ( $tag->is_required() && '' === $value ) {
			$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );
			return $result;
		}

		if ( '' !== $value ) {
			$min = $tag->get_minlength_option();
			$max = $tag->get_maxlength_option();
			$len = function_exists( 'wpcf7_count_code_units' ) ? wpcf7_count_code_units( $value ) : strlen( $value );

			if ( $min && $len < (int) $min ) {
				$result->invalidate( $tag, wpcf7_get_message( 'invalid_too_short' ) );
			} elseif ( $max && $len > (int) $max ) {
				$result->invalidate( $tag, wpcf7_get_message( 'invalid_too_long' ) );
			}
		}

		return $result;
	}
}
