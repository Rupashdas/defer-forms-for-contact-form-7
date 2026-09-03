<?php
/**
 * Plugin deactivation handler.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\Core;

defined( 'ABSPATH' ) || exit;

final class Deactivator {

	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'df7_daily_cleanup' );
	}
}
