<?php
/**
 * Base for the REST controllers.
 *
 * The routes used to live in one 700-line Plugin class. Splitting them by
 * resource keeps each file small enough to read in one sitting, and means a
 * change to, say, submissions cannot disturb settings.
 *
 * Every route is admin-only; `can_manage()` is the single place that says so.
 *
 * @package DF7
 */

declare(strict_types=1);

namespace DF7\REST;

use DF7\Core\Capability;
use DF7\Core\Container;

defined( 'ABSPATH' ) || exit;

abstract class Controller {

	protected const NAMESPACE = 'df7/v1';

	protected Container $container;

	public function __construct( Container $container ) {
		$this->container = $container;
	}

	/**
	 * Register this controller's routes. Called on `rest_api_init`.
	 */
	abstract public function register_routes(): void;

	/**
	 * @return callable
	 */
	protected static function can_manage() {
		return static fn() => Capability::granted();
	}

	/**
	 * A refusal, in the shape the REST API already understands.
	 *
	 * These used to be `new WP_REST_Response( array( 'error' => 'not_found' ),
	 * 404 )` — a body this plugin invented, and one nothing on the other side
	 * knew how to read. `@wordpress/api-fetch` rejects with the parsed body, so
	 * every `.catch( ( err ) => setError( err.message ) )` in the admin was
	 * reading `err.message` off an object that had no `message` on it: an error
	 * banner that appeared, empty, and told the user nothing.
	 *
	 * `WP_Error` is what `register_rest_route()` callbacks return, and the
	 * server turns it into `{ code, message, data: { status } }` — so the
	 * message travels, and it travels translated, from the one place that knows
	 * what actually went wrong.
	 *
	 * The slug stays the machine-readable half. Two screens key route-specific
	 * wording off it, and a caller that wants to branch should not have to match
	 * on a sentence.
	 *
	 * @param string $code    Machine-readable slug, e.g. `not_found`.
	 * @param string $message Translated sentence for a person to read.
	 * @param int    $status  HTTP status to answer with.
	 */
	protected static function error( string $code, string $message, int $status ): \WP_Error {
		return new \WP_Error( $code, $message, array( 'status' => $status ) );
	}
}
