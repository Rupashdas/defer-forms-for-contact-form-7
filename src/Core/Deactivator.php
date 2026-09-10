<?php
/**
 * Plugin deactivation handler.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Core;

defined( 'ABSPATH' ) || exit;

final class Deactivator {

	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'deferforms_daily_cleanup' );
	}
}
