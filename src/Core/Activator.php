<?php
/**
 * Plugin activation handler.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\Core;

use CF7E\DB\Schema;

defined( 'ABSPATH' ) || exit;

final class Activator {

	public static function activate(): void {
		Schema::install();
	}
}
