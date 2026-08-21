<?php
/**
 * REST: the feature catalogue behind the Features page.
 *
 * Read-only. There is nothing to write: every feature is on, and the list it
 * serves is a constant. See Modules\Registry for why the switches went.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\REST;

use CF7NL\Modules\Registry;

defined( 'ABSPATH' ) || exit;

final class Modules_Controller extends Controller {

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/modules',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_list_modules' ),
			)
		);
	}

	public function rest_list_modules(): \WP_REST_Response {
		return new \WP_REST_Response( Registry::definitions(), 200 );
	}
}
