<?php
/**
 * Forward a submission to a Telegram chat.
 *
 * A site-wide bot and a single chat: token and chat id are set once in
 * Settings, and every form uses them. Per-form channels would need the token in
 * two places anyway, and almost nobody wants a second channel.
 *
 * Sent from the request that stored the entry, not from a queue. Telegram's API
 * answers in well under a second and a form submit is already waiting on mail,
 * so a background job would add a moving part for no gain — and a failure would
 * have nowhere to be seen.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Telegram {

	private const ENDPOINT = 'https://api.telegram.org/bot%s/sendMessage';

	/**
	 * Telegram refuses a message over 4096 characters outright, so a long
	 * submission would arrive as nothing at all rather than as most of itself.
	 */
	private const LIMIT = 4096;

	/**
	 * Send one entry, if this site is set up to.
	 *
	 * Nothing is returned and nothing is thrown: a form that has been filled in
	 * and stored has succeeded, whatever a chat app has to say about it. The
	 * failure goes to the log, where a site owner wondering why their phone is
	 * quiet can find it.
	 *
	 * @param array<string, mixed> $config The `telegram` settings section.
	 */
	public static function notify( array $config, Notification $entry ): void {
		if ( empty( $config['enabled'] ) ) {
			return;
		}

		$token = (string) ( $config['bot_token'] ?? '' );
		$chat  = (string) ( $config['chat_id'] ?? '' );

		if ( '' === $token || '' === $chat ) {
			return;
		}

		$error = self::send( $token, $chat, self::compose( $entry ) );

		/*
		 * The only place a failure here can be seen. Nobody is watching this
		 * request — the visitor has been thanked and gone — so a silent return
		 * would leave a site owner with a quiet phone and nothing to look at.
		 *
		 * Behind WP_DEBUG, because a chat app being unreachable is not a reason
		 * to write to the log of a site that has not asked for one.
		 */
		if ( '' !== $error && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- the only channel a background failure has.
			error_log( 'CF7 Essentials: Telegram refused a notification — ' . $error );
		}
	}

	/**
	 * Prove the settings work. Returns Telegram's reason, or '' when it arrived.
	 *
	 * Sent whether or not the toggle is on: somebody filling this in wants to
	 * know the credentials are right before they switch it on, and refusing to
	 * test until it is enabled makes them turn it on to find out.
	 *
	 * @param array<string, mixed> $config The `telegram` settings section.
	 */
	public static function test( array $config ): string {
		return self::send(
			(string) ( $config['bot_token'] ?? '' ),
			(string) ( $config['chat_id'] ?? '' ),
			'<b>' . self::escape( __( 'CF7 Essentials', 'essentials-for-contact-form-7' ) ) . '</b>' . "\n"
				. self::escape( __( 'This is a test. Your form submissions will arrive here.', 'essentials-for-contact-form-7' ) )
		);
	}

	/**
	 * Hand one message to Telegram. Returns the error, or '' when it went.
	 *
	 * A short timeout on purpose: this runs inside the submit the visitor is
	 * waiting on, and a chat notification is not worth making somebody watch a
	 * spinner for. Telegram answers in well under a second when it is up, so
	 * five is generous rather than tight.
	 *
	 * The token is in the URL because that is where Telegram's API puts it. It
	 * must therefore never reach the log — an error from wp_remote_post() can
	 * carry the whole request back, so only the message is taken from it.
	 */
	private static function send( string $token, string $chat, string $message ): string {
		$response = wp_remote_post(
			sprintf( self::ENDPOINT, rawurlencode( $token ) ),
			array(
				'timeout' => 5,
				'body'    => array(
					'chat_id'                  => $chat,
					'text'                     => $message,
					'parse_mode'               => 'HTML',
					// The link at the end is for the admin, not something to
					// unfurl a preview card of in the chat.
					'disable_web_page_preview' => 'true',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( 200 === $code ) {
			return '';
		}

		/*
		 * Telegram says why in the body, and the why is usually the thing the
		 * site owner got wrong: "chat not found" for an id that is not a chat
		 * the bot can reach, "Unauthorized" for a token that has been revoked.
		 * Passing that through beats reporting the number.
		 */
		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return is_array( $body ) && ! empty( $body['description'] )
			? (string) $body['description']
			: sprintf( /* translators: %d: an HTTP status code. */ __( 'Telegram answered %d.', 'essentials-for-contact-form-7' ), $code );
	}

	/**
	 * The message: what came in, and where to go and read it.
	 *
	 * HTML rather than Telegram's markdown, because markdown makes an unescaped
	 * underscore or asterisk in somebody's answer into formatting, and an
	 * unbalanced one makes Telegram reject the whole message. HTML has three
	 * characters to escape and no way for a stray one to break the parse.
	 *
	 * Values are printed as the visitor sent them, including the empty ones —
	 * a question left blank is worth seeing on a form that asked it.
	 */
	private static function compose( Notification $entry ): string {
		$lines = array(
			'<b>' . self::escape( $entry->title ) . '</b>',
			self::escape( $entry->when ),
			'',
		);

		foreach ( $entry->fields as $field => $value ) {
			$lines[] = '<b>' . self::escape( $field ) . '</b>: ' . self::escape( $value );
		}

		$lines[] = '';
		$lines[] = '<a href="' . esc_url( $entry->link ) . '">'
			. self::escape( __( 'Open this entry', 'essentials-for-contact-form-7' ) ) . '</a>';

		$message = implode( "\n", $lines );

		if ( mb_strlen( $message ) <= self::LIMIT ) {
			return $message;
		}

		// Cut with room for the notice, so the result is under the limit rather
		// than exactly at it.
		$notice = "\n\n" . self::escape( __( '(truncated)', 'essentials-for-contact-form-7' ) );

		return mb_substr( $message, 0, self::LIMIT - mb_strlen( $notice ) ) . $notice;
	}

	/**
	 * The three characters Telegram's HTML mode reads as markup.
	 *
	 * Not esc_html(): that also turns quotes into entities, which arrive in the
	 * chat as &quot; because Telegram only decodes the three it defines.
	 */
	private static function escape( string $text ): string {
		return str_replace( array( '&', '<', '>' ), array( '&amp;', '&lt;', '&gt;' ), $text );
	}
}
