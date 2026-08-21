<?php
/**
 * REST: Reading and writing the plugin settings sections.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\REST;

use CF7NL\DB\Settings_Repository;

defined( 'ABSPATH' ) || exit;

final class Settings_Controller extends Controller {

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/settings',
			array(
				'methods'             => 'GET',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_get_settings' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/settings/(?P<section>[a-z_]+)',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_update_settings' ),
				'args'                => array(
					'section' => array( 'type' => 'string' ),
				),
			)
		);
	}

	public function rest_get_settings(): \WP_REST_Response {
		$repo = $this->container->make( 'settings.repository' );
		return new \WP_REST_Response( $repo->all(), 200 );
	}

	/**
	 * The request is only asked to name a section and hand over values. What those
	 * values are allowed to be is the repository's rule — see
	 * Settings_Repository::sanitize(), which every writer goes through, not just
	 * this one.
	 */
	public function rest_update_settings( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$section = (string) $request->get_param( 'section' );

		if ( ! Settings_Repository::has_section( $section ) ) {
			return self::error( 'unknown_section', __( 'There is no settings section by that name.', 'cf7-nova-lite' ), 400 );
		}

		$repo    = $this->container->make( 'settings.repository' );
		$updated = $repo->update_section( $section, (array) $request->get_json_params() );

		return new \WP_REST_Response( $updated, 200 );
	}
}
