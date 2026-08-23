<?php
/**
 * Styling controls.
 *
 * Turns the Design settings into the `--cf7e-*` custom properties that
 * assets/css/controls.css already reads, so changing a colour here re-skins
 * every control without a line of CSS. The same declarations are emitted twice:
 * onto `.wpcf7-form` on the front end and onto `.cf7e-preview` in the builder,
 * which is what keeps the preview honest.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

use CF7E\DB\Settings_Repository;

defined( 'ABSPATH' ) || exit;

final class Design {

	/** Setting key => [ token name, unit ]. */
	private const TOKENS = array(
		'primary'          => array( 'primary', '' ),
		'primary_contrast' => array( 'primary-contrast', '' ),
		'text'             => array( 'text', '' ),
		'muted'            => array( 'muted', '' ),
		'border'           => array( 'border', '' ),
		'bg'               => array( 'bg', '' ),
		'surface_alt'      => array( 'surface-alt', '' ),
		'error'            => array( 'error', '' ),
		'radius'           => array( 'radius', 'px' ),
		'control_height'   => array( 'control-height', 'px' ),
		'font_size'        => array( 'font-size', 'px' ),
		'padding_x'        => array( 'padding-x', 'px' ),
		'padding_y'        => array( 'padding-y', 'px' ),
		'gap'              => array( 'gap', 'px' ),
		'ring'             => array( 'ring', 'px' ),
	);

	/** Sizes are clamped so a stray value can't wreck a live form. */
	private const LIMITS = array(
		'radius'         => array( 0, 40 ),
		'control_height' => array( 28, 80 ),
		// The hints and error lines under a form carry their own max( 14px, … )
		// floor, so the base is free to go anywhere the site owner wants.
		'font_size'      => array( 0, 100 ),
		'padding_x'      => array( 4, 32 ),
		'padding_y'      => array( 4, 24 ),
		'gap'            => array( 0, 60 ),
		'ring'           => array( 0, 8 ),
	);

	/**
	 * Only emitted when the button is given colours of its own; otherwise the
	 * CSS defaults keep it following the primary colour.
	 */
	private const BUTTON_TOKENS = array(
		'button_bg'   => 'btn-bg',
		'button_text' => 'btn-text',
	);

	private Settings_Repository $settings;

	public function __construct( Settings_Repository $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Clean a submitted Design section. Static so the REST layer can reuse the
	 * very same colour rules and size limits the renderer applies — two copies
	 * of these numbers would drift apart.
	 *
	 * @param array<string, mixed> $input
	 * @return array<string, mixed>
	 */
	public static function sanitize( array $input ): array {
		$out = array();

		if ( array_key_exists( 'button_custom', $input ) ) {
			$out['button_custom'] = (bool) $input['button_custom'];
		}

		foreach ( self::BUTTON_TOKENS as $key => $token ) {
			if ( array_key_exists( $key, $input ) ) {
				$colour = sanitize_hex_color( (string) $input[ $key ] );
				if ( null !== $colour ) {
					$out[ $key ] = $colour;
				}
			}
		}

		foreach ( self::TOKENS as $key => [ , $unit ] ) {
			if ( ! array_key_exists( $key, $input ) ) {
				continue;
			}

			if ( '' === $unit ) {
				$colour = sanitize_hex_color( (string) $input[ $key ] );
				if ( null !== $colour ) {
					$out[ $key ] = $colour;
				}
				continue;
			}

			[ $min, $max ] = self::LIMITS[ $key ];
			$out[ $key ]   = max( $min, min( $max, (int) $input[ $key ] ) );
		}

		return $out;
	}

	/**
	 * The declarations only, ready to drop inside any selector.
	 */
	public function declarations(): string {
		// Sanitised again on the way out, not just on the way in: these strings
		// are printed into a public <style>, and stored values can predate a
		// change to the rules.
		$values = self::sanitize( $this->settings->get_section( 'design' ) );
		$out    = '';

		foreach ( self::TOKENS as $key => [ $token, $unit ] ) {
			if ( ! isset( $values[ $key ] ) ) {
				continue;
			}
			$out .= '--cf7e-' . $token . ':' . $values[ $key ] . $unit . ';';
		}

		// A softened primary makes a focus ring that always suits the palette.
		if ( isset( $values['primary'] ) ) {
			$out .= '--cf7e-ring-color:' . self::six_digit( (string) $values['primary'] ) . '24;';
		}

		if ( ! empty( $values['button_custom'] ) ) {
			foreach ( self::BUTTON_TOKENS as $key => $token ) {
				if ( isset( $values[ $key ] ) ) {
					$out .= '--cf7e-' . $token . ':' . $values[ $key ] . ';';
				}
			}
		}

		$out .= $this->icons( $values );

		return $out;
	}

	/**
	 * Shorthand hex written out in full. sanitize_hex_color() accepts `#fff`,
	 * and appending an alpha pair to that gives `#fff24` — five digits, which no
	 * browser reads as a colour, so the whole declaration is dropped.
	 */
	private static function six_digit( string $hex ): string {
		if ( 4 !== strlen( $hex ) ) {
			return $hex;
		}
		return '#' . $hex[1] . $hex[1] . $hex[2] . $hex[2] . $hex[3] . $hex[3];
	}

	/**
	 * Rebuild the icon tokens in the chosen colours. A data: URI can't read a
	 * custom property, so recolouring an icon means re-emitting the whole URI.
	 *
	 * @param array<string, mixed> $values Sanitised design values.
	 */
	private function icons( array $values ): string {
		$muted    = (string) ( $values['muted'] ?? '' );
		$contrast = (string) ( $values['primary_contrast'] ?? '' );
		$primary  = (string) ( $values['primary'] ?? '' );

		$svg = static function ( string $body, string $colour, string $width ): string {
			return sprintf(
				"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%s' stroke-width='%s' stroke-linecap='round' stroke-linejoin='round'>%s</svg>\");",
				str_replace( '#', '%23', $colour ),
				$width,
				$body
			);
		};

		$out = '';

		if ( '' !== $muted ) {
			$out .= '--cf7e-icon-chevron:' . $svg( "<path d='m6 9 6 6 6-6'/>", $muted, '2' );
			$out .= '--cf7e-icon-upload:' . $svg( "<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><path d='M7 10l5-5 5 5'/><path d='M12 5v12'/>", $muted, '1.7' );
			$out .= '--cf7e-icon-doc:' . $svg( "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6'/>", $muted, '1.6' );
		}

		// The tick sits on the primary fill, so it takes the contrast colour.
		if ( '' !== $contrast ) {
			$out .= '--cf7e-icon-tick:' . $svg( "<path d='M20 6 9 17l-5-5'/>", $contrast, '3.5' );
		}

		// The chosen-option tick sits on the panel, so it takes the primary.
		if ( '' !== $primary ) {
			$out .= '--cf7e-icon-check:' . $svg( "<path d='M20 6 9 17l-5-5'/>", $primary, '3' );
		}

		return $out;
	}

	/**
	 * Front-end: hang the tokens off the form itself so a theme can still
	 * override them further down the cascade.
	 */
	public function inline_css(): string {
		$declarations = $this->declarations();
		return '' === $declarations ? '' : '.wpcf7-form{' . $declarations . '}';
	}

	/**
	 * Builder preview: same tokens, different host element.
	 *
	 * This used to return a whole `<style>` element that `admin_head` echoed
	 * out, and paid for it twice. Once in escaping: a `<style>` element does not
	 * decode entities, so the block could not be run through `esc_html()` — the
	 * icon URIs came out as `&lt;svg` and every icon in the preview vanished —
	 * which left an `echo` with a phpcs:ignore over it and a hand-rolled
	 * `str_ireplace` guarding against an early `</style`. And once in
	 * specificity: `admin_head` runs before the page's render callback enqueues
	 * the admin bundle, so the bundle's own `:is( .wpcf7-form, .cf7e-preview )`
	 * defaults printed *after* this block at the same single-class weight and
	 * won on source order. The class was doubled to climb over that.
	 *
	 * Both problems were the same problem — printing CSS by hand, at the wrong
	 * moment. Menu hands this to `wp_add_inline_style()` now, which puts it
	 * directly after the stylesheet it has to beat, so source order does the
	 * work a doubled class was doing. Nothing here is markup any more, so
	 * there is nothing to escape and nothing to strip.
	 */
	public function preview_css(): string {
		$declarations = $this->declarations();

		return '' === $declarations ? '' : '.cf7e-preview{' . $declarations . '}';
	}
}
