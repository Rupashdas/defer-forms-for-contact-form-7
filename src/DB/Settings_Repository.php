<?php
/**
 * Settings storage backed by a single WP option.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\DB;

use DF7\CF7\Design;

defined( 'ABSPATH' ) || exit;

final class Settings_Repository {

	private const OPTION_KEY = 'df7_settings';

	/**
	 * @var array<string, array<string, mixed>>
	 */
	private const DEFAULTS = array(
		'general'  => array(
			'retention_days'      => 0,
			'delete_on_uninstall' => false,
		),
		'spam'     => array(
			'honeypot_enabled'    => true,
			'time_trap_enabled'   => true,
			'dedup_enabled'       => true,
			// On by default: a spam check that misfires would otherwise destroy a
			// real enquiry with no trace. Kept for a month rather than forever,
			// because a bot can write a row per attempt.
			'store_spam'          => true,
			// Off by default, unlike the row itself. A stored spam row costs a few
			// kilobytes and buys back a misfiled enquiry; its attachments cost a
			// megabyte each and are the cheapest way to fill a disk from outside.
			'spam_attachments'    => false,
			'spam_retention_days' => 30,
		),
		'privacy'  => array(
			'ip_logging' => true,
		),
		// Off until somebody fills in both halves of it. A bot token is not
		// something a plugin can guess at, and half of one sends nothing.
		'telegram' => array(
			'enabled'   => false,
			'bot_token' => '',
			'chat_id'   => '',
		),
		// One URL each, and the URL carries the channel with it — so unlike
		// Telegram there is no second field to pair wrongly.
		'slack'    => array(
			'enabled'     => false,
			'webhook_url' => '',
		),
		'discord'  => array(
			'enabled'     => false,
			'webhook_url' => '',
		),
		// The same two fields again, and deliberately its own section rather
		// than a fourth chat service: the others post a written message to a
		// channel somebody reads, this posts JSON to whatever is listening.
		// Sharing a section would mean one URL for both, and they are never the
		// same URL.
		'webhook'  => array(
			'enabled'     => false,
			'webhook_url' => '',
		),
		// Mirrors the --df7-* contract in assets/css/controls.css. Defaults are
		// the same values that stylesheet declares, so an untouched install looks
		// exactly as it does today.
		'design'   => array(
			'primary'          => '#1b1b22',
			'primary_contrast' => '#ffffff',
			'text'             => '#1b1b22',
			'muted'            => '#8a8580',
			'border'           => '#d9d3c9',
			'bg'               => '#ffffff',
			'surface_alt'      => '#faf9f7',
			'error'            => '#dc2626',
			'radius'           => 8,
			'control_height'   => 46,
			'font_size'        => 16,
			'padding_x'        => 14,
			'padding_y'        => 11,
			'gap'              => 18,
			'ring'             => 3,
			'button_custom'    => false,
			'button_bg'        => '#1b1b22',
			'button_text'      => '#ffffff',
		),
	);

	/**
	 * Every section, defaults filled in, and nothing the plugin does not have.
	 *
	 * The intersect is the load-bearing part. Merging alone kept whatever the
	 * option happened to hold, so a setting that was renamed in some release
	 * stayed readable for ever — reported by `GET /settings` as though it still
	 * meant something — while update_section() intersects before writing and so
	 * could never change or remove it. A real install still carried `honeypot`,
	 * `submit_delay`, `dedupe` and `dedupe_window` that way, long after the code
	 * that read them was gone.
	 *
	 * It cleans up as a side effect: update_section() writes what this returns,
	 * so the next save of any section drops the dead keys from the option.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function all(): array {
		$stored = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $stored ) ) {
			$stored = array();
		}

		$merged = array();
		foreach ( self::DEFAULTS as $section => $defaults ) {
			$merged[ $section ] = array_intersect_key(
				wp_parse_args( (array) ( $stored[ $section ] ?? array() ), $defaults ),
				$defaults
			);
		}
		return $merged;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_section( string $section ): array {
		$all = $this->all();
		return $all[ $section ] ?? array();
	}

	/** Is this the name of a section the plugin actually has? */
	public static function has_section( string $section ): bool {
		return isset( self::DEFAULTS[ $section ] );
	}

	/**
	 * Cut a submitted section down to values that are safe to store.
	 *
	 * These rules used to live in the REST controller, which made the controller
	 * the only safe way in: anything else that reached update_section() — WP-CLI,
	 * an importer, a future Pro add-on — would write whatever it was handed, and
	 * the design values in particular are printed straight into a public <style>
	 * element. Validation belongs to the thing that does the storing.
	 *
	 * @param array<string, mixed> $input
	 * @return array<string, mixed>
	 */
	public static function sanitize( string $section, array $input ): array {
		switch ( $section ) {
			case 'general':
				return array(
					'retention_days'      => max( 0, min( 3650, (int) ( $input['retention_days'] ?? 0 ) ) ),
					'delete_on_uninstall' => (bool) ( $input['delete_on_uninstall'] ?? false ),
				);

			case 'spam':
				// Every key the section defines has to be listed: what this returns
				// replaces the stored section wholesale, so a missing key would be a
				// setting the user can never turn off.
				return array(
					'honeypot_enabled'    => (bool) ( $input['honeypot_enabled'] ?? false ),
					'time_trap_enabled'   => (bool) ( $input['time_trap_enabled'] ?? false ),
					'dedup_enabled'       => (bool) ( $input['dedup_enabled'] ?? false ),
					'store_spam'          => (bool) ( $input['store_spam'] ?? false ),
					'spam_attachments'    => (bool) ( $input['spam_attachments'] ?? false ),
					'spam_retention_days' => max( 0, min( 3650, (int) ( $input['spam_retention_days'] ?? 30 ) ) ),
				);

			case 'privacy':
				return array(
					'ip_logging' => (bool) ( $input['ip_logging'] ?? false ),
				);

			case 'telegram':
				/*
				 * Both halves trimmed, because both are pasted rather than typed
				 * and a trailing space on a bot token is an Unauthorized with
				 * nothing on screen to explain it.
				 *
				 * sanitize_text_field() on the token as well: it is not displayed
				 * anywhere, but it does go into a URL, and a newline in a URL is
				 * how a header gets split.
				 */
				return array(
					'enabled'   => (bool) ( $input['enabled'] ?? false ),
					'bot_token' => trim( sanitize_text_field( (string) ( $input['bot_token'] ?? '' ) ) ),
					'chat_id'   => trim( sanitize_text_field( (string) ( $input['chat_id'] ?? '' ) ) ),
				);

			case 'slack':
			case 'discord':
			case 'webhook':
				/*
				 * esc_url_raw, not sanitize_text_field: this value is posted to
				 * as a URL, and it is the one setting on this page that the
				 * server hands straight to an HTTP request. Anything that is not
				 * a URL comes back empty rather than being sent somewhere.
				 */
				return array(
					'enabled'     => (bool) ( $input['enabled'] ?? false ),
					'webhook_url' => esc_url_raw( trim( (string) ( $input['webhook_url'] ?? '' ) ) ),
				);

			case 'design':
				// Design owns its own colour rules and size limits, and applies them
				// again on the way out — see CF7\Design::declarations().
				return Design::sanitize( $input );
		}

		return array();
	}

	/**
	 * Why a section cannot be saved as given, or '' when it can.
	 *
	 * Separate from sanitize(), which quietly makes a value safe. Some values
	 * are safe and still wrong, and the difference matters to whoever typed it:
	 * a webhook URL that belongs to the other service is a perfectly good URL,
	 * and silently emptying the field would leave somebody staring at a box that
	 * refuses to keep what they paste.
	 *
	 * The commonest mistake this catches is pasting the Discord webhook into the
	 * Slack tab. Sent as-is, Slack answers "invalid_payload", which reads as a
	 * bug in this plugin rather than as a URL in the wrong box.
	 *
	 * @param array<string, mixed> $input
	 */
	public static function problem( string $section, array $input ): string {
		/*
		 * The webhook is policed by shape rather than by host, because every
		 * host is a legitimate one -- that is the point of it. All this can say
		 * is that the value is an address at all, which still catches the two
		 * real mistakes: a Zap ID pasted without the URL around it, and a
		 * "hooks.zapier.com/..." copied without its scheme.
		 *
		 * http is allowed alongside https. An n8n running on the same machine as
		 * the site is a normal way to use this, and it has no certificate.
		 */
		if ( 'webhook' === $section ) {
			$url = trim( (string) ( $input['webhook_url'] ?? '' ) );

			if ( '' === $url ) {
				return '';
			}

			$parts  = (array) wp_parse_url( $url );
			$scheme = strtolower( (string) ( $parts['scheme'] ?? '' ) );

			if ( '' !== (string) ( $parts['host'] ?? '' ) && in_array( $scheme, array( 'http', 'https' ), true ) ) {
				return '';
			}

			return __( 'That is not a full URL. It should begin http:// or https://', 'defer-forms-for-contact-form-7' );
		}

		$hosts = array(
			// Slack's incoming webhooks are only ever on this host.
			'slack'   => array( 'hooks.slack.com' ),
			// discordapp.com is the old name and still issued in older URLs.
			'discord' => array( 'discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com' ),
		);

		if ( ! isset( $hosts[ $section ] ) ) {
			return '';
		}

		$url = trim( (string) ( $input['webhook_url'] ?? '' ) );

		// Empty is how the setting is cleared, and clearing is allowed.
		if ( '' === $url ) {
			return '';
		}

		$host = strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) );

		if ( ! in_array( $host, $hosts[ $section ], true ) ) {
			return 'slack' === $section
				? __( 'That is not a Slack webhook URL. It should begin https://hooks.slack.com/services/', 'defer-forms-for-contact-form-7' )
				: __( 'That is not a Discord webhook URL. It should begin https://discord.com/api/webhooks/', 'defer-forms-for-contact-form-7' );
		}

		return '';
	}

	/**
	 * @param array<string, mixed> $values Raw values; sanitised here, not by the caller.
	 * @return array<string, mixed> The updated section after merge.
	 */
	public function update_section( string $section, array $values ): array {
		if ( ! self::has_section( $section ) ) {
			return array();
		}

		$all             = $this->all();
		$clean           = array_intersect_key( self::sanitize( $section, $values ), self::DEFAULTS[ $section ] );
		$all[ $section ] = array_merge( $all[ $section ], $clean );

		update_option( self::OPTION_KEY, $all, false );

		return $all[ $section ];
	}
}
