<?php
/**
 * Settings storage backed by a single WP option.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\DB;

use CF7NL\CF7\Design;

defined( 'ABSPATH' ) || exit;

final class Settings_Repository {

	private const OPTION_KEY = 'cf7nl_settings';

	/**
	 * @var array<string, array<string, mixed>>
	 */
	private const DEFAULTS = array(
		'general' => array(
			'retention_days'      => 0,
			'delete_on_uninstall' => false,
		),
		'spam'    => array(
			'honeypot_enabled'    => true,
			'time_trap_enabled'   => true,
			'dedup_enabled'       => true,
			// On by default: a spam check that misfires would otherwise destroy a
			// real enquiry with no trace. Kept for a month rather than forever,
			// because a bot can write a row per attempt.
			'store_spam'          => true,
			'spam_retention_days' => 30,
		),
		'privacy' => array(
			'ip_logging' => true,
		),
		// Mirrors the --cf7nl-* contract in assets/css/controls.css. Defaults are
		// the same values that stylesheet declares, so an untouched install looks
		// exactly as it does today.
		'design'  => array(
			'primary'          => '#1b1b22',
			'primary_contrast' => '#ffffff',
			'text'             => '#1b1b22',
			'muted'            => '#8a8580',
			'border'           => '#d9d3c9',
			'bg'               => '#ffffff',
			'surface_alt'      => '#faf9f7',
			'error'            => '#dc2626',
			'radius'           => 8,
			'control_height'   => 46,
			'font_size'        => 16,
			'padding_x'        => 14,
			'padding_y'        => 11,
			'gap'              => 18,
			'ring'             => 3,
			'button_custom'    => false,
			'button_bg'        => '#1b1b22',
			'button_text'      => '#ffffff',
		),
	);

	/**
	 * Every section, defaults filled in, and nothing the plugin does not have.
	 *
	 * The intersect is the load-bearing part. Merging alone kept whatever the
	 * option happened to hold, so a setting that was renamed in some release
	 * stayed readable for ever — reported by `GET /settings` as though it still
	 * meant something — while update_section() intersects before writing and so
	 * could never change or remove it. A real install still carried `honeypot`,
	 * `submit_delay`, `dedupe` and `dedupe_window` that way, long after the code
	 * that read them was gone.
	 *
	 * It cleans up as a side effect: update_section() writes what this returns,
	 * so the next save of any section drops the dead keys from the option.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function all(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		$merged = array();
		foreach ( self::DEFAULTS as $section => $defaults ) {
			$merged[ $section ] = array_intersect_key(
				wp_parse_args( (array) ( $stored[ $section ] ?? array() ), $defaults ),
				$defaults
			);
		}
		return $merged;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_section( string $section ): array {
		$all = $this->all();
		return $all[ $section ] ?? array();
	}

	/** Is this the name of a section the plugin actually has? */
	public static function has_section( string $section ): bool {
		return isset( self::DEFAULTS[ $section ] );
	}

	/**
	 * Cut a submitted section down to values that are safe to store.
	 *
	 * These rules used to live in the REST controller, which made the controller
	 * the only safe way in: anything else that reached update_section() — WP-CLI,
	 * an importer, a future Pro add-on — would write whatever it was handed, and
	 * the design values in particular are printed straight into a public <style>
	 * element. Validation belongs to the thing that does the storing.
	 *
	 * @param array<string, mixed> $input
	 * @return array<string, mixed>
	 */
	public static function sanitize( string $section, array $input ): array {
		switch ( $section ) {
			case 'general':
				return array(
					'retention_days'      => max( 0, min( 3650, (int) ( $input['retention_days'] ?? 0 ) ) ),
					'delete_on_uninstall' => (bool) ( $input['delete_on_uninstall'] ?? false ),
				);

			case 'spam':
				// Every key the section defines has to be listed: what this returns
				// replaces the stored section wholesale, so a missing key would be a
				// setting the user can never turn off.
				return array(
					'honeypot_enabled'    => (bool) ( $input['honeypot_enabled'] ?? false ),
					'time_trap_enabled'   => (bool) ( $input['time_trap_enabled'] ?? false ),
					'dedup_enabled'       => (bool) ( $input['dedup_enabled'] ?? false ),
					'store_spam'          => (bool) ( $input['store_spam'] ?? false ),
					'spam_retention_days' => max( 0, min( 3650, (int) ( $input['spam_retention_days'] ?? 30 ) ) ),
				);

			case 'privacy':
				return array(
					'ip_logging' => (bool) ( $input['ip_logging'] ?? false ),
				);

			case 'design':
				// Design owns its own colour rules and size limits, and applies them
				// again on the way out — see CF7\Design::declarations().
				return Design::sanitize( $input );
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $values Raw values; sanitised here, not by the caller.
	 * @return array<string, mixed> The updated section after merge.
	 */
	public function update_section( string $section, array $values ): array {
		if ( ! self::has_section( $section ) ) {
			return array();
		}

		$all             = $this->all();
		$clean           = array_intersect_key( self::sanitize( $section, $values ), self::DEFAULTS[ $section ] );
		$all[ $section ] = array_merge( $all[ $section ], $clean );

		update_option( self::OPTION_KEY, $all, false );

		return $all[ $section ];
	}
}
