<?php
/**
 * Who may use CF7 Nova.
 *
 * `manage_options` was spelled out in six places — every REST controller through
 * Controller::can_manage(), the admin menu, the CSV export and the attachment
 * download. Six copies of one decision, and no way for a site to change it
 * without editing the plugin.
 *
 * That matters more than it sounds. `manage_options` is administrator-only, so
 * an editor who already has `wpcf7_edit_contact_forms` — who is trusted to build
 * the forms — could not open the submissions those forms collected. The honest
 * answer is that this is one rule, stated once, and a site may narrow or widen it.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Core;

defined( 'ABSPATH' ) || exit;

final class Capability {

	/**
	 * What everything under CF7 Nova asks for.
	 *
	 * Filterable so a site can hand the submissions screen to an editor without
	 * also handing over the whole of wp-admin:
	 *
	 *     add_filter( 'cf7nl_capability', fn() => 'edit_pages' );
	 *
	 * The default stays `manage_options`, so an untouched install behaves exactly
	 * as it did.
	 */
	public static function required(): string {
		$capability = apply_filters( 'cf7nl_capability', 'manage_options' );

		// A filter that returns nothing must not open the plugin to everybody.
		return is_string( $capability ) && '' !== $capability ? $capability : 'manage_options';
	}

	/** Does the current user hold it? */
	public static function granted(): bool {
		return current_user_can( self::required() );
	}
}
