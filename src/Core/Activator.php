<?php
/**
 * Plugin activation handler.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\Core;

use DEFERFORMS\DB\Schema;

defined( 'ABSPATH' ) || exit;

final class Activator {

	public static function activate(): void {
		Schema::install();
	}
}
