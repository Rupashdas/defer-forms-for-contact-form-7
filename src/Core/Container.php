<?php
/**
 * Dependency-injection container.
 *
 * @package DF7
 */

declare(strict_types=1);

namespace DF7\Core;

defined( 'ABSPATH' ) || exit;

final class Container {

	/** @var array<string, array{factory: callable, shared: bool}> */
	private array $bindings = array();

	/** @var array<string, mixed> */
	private array $instances = array();

	/**
	 * Register a factory. A fresh instance is built on every make().
	 *
	 * @param string   $key     Service name, e.g. 'cf7.steps'.
	 * @param callable $factory Receives the container, returns the service.
	 */
	public function bind( string $key, callable $factory ): void {
		$this->bindings[ $key ] = array(
			'factory' => $factory,
			'shared'  => false,
		);
	}

	/**
	 * Register a factory whose result is built once and then reused.
	 *
	 * @param string   $key     Service name, e.g. 'cf7.steps'.
	 * @param callable $factory Receives the container, returns the service.
	 */
	public function singleton( string $key, callable $factory ): void {
		$this->bindings[ $key ] = array(
			'factory' => $factory,
			'shared'  => true,
		);
	}

	/**
	 * @param string $key
	 * @return mixed
	 * @throws \OutOfBoundsException When nothing has been bound under $key.
	 */
	public function make( string $key ) {

		if ( array_key_exists( $key, $this->instances ) ) {
			return $this->instances[ $key ];
		}

		if ( ! isset( $this->bindings[ $key ] ) ) {
			throw new \OutOfBoundsException(
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- a wiring mistake, thrown where no WordPress is loaded; esc_html() would not exist here.
				sprintf( 'Container has no binding for key "%s".', $key )
			);
		}

		$binding = $this->bindings[ $key ];
		$object  = ( $binding['factory'] )( $this );

		if ( $binding['shared'] ) {
			$this->instances[ $key ] = $object;
		}

		return $object;
	}
}
