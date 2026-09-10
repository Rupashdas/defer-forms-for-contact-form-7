<?php
/**
 * REST: Reading and writing the plugin settings sections.
 *
 * @package DEFERFORMS
 */

declare(strict_types=1);

namespace DEFERFORMS\REST;

use DEFERFORMS\CF7\Discord;
use DEFERFORMS\CF7\Slack;
use DEFERFORMS\CF7\Telegram;
use DEFERFORMS\CF7\Webhook;
use DEFERFORMS\DB\Settings_Repository;

defined( 'ABSPATH' ) || exit;

final class Settings_Controller extends Controller {

	/**
	 * The one field per section that must not travel back to the browser whole.
	 *
	 * A webhook URL belongs here beside the bot token: anyone holding it can
	 * post into the channel it names, which is the whole of what it protects.
	 */
	private const SECRETS = array(
		'telegram' => 'bot_token',
		'slack'    => 'webhook_url',
		'discord'  => 'webhook_url',
		'webhook'  => 'webhook_url',
	);

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
			'/settings/(?P<section>telegram|slack|discord|webhook)/test',
			array(
				'methods'             => 'POST',
				'permission_callback' => self::can_manage(),
				'callback'            => array( $this, 'rest_test_notifier' ),
				'args'                => array(
					'section' => array( 'type' => 'string' ),
				),
			)
		);
	}

	public function rest_get_settings(): \WP_REST_Response {
		$repo = $this->container->make( 'settings.repository' );
		$all  = $repo->all();

		// Masked here and only here. Everything server-side — Telegram::notify,
		// Slack::notify, the test route below — reads the real value through the
		// repository, so masking there would break the messages it configures.
		foreach ( self::SECRETS as $section => $key ) {
			$all[ $section ][ $key ] = self::mask( $key, (string) $all[ $section ][ $key ] );
		}

		return new \WP_REST_Response( $all, 200 );
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
			return self::error( 'unknown_section', __( 'There is no settings section by that name.', 'defer-forms-for-contact-form-7' ), 400 );
		}

		$values = (array) $request->get_json_params();

		$repo   = $this->container->make( 'settings.repository' );
		$secret = self::SECRETS[ $section ] ?? '';

		// Before problem(), so what gets validated is the value that will be
		// stored. A mask reaching the URL check would pass it — the host is the
		// half a mask keeps — and be saved as a webhook that goes nowhere.
		if ( '' !== $secret ) {
			$values[ $secret ] = self::keep_or_replace(
				$secret,
				isset( $values[ $secret ] ) ? (string) $values[ $secret ] : null,
				(string) $repo->get_section( $section )[ $secret ]
			);
		}

		// Refused rather than quietly corrected, so the reason reaches the person
		// who typed it. See Settings_Repository::problem().
		$problem = Settings_Repository::problem( $section, $values );

		if ( '' !== $problem ) {
			return self::error( 'invalid_setting', $problem, 400 );
		}

		$updated = $repo->update_section( $section, $values );

		if ( '' !== $secret ) {
			$updated[ $secret ] = self::mask( $secret, (string) $updated[ $secret ] );
		}

		return new \WP_REST_Response( $updated, 200 );
	}

	/**
	 * Turn what the browser sent for a secret into what should be stored.
	 *
	 * The browser was handed the masked form, and a form that saves the whole
	 * section hands it straight back — untouched fields included. So the mask
	 * means "no change", and so does a field the request never mentioned.
	 *
	 * An empty one does not. Emptying the box is the only way a credential that
	 * should not be on the site any more can be taken off it, and it is already
	 * what clearing means for a webhook URL everywhere else — see
	 * Settings_Repository::problem(). Turning the destination off leaves the
	 * secret in the database; this removes it.
	 *
	 * @param string      $key      Which secret, so it is compared against the mask it was shown as.
	 * @param string|null $incoming What the request carried, or null if it carried nothing.
	 * @param string      $stored   What is in the database now.
	 */
	private static function keep_or_replace( string $key, ?string $incoming, string $stored ): string {
		if ( null === $incoming ) {
			return $stored;
		}

		$incoming = trim( $incoming );

		if ( '' !== $incoming && self::mask( $key, $stored ) === $incoming ) {
			return $stored;
		}

		return $incoming;
	}

	/**
	 * Enough of a secret to recognise it, not enough to use it.
	 *
	 * A webhook URL keeps its host instead of its first four characters: every
	 * Slack URL begins the same way, so ends-only masking would show nothing
	 * worth showing, while the host says which destination this is and is not
	 * the part that authorises anything. The path is.
	 *
	 * @return string The masked form, or '' when nothing is stored.
	 */
	private static function mask( string $key, string $value ): string {
		if ( '' === $value ) {
			return '';
		}

		if ( 'webhook_url' === $key ) {
			$parts = (array) wp_parse_url( $value );

			if ( ! empty( $parts['host'] ) ) {
				return ( $parts['scheme'] ?? 'https' ) . '://' . $parts['host'] . '/…' . substr( $value, -4 );
			}
		}

		if ( strlen( $value ) <= 12 ) {
			return '••••••••';
		}

		return substr( $value, 0, 4 ) . '…' . substr( $value, -4 );
	}

	/**
	 * Send one message to whichever destination was named, and say what happened.
	 *
	 * The three are named in the route pattern rather than looked up, so a
	 * section that is not a notifier cannot reach this at all — and adding a
	 * fourth means saying so in two places, which is the point: a destination
	 * nobody can test is a destination nobody can set up.
	 *
	 * Reads what is stored rather than anything in the request. A test of
	 * settings that were never saved would pass, and the site would go on using
	 * the ones that were.
	 */
	public function rest_test_notifier( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$section = (string) $request->get_param( 'section' );
		$repo    = $this->container->make( 'settings.repository' );
		$config  = $repo->get_section( $section );

		$required = 'telegram' === $section
			? array( 'bot_token', 'chat_id' )
			: array( 'webhook_url' );

		foreach ( $required as $key ) {
			if ( '' === trim( (string) ( $config[ $key ] ?? '' ) ) ) {
				return self::error(
					'not_configured',
					'telegram' === $section
						? __( 'Fill in the bot token and the chat ID first.', 'defer-forms-for-contact-form-7' )
						: __( 'Fill in the webhook URL first.', 'defer-forms-for-contact-form-7' ),
					400
				);
			}
		}

		$error = self::send_test( $section, $config );

		if ( '' !== $error ) {
			// Their own words: each service names which part is wrong far better
			// than a message written here could.
			return self::error( 'refused', $error, 400 );
		}

		return new \WP_REST_Response( array( 'sent' => true ), 200 );
	}

	/**
	 * @param array<string, mixed> $config
	 */
	private static function send_test( string $section, array $config ): string {
		switch ( $section ) {
			case 'slack':
				return Slack::test( $config );

			case 'discord':
				return Discord::test( $config );

			case 'webhook':
				return Webhook::test( $config );

			default:
				return Telegram::test( $config );
		}
	}
}
