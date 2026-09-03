<?php
/**
 * Plugin activation handler.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\Core;

use DF7\DB\Schema;

defined( 'ABSPATH' ) || exit;

final class Activator {

	public static function activate(): void {
		Schema::install();
	}
}
