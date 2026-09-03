<?php
/**
 * Pre-fill any field. A `prefill:SOURCE` option on a form-tag is resolved at
 * render time (URL parameter, cookie, current post, logged-in user, referrer,
 * date) and becomes the field's starting value — so a normal email/text/date
 * field keeps its own type and validation while arriving already filled in.
 *
 * Choice tags (select/checkbox/radio) are skipped on purpose: for those, a
 * form-tag's `values` are the options themselves, not a single value.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Prefill {

	private const OPTION = 'prefill:';

	/** Single-value inputs, where `values[0]` really is the field's value. */
	private const TYPES = array(
		'text',
		'email',
		'url',
		'tel',
		'number',
		'range',
		'date',
		'textarea',
		'password',
		'hidden',
		'dynamictext',
	);

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_tag', array( $this, 'apply' ), 20 );
	}

	/**
	 * @param array<string, mixed>|\WPCF7_FormTag $tag
	 * @return array<string, mixed>|\WPCF7_FormTag
	 */
	public function apply( $tag ) {
		$options = $this->read( $tag, 'options' );
		if ( empty( $options ) ) {
			return $tag;
		}

		$basetype = (string) ( $this->read( $tag, 'basetype' ) ?: rtrim( (string) $this->read( $tag, 'type' ), '*' ) );
		if ( ! in_array( $basetype, self::TYPES, true ) ) {
			return $tag;
		}

		$source = '';
		foreach ( (array) $options as $option ) {
			$option = (string) $option;
			if ( 0 === strpos( $option, self::OPTION ) ) {
				$source = substr( $option, strlen( self::OPTION ) );
				break;
			}
		}

		if ( '' === $source ) {
			return $tag;
		}

		$value = Value_Source::resolve( $source );
		if ( '' === $value ) {
			return $tag;
		}

		// A field that arrives filled in has no use for a placeholder, and CF7
		// reads the same `values[0]` for both — so the resolved value wins.
		$options = array_values(
			array_filter(
				(array) $options,
				static fn( $option ) => 'placeholder' !== $option && 'watermark' !== $option
			)
		);

		return $this->write( $tag, $options, array( $value ) );
	}

	/**
	 * @param array<string, mixed>|\WPCF7_FormTag $tag
	 * @return mixed
	 */
	private function read( $tag, string $key ) {
		if ( is_array( $tag ) ) {
			return $tag[ $key ] ?? null;
		}
		return is_object( $tag ) && isset( $tag->{$key} ) ? $tag->{$key} : null;
	}

	/**
	 * @param array<string, mixed>|\WPCF7_FormTag $tag
	 * @param array<int, string>                  $options
	 * @param array<int, string>                  $values
	 * @return array<string, mixed>|\WPCF7_FormTag
	 */
	private function write( $tag, array $options, array $values ) {
		if ( is_array( $tag ) ) {
			$tag['options'] = $options;
			$tag['values']  = $values;
			$tag['labels']  = $values;
			return $tag;
		}

		if ( is_object( $tag ) ) {
			$tag->options = $options;
			$tag->values  = $values;
			$tag->labels  = $values;
		}
		return $tag;
	}
}
