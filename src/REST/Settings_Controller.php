<?php
/**
 * REST: Reading and writing the plugin settings sections.
 *
 * @package CF7_Nova_Lite
 */

declare(strict_types=1);

namespace CF7NL\REST;

use CF7NL\CF7\Telegram;
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

		/*
		 * Its own route rather than a parameter on the one above: the section
		 * pattern is [a-z_]+ and does not match a slash, and widening it so one
		 * callback could branch would let every future section be addressed two
		 * ways for the sake of this one.
		 */
		register_rest_route(
			self::NAMESPACE,
			'/settings/telegram/test',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_test_telegram' ),
			)
		);
	}

	/**
	 * Send one message to the configured chat and say what happened.
	 *
	 * Reads what is stored rather than anything in the request. A test of
	 * settings that were never saved would pass, and the site would go on using
	 * the ones that were.
	 */
	public function rest_test_telegram(): \WP_REST_Response|\WP_Error {
		$repo   = $this->container->make( 'settings.repository' );
		$config = $repo->get_section( 'telegram' );

		if ( '' === trim( (string) ( $config['bot_token'] ?? '' ) ) || '' === trim( (string) ( $config['chat_id'] ?? '' ) ) ) {
			return self::error( 'not_configured', __( 'Fill in the bot token and the chat ID first.', 'cf7-nova-lite' ), 400 );
		}

		$error = Telegram::test( $config );

		if ( '' !== $error ) {
			// Telegram's own words: they name which of the two fields is wrong.
			return self::error( 'telegram_refused', $error, 400 );
		}

		return new \WP_REST_Response( array( 'sent' => true ), 200 );
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
