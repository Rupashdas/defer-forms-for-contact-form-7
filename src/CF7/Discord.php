<?php
/**
 * Post a submission into a Discord channel.
 *
 * One webhook URL, made in the channel's own settings, which carries the
 * channel and the bot identity with it.
 *
 * Two things differ from Slack rather than being the same code twice. Discord's
 * message limit is two thousand characters — low enough that an ordinary form
 * with a dozen fields reaches it — and it answers a successful post with 204
 * and an empty body rather than 200.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Discord {

	/**
	 * Discord's limit on `content`, and the reason truncation matters here more
	 * than anywhere else: fifteen fields of ordinary answers will pass it, and
	 * a message over the limit is refused whole.
	 */
	private const LIMIT = 2000;

	/**
	 * Send one entry, if this site is set up to.
	 *
	 * @param array<string, mixed> $config The `discord` settings section.
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

		if ( '' !== $error && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- the only channel a background failure has.
			error_log( 'CF7 Nova: Discord refused a notification — ' . $error );
		}
	}

	/**
	 * Prove the webhook works. Returns Discord's reason, or '' when it arrived.
	 *
	 * @param array<string, mixed> $config The `discord` settings section.
	 */
	public static function test( array $config ): string {
		return self::send(
			(string) ( $config['webhook_url'] ?? '' ),
			'**' . self::escape( __( 'CF7 Nova', 'cf7-nova-lite' ) ) . "**\n"
				. self::escape( __( 'This is a test. Your form submissions will arrive here.', 'cf7-nova-lite' ) )
		);
	}

	/**
	 * The message, in Discord's markdown.
	 *
	 * The link goes in bare. Discord has no `<url|label>` form in message
	 * content — a labelled link needs an embed — and a bare URL is rendered as
	 * a link anyway, so the plainer thing is also the working one.
	 */
	private static function compose( Notification $entry ): string {
		$lines = array(
			'**' . self::escape( $entry->title ) . '**',
			self::escape( $entry->when ),
			'',
		);

		foreach ( $entry->fields as $field => $value ) {
			$lines[] = '**' . self::escape( $field ) . '**: ' . self::escape( $value );
		}

		$lines[] = '';
		$lines[] = esc_url_raw( $entry->link );

		$message = implode( "\n", $lines );

		if ( mb_strlen( $message ) <= self::LIMIT ) {
			return $message;
		}

		/*
		 * Cut from the fields, not from the end.
		 *
		 * The link is the last line and the most useful one — a message that
		 * loses its ending loses the way to read the rest of the entry, which
		 * is exactly what somebody does when the message was too long to show
		 * them everything.
		 */
		$tail = "\n\n" . self::escape( __( '(truncated)', 'cf7-nova-lite' ) ) . "\n" . esc_url_raw( $entry->link );
		$room = self::LIMIT - mb_strlen( $tail );

		return mb_substr( $message, 0, max( 0, $room ) ) . $tail;
	}

	/**
	 * Hand one message to the webhook. Returns the error, or '' when it went.
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
				'body'    => wp_json_encode( array( 'content' => $message ) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		// 204 is the success: Discord accepts the post and returns nothing.
		if ( 204 === $code || 200 === $code ) {
			return '';
		}

		// Discord answers in JSON and names the fault: "Unknown Webhook" for a
		// URL that has been deleted, "Invalid Webhook Token" for a mistyped one.
		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return is_array( $body ) && ! empty( $body['message'] )
			? (string) $body['message']
			: sprintf( /* translators: %d: an HTTP status code. */ __( 'Discord answered %d.', 'cf7-nova-lite' ), $code );
	}

	/**
	 * Characters Discord's markdown reads as formatting.
	 *
	 * More than the other two need: Discord takes asterisks, underscores,
	 * backticks, tildes and pipes as markup inside ordinary text, so an answer
	 * containing `*` would swallow the rest of the line into italics. A
	 * backslash in front is Discord's own escape.
	 */
	private static function escape( string $text ): string {
		return preg_replace( '/([*_~`|\\\\])/', '\\\\$1', $text ) ?? $text;
	}
}
