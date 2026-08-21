<?php
/**
 * Country dropdown field. A registered CF7 form-tag `[country]` that renders a
 * <select> populated from a built-in country list — so the saved form markup
 * stays clean (`[country* name]`) instead of baking ~250 options into it.
 *
 * @package CF7_Nova_Lite
 */

declare( strict_types=1 );

namespace CF7NL\CF7;

defined( 'ABSPATH' ) || exit;

final class Country {

	use Required_Check {
		validate as validate_required;
	}

	public function register_hooks(): void {
		add_action( 'wpcf7_init', array( $this, 'add_form_tag' ) );
		add_filter( 'wpcf7_validate_country', array( $this, 'validate' ), 10, 2 );
		add_filter( 'wpcf7_validate_country*', array( $this, 'validate' ), 10, 2 );
	}

	/**
	 * A dropdown only offers what it rendered, so anything else was not chosen —
	 * it was posted. Contact Form 7 derives an enum rule for its own select from
	 * its schema; a tag registered here gets none, so the list has to be checked
	 * against by hand or the field means nothing once the form leaves the browser.
	 *
	 * @param \WPCF7_Validation                   $result
	 * @param \WPCF7_FormTag|array<string, mixed> $tag
	 * @return \WPCF7_Validation
	 */
	public function validate( $result, $tag ) {
		$result = $this->validate_required( $result, $tag );
		$tag    = new \WPCF7_FormTag( $tag );

		$value = isset( $_POST[ $tag->name ] ) ? wp_unslash( $_POST[ $tag->name ] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
		$value = is_scalar( $value ) ? trim( (string) $value ) : '';

		// Empty is the placeholder option; whether that is allowed is the required
		// check's business, already settled above.
		//
		// Checked against the keys, which are the canonical English names — the
		// values are the translated labels, and what a browser posts is the
		// option's value.
		if ( '' === $value || array_key_exists( $value, self::countries() ) ) {
			return $result;
		}

		$result->invalidate( $tag, wpcf7_get_message( 'invalid_required' ) );

		return $result;
	}

	public function add_form_tag(): void {
		if ( ! function_exists( 'wpcf7_add_form_tag' ) ) {
			return;
		}
		wpcf7_add_form_tag(
			array( 'country', 'country*' ),
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

		// Prefill is handled here rather than by the shared Prefill filter: a
		// select carries its choices in `values`, so the match is a `selected`
		// attribute instead of a replacement value.
		$prefill  = (string) ( $tag->get_option( 'prefill', '', true ) ?: '' );
		$selected = '' !== $prefill ? Value_Source::resolve( $prefill ) : '';

		$options = '<option value="">' . esc_html__( 'Select a country…', 'cf7-nova-lite' ) . '</option>';

		// Value and label are deliberately different now. The value is the
		// canonical English name, so what lands in the submissions table does not
		// change the day somebody switches the site language — a table holding
		// "Bangladesh" for half its rows and the translation for the rest is not
		// something you can sort, filter or export sensibly. The label is what a
		// visitor reads, and that follows the locale.
		foreach ( self::countries() as $name => $label ) {
			// Either spelling satisfies a `prefill:`, since a link could carry
			// the canonical name or the one the visitor saw.
			$is_selected = 0 === strcasecmp( $name, $selected ) || 0 === strcasecmp( $label, $selected );

			$options .= sprintf(
				'<option value="%1$s"%3$s>%2$s</option>',
				esc_attr( $name ),
				esc_html( $label ),
				$is_selected ? ' selected' : ''
			);
		}

		// get_class_option carries the user's classes plus our marker classes
		// (cf7nl-search), which the select widget reads.
		$class = $tag->get_class_option( wpcf7_form_controls_class( $tag->type ) ) . ' cf7nl-country';

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
	 * Canonical English name => the name to show, in the site's language.
	 *
	 * @return array<string, string>
	 */
	private static function countries(): array {
		return array(
			'Afghanistan'                      => __( 'Afghanistan', 'cf7-nova-lite' ),
			'Albania'                          => __( 'Albania', 'cf7-nova-lite' ),
			'Algeria'                          => __( 'Algeria', 'cf7-nova-lite' ),
			'Andorra'                          => __( 'Andorra', 'cf7-nova-lite' ),
			'Angola'                           => __( 'Angola', 'cf7-nova-lite' ),
			'Antigua and Barbuda'              => __( 'Antigua and Barbuda', 'cf7-nova-lite' ),
			'Argentina'                        => __( 'Argentina', 'cf7-nova-lite' ),
			'Armenia'                          => __( 'Armenia', 'cf7-nova-lite' ),
			'Australia'                        => __( 'Australia', 'cf7-nova-lite' ),
			'Austria'                          => __( 'Austria', 'cf7-nova-lite' ),
			'Azerbaijan'                       => __( 'Azerbaijan', 'cf7-nova-lite' ),
			'Bahamas'                          => __( 'Bahamas', 'cf7-nova-lite' ),
			'Bahrain'                          => __( 'Bahrain', 'cf7-nova-lite' ),
			'Bangladesh'                       => __( 'Bangladesh', 'cf7-nova-lite' ),
			'Barbados'                         => __( 'Barbados', 'cf7-nova-lite' ),
			'Belarus'                          => __( 'Belarus', 'cf7-nova-lite' ),
			'Belgium'                          => __( 'Belgium', 'cf7-nova-lite' ),
			'Belize'                           => __( 'Belize', 'cf7-nova-lite' ),
			'Benin'                            => __( 'Benin', 'cf7-nova-lite' ),
			'Bhutan'                           => __( 'Bhutan', 'cf7-nova-lite' ),
			'Bolivia'                          => __( 'Bolivia', 'cf7-nova-lite' ),
			'Bosnia and Herzegovina'           => __( 'Bosnia and Herzegovina', 'cf7-nova-lite' ),
			'Botswana'                         => __( 'Botswana', 'cf7-nova-lite' ),
			'Brazil'                           => __( 'Brazil', 'cf7-nova-lite' ),
			'Brunei'                           => __( 'Brunei', 'cf7-nova-lite' ),
			'Bulgaria'                         => __( 'Bulgaria', 'cf7-nova-lite' ),
			'Burkina Faso'                     => __( 'Burkina Faso', 'cf7-nova-lite' ),
			'Burundi'                          => __( 'Burundi', 'cf7-nova-lite' ),
			'Cabo Verde'                       => __( 'Cabo Verde', 'cf7-nova-lite' ),
			'Cambodia'                         => __( 'Cambodia', 'cf7-nova-lite' ),
			'Cameroon'                         => __( 'Cameroon', 'cf7-nova-lite' ),
			'Canada'                           => __( 'Canada', 'cf7-nova-lite' ),
			'Central African Republic'         => __( 'Central African Republic', 'cf7-nova-lite' ),
			'Chad'                             => __( 'Chad', 'cf7-nova-lite' ),
			'Chile'                            => __( 'Chile', 'cf7-nova-lite' ),
			'China'                            => __( 'China', 'cf7-nova-lite' ),
			'Colombia'                         => __( 'Colombia', 'cf7-nova-lite' ),
			'Comoros'                          => __( 'Comoros', 'cf7-nova-lite' ),
			'Congo'                            => __( 'Congo', 'cf7-nova-lite' ),
			'Costa Rica'                       => __( 'Costa Rica', 'cf7-nova-lite' ),
			'Croatia'                          => __( 'Croatia', 'cf7-nova-lite' ),
			'Cuba'                             => __( 'Cuba', 'cf7-nova-lite' ),
			'Cyprus'                           => __( 'Cyprus', 'cf7-nova-lite' ),
			'Czechia'                          => __( 'Czechia', 'cf7-nova-lite' ),
			'Denmark'                          => __( 'Denmark', 'cf7-nova-lite' ),
			'Djibouti'                         => __( 'Djibouti', 'cf7-nova-lite' ),
			'Dominica'                         => __( 'Dominica', 'cf7-nova-lite' ),
			'Dominican Republic'               => __( 'Dominican Republic', 'cf7-nova-lite' ),
			'Ecuador'                          => __( 'Ecuador', 'cf7-nova-lite' ),
			'Egypt'                            => __( 'Egypt', 'cf7-nova-lite' ),
			'El Salvador'                      => __( 'El Salvador', 'cf7-nova-lite' ),
			'Equatorial Guinea'                => __( 'Equatorial Guinea', 'cf7-nova-lite' ),
			'Eritrea'                          => __( 'Eritrea', 'cf7-nova-lite' ),
			'Estonia'                          => __( 'Estonia', 'cf7-nova-lite' ),
			'Eswatini'                         => __( 'Eswatini', 'cf7-nova-lite' ),
			'Ethiopia'                         => __( 'Ethiopia', 'cf7-nova-lite' ),
			'Fiji'                             => __( 'Fiji', 'cf7-nova-lite' ),
			'Finland'                          => __( 'Finland', 'cf7-nova-lite' ),
			'France'                           => __( 'France', 'cf7-nova-lite' ),
			'Gabon'                            => __( 'Gabon', 'cf7-nova-lite' ),
			'Gambia'                           => __( 'Gambia', 'cf7-nova-lite' ),
			'Georgia'                          => __( 'Georgia', 'cf7-nova-lite' ),
			'Germany'                          => __( 'Germany', 'cf7-nova-lite' ),
			'Ghana'                            => __( 'Ghana', 'cf7-nova-lite' ),
			'Greece'                           => __( 'Greece', 'cf7-nova-lite' ),
			'Grenada'                          => __( 'Grenada', 'cf7-nova-lite' ),
			'Guatemala'                        => __( 'Guatemala', 'cf7-nova-lite' ),
			'Guinea'                           => __( 'Guinea', 'cf7-nova-lite' ),
			'Guinea-Bissau'                    => __( 'Guinea-Bissau', 'cf7-nova-lite' ),
			'Guyana'                           => __( 'Guyana', 'cf7-nova-lite' ),
			'Haiti'                            => __( 'Haiti', 'cf7-nova-lite' ),
			'Honduras'                         => __( 'Honduras', 'cf7-nova-lite' ),
			'Hungary'                          => __( 'Hungary', 'cf7-nova-lite' ),
			'Iceland'                          => __( 'Iceland', 'cf7-nova-lite' ),
			'India'                            => __( 'India', 'cf7-nova-lite' ),
			'Indonesia'                        => __( 'Indonesia', 'cf7-nova-lite' ),
			'Iran'                             => __( 'Iran', 'cf7-nova-lite' ),
			'Iraq'                             => __( 'Iraq', 'cf7-nova-lite' ),
			'Ireland'                          => __( 'Ireland', 'cf7-nova-lite' ),
			'Israel'                           => __( 'Israel', 'cf7-nova-lite' ),
			'Italy'                            => __( 'Italy', 'cf7-nova-lite' ),
			'Jamaica'                          => __( 'Jamaica', 'cf7-nova-lite' ),
			'Japan'                            => __( 'Japan', 'cf7-nova-lite' ),
			'Jordan'                           => __( 'Jordan', 'cf7-nova-lite' ),
			'Kazakhstan'                       => __( 'Kazakhstan', 'cf7-nova-lite' ),
			'Kenya'                            => __( 'Kenya', 'cf7-nova-lite' ),
			'Kiribati'                         => __( 'Kiribati', 'cf7-nova-lite' ),
			'Kuwait'                           => __( 'Kuwait', 'cf7-nova-lite' ),
			'Kyrgyzstan'                       => __( 'Kyrgyzstan', 'cf7-nova-lite' ),
			'Laos'                             => __( 'Laos', 'cf7-nova-lite' ),
			'Latvia'                           => __( 'Latvia', 'cf7-nova-lite' ),
			'Lebanon'                          => __( 'Lebanon', 'cf7-nova-lite' ),
			'Lesotho'                          => __( 'Lesotho', 'cf7-nova-lite' ),
			'Liberia'                          => __( 'Liberia', 'cf7-nova-lite' ),
			'Libya'                            => __( 'Libya', 'cf7-nova-lite' ),
			'Liechtenstein'                    => __( 'Liechtenstein', 'cf7-nova-lite' ),
			'Lithuania'                        => __( 'Lithuania', 'cf7-nova-lite' ),
			'Luxembourg'                       => __( 'Luxembourg', 'cf7-nova-lite' ),
			'Madagascar'                       => __( 'Madagascar', 'cf7-nova-lite' ),
			'Malawi'                           => __( 'Malawi', 'cf7-nova-lite' ),
			'Malaysia'                         => __( 'Malaysia', 'cf7-nova-lite' ),
			'Maldives'                         => __( 'Maldives', 'cf7-nova-lite' ),
			'Mali'                             => __( 'Mali', 'cf7-nova-lite' ),
			'Malta'                            => __( 'Malta', 'cf7-nova-lite' ),
			'Marshall Islands'                 => __( 'Marshall Islands', 'cf7-nova-lite' ),
			'Mauritania'                       => __( 'Mauritania', 'cf7-nova-lite' ),
			'Mauritius'                        => __( 'Mauritius', 'cf7-nova-lite' ),
			'Mexico'                           => __( 'Mexico', 'cf7-nova-lite' ),
			'Micronesia'                       => __( 'Micronesia', 'cf7-nova-lite' ),
			'Moldova'                          => __( 'Moldova', 'cf7-nova-lite' ),
			'Monaco'                           => __( 'Monaco', 'cf7-nova-lite' ),
			'Mongolia'                         => __( 'Mongolia', 'cf7-nova-lite' ),
			'Montenegro'                       => __( 'Montenegro', 'cf7-nova-lite' ),
			'Morocco'                          => __( 'Morocco', 'cf7-nova-lite' ),
			'Mozambique'                       => __( 'Mozambique', 'cf7-nova-lite' ),
			'Myanmar'                          => __( 'Myanmar', 'cf7-nova-lite' ),
			'Namibia'                          => __( 'Namibia', 'cf7-nova-lite' ),
			'Nauru'                            => __( 'Nauru', 'cf7-nova-lite' ),
			'Nepal'                            => __( 'Nepal', 'cf7-nova-lite' ),
			'Netherlands'                      => __( 'Netherlands', 'cf7-nova-lite' ),
			'New Zealand'                      => __( 'New Zealand', 'cf7-nova-lite' ),
			'Nicaragua'                        => __( 'Nicaragua', 'cf7-nova-lite' ),
			'Niger'                            => __( 'Niger', 'cf7-nova-lite' ),
			'Nigeria'                          => __( 'Nigeria', 'cf7-nova-lite' ),
			'North Korea'                      => __( 'North Korea', 'cf7-nova-lite' ),
			'North Macedonia'                  => __( 'North Macedonia', 'cf7-nova-lite' ),
			'Norway'                           => __( 'Norway', 'cf7-nova-lite' ),
			'Oman'                             => __( 'Oman', 'cf7-nova-lite' ),
			'Pakistan'                         => __( 'Pakistan', 'cf7-nova-lite' ),
			'Palau'                            => __( 'Palau', 'cf7-nova-lite' ),
			'Palestine'                        => __( 'Palestine', 'cf7-nova-lite' ),
			'Panama'                           => __( 'Panama', 'cf7-nova-lite' ),
			'Papua New Guinea'                 => __( 'Papua New Guinea', 'cf7-nova-lite' ),
			'Paraguay'                         => __( 'Paraguay', 'cf7-nova-lite' ),
			'Peru'                             => __( 'Peru', 'cf7-nova-lite' ),
			'Philippines'                      => __( 'Philippines', 'cf7-nova-lite' ),
			'Poland'                           => __( 'Poland', 'cf7-nova-lite' ),
			'Portugal'                         => __( 'Portugal', 'cf7-nova-lite' ),
			'Qatar'                            => __( 'Qatar', 'cf7-nova-lite' ),
			'Romania'                          => __( 'Romania', 'cf7-nova-lite' ),
			'Russia'                           => __( 'Russia', 'cf7-nova-lite' ),
			'Rwanda'                           => __( 'Rwanda', 'cf7-nova-lite' ),
			'Saint Kitts and Nevis'            => __( 'Saint Kitts and Nevis', 'cf7-nova-lite' ),
			'Saint Lucia'                      => __( 'Saint Lucia', 'cf7-nova-lite' ),
			'Saint Vincent and the Grenadines' => __( 'Saint Vincent and the Grenadines', 'cf7-nova-lite' ),
			'Samoa'                            => __( 'Samoa', 'cf7-nova-lite' ),
			'San Marino'                       => __( 'San Marino', 'cf7-nova-lite' ),
			'Sao Tome and Principe'            => __( 'Sao Tome and Principe', 'cf7-nova-lite' ),
			'Saudi Arabia'                     => __( 'Saudi Arabia', 'cf7-nova-lite' ),
			'Senegal'                          => __( 'Senegal', 'cf7-nova-lite' ),
			'Serbia'                           => __( 'Serbia', 'cf7-nova-lite' ),
			'Seychelles'                       => __( 'Seychelles', 'cf7-nova-lite' ),
			'Sierra Leone'                     => __( 'Sierra Leone', 'cf7-nova-lite' ),
			'Singapore'                        => __( 'Singapore', 'cf7-nova-lite' ),
			'Slovakia'                         => __( 'Slovakia', 'cf7-nova-lite' ),
			'Slovenia'                         => __( 'Slovenia', 'cf7-nova-lite' ),
			'Solomon Islands'                  => __( 'Solomon Islands', 'cf7-nova-lite' ),
			'Somalia'                          => __( 'Somalia', 'cf7-nova-lite' ),
			'South Africa'                     => __( 'South Africa', 'cf7-nova-lite' ),
			'South Korea'                      => __( 'South Korea', 'cf7-nova-lite' ),
			'South Sudan'                      => __( 'South Sudan', 'cf7-nova-lite' ),
			'Spain'                            => __( 'Spain', 'cf7-nova-lite' ),
			'Sri Lanka'                        => __( 'Sri Lanka', 'cf7-nova-lite' ),
			'Sudan'                            => __( 'Sudan', 'cf7-nova-lite' ),
			'Suriname'                         => __( 'Suriname', 'cf7-nova-lite' ),
			'Sweden'                           => __( 'Sweden', 'cf7-nova-lite' ),
			'Switzerland'                      => __( 'Switzerland', 'cf7-nova-lite' ),
			'Syria'                            => __( 'Syria', 'cf7-nova-lite' ),
			'Taiwan'                           => __( 'Taiwan', 'cf7-nova-lite' ),
			'Tajikistan'                       => __( 'Tajikistan', 'cf7-nova-lite' ),
			'Tanzania'                         => __( 'Tanzania', 'cf7-nova-lite' ),
			'Thailand'                         => __( 'Thailand', 'cf7-nova-lite' ),
			'Timor-Leste'                      => __( 'Timor-Leste', 'cf7-nova-lite' ),
			'Togo'                             => __( 'Togo', 'cf7-nova-lite' ),
			'Tonga'                            => __( 'Tonga', 'cf7-nova-lite' ),
			'Trinidad and Tobago'              => __( 'Trinidad and Tobago', 'cf7-nova-lite' ),
			'Tunisia'                          => __( 'Tunisia', 'cf7-nova-lite' ),
			'Turkey'                           => __( 'Turkey', 'cf7-nova-lite' ),
			'Turkmenistan'                     => __( 'Turkmenistan', 'cf7-nova-lite' ),
			'Tuvalu'                           => __( 'Tuvalu', 'cf7-nova-lite' ),
			'Uganda'                           => __( 'Uganda', 'cf7-nova-lite' ),
			'Ukraine'                          => __( 'Ukraine', 'cf7-nova-lite' ),
			'United Arab Emirates'             => __( 'United Arab Emirates', 'cf7-nova-lite' ),
			'United Kingdom'                   => __( 'United Kingdom', 'cf7-nova-lite' ),
			'United States'                    => __( 'United States', 'cf7-nova-lite' ),
			'Uruguay'                          => __( 'Uruguay', 'cf7-nova-lite' ),
			'Uzbekistan'                       => __( 'Uzbekistan', 'cf7-nova-lite' ),
			'Vanuatu'                          => __( 'Vanuatu', 'cf7-nova-lite' ),
			'Vatican City'                     => __( 'Vatican City', 'cf7-nova-lite' ),
			'Venezuela'                        => __( 'Venezuela', 'cf7-nova-lite' ),
			'Vietnam'                          => __( 'Vietnam', 'cf7-nova-lite' ),
			'Yemen'                            => __( 'Yemen', 'cf7-nova-lite' ),
			'Zambia'                           => __( 'Zambia', 'cf7-nova-lite' ),
			'Zimbabwe'                         => __( 'Zimbabwe', 'cf7-nova-lite' ),
		);
	}
}
