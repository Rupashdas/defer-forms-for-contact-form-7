<?php
/**
 * The builder's flat item list → CF7 form-tag markup.
 *
 * The writing half of the round-trip; Form_Parser reads it back and Form_Markup
 * holds what they must agree on.
 *
 * Everything a user typed passes through here on its way into a stored template,
 * so this is where escaping happens — see Form_Markup::escape_text(), and
 * option_value() for the characters that would end a tag early.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Serializer {

	/**
	 * Item list → CF7 form-tag markup. `html` items pass through verbatim.
	 *
	 * @param array<int, array<string, mixed>> $items
	 */
	public static function serialize( array $items ): string {
		$parts = array();
		foreach ( $items as $item ) {
			// Every serializer below takes an array. A stray scalar in the list
			// would be a TypeError, i.e. a fatal on the save endpoint.
			if ( ! is_array( $item ) ) {
				continue;
			}
			$kind = $item['kind'] ?? 'field';
			if ( 'html' === $kind ) {
				$parts[] = (string) ( $item['html'] ?? '' );
				continue;
			}
			if ( 'content' === $kind ) {
				$parts[] = self::serialize_content( $item );
				continue;
			}
			if ( 'row' === $kind ) {
				$parts[] = self::serialize_row( $item );
				continue;
			}
			if ( 'pagebreak' === $kind ) {
				$parts[] = self::serialize_step( $item );
				continue;
			}
			$parts[] = self::serialize_field( $item );
		}
		// Not `'strlen'`: it answers a length, not a yes or no, and PHP 8 is
		// strict about what it accepts as a string in the first place.
		$written = array_filter( array_map( 'trim', $parts ), static fn( string $part ): bool => '' !== $part );

		return trim( implode( "\n\n", $written ) );
	}

	/**
	 * One field item → one CF7 form-tag, wrapped in a `<label>` when it has a
	 * caption.
	 *
	 * @param array<string, mixed> $field
	 */
	private static function serialize_field( array $field ): string {
		$type     = (string) preg_replace( '/[^a-z0-9_]/', '', strtolower( (string) ( $field['type'] ?? 'text' ) ) );
		$required = ! empty( $field['required'] );
		$name     = (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $field['name'] ?? '' ) );

		// Acceptance is its own shape: consent text lives between the tags, it's
		// required unless `optional`, and it isn't wrapped in a <label>.
		if ( 'acceptance' === $type ) {
			return self::wrap_condition( $field, self::serialize_acceptance( $field, $name, $required ) );
		}

		// Only some tags have a starred variant registered. `[radio*]` in
		// particular does not exist — CF7 always applies a required rule to
		// radio groups — and an unregistered tag would print as literal text.
		$star_ok = in_array(
			$type,
			array( 'text', 'email', 'url', 'tel', 'textarea', 'number', 'range', 'date', 'select', 'checkbox', 'file', 'password', 'rating', 'country', 'dynamictext', 'product' ),
			true
		);

		$tag_parts = array( $type . ( $required && $star_ok ? '*' : '' ) );

		if ( '' !== $name ) {
			$tag_parts[] = $name;
		}

		$options = (array) ( $field['options'] ?? array() );

		// Radio/checkbox: CF7 wraps each option in its own <label> only with this
		// flag — without it, clicking option text selects the first option.
		if ( in_array( $type, array( 'radio', 'checkbox' ), true ) ) {
			$options['use_label_element'] = true;
		}

		// Placeholder is emitted CF7-native: a bare `placeholder` flag plus the
		// text as a quoted value — never `placeholder:"…"`.
		$placeholder = trim( (string) ( $field['placeholder'] ?? ( $options['placeholder'] ?? '' ) ) );
		unset( $options['placeholder'] );
		$placeholder_ok = in_array( $type, array( 'text', 'email', 'tel', 'url', 'number', 'date', 'password', 'textarea' ), true );
		// Range has no placeholder but does take a default thumb value.
		// A hidden field is nothing but its value, so it must carry one too.
		$default_ok = $placeholder_ok || in_array( $type, array( 'range', 'dynamictext', 'hidden' ), true );

		// Class → one `class:` token per word (CF7 supports repeats). A styled
		// date field also carries the deferforms-fp marker the front-end picker reads.
		$classes = array_values( array_filter( preg_split( '/\s+/', trim( (string) ( $options['class'] ?? '' ) ) ) ?: array() ) );
		unset( $options['class'] );
		if ( 'date' === $type && 'native' !== ( $field['picker'] ?? 'styled' ) ) {
			$classes[] = 'deferforms-fp';
		}
		// Choice layout rides along as a marker class CF7 puts on the control.
		if ( in_array( $type, array( 'checkbox', 'radio' ), true ) ) {
			$layout = (string) ( $field['layout'] ?? 'list' );
			if ( in_array( $layout, array( 'inline', 'cards' ), true ) ) {
				$classes[] = 'deferforms-' . $layout;
			}
		}
		// Same for the search box on dropdowns.
		if ( in_array( $type, array( 'select', 'country' ), true ) && ! empty( $field['searchable'] ) ) {
			$classes[] = 'deferforms-search';
		}
		// A phone format carries punctuation and spaces, so it cannot ride as a
		// CF7 option value; base64url makes it class-safe. The digits-only marker
		// is implied by a format but also stands on its own.
		if ( 'tel' === $type ) {
			$format = trim( (string) ( $field['telformat'] ?? '' ) );
			if ( '' !== $format ) {
				$classes[] = Form_Markup::TEL_FORMAT . rtrim( strtr( base64_encode( $format ), '+/', '-_' ), '=' );
			}
			if ( ! empty( $field['digitsonly'] ) ) {
				$classes[] = Form_Markup::TEL_DIGITS;
			}
		}

		foreach ( $options as $option_name => $raw_value ) {
			$option_name = (string) $option_name;

			/*
			 * CF7's length spec — `40`, `40/100`, `40x10` — is a bare token in
			 * the tag, so the parser files it under options along with the real
			 * flags. It is not a name, and the sanitiser below strips the slash
			 * out of it: `[text your-name 40/100]` came back as
			 * `[text your-name 40100]`, turning a field forty characters wide
			 * with a hundred-character limit into one with no limit at all.
			 */
			if ( true === $raw_value && preg_match( '#^\d+(?:[/x]\d+)?$#', $option_name ) ) {
				$tag_parts[] = $option_name;
				continue;
			}

			$option_name = (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', $option_name );
			if ( '' === $option_name ) {
				continue;
			}

			/*
			 * A flag option is written bare: `readonly`, not `readonly:1`.
			 *
			 * Only a real boolean. The parser writes `true` for a bare token and
			 * a string for `name:value`, so there was never a reason to read '1'
			 * as a flag — and doing so threw the value away from every option
			 * that legitimately holds one. `[number qty min:1 max:10]` came back
			 * as `[number qty min max:10]`: the minimum silently gone from a
			 * quantity field, on a form the builder was only asked to open.
			 */
			if ( true === $raw_value ) {
				$tag_parts[] = $option_name;
			} elseif ( '' !== $raw_value && null !== $raw_value ) {
				$clean_value = self::option_value( (string) $raw_value );
				if ( '' !== $clean_value ) {
					$tag_parts[] = $option_name . ':' . $clean_value;
				}
			}
		}

		foreach ( $classes as $class_name ) {
			$class_name = sanitize_html_class( $class_name );
			if ( '' !== $class_name ) {
				$tag_parts[] = 'class:' . $class_name;
			}
		}

		if ( '' !== $placeholder && $placeholder_ok ) {
			$tag_parts[] = 'placeholder';
		}

		if ( 'submit' === $type && ! empty( $field['label'] ) ) {
			$tag_parts[] = '"' . str_replace( '"', '', (string) $field['label'] ) . '"';
		} elseif ( '' !== $placeholder && $placeholder_ok ) {
			$tag_parts[] = '"' . str_replace( '"', '', $placeholder ) . '"';
		} else {
			$default_value = trim( str_replace( '"', '', (string) ( $field['default'] ?? '' ) ) );

			// Left blank, CF7 parks a range at the midpoint of min/max — a value
			// the visitor never chose. Write the minimum out instead, so the tag
			// says what it means and the front-end matches the builder preview.
			if ( 'range' === $type && '' === $default_value ) {
				$minimum       = trim( (string) ( ( (array) ( $field['options'] ?? array() ) )['min'] ?? '' ) );
				$default_value = '' !== $minimum ? $minimum : '0';
			}

			if ( '' !== $default_value && $default_ok ) {
				$tag_parts[] = '"' . $default_value . '"';
			}
			foreach ( (array) ( $field['choices'] ?? array() ) as $choice ) {
				$tag_parts[] = '"' . str_replace( '"', '', (string) $choice ) . '"';
			}
		}

		$tag       = '[' . implode( ' ', $tag_parts ) . ']';
		$labelable = in_array( $type, array( 'text', 'email', 'tel', 'url', 'number', 'range', 'date', 'password', 'textarea', 'select', 'checkbox', 'radio', 'file', 'rating', 'country', 'dynamictext', 'product' ), true );

		// A hidden dynamic field renders nothing, so a caption would dangle.
		if ( 'dynamictext' === $type && ! empty( $field['options']['hidden'] ) ) {
			$labelable = false;
		}
		$label = trim( (string) ( $field['label'] ?? '' ) );

		if ( $labelable && '' !== $label ) {
			// Escaped the same way a content block's text is, and for the same
			// reason: a caption is a caption, not a place to open a tag. The parse
			// side decodes it again, so `a < b` survives a round-trip intact.
			$label = Form_Markup::escape_text( $label );

			// A <label> forwards clicks to the first control inside it, breaking
			// radio/checkbox option selection and file dropzones — those get a
			// <fieldset>/<legend> caption instead.
			if ( in_array( $type, array( 'radio', 'checkbox', 'file', 'rating' ), true ) ) {
				return self::wrap_condition( $field, "<fieldset class=\"deferforms-fieldset\"><legend>{$label}</legend>\n{$tag}</fieldset>" );
			}
			return self::wrap_condition( $field, "<label>{$label}\n{$tag}</label>" );
		}
		return self::wrap_condition( $field, $tag );
	}

	/**
	 * A `key:value` option's value, cut down to what the tag syntax can carry.
	 *
	 * A form-tag ends at the first `]` and its options are split on whitespace, so
	 * a value holding either one does not travel — it truncates the tag, and every
	 * field after it stops rendering. Stripping is what already happened to `"`
	 * here; this only widens it to the other two characters that break the tag.
	 */
	private static function option_value( string $value ): string {
		return trim( (string) preg_replace( '/[\s"\[\]]+/', '', $value ) );
	}

	/**
	 * One acceptance item → `[acceptance name optional default:on] consent [/acceptance]`.
	 *
	 * @param array<string, mixed> $field
	 */
	private static function serialize_acceptance( array $field, string $name, bool $required ): string {
		$tag_parts = array( 'acceptance' );
		if ( '' !== $name ) {
			$tag_parts[] = $name;
		}
		if ( ! $required ) {
			$tag_parts[] = 'optional';
		}
		if ( 'on' === ( $field['default'] ?? '' ) ) {
			$tag_parts[] = 'default:on';
		}

		$options = (array) ( $field['options'] ?? array() );
		$id      = (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $options['id'] ?? '' ) );
		if ( '' !== $id ) {
			$tag_parts[] = 'id:' . $id;
		}
		foreach ( array_filter( preg_split( '/\s+/', trim( (string) ( $options['class'] ?? '' ) ) ) ?: array() ) as $class_name ) {
			$class_name = sanitize_html_class( $class_name );
			if ( '' !== $class_name ) {
				$tag_parts[] = 'class:' . $class_name;
			}
		}

		$tag  = '[' . implode( ' ', $tag_parts ) . ']';
		$text = Form_Markup::escape_text( trim( (string) ( $field['label'] ?? '' ) ) );

		return '' !== $text ? "{$tag} {$text} [/acceptance]" : $tag;
	}

	/**
	 * Wrap a field's markup in a `[deferforms_if]` region when it carries a condition.
	 * The marker is an unregistered tag, so CF7 leaves it literal and the
	 * front-end converts it to a `data-`flagged div.
	 *
	 * @param array<string, mixed> $field The field item, which may carry a `condition`.
	 * @param string               $html  The field's markup, to be wrapped.
	 */
	private static function wrap_condition( array $field, string $html ): string {
		$condition = $field['condition'] ?? null;
		if ( ! is_array( $condition ) ) {
			return $html;
		}

		// Groups are OR'd; rules inside a group are AND'd → (A and B) or (C and D).
		$clean_groups = array();
		foreach ( (array) ( $condition['groups'] ?? array() ) as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}
			$clean_rules = array();
			foreach ( (array) ( $group['rules'] ?? array() ) as $rule ) {
				if ( ! is_array( $rule ) ) {
					continue;
				}
				$watched_field = (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $rule['field'] ?? '' ) );
				if ( '' === $watched_field ) {
					continue;
				}
				$clean_rules[] = array(
					'field'    => $watched_field,
					'operator' => (string) preg_replace( '/[^a-z]/', '', strtolower( (string) ( $rule['operator'] ?? 'eq' ) ) ),
					'value'    => (string) ( $rule['value'] ?? '' ),
				);
			}
			if ( ! empty( $clean_rules ) ) {
				$clean_groups[] = array( 'rules' => $clean_rules );
			}
		}

		if ( empty( $clean_groups ) ) {
			return $html;
		}

		$action = 'hide' === ( $condition['action'] ?? 'show' ) ? 'hide' : 'show';
		// Free-text values mean the payload is base64-encoded JSON — it can never
		// contain a quote or `]` that would break the marker.
		$encoded_groups = base64_encode( (string) wp_json_encode( $clean_groups ) );

		return "[deferforms_if action=\"{$action}\" groups=\"{$encoded_groups}\"]\n{$html}\n[/deferforms_if]";
	}

	/**
	 * A grid row → `[deferforms_row cols="N"][deferforms_col] … [/deferforms_col] … [/deferforms_row]`.
	 * Each column wraps its own serialized items. The markers are unregistered
	 * tags, so CF7 leaves them literal and Grid converts them to divs.
	 *
	 * @param array<string, mixed> $row
	 */
	private static function serialize_row( array $row ): string {
		$columns = array();
		if ( isset( $row['columns'] ) && is_array( $row['columns'] ) ) {
			$columns = $row['columns'];
		} elseif ( isset( $row['children'] ) ) {
			$columns = array( (array) $row['children'] );
		}

		$columns = array_slice( $columns, 0, 4 );
		if ( empty( $columns ) ) {
			$columns = array( array() );
		}

		$cells = array();
		foreach ( $columns as $col ) {
			$inner   = self::serialize( (array) $col );
			$cells[] = "[deferforms_col]\n{$inner}\n[/deferforms_col]";
		}

		return '[deferforms_row cols="' . count( $columns ) . "\"]\n" . implode( "\n", $cells ) . "\n[/deferforms_row]";
	}

	/**
	 * One setting off a fixed list, or the fallback when it is anything else.
	 *
	 * Each of these used to be written inline as
	 *
	 *     in_array( $item[ $key ] ?? $fallback, $allowed, true ) ? (string) $item[ $key ] : $fallback
	 *
	 * where the null coalesce covers the test and not the branch it guards. With
	 * the key absent the test passes on a default the branch then discards,
	 * reading the missing key again and casting null — so the fallback never ran
	 * and the value came out empty. A heading saved without one lost its tag
	 * name: `< class="deferforms-h deferforms-h- deferforms-align-">`.
	 *
	 * @param array<string, mixed> $item
	 * @param array<int, string>   $allowed
	 */
	private static function one_of( array $item, string $key, array $allowed, string $fallback ): string {
		$value = (string) ( $item[ $key ] ?? '' );

		return in_array( $value, $allowed, true ) ? $value : $fallback;
	}
	/**
	 * A content block (heading/paragraph/divider/spacer) → its HTML, carrying
	 * deferforms- classes the front-end styles.
	 *
	 * @param array<string, mixed> $item
	 */
	private static function serialize_content( array $item ): string {
		$type  = (string) ( $item['type'] ?? '' );
		$align = self::one_of( $item, 'align', array( 'left', 'center', 'right' ), 'left' );
		$text  = Form_Markup::escape_text( (string) ( $item['text'] ?? '' ) );

		if ( 'heading' === $type ) {
			$level = self::one_of( $item, 'level', array( 'h2', 'h3', 'h4' ), 'h2' );
			return "<{$level} class=\"deferforms-h deferforms-h-{$level} deferforms-align-{$align}\">{$text}</{$level}>";
		}
		if ( 'paragraph' === $type ) {
			$size = self::one_of( $item, 'size', array( 'sm', 'md', 'lg' ), 'md' );
			return "<p class=\"deferforms-p deferforms-p-{$size} deferforms-align-{$align}\">{$text}</p>";
		}
		if ( 'divider' === $type ) {
			$style     = self::one_of( $item, 'style', array( 'solid', 'dashed', 'dotted' ), 'solid' );
			$tier      = self::one_of( $item, 'tier', array( 'subtle', 'normal', 'strong' ), 'subtle' );
			$thickness = max( 1, min( 6, (int) ( $item['thickness'] ?? 1 ) ) );
			return "<hr class=\"deferforms-hr deferforms-hr-{$style} deferforms-hr-{$tier}\" style=\"border-top-width:{$thickness}px\" />";
		}
		if ( 'spacer' === $type ) {
			$height = max( 0, min( 200, (int) ( $item['height'] ?? 16 ) ) );
			return "<div class=\"deferforms-spacer\" style=\"height:{$height}px\" aria-hidden=\"true\"></div>";
		}
		return '';
	}

	/**
	 * A page break and whatever settings it was given.
	 *
	 * @param array<string, mixed> $item
	 */
	private static function serialize_step( array $item ): string {
		$tag_parts = array( 'deferforms_pagebreak' );

		foreach ( Form_Markup::STEP_ATTRS as $key ) {
			// A quote would close the attribute early, so it never goes in.
			$value = trim( str_replace( '"', '', (string) ( $item[ $key ] ?? '' ) ) );
			if ( '' !== $value ) {
				$tag_parts[] = $key . '="' . $value . '"';
			}
		}

		return '[' . implode( ' ', $tag_parts ) . ']';
	}
}
