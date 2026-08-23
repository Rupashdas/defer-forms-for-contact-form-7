<?php
/**
 * A class name of your own on one form.
 *
 * The styling page sets how every form on the site looks. This is the other
 * half: a hook for the one form that has to differ — a narrower contact form in
 * a sidebar, a booking form on a dark page — written in the theme's stylesheet
 * and reached through a name the form carries.
 *
 * On the form element itself rather than a wrapper. `.my-form input` is what
 * somebody expects to write; a wrapper would make it `.my-form .wpcf7-form
 * input` and the extra step would be a surprise every time.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Class {

	private const META = '_cf7e_form_class';

	public function register_hooks(): void {
		add_filter( 'wpcf7_form_class_attr', array( $this, 'add' ) );
	}

	/**
	 * What this form was given, or '' — the stored value, already clean.
	 */
	public static function config( int $form_id ): string {
		return self::sanitize( (string) get_post_meta( $form_id, self::META, true ) );
	}

	/**
	 * Store it, or clear it when there is nothing left to store.
	 *
	 * @return string The sanitised value, as stored.
	 */
	public static function save( int $form_id, string $input ): string {
		$clean = self::sanitize( $input );

		if ( '' !== $clean ) {
			update_post_meta( $form_id, self::META, $clean );
		} else {
			delete_post_meta( $form_id, self::META );
		}

		return $clean;
	}

	/**
	 * Class names, and nothing else.
	 *
	 * This goes straight into a class attribute, so it is an allow-list rather
	 * than an escape: letters, digits, hyphens and underscores, split on spaces.
	 * A quote in here would end the attribute and start writing markup.
	 *
	 * Several are allowed because "narrow dark" is a normal thing to want and
	 * making somebody pick one would send them to a wrapper div instead.
	 */
	private static function sanitize( string $input ): string {
		$names = array();

		foreach ( preg_split( '/\s+/', trim( $input ) ) ?: array() as $name ) {
			$name = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $name );

			// A class cannot begin with a digit, and one that does is silently
			// ignored by every stylesheet that tries to use it.
			if ( '' !== (string) $name && ! preg_match( '/^\d/', (string) $name ) ) {
				$names[] = (string) $name;
			}
		}

		return implode( ' ', array_unique( $names ) );
	}

	/**
	 * Add it to the form CF7 is about to render.
	 *
	 * @param string $class The class attribute CF7 has built so far.
	 */
	public function add( $class ): string {
		$class = (string) $class;
		$form  = self::current_form();

		if ( ! $form ) {
			return $class;
		}

		$mine = self::config( $form->id() );

		return '' === $mine ? $class : $class . ' ' . $mine;
	}

	private static function current_form(): ?object {
		if ( ! class_exists( '\WPCF7_ContactForm' ) ) {
			return null;
		}

		$form = \WPCF7_ContactForm::get_current();

		return $form instanceof \WPCF7_ContactForm ? $form : null;
	}
}
