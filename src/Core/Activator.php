<?php
/**
 * Plugin activation handler.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\Core;

use CF7NL\DB\Schema;

defined( 'ABSPATH' ) || exit;

final class Activator {

	public static function activate(): void {
		Schema::install();
	}
}
