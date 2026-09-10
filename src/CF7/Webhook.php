<?php
/**
 * Post a submission to an endpoint of the site's choosing, as JSON.
 *
 * The other three destinations write a message for somebody to read, and each
 * marks it up its own way. This one has no reader: it hands over the entry as
 * data and lets whatever is listening decide what the entry means. So there is
 * no composing and no escaping here — JSON encoding is the escaping.
 *
 * @package DEFERFORMS
 */

declare( strict_types=1 );

namespace DEFERFORMS\CF7;

defined( 'ABSPATH' ) || exit;

final class Webhook {

	/**
	 * Send one entry, if this site is set up to.
	 *
	 * @param array<string, mixed> $config The `webhook` settings section.
	 */
	public static function notify( array $config, Notification $entry ): void {
		if ( empty( $config['enabled'] ) ) {
			return;
		}

		$url = (string) ( $config['webhook_url'] ?? '' );

		if ( '' === $url ) {
			return;
		}

		$error = self::send( $url, self::payload( $entry ) );

		if ( '' !== $error && defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- the only channel a background failure has.
			error_log( 'Defer Forms: the webhook refused a notification — ' . $error );
		}
	}

	/**
	 * Prove the endpoint accepts a post. Returns the reason, or '' when it did.
	 *
	 * The test body is the same shape as a real one so that whoever is building
	 * the other end can map their fields from it. It carries no visitor data.
	 *
	 * @param array<string, mixed> $config The `webhook` settings section.
	 */
	public static function test( array $config ): string {
		return self::send(
			(string) ( $config['webhook_url'] ?? '' ),
			array(
				'test'   => true,
				'form'   => array(
					'id'    => 0,
					'title' => __( 'Defer Forms', 'defer-forms-for-contact-form-7' ),
				),
				'entry'  => array(
					'id'           => 0,
					'url'          => '',
					'submitted_at' => (string) ( wp_date( 'c' ) ?: '' ),
				),
				'fields' => array(
					'message' => __( 'This is a test. Your form submissions will arrive here.', 'defer-forms-for-contact-form-7' ),
				),
			)
		);
	}

	/**
	 * The entry as data.
	 *
	 * Nested rather than flat, because `id` on its own would have to mean either
	 * the form or the entry and the reader cannot tell which. Zapier and Make
	 * both flatten nesting into `form__title` on the way in, so grouping costs
	 * the reader nothing and tells them what they are looking at.
	 *
	 * @return array<string, mixed>
	 */
	private static function payload( Notification $entry ): array {
		return array(
			'form'   => array(
				'id'    => $entry->form_id,
				'title' => $entry->title,
			),
			'entry'  => array(
				'id'           => $entry->entry_id,
				'url'          => $entry->link,
				'submitted_at' => $entry->at,
			),
			'fields' => $entry->fields,
		);
	}

	/**
	 * Hand one payload to the endpoint. Returns the error, or '' when it went.
	 *
	 * Any 2xx is success. A webhook receiver is somebody else's code and they
	 * answer differently — Zapier 200, a queue that accepts and defers 202, an
	 * endpoint with nothing to say 204 — and refusing all but one of those
	 * would report a working integration as broken.
	 *
	 * @param array<string, mixed> $payload
	 */
	private static function send( string $url, array $payload ): string {
		if ( '' === $url ) {
			return __( 'No webhook URL is set.', 'defer-forms-for-contact-form-7' );
		}

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 5,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( $payload ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response->get_error_message();
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( $code >= 200 && $code < 300 ) {
			return '';
		}

		/*
		 * The status code, and nothing from the body. Unlike Slack and Discord
		 * there is no agreed place an error message lives, and a page of HTML
		 * from a misdirected URL is worse than useless on a settings screen.
		 */
		return sprintf(
			/* translators: %d: an HTTP status code. */
			__( 'The endpoint answered %d.', 'defer-forms-for-contact-form-7' ),
			$code
		);
	}
}
