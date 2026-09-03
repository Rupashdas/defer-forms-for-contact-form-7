<?php
/**
 * Submission ID — a sequential number per submission, for order or ticket
 * references in the confirmation mail.
 *
 * Two decisions worth knowing:
 *
 * 1. The number is never rendered into the page. Printing "next id = 482" tells
 *    every visitor how many submissions the site has had, so the field posts
 *    empty and the real value is injected server-side at submit time.
 *
 * 2. Allocation is a single atomic SQL statement. Reading a counter, adding one
 *    and writing it back hands two simultaneous submissions the same number;
 *    MySQL's LAST_INSERT_ID(expr) trick increments and reports the new value in
 *    one statement, per connection, so each caller gets its own.
 *
 * @package DF7
 */

declare( strict_types=1 );

namespace DF7\CF7;

defined( 'ABSPATH' ) || exit;

final class Submission_Id {

	private const OPTION = 'df7_submission_seq';

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_posted_data', array( $this, 'inject' ), 20 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'submission_id' ),
			array( $this, 'render' ),
			array( 'name-attr' => true )
		);
	}

	/**
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 */
	public function render( $tag ): string {
		$tag = new \WPCF7_FormTag( $tag );
		if ( '' === $tag->name ) {
			return '';
		}

		return sprintf(
			'<input type="hidden" name="%s" value="" class="df7-submission-id" />',
			esc_attr( $tag->name )
		);
	}

	/**
	 * Fill every submission_id field with a freshly allocated number.
	 *
	 * @param array<string, mixed> $data
	 * @return array<string, mixed>
	 */
	public function inject( $data ) {
		if ( ! is_array( $data ) || ! class_exists( 'WPCF7_ContactForm' ) ) {
			return $data;
		}

		$form = \WPCF7_ContactForm::get_current();
		if ( ! $form ) {
			return $data;
		}

		$tags = $form->scan_form_tags( array( 'type' => array( 'submission_id' ) ) );
		if ( empty( $tags ) ) {
			return $data;
		}

		// One number per submission, however many fields display it.
		$number = self::allocate();

		foreach ( $tags as $tag ) {
			if ( '' === $tag->name ) {
				continue;
			}
			$prefix = (string) ( $tag->get_option( 'prefix', '', true ) ?: '' );
			$pad    = (int) $tag->get_option( 'pad', 'int', true );
			$pad    = max( 0, min( 12, $pad ) );

			$data[ $tag->name ] = $prefix . ( $pad > 0 ? str_pad( (string) $number, $pad, '0', STR_PAD_LEFT ) : (string) $number );
		}

		return $data;
	}

	// phpcs:disable WordPress.DB.DirectDatabaseQuery -- These three do touch
	// core's options table, and deliberately: the counter has to be incremented
	// and read back in one statement, and there is no option API that does that.
	// update_option() reads, adds one and writes, so two submissions arriving
	// together are handed the same number. Caching is handled below rather than
	// skipped — the wp_cache_delete() is what stops get_option() serving the
	// value from before the increment.

	/**
	 * Take the next number. Atomic: the UPDATE both increments the counter and
	 * records the new value for this connection, so concurrent submissions can
	 * never be handed the same one.
	 */
	private static function allocate(): int {
		global $wpdb;

		// option_name is unique, so a racing INSERT is simply ignored.
		$wpdb->query(
			$wpdb->prepare(
				"INSERT IGNORE INTO {$wpdb->options} ( option_name, option_value, autoload ) VALUES ( %s, '0', 'no' )",
				self::OPTION
			)
		);

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->options} SET option_value = LAST_INSERT_ID( option_value + 1 ) WHERE option_name = %s",
				self::OPTION
			)
		);

		$number = (int) $wpdb->get_var( 'SELECT LAST_INSERT_ID()' );

		// get_option() would otherwise keep serving the pre-increment value.
		wp_cache_delete( self::OPTION, 'options' );
		wp_cache_delete( 'notoptions', 'options' );

		return $number > 0 ? $number : 1;
	}
	// phpcs:enable WordPress.DB.DirectDatabaseQuery
}
