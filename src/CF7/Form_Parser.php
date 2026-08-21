<?php
/**
 * CF7 form-tag markup → the builder's flat item list.
 *
 * The reading half of the round-trip; Form_Serializer is the writing half and
 * Form_Markup holds what they must agree on. Both were one 1100-line class,
 * which was more than anyone could hold in their head at once.
 *
 * Each item it produces has a `kind`:
 *   - 'field':     a CF7 form-tag (text, email, select, …)
 *   - 'content':   a layout block (heading/paragraph/divider/spacer)
 *   - 'row':       a grid row wrapping child items in columns
 *   - 'pagebreak': a multi-step page break ([cf7nl_pagebreak])
 *   - 'html':      free-form markup between tags (preserved verbatim)
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Form_Parser {

	/**
	 * Markup → item list.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function parse( string $markup ): array {
		$out = array();
		foreach ( self::split_rows( $markup ) as $seg ) {
			if ( 'row' === $seg['type'] ) {
				$out[] = array(
					'kind'    => 'row',
					'columns' => self::split_columns( $seg['inner'] ),
				);
				continue;
			}
			foreach ( self::parse_items( $seg['text'] ) as $item ) {
				$out[] = $item;
			}
		}
		return $out;
	}

	/**
	 * Parse a markup fragment (no row wrappers) into a flat item list.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function parse_items( string $markup ): array {
		$out = array();
		foreach ( self::split_conditions( $markup ) as $seg ) {
			$items = self::absorb_content_blocks(
				self::absorb_fieldset_wrappers( self::absorb_label_wrappers( self::parse_flat( $seg['text'] ) ) )
			);
			if ( isset( $seg['cond'] ) ) {
				foreach ( $items as &$item ) {
					if ( 'field' === ( $item['kind'] ?? '' ) ) {
						$item['condition'] = $seg['cond'];
					}
				}
				unset( $item );
			}
			foreach ( $items as $item ) {
				$out[] = $item;
			}
		}
		return $out;
	}

	/**
	 * Split markup into ordered segments, peeling out conditional regions
	 * (`[cf7nl_if field="…" op="…" value="…"] … [/cf7nl_if]`). A plain segment
	 * carries only `text`; a conditional segment also carries `cond`.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function split_conditions( string $markup ): array {
		$out = array();
		$pos = 0;

		if ( preg_match_all( '/\[cf7nl_if\s+([^\]]*)\](.*?)\[\/cf7nl_if\]/s', $markup, $matches, PREG_OFFSET_CAPTURE ) ) {
			foreach ( $matches[0] as $i => $whole ) {
				$start = (int) $whole[1];
				if ( $start > $pos ) {
					$out[] = array( 'text' => substr( $markup, $pos, $start - $pos ) );
				}
				$out[] = array(
					'cond' => self::parse_condition_attrs( (string) $matches[1][ $i ][0] ),
					'text' => (string) $matches[2][ $i ][0],
				);
				$pos   = $start + strlen( (string) $whole[0] );
			}
		}

		$tail = substr( $markup, $pos );
		if ( '' !== trim( $tail ) ) {
			$out[] = array( 'text' => $tail );
		}

		return $out;
	}

	/**
	 * Read a page break's settings off its opening tag.
	 *
	 * @return array<string, string>
	 */
	private static function parse_step_attrs( string $args ): array {
		$out = array();

		foreach ( Form_Markup::STEP_ATTRS as $key ) {
			if ( preg_match( '/\b' . $key . '="([^"]*)"/', $args, $match ) ) {
				$out[ $key ] = $match[1];
			}
		}

		return $out;
	}

	/**
	 * Read the `field`/`op`/`value` attributes off a `[cf7nl_if …]` opening tag.
	 *
	 * @return array<string, string>
	 */
	private static function parse_condition_attrs( string $attrs ): array {
		$get = static function ( string $key ) use ( $attrs ): string {
			return preg_match( '/\b' . $key . '="([^"]*)"/', $attrs, $match ) ? $match[1] : '';
		};

		$groups  = array();
		$decoded = json_decode( (string) base64_decode( $get( 'groups' ), true ), true );
		if ( is_array( $decoded ) ) {
			foreach ( $decoded as $group ) {
				if ( ! is_array( $group ) ) {
					continue;
				}
				$rules = array();
				foreach ( (array) ( $group['rules'] ?? array() ) as $rule ) {
					if ( ! is_array( $rule ) ) {
						continue;
					}
					// Cut to the same shape wrap_condition() writes. The payload is
					// base64 inside a template anyone with the CF7 editor can
					// hand-edit, and the field name reaches the browser as part of
					// a `[name="…"]` selector — a quote or bracket in it throws,
					// and conditional logic stops working for the whole form.
					$rules[] = array(
						'field'    => (string) preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) ( $rule['field'] ?? '' ) ),
						'operator' => (string) preg_replace( '/[^a-z]/', '', strtolower( (string) ( $rule['operator'] ?? 'eq' ) ) ),
						'value'    => (string) ( $rule['value'] ?? '' ),
					);
				}
				$groups[] = array( 'rules' => $rules );
			}
		}

		return array(
			'action' => 'hide' === $get( 'action' ) ? 'hide' : 'show',
			'groups' => $groups,
		);
	}

	/**
	 * Split markup into ordered segments — plain markup and grid-row regions
	 * (`[cf7nl_row cols="N"] … [/cf7nl_row]`). Rows don't nest.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function split_rows( string $markup ): array {
		$out = array();
		$pos = 0;

		if ( preg_match_all( '/\[cf7nl_row(?:\s+cols="(\d+)")?\](.*?)\[\/cf7nl_row\]/s', $markup, $matches, PREG_OFFSET_CAPTURE ) ) {
			foreach ( $matches[0] as $i => $whole ) {
				$start = (int) $whole[1];
				if ( $start > $pos ) {
					$out[] = array(
						'type' => 'markup',
						'text' => substr( $markup, $pos, $start - $pos ),
					);
				}
				$out[] = array(
					'type'  => 'row',
					'cols'  => '' !== $matches[1][ $i ][0] ? max( 1, min( 4, (int) $matches[1][ $i ][0] ) ) : 2,
					'inner' => (string) $matches[2][ $i ][0],
				);
				$pos   = $start + strlen( (string) $whole[0] );
			}
		}

		$tail = substr( $markup, $pos );
		if ( '' !== trim( $tail ) ) {
			$out[] = array(
				'type' => 'markup',
				'text' => $tail,
			);
		}

		return $out;
	}

	/**
	 * Split a row's inner markup into per-column item lists by reading
	 * `[cf7nl_col] … [/cf7nl_col]` segments. A legacy row with no column markers
	 * collapses into a single column.
	 *
	 * @return array<int, array<int, array<string, mixed>>>
	 */
	private static function split_columns( string $inner ): array {
		$columns = array();

		if ( preg_match_all( '/\[cf7nl_col\](.*?)\[\/cf7nl_col\]/s', $inner, $matches ) ) {
			foreach ( $matches[1] as $cell ) {
				$columns[] = self::parse_items( $cell );
			}
		}

		if ( empty( $columns ) ) {
			$columns[] = self::parse_items( $inner );
		}

		return $columns;
	}

	/**
	 * Walk the markup, emitting a `field` item for every `[tag …]` and an
	 * `html` item for any markup between tags.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function parse_flat( string $markup ): array {
		$out = array();

		// Mask "…quoted…" segments so a `]` inside a quoted value can't end a
		// tag early. Restored before each piece is stored.
		$quoted = array();
		$masked = preg_replace_callback(
			'/"([^"]*)"/',
			static function ( $match ) use ( &$quoted ) {
				$quoted[] = $match[0];
				return '%%QS' . ( count( $quoted ) - 1 ) . '%%';
			},
			$markup
		);
		if ( ! is_string( $masked ) ) {
			$masked = $markup;
		}

		$restore = static function ( string $text ) use ( $quoted ): string {
			return (string) preg_replace_callback(
				'/%%QS(\d+)%%/',
				static fn( $match ) => $quoted[ (int) $match[1] ] ?? $match[0],
				$text
			);
		};

		$pattern  = '/\[([a-z][a-z0-9_]*)\*?(?:\s+([^\]]*))?\]/i';
		$last_end = 0;

		preg_match_all( $pattern, $masked, $matches, PREG_OFFSET_CAPTURE );

		foreach ( $matches[0] as $i => $match ) {
			$start = (int) $match[1];

			// Any markup sitting before this tag becomes an html item.
			if ( $start > $last_end ) {
				$between = $restore( substr( $masked, $last_end, $start - $last_end ) );
				if ( '' !== trim( $between ) ) {
					$out[] = array(
						'kind' => 'html',
						'html' => $between,
					);
				}
			}

			$tag      = strtolower( $matches[1][ $i ][0] );
			$args     = trim( $restore( (string) $matches[2][ $i ][0] ) );
			$required = false !== strpos( $match[0], $matches[1][ $i ][0] . '*' );

			$last_end = $start + strlen( (string) $match[0] );

			// Multi-step page break is its own item, not a field. Its settings
			// ride as quoted attributes, the same way a conditional group's do.
			if ( 'cf7nl_pagebreak' === $tag ) {
				$out[] = array_merge( array( 'kind' => 'pagebreak' ), self::parse_step_attrs( $args ) );
				continue;
			}

			// Acceptance: consent text sits between the tags; required unless `optional`.
			if ( 'acceptance' === $tag ) {
				$field             = self::parse_args( $tag, $args );
				$field['kind']     = 'field';
				$field['type']     = 'acceptance';
				$field['required'] = empty( $field['options']['optional'] );
				if ( 'on' === ( $field['options']['default'] ?? '' ) ) {
					$field['default'] = 'on';
				}
				unset( $field['options']['optional'], $field['options']['default'] );

				$close = strpos( $masked, '[/acceptance]', $last_end );
				if ( false !== $close ) {
					$text = Form_Markup::decode_text( trim( $restore( substr( $masked, $last_end, $close - $last_end ) ) ) );
					if ( '' !== $text ) {
						$field['label'] = $text;
					}
					$last_end = $close + strlen( '[/acceptance]' );
				}

				$out[] = $field;
				continue;
			}

			$field         = self::parse_args( $tag, $args );
			$field['kind'] = 'field';
			$field['type'] = $tag;
			// Neither tag has a starred variant, and neither needs one: CF7 applies
			// a required rule to every radio group, and a quiz is failed by its own
			// validation filter when the answer is missing.
			$field['required'] = in_array( $tag, array( 'radio', 'quiz' ), true ) ? true : $required;
			$out[]             = $field;
		}

		// Any markup after the last tag.
		$tail = $restore( substr( $masked, $last_end ) );
		if ( '' !== trim( $tail ) ) {
			$out[] = array(
				'kind' => 'html',
				'html' => $tail,
			);
		}

		return $out;
	}

	/**
	 * Parse a tag's argument string into name, options, choices, placeholder
	 * and default.
	 *
	 * @return array<string, mixed>
	 */
	private static function parse_args( string $tag, string $args ): array {
		$out = array(
			'name'        => '',
			'options'     => array(),
			'choices'     => array(),
			'placeholder' => '',
			'default'     => '',
		);

		if ( '' === $args ) {
			return $out;
		}

		// Protect quoted values, then split the rest on whitespace.
		$quoted = array();
		$args   = (string) preg_replace_callback(
			'/"([^"]*)"/',
			static function ( $match ) use ( &$quoted ) {
				$quoted[] = $match[1];
				return '%%Q' . ( count( $quoted ) - 1 ) . '%%';
			},
			$args
		);

		$tokens = preg_split( '/\s+/', trim( $args ) ) ?: array();
		$first  = true;

		foreach ( $tokens as $token ) {
			if ( '' === $token ) {
				continue;
			}
			// A quoted token is a choice / value.
			if ( preg_match( '/^%%Q(\d+)%%$/', $token, $match ) ) {
				$out['choices'][] = $quoted[ (int) $match[1] ] ?? '';
				continue;
			}
			// The first bare token is the field name.
			if ( $first ) {
				$out['name'] = $token;
				$first       = false;
				continue;
			}
			// `key:value` option.
			if ( false !== strpos( $token, ':' ) ) {
				[ $option_name, $option_value ] = explode( ':', $token, 2 );
				if ( preg_match( '/^%%Q(\d+)%%$/', $option_value, $quoted_match ) ) {
					$option_value = $quoted[ (int) $quoted_match[1] ] ?? '';
				}
				// CF7 allows `class:` more than once, and each one adds a class
				// rather than replacing what came before it.
				if ( 'class' === $option_name ) {
					$out['options']['class'] = trim( ( $out['options']['class'] ?? '' ) . ' ' . $option_value );
				} else {
					$out['options'][ $option_name ] = $option_value;
				}
				if ( 'placeholder' === $option_name ) {
					$out['placeholder'] = $option_value;
				}
				continue;
			}
			// A bare flag option (e.g. `readonly`, `placeholder`).
			$out['options'][ $token ] = true;
		}

		// Submit: the quoted arg is the button label, not a choice.
		if ( 'submit' === $tag && ! empty( $out['choices'] ) ) {
			$out['label']   = (string) array_shift( $out['choices'] );
			$out['choices'] = array();
		}

		// A bare `placeholder` flag means the first quoted value is the
		// placeholder text (CF7-native syntax).
		if ( true === ( $out['options']['placeholder'] ?? null ) && ! empty( $out['choices'] ) ) {
			$ph                            = (string) array_shift( $out['choices'] );
			$out['placeholder']            = $ph;
			$out['options']['placeholder'] = $ph;
		}

		// Text-like fields: the first leftover quoted value is the default.
		$text_like = array( 'text', 'email', 'tel', 'url', 'number', 'range', 'date', 'password', 'textarea', 'hidden', 'dynamictext' );
		if ( in_array( $tag, $text_like, true ) && ! empty( $out['choices'] ) ) {
			$out['default'] = (string) array_shift( $out['choices'] );
		}

		// Settings we smuggle through CF7 as marker classes come back out here,
		// so the user's own CSS-class field never shows them.
		if ( 'date' === $tag ) {
			$found         = self::extract_markers( $out, array( 'cf7nl-fp' ) );
			$out['picker'] = $found ? 'styled' : 'native';
		}

		if ( in_array( $tag, array( 'checkbox', 'radio' ), true ) ) {
			$found         = self::extract_markers( $out, array( 'cf7nl-inline', 'cf7nl-cards' ) );
			$out['layout'] = $found ? substr( (string) $found[0], strlen( 'cf7nl-' ) ) : 'list';
		}

		if ( in_array( $tag, array( 'select', 'country' ), true ) ) {
			$out['searchable'] = (bool) self::extract_markers( $out, array( 'cf7nl-search' ) );
		}

		if ( 'tel' === $tag ) {
			$out['telformat']  = self::extract_tel_format( $out );
			$out['digitsonly'] = (bool) self::extract_markers( $out, array( Form_Markup::TEL_DIGITS ) );
		}

		return $out;
	}

	/**
	 * Pull the phone format back out of its marker class.
	 *
	 * The pattern is free text with spaces and brackets in it, which no CF7 tag
	 * option can carry, so it travels base64url-encoded inside a class name.
	 *
	 * @param array<string, mixed> $out Parsed tag, modified in place.
	 */
	private static function extract_tel_format( array &$out ): string {
		$classes = array_values( array_filter( preg_split( '/\s+/', trim( (string) ( $out['options']['class'] ?? '' ) ) ) ?: array() ) );
		$format  = '';
		$rest    = array();

		foreach ( $classes as $class ) {
			if ( 0 !== strpos( $class, Form_Markup::TEL_FORMAT ) ) {
				$rest[] = $class;
				continue;
			}

			// Strict decode, and false casts to '': a hand-edited class should
			// lose the format, not take the whole field down.
			$token  = strtr( substr( $class, strlen( Form_Markup::TEL_FORMAT ) ), '-_', '+/' );
			$format = (string) base64_decode( $token, true );
		}

		if ( empty( $rest ) ) {
			unset( $out['options']['class'] );
		} else {
			$out['options']['class'] = implode( ' ', $rest );
		}

		return $format;
	}

	/**
	 * Remove our marker classes from a parsed tag's `class` option and report
	 * which were present, leaving any classes the user typed untouched.
	 *
	 * @param array<string, mixed> $out     Parsed tag, modified in place.
	 * @param array<int, string>   $markers Marker classes to look for.
	 * @return array<int, string> The markers that were found.
	 */
	private static function extract_markers( array &$out, array $markers ): array {
		$classes = array_values( array_filter( preg_split( '/\s+/', trim( (string) ( $out['options']['class'] ?? '' ) ) ) ?: array() ) );
		$found   = array_values( array_intersect( $markers, $classes ) );
		$rest    = array_values( array_diff( $classes, $markers ) );

		if ( empty( $rest ) ) {
			unset( $out['options']['class'] );
		} else {
			$out['options']['class'] = implode( ' ', $rest );
		}

		return $found;
	}

	/**
	 * Fold a `<label>Caption [tag]</label>` triple (html + field + html) back
	 * into the field's `label`, dropping the wrapper html fragments.
	 *
	 * @param array<int, array<string, mixed>> $items
	 * @return array<int, array<string, mixed>>
	 */
	private static function absorb_label_wrappers( array $items ): array {
		$result = array();
		$i      = 0;
		$total  = count( $items );

		while ( $i < $total ) {
			$item = $items[ $i ];

			if ( 'html' === $item['kind'] && $i + 2 < $total
				&& 'field' === $items[ $i + 1 ]['kind']
				&& 'html' === $items[ $i + 2 ]['kind']
			) {
				$open_html  = (string) $item['html'];
				$close_html = (string) $items[ $i + 2 ]['html'];

				// Opening html ends with `<label …>CAPTION` (no nested tags) and
				// the following html starts with `</label>`.
				if ( preg_match( '/^(.*?)<label\b[^>]*>([^<>]*?)\s*$/s', $open_html, $om )
					&& preg_match( '#^\s*</label>(.*)$#s', $close_html, $cm )
				) {
					$prefix    = $om[1];
					$label     = Form_Markup::decode_text( trim( $om[2] ) );
					$remainder = $cm[1];

					if ( '' !== trim( $prefix ) ) {
						$result[] = array(
							'kind' => 'html',
							'html' => $prefix,
						);
					}

					$field = $items[ $i + 1 ];
					if ( '' !== $label ) {
						$field['label'] = $label;
					}
					$result[] = $field;

					// Re-process leftover html after `</label>`; otherwise skip
					// the whole triple.
					if ( '' !== trim( $remainder ) ) {
						$items[ $i + 2 ] = array(
							'kind' => 'html',
							'html' => $remainder,
						);
						$i              += 2;
						continue;
					}
					$i += 3;
					continue;
				}
			}

			$result[] = $item;
			++$i;
		}

		return $result;
	}

	/**
	 * Like absorb_label_wrappers, but folds a `<fieldset><legend>Caption</legend>
	 * [tag]</fieldset>` triple (used for radio/checkbox/file) into the field label.
	 *
	 * @param array<int, array<string, mixed>> $items
	 * @return array<int, array<string, mixed>>
	 */
	private static function absorb_fieldset_wrappers( array $items ): array {
		$result = array();
		$i      = 0;
		$total  = count( $items );

		while ( $i < $total ) {
			$item = $items[ $i ];

			if ( 'html' === $item['kind'] && $i + 2 < $total
				&& 'field' === $items[ $i + 1 ]['kind']
				&& 'html' === $items[ $i + 2 ]['kind']
			) {
				$open_html  = (string) $item['html'];
				$close_html = (string) $items[ $i + 2 ]['html'];

				if ( preg_match( '/^(.*?)<fieldset\b[^>]*>\s*<legend\b[^>]*>([^<>]*?)<\/legend>\s*$/s', $open_html, $om )
					&& preg_match( '#^\s*</fieldset>(.*)$#s', $close_html, $cm )
				) {
					$prefix    = $om[1];
					$label     = Form_Markup::decode_text( trim( $om[2] ) );
					$remainder = $cm[1];

					if ( '' !== trim( $prefix ) ) {
						$result[] = array(
							'kind' => 'html',
							'html' => $prefix,
						);
					}

					$field = $items[ $i + 1 ];
					if ( '' !== $label ) {
						$field['label'] = $label;
					}
					$result[] = $field;

					if ( '' !== trim( $remainder ) ) {
						$items[ $i + 2 ] = array(
							'kind' => 'html',
							'html' => $remainder,
						);
						$i              += 2;
						continue;
					}
					$i += 3;
					continue;
				}
			}

			$result[] = $item;
			++$i;
		}

		return $result;
	}

	/**
	 * Turn html items produced by serialize_content back into content items.
	 *
	 * @param array<int, array<string, mixed>> $items
	 * @return array<int, array<string, mixed>>
	 */
	private static function absorb_content_blocks( array $items ): array {
		$out = array();
		foreach ( $items as $item ) {
			if ( 'html' !== ( $item['kind'] ?? '' ) ) {
				$out[] = $item;
				continue;
			}
			foreach ( self::split_content( (string) $item['html'] ) as $piece ) {
				$out[] = $piece;
			}
		}
		return $out;
	}

	/**
	 * Peel content blocks out of an HTML blob, returning an ordered mix of
	 * `content` items and leftover `html` items.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function split_content( string $html ): array {
		$re = '#(?P<h><(?P<hlvl>h[234])\s+class="(?P<hcls>[^"]*nv-h[^"]*)"\s*>(?P<htxt>.*?)</\2>)'
			. '|(?P<p><p\s+class="(?P<pcls>[^"]*nv-p[^"]*)"\s*>(?P<ptxt>.*?)</p>)'
			. '|(?P<hr><hr\s+class="(?P<hrcls>[^"]*nv-hr[^"]*)"(?:\s+style="border-top-width:(?P<hrth>\d+)px")?\s*/?\s*>)'
			. '|(?P<sp><div\s+class="nv-spacer"\s+style="height:(?P<sph>\d+)px"[^>]*>\s*</div>)#is';

		if ( false === preg_match_all( $re, $html, $matches, PREG_OFFSET_CAPTURE ) || empty( $matches[0] ) ) {
			return '' === trim( $html ) ? array() : array(
				array(
					'kind' => 'html',
					'html' => $html,
				),
			);
		}

		$out = array();
		$pos = 0;

		foreach ( $matches[0] as $i => $whole ) {
			$start = (int) $whole[1];
			if ( $start > $pos ) {
				$between = substr( $html, $pos, $start - $pos );
				if ( '' !== trim( $between ) ) {
					$out[] = array(
						'kind' => 'html',
						'html' => $between,
					);
				}
			}

			if ( '' !== ( $matches['h'][ $i ][0] ?? '' ) ) {
				$out[] = array(
					'kind'  => 'content',
					'type'  => 'heading',
					'level' => $matches['hlvl'][ $i ][0],
					'align' => self::class_token( $matches['hcls'][ $i ][0], 'nv-align-', array( 'left', 'center', 'right' ), 'left' ),
					'text'  => html_entity_decode( wp_strip_all_tags( (string) $matches['htxt'][ $i ][0] ), ENT_QUOTES, 'UTF-8' ),
				);
			} elseif ( '' !== ( $matches['p'][ $i ][0] ?? '' ) ) {
				$out[] = array(
					'kind'  => 'content',
					'type'  => 'paragraph',
					'size'  => self::class_token( $matches['pcls'][ $i ][0], 'nv-p-', array( 'sm', 'md', 'lg' ), 'md' ),
					'align' => self::class_token( $matches['pcls'][ $i ][0], 'nv-align-', array( 'left', 'center', 'right' ), 'left' ),
					'text'  => html_entity_decode( wp_strip_all_tags( (string) $matches['ptxt'][ $i ][0] ), ENT_QUOTES, 'UTF-8' ),
				);
			} elseif ( '' !== ( $matches['hr'][ $i ][0] ?? '' ) ) {
				$out[] = array(
					'kind'      => 'content',
					'type'      => 'divider',
					'style'     => self::class_token( $matches['hrcls'][ $i ][0], 'nv-hr-', array( 'solid', 'dashed', 'dotted' ), 'solid' ),
					'tier'      => self::class_token( $matches['hrcls'][ $i ][0], 'nv-hr-', array( 'subtle', 'normal', 'strong' ), 'subtle' ),
					'thickness' => isset( $matches['hrth'][ $i ][0] ) && '' !== $matches['hrth'][ $i ][0] ? (int) $matches['hrth'][ $i ][0] : 1,
				);
			} elseif ( '' !== ( $matches['sp'][ $i ][0] ?? '' ) ) {
				$out[] = array(
					'kind'   => 'content',
					'type'   => 'spacer',
					'height' => (int) $matches['sph'][ $i ][0],
				);
			}

			$pos = $start + strlen( (string) $whole[0] );
		}

		$tail = substr( $html, $pos );
		if ( '' !== trim( $tail ) ) {
			$out[] = array(
				'kind' => 'html',
				'html' => $tail,
			);
		}

		return $out;
	}

	/**
	 * Pull a known token (e.g. `center` from `nv-align-center`) out of a class
	 * string, falling back to a default.
	 *
	 * @param array<int, string> $allowed
	 */
	private static function class_token( string $classes, string $prefix, array $allowed, string $default ): string {
		if ( preg_match( '/\b' . preg_quote( $prefix, '/' ) . '([a-z0-9]+)\b/', $classes, $match ) && in_array( $match[1], $allowed, true ) ) {
			return $match[1];
		}
		return $default;
	}
}
