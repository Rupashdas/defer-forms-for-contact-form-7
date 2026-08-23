<?php
/**
 * Product field — a dropdown of WooCommerce products, so an enquiry form can
 * ask which product it is about.
 *
 * WooCommerce is optional: without it the field says so rather than rendering a
 * broken control, and validation still passes so the rest of the form works.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

defined( 'ABSPATH' ) || exit;

final class Product_Field {

	use Required_Check {
		validate as validate_required;
	}

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_product', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_product*', array( $this, 'validate' ), 10, 2 );
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'product', 'product*' ),
			array( $this, 'render' ),
			array( 'name-attr' => true )
		);
	}

	public static function is_available(): bool {
		return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' );
	}

	/**
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 */
	public function render( $tag ): string {
		$tag = new \WPCF7_FormTag( $tag );
		if ( '' === $tag->name ) {
			return '';
		}

		if ( ! self::is_available() ) {
			return '<span class="cf7e-product-missing">'
				. esc_html__( 'WooCommerce is not active, so there are no products to list.', 'essentials-for-contact-form-7' )
				. '</span>';
		}

		$options = '<option value="">' . esc_html__( 'Select a product…', 'essentials-for-contact-form-7' ) . '</option>';

		foreach ( $this->products( $tag ) as $product ) {
			$label = $product->get_name();
			if ( $tag->has_option( 'show_price' ) ) {
				$label .= ' — ' . wp_strip_all_tags( (string) wc_price( $product->get_price() ) );
			}
			$options .= sprintf(
				'<option value="%1$s">%2$s</option>',
				esc_attr( $product->get_name() ),
				esc_html( $label )
			);
		}

		$class = $tag->get_class_option( wpcf7_form_controls_class( $tag->type ) ) . ' cf7e-product';

		return sprintf(
			'<span class="wpcf7-form-control-wrap" data-name="%1$s"><select name="%1$s" class="%2$s"%3$s>%4$s</select>%5$s</span>',
			esc_attr( $tag->name ),
			esc_attr( trim( $class ) ),
			$tag->is_required() ? ' aria-required="true"' : '',
			$options,
			wpcf7_get_validation_error( $tag->name )
		);
	}

	/**
	 * @param \WPCF7_FormTag $tag
	 * @return array<int, \WC_Product>
	 */
	private function products( $tag ): array {
		$limit = (int) $tag->get_option( 'limit', 'int', true );
		$args  = array(
			'status'  => 'publish',
			'limit'   => $limit > 0 ? min( 200, $limit ) : 50,
			'orderby' => 'title',
			'order'   => 'ASC',
		);

		$category = sanitize_title( (string) ( $tag->get_option( 'cat', '', true ) ?: '' ) );
		if ( '' !== $category ) {
			$args['category'] = array( $category );
		}

		if ( $tag->has_option( 'in_stock' ) ) {
			$args['stock_status'] = 'instock';
		}

		$products = wc_get_products( $args );

		return is_array( $products ) ? $products : array();
	}

	/**
	 * Without WooCommerce the field renders an explanation instead of a control,
	 * so there is nothing the visitor could have filled in — requiring it would
	 * make the whole form impossible to submit.
	 *
	 * @param \WPCF7_Validation                   $result
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 * @return \WPCF7_Validation
	 */
	public function validate( $result, $tag ) {
		if ( ! self::is_available() ) {
			return $result;
		}

		$result = $this->validate_required( $result, $tag );
		$tag    = new \WPCF7_FormTag( $tag );

		$value = isset( $_POST[ $tag->name ] ) ? wp_unslash( $_POST[ $tag->name ] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
		$value = is_scalar( $value ) ? trim( (string) $value ) : '';

		// Empty is the placeholder option — whether that is acceptable was settled
		// by the required check above.
		if ( '' === $value ) {
			return $result;
		}

		// The dropdown offered a fixed list, so a name outside it was posted rather
		// than picked. Without this an enquiry can name any "product" it likes, and
		// the mail reads as though the shop sells it.
		$names = array_map( static fn( $product ) => $product->get_name(), $this->products( $tag ) );

		if ( ! in_array( $value, $names, true ) ) {
			$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );
		}

		return $result;
	}
}
