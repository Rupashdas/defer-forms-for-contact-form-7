<?php
/**
 * Plugin deactivation handler.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Core;

defined( 'ABSPATH' ) || exit;

final class Deactivator {

	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'cf7e_daily_cleanup' );
	}
}
