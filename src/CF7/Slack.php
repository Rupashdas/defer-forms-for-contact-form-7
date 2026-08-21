<?php
/**
 * Post a submission into a Slack channel.
 *
 * One incoming webhook URL and nothing else. Slack puts the channel, the bot
 * name and the workspace inside the URL it gives you, so unlike Telegram there
 * is no second field to get wrong — and no way to be told "chat not found"
 * because there is no chat to name.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Slack {

	/**
	 * Slack's own ceiling on the `text` field. Far beyond anything a form
	 * produces, but a pasted essay is a thing and a refused message is silent.
	 */
	private const LIMIT = 40000;

	/**
	 * Send one entry, if this site is set up to.
	 *
	 * @param array<string, mixed> $config The `slack` settings section.
	 */
	public static function notify( array $config, Notification $entry ): void {
		if ( empty( $config['enabled'] ) ) {
			return;
		}

		$url = (string) ( $config['webhook_url'] ?? '' );

		if ( '' === $url ) {
			return;
		}

		$error = self::send( $url, self::compose( $entry ) );

		// The only place a failure here can be seen: nobody is watching this
		// request, and the visitor has been thanked and gone.
		if ( '' !== $error && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- the only channel a background failure has.
			error_log( 'CF7 Nova: Slack refused a notification — ' . $error );
		}
	}

	/**
	 * Prove the webhook works. Returns Slack's reason, or '' when it arrived.
	 *
	 * Sent whether or not the toggle is on, so the URL can be checked before
	 * the feature is switched on rather than after.
	 *
	 * @param array<string, mixed> $config The `slack` settings section.
	 */
	public static function test( array $config ): string {
		return self::send(
			(string) ( $config['webhook_url'] ?? '' ),
			'*' . self::escape( __( 'CF7 Nova', 'cf7-nova-lite' ) ) . "*\n"
				. self::escape( __( 'This is a test. Your form submissions will arrive here.', 'cf7-nova-lite' ) )
		);
	}

	/**
	 * The message, in Slack's mrkdwn.
	 *
	 * Not Slack's Block Kit. Blocks would look tidier and are a JSON structure
	 * with its own limits — fifty blocks, three thousand characters a field —
	 * that a form with many fields runs into. A message that arrives plainly
	 * beats one that sometimes does not arrive.
	 */
	private static function compose( Notification $entry ): string {
		$lines = array(
			'*' . self::escape( $entry->title ) . '*',
			self::escape( $entry->when ),
			'',
		);

		foreach ( $entry->fields as $field => $value ) {
			$lines[] = '*' . self::escape( $field ) . '*: ' . self::escape( $value );
		}

		$lines[] = '';
		$lines[] = '<' . esc_url_raw( $entry->link ) . '|' . self::escape( __( 'Open this entry', 'cf7-nova-lite' ) ) . '>';

		$message = implode( "\n", $lines );

		if ( mb_strlen( $message ) <= self::LIMIT ) {
			return $message;
		}

		$notice = "\n\n" . self::escape( __( '(truncated)', 'cf7-nova-lite' ) );

		return mb_substr( $message, 0, self::LIMIT - mb_strlen( $notice ) ) . $notice;
	}

	/**
	 * Hand one message to the webhook. Returns the error, or '' when it went.
	 *
	 * Five seconds, for the reason Telegram has five: this runs inside the
	 * submit the visitor is waiting on.
	 */
	private static function send( string $url, string $message ): string {
		if ( '' === $url ) {
			return __( 'No webhook URL is set.', 'cf7-nova-lite' );
		}

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 5,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( array( 'text' => $message ) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}

		if ( 200 === (int) wp_remote_retrieve_response_code( $response ) ) {
			return '';
		}

		/*
		 * Slack answers a bad webhook in plain text rather than JSON:
		 * "no_service" for a URL that has been revoked, "invalid_payload" for a
		 * body it cannot read. Those words are the diagnosis, so they are passed
		 * through as they are.
		 */
		$body = trim( (string) wp_remote_retrieve_body( $response ) );

		return '' !== $body
			? $body
			: sprintf( /* translators: %d: an HTTP status code. */ __( 'Slack answered %d.', 'cf7-nova-lite' ), (int) wp_remote_retrieve_response_code( $response ) );
	}

	/**
	 * The three characters Slack's mrkdwn reads as markup.
	 *
	 * Only these three, per Slack's own escaping rules — asterisks and
	 * underscores inside a value are left alone, because Slack does not treat
	 * an unbalanced one as an error the way Telegram's markdown does.
	 */
	private static function escape( string $text ): string {
		return str_replace( array( '&', '<', '>' ), array( '&amp;', '&lt;', '&gt;' ), $text );
	}
}
