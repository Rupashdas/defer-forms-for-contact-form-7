<?php
/**
 * Forms as JSON: what travels between two sites, and what is refused on arrival.
 *
 * A CF7 form is a post with five properties and, in our case, two meta rows. All
 * of that is text, so moving one to another site is a file rather than a
 * migration.
 *
 * The reading half is the half that matters. An exported bundle is a file that
 * has been off the site — mailed around, edited in a text editor, downloaded
 * from a forum — so nothing in it is trusted on the way back in: keys that are
 * not on the lists below are dropped rather than passed on, and the ones that
 * stay are cast to the shape their consumer expects before anything is written.
 *
 * Deliberately free of WordPress, so both halves can be checked without one.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Bundle {

	/** Names the file for what it is, so an unrelated JSON is refused early. */
	public const FORMAT = 'cf7-essentials-forms';

	/** Bumped only when a bundle written today would be misread tomorrow. */
	public const VERSION = 1;

	/**
	 * The CF7 properties a bundle may carry.
	 *
	 * An allow-list, because import writes these straight onto a contact form:
	 * anything else in the file is somebody else's idea of what a form is.
	 */
	private const PROPERTIES = array( 'form', 'mail', 'mail_2', 'messages', 'additional_settings' );

	/** The properties above that are arrays of their own, and of what. */
	private const MAIL_KEYS = array( 'subject', 'sender', 'body', 'recipient', 'additional_headers', 'attachments', 'use_html', 'exclude_blank', 'active' );

	/** Mail keys CF7 stores as booleans. The rest are text. */
	private const MAIL_FLAGS = array( 'use_html', 'exclude_blank', 'active' );

	/** Our own post meta, handed to the class that owns each key on the way in. */
	private const META = array( 'redirect', 'steps' );

	/**
	 * More than this is not an export anyone meant to make, and unpacking it
	 * would be the request that runs until the server gives up.
	 */
	private const MAX_FORMS = 200;

	/**
	 * Forms → the bundle that gets written to the file.
	 *
	 * @param array<int, array<string, mixed>> $forms Each one: title, locale, properties, meta.
	 * @return array<string, mixed>
	 */
	public static function pack( array $forms ): array {
		$packed = array();

		foreach ( array_slice( $forms, 0, self::MAX_FORMS ) as $form ) {
			if ( ! is_array( $form ) ) {
				continue;
			}
			$packed[] = array(
				'title'      => (string) ( $form['title'] ?? '' ),
				'locale'     => (string) ( $form['locale'] ?? '' ),
				'properties' => self::clean_properties( (array) ( $form['properties'] ?? array() ) ),
				'meta'       => self::clean_meta( (array) ( $form['meta'] ?? array() ) ),
			);
		}

		return array(
			'format'  => self::FORMAT,
			'version' => self::VERSION,
			'created' => gmdate( 'c' ),
			'forms'   => $packed,
		);
	}

	/**
	 * The bundle from the file → the forms worth trying to create.
	 *
	 * Returns an empty list for anything that is not one of our bundles rather
	 * than guessing at it: a file that does not say what it is has no shape we
	 * know how to read.
	 *
	 * @param array<string, mixed> $bundle Decoded JSON.
	 * @return array<int, array<string, mixed>>
	 */
	public static function unpack( array $bundle ): array {
		if ( self::FORMAT !== ( $bundle['format'] ?? '' ) ) {
			return array();
		}

		// Forward-compatible on purpose: a file from a later version is read as
		// far as this version understands it, and whatever it carries that we do
		// not know about is dropped by the allow-lists anyway.
		if ( (int) ( $bundle['version'] ?? 0 ) < 1 ) {
			return array();
		}

		$forms = $bundle['forms'] ?? null;
		if ( ! is_array( $forms ) ) {
			return array();
		}

		$out = array();

		foreach ( array_slice( $forms, 0, self::MAX_FORMS ) as $form ) {
			if ( ! is_array( $form ) ) {
				continue;
			}

			$properties = self::clean_properties( (array) ( $form['properties'] ?? array() ) );

			// A form with no template is not a form. Importing it would leave an
			// empty post whose only effect is a row in a list.
			if ( '' === trim( (string) ( $properties['form'] ?? '' ) ) ) {
				continue;
			}

			$out[] = array(
				'title'      => self::title( (string) ( $form['title'] ?? '' ) ),
				'locale'     => (string) ( $form['locale'] ?? '' ),
				'properties' => $properties,
				'meta'       => self::clean_meta( (array) ( $form['meta'] ?? array() ) ),
			);
		}

		return $out;
	}

	/**
	 * A title that will still be a title after the trip.
	 *
	 * Blank is the case that matters: WordPress stores an untitled form quite
	 * happily, and the forms list then shows a row with nothing to click.
	 */
	private static function title( string $title ): string {
		$title = trim( (string) preg_replace( '/\s+/', ' ', $title ) );

		if ( '' === $title ) {
			return 'Imported form';
		}

		return mb_substr( $title, 0, 200 );
	}

	/**
	 * @param array<string, mixed> $properties
	 * @return array<string, mixed>
	 */
	private static function clean_properties( array $properties ): array {
		$out = array();

		foreach ( self::PROPERTIES as $key ) {
			if ( ! array_key_exists( $key, $properties ) ) {
				continue;
			}

			$value = $properties[ $key ];

			if ( 'mail' === $key || 'mail_2' === $key ) {
				$out[ $key ] = self::clean_mail( (array) $value );
				continue;
			}

			// `messages` is a flat map of message id => text, and CF7 reads only
			// the ids it knows, so the pairs travel as they are.
			if ( 'messages' === $key ) {
				$out[ $key ] = self::strings( (array) $value );
				continue;
			}

			$out[ $key ] = is_scalar( $value ) ? (string) $value : '';
		}

		return $out;
	}

	/**
	 * One mail template.
	 *
	 * `attachments` names files on the server it came from, which will not be
	 * the files on the server it lands on — CF7 resolves that at send time, and
	 * a path that matches nothing simply sends no attachment. It travels anyway,
	 * because dropping it would silently change what an imported form does.
	 *
	 * @param array<string, mixed> $mail
	 * @return array<string, mixed>
	 */
	private static function clean_mail( array $mail ): array {
		$out = array();

		foreach ( self::MAIL_KEYS as $key ) {
			if ( ! array_key_exists( $key, $mail ) ) {
				continue;
			}

			if ( in_array( $key, self::MAIL_FLAGS, true ) ) {
				$out[ $key ] = (bool) $mail[ $key ];
				continue;
			}

			$out[ $key ] = is_scalar( $mail[ $key ] ) ? (string) $mail[ $key ] : '';
		}

		return $out;
	}

	/**
	 * Our own settings, kept whole.
	 *
	 * Not sanitised here on purpose: Redirect::save() and Steps::save() each own
	 * the rules for their own key, and a second opinion in this file would be
	 * the copy that goes stale.
	 *
	 * @param array<string, mixed> $meta
	 * @return array<string, mixed>
	 */
	private static function clean_meta( array $meta ): array {
		$out = array();

		foreach ( self::META as $key ) {
			if ( isset( $meta[ $key ] ) && is_array( $meta[ $key ] ) ) {
				$out[ $key ] = $meta[ $key ];
			}
		}

		return $out;
	}

	/**
	 * A map of string => string, with anything else in it left behind.
	 *
	 * @param array<mixed, mixed> $values
	 * @return array<string, string>
	 */
	private static function strings( array $values ): array {
		$out = array();

		foreach ( $values as $key => $value ) {
			if ( is_string( $key ) && is_scalar( $value ) ) {
				$out[ $key ] = (string) $value;
			}
		}

		return $out;
	}
}
