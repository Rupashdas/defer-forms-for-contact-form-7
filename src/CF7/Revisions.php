<?php
/**
 * A safety net under the builder.
 *
 * Saving in the builder rewrites the whole form template — `Form_Serializer`
 * turns the item list back into markup and that markup replaces what was there.
 * No merge, nothing kept. Undo/redo covers the current session and not the case
 * that actually hurts: noticing tomorrow that yesterday's change broke
 * something.
 *
 * So the last ten states each form has been in are kept, and the builder can
 * load one back.
 *
 * **What is kept is exactly what the builder writes** — the `form` property,
 * the redirect config and the step config. Not the mail template, not the
 * messages, not the title. The builder never touches those, so it cannot break
 * them, and storing them would make every row bigger while implying a
 * protection that is not being offered.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Revisions {

	/** One meta row per revision, so pruning is a delete rather than a rewrite. */
	private const META = '_cf7e_revision';

	/** How many states a form remembers. A decision, not a setting. */
	private const KEEP = 10;

	/**
	 * Forms changed during this request.
	 *
	 * `wpcf7_after_save` can fire several times in one request — importing a
	 * bundle saves every form in it — and nothing stops a caller saving the same
	 * form twice. Collecting ids here and acting once at the end collapses that
	 * into one revision per form.
	 *
	 * @var array<int, bool>
	 */
	private static array $marked = array();

	public function register_hooks(): void {
		add_action( 'wpcf7_after_save', array( __CLASS__, 'on_save' ) );
		add_action( 'shutdown', array( __CLASS__, 'take_marked' ) );
	}

	/**
	 * Note that a form changed. Deliberately does not snapshot.
	 *
	 * `wpcf7_after_save` fires inside `WPCF7_ContactForm::save()`, which is
	 * before `Forms_Controller` has written the redirect and step meta — those
	 * calls come after `$form->save()` returns. Snapshotting here would pair a
	 * new template with the previous config: a state the form was never in, and
	 * one that would restore as a subtly broken form.
	 *
	 * @param mixed $form The contact form CF7 just saved.
	 */
	public static function on_save( $form ): void {
		$id = ( is_object( $form ) && method_exists( $form, 'id' ) ) ? (int) $form->id() : 0;

		if ( $id > 0 ) {
			self::mark( $id );
		}
	}

	public static function mark( int $form_id ): void {
		self::$marked[ $form_id ] = true;
	}

	/** For tests, which run several scenarios inside one process. */
	public static function forget_marks(): void {
		self::$marked = array();
	}

	/**
	 * Snapshot everything marked. Runs on `shutdown`, by which point every write
	 * in the request has landed.
	 */
	public static function take_marked(): void {
		$marked = array_keys( self::$marked );

		self::$marked = array();

		foreach ( $marked as $form_id ) {
			self::take( (int) $form_id );
		}
	}

	/**
	 * Store the form's current state, unless it is the state already on top.
	 *
	 * Opening a form and saving it without changing anything is an ordinary
	 * thing to do, and it must not push a real revision out of a ten-deep
	 * window.
	 */
	public static function take( int $form_id ): void {
		if ( $form_id < 1 ) {
			return;
		}

		$state  = self::current_state( $form_id );
		$rows   = self::rows( $form_id );
		$newest = end( $rows );

		if ( is_array( $newest ) && self::same( $newest, $state ) ) {
			return;
		}

		$state['rev']  = self::next_rev( $rows );
		$state['time'] = time();

		add_post_meta( $form_id, self::META, $state, false );

		self::prune( $form_id );
	}

	/**
	 * What can be restored, newest first. Metadata only — the modal lists these
	 * every time it opens, and a payload it will not show is a payload nobody
	 * asked for.
	 *
	 * @return array<int, array{rev: int, time: int}>
	 */
	public static function all( int $form_id ): array {
		$list = array();

		foreach ( self::rows( $form_id ) as $row ) {
			$list[] = array(
				'rev'  => (int) ( $row['rev'] ?? 0 ),
				'time' => (int) ( $row['time'] ?? 0 ),
			);
		}

		return array_reverse( $list );
	}

	/**
	 * One revision in full, or null when it has been pruned or never existed.
	 *
	 * @return array<string, mixed>|null
	 */
	public static function get( int $form_id, int $rev ): ?array {
		foreach ( self::rows( $form_id ) as $row ) {
			if ( (int) ( $row['rev'] ?? 0 ) === $rev ) {
				return $row;
			}
		}

		return null;
	}

	/**
	 * The three things the builder can write.
	 *
	 * @return array<string, mixed>
	 */
	private static function current_state( int $form_id ): array {
		return array(
			'form'     => self::template( $form_id ),
			'redirect' => Redirect::config( $form_id ),
			'steps'    => Steps::config( $form_id ),
		);
	}

	/**
	 * The saved template.
	 *
	 * Read from post meta rather than through `WPCF7_ContactForm`, because the
	 * instance CF7 handed us on save is not necessarily the one still in memory
	 * by `shutdown`, and the meta is what a later page load will read anyway.
	 */
	private static function template( int $form_id ): string {
		return (string) get_post_meta( $form_id, '_form', true );
	}

	/**
	 * Two states are the same when all three parts are.
	 *
	 * `==` rather than `===` on the arrays: the config classes rebuild them each
	 * call, so identity would never hold, and key order is not meaningful here.
	 *
	 * @param array<string, mixed> $stored
	 * @param array<string, mixed> $state
	 */
	private static function same( array $stored, array $state ): bool {
		return (string) ( $stored['form'] ?? '' ) === (string) $state['form']
			&& ( $stored['redirect'] ?? array() ) == $state['redirect'] // phpcs:ignore Universal.Operators.StrictComparisons.LooseEqual -- see above.
			&& ( $stored['steps'] ?? array() ) == $state['steps']; // phpcs:ignore Universal.Operators.StrictComparisons.LooseEqual
	}

	/**
	 * The next revision number for this form.
	 *
	 * Counted from the highest still stored rather than from how many there are,
	 * so pruning cannot hand out a number that is already in use — which would
	 * make two entries indistinguishable in a URL.
	 *
	 * @param array<int, array<string, mixed>> $rows
	 */
	private static function next_rev( array $rows ): int {
		$highest = 0;

		foreach ( $rows as $row ) {
			$highest = max( $highest, (int) ( $row['rev'] ?? 0 ) );
		}

		return $highest + 1;
	}

	/**
	 * Stored revisions, oldest first — the order `get_post_meta()` returns them.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	private static function rows( int $form_id ): array {
		$rows = get_post_meta( $form_id, self::META, false );

		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}

	/** Drop the oldest until the form is back within the cap. */
	private static function prune( int $form_id ): void {
		$rows   = self::rows( $form_id );
		$excess = count( $rows ) - self::KEEP;

		for ( $i = 0; $i < $excess; $i++ ) {
			delete_post_meta( $form_id, self::META, $rows[ $i ] );
		}
	}
}
