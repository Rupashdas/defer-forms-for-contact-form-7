<?php
/**
 * The required-field check shared by our custom form-tags.
 *
 * CF7 generates validation rules from its own schema for the tags it ships, but
 * a tag we register ourselves gets none — so each of our fields has to say "this
 * one is empty" for itself. Five classes had written the same eight lines; this
 * is that code, once.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

trait Required_Check {

	/**
	 * Invalidate the tag when it is required and nothing was submitted.
	 *
	 * @param \WPCF7_Validation                   $result
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 * @return \WPCF7_Validation
	 */
	public function validate( $result, $tag ) {
		$tag = new \WPCF7_FormTag( $tag );

		if ( ! $tag->is_required() ) {
			return $result;
		}

		// Multi-value fields post an array; a list of empty strings is still empty.
		$raw    = isset( $_POST[ $tag->name ] ) ? wp_unslash( $_POST[ $tag->name ] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
		$values = array_filter(
			array_map(
				// Nothing stops a caller posting `field[a][b]=x`, and casting that
				// nested array to a string is a warning on every submission. A value
				// that is not a scalar was never an answer to this field, so it
				// counts as nothing rather than as something.
				static fn( $value ) => is_scalar( $value ) ? trim( (string) $value ) : '',
				is_array( $raw ) ? $raw : array( $raw )
			),
			static fn( string $value ): bool => '' !== $value
		);

		if ( empty( $values ) ) {
			$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );
		}

		return $result;
	}
}
