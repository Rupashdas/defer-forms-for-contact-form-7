<?php
/**
 * Country dropdown field. A registered CF7 form-tag `[country]` that renders a
 * <select> populated from a built-in country list — so the saved form markup
 * stays clean (`[country* name]`) instead of baking ~250 options into it.
 *
 * @package CF7_Essentials
 */

declare( strict_types=1 );

namespace CF7E\CF7;

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

		$options = '<option value="">' . esc_html__( 'Select a country…', 'essentials-for-contact-form-7' ) . '</option>';

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
		// (cf7e-search), which the select widget reads.
		$class = $tag->get_class_option( wpcf7_form_controls_class( $tag->type ) ) . ' cf7e-country';

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
			'Afghanistan'                      => __( 'Afghanistan', 'essentials-for-contact-form-7' ),
			'Albania'                          => __( 'Albania', 'essentials-for-contact-form-7' ),
			'Algeria'                          => __( 'Algeria', 'essentials-for-contact-form-7' ),
			'Andorra'                          => __( 'Andorra', 'essentials-for-contact-form-7' ),
			'Angola'                           => __( 'Angola', 'essentials-for-contact-form-7' ),
			'Antigua and Barbuda'              => __( 'Antigua and Barbuda', 'essentials-for-contact-form-7' ),
			'Argentina'                        => __( 'Argentina', 'essentials-for-contact-form-7' ),
			'Armenia'                          => __( 'Armenia', 'essentials-for-contact-form-7' ),
			'Australia'                        => __( 'Australia', 'essentials-for-contact-form-7' ),
			'Austria'                          => __( 'Austria', 'essentials-for-contact-form-7' ),
			'Azerbaijan'                       => __( 'Azerbaijan', 'essentials-for-contact-form-7' ),
			'Bahamas'                          => __( 'Bahamas', 'essentials-for-contact-form-7' ),
			'Bahrain'                          => __( 'Bahrain', 'essentials-for-contact-form-7' ),
			'Bangladesh'                       => __( 'Bangladesh', 'essentials-for-contact-form-7' ),
			'Barbados'                         => __( 'Barbados', 'essentials-for-contact-form-7' ),
			'Belarus'                          => __( 'Belarus', 'essentials-for-contact-form-7' ),
			'Belgium'                          => __( 'Belgium', 'essentials-for-contact-form-7' ),
			'Belize'                           => __( 'Belize', 'essentials-for-contact-form-7' ),
			'Benin'                            => __( 'Benin', 'essentials-for-contact-form-7' ),
			'Bhutan'                           => __( 'Bhutan', 'essentials-for-contact-form-7' ),
			'Bolivia'                          => __( 'Bolivia', 'essentials-for-contact-form-7' ),
			'Bosnia and Herzegovina'           => __( 'Bosnia and Herzegovina', 'essentials-for-contact-form-7' ),
			'Botswana'                         => __( 'Botswana', 'essentials-for-contact-form-7' ),
			'Brazil'                           => __( 'Brazil', 'essentials-for-contact-form-7' ),
			'Brunei'                           => __( 'Brunei', 'essentials-for-contact-form-7' ),
			'Bulgaria'                         => __( 'Bulgaria', 'essentials-for-contact-form-7' ),
			'Burkina Faso'                     => __( 'Burkina Faso', 'essentials-for-contact-form-7' ),
			'Burundi'                          => __( 'Burundi', 'essentials-for-contact-form-7' ),
			'Cabo Verde'                       => __( 'Cabo Verde', 'essentials-for-contact-form-7' ),
			'Cambodia'                         => __( 'Cambodia', 'essentials-for-contact-form-7' ),
			'Cameroon'                         => __( 'Cameroon', 'essentials-for-contact-form-7' ),
			'Canada'                           => __( 'Canada', 'essentials-for-contact-form-7' ),
			'Central African Republic'         => __( 'Central African Republic', 'essentials-for-contact-form-7' ),
			'Chad'                             => __( 'Chad', 'essentials-for-contact-form-7' ),
			'Chile'                            => __( 'Chile', 'essentials-for-contact-form-7' ),
			'China'                            => __( 'China', 'essentials-for-contact-form-7' ),
			'Colombia'                         => __( 'Colombia', 'essentials-for-contact-form-7' ),
			'Comoros'                          => __( 'Comoros', 'essentials-for-contact-form-7' ),
			'Congo'                            => __( 'Congo', 'essentials-for-contact-form-7' ),
			'Costa Rica'                       => __( 'Costa Rica', 'essentials-for-contact-form-7' ),
			'Croatia'                          => __( 'Croatia', 'essentials-for-contact-form-7' ),
			'Cuba'                             => __( 'Cuba', 'essentials-for-contact-form-7' ),
			'Cyprus'                           => __( 'Cyprus', 'essentials-for-contact-form-7' ),
			'Czechia'                          => __( 'Czechia', 'essentials-for-contact-form-7' ),
			'Denmark'                          => __( 'Denmark', 'essentials-for-contact-form-7' ),
			'Djibouti'                         => __( 'Djibouti', 'essentials-for-contact-form-7' ),
			'Dominica'                         => __( 'Dominica', 'essentials-for-contact-form-7' ),
			'Dominican Republic'               => __( 'Dominican Republic', 'essentials-for-contact-form-7' ),
			'Ecuador'                          => __( 'Ecuador', 'essentials-for-contact-form-7' ),
			'Egypt'                            => __( 'Egypt', 'essentials-for-contact-form-7' ),
			'El Salvador'                      => __( 'El Salvador', 'essentials-for-contact-form-7' ),
			'Equatorial Guinea'                => __( 'Equatorial Guinea', 'essentials-for-contact-form-7' ),
			'Eritrea'                          => __( 'Eritrea', 'essentials-for-contact-form-7' ),
			'Estonia'                          => __( 'Estonia', 'essentials-for-contact-form-7' ),
			'Eswatini'                         => __( 'Eswatini', 'essentials-for-contact-form-7' ),
			'Ethiopia'                         => __( 'Ethiopia', 'essentials-for-contact-form-7' ),
			'Fiji'                             => __( 'Fiji', 'essentials-for-contact-form-7' ),
			'Finland'                          => __( 'Finland', 'essentials-for-contact-form-7' ),
			'France'                           => __( 'France', 'essentials-for-contact-form-7' ),
			'Gabon'                            => __( 'Gabon', 'essentials-for-contact-form-7' ),
			'Gambia'                           => __( 'Gambia', 'essentials-for-contact-form-7' ),
			'Georgia'                          => __( 'Georgia', 'essentials-for-contact-form-7' ),
			'Germany'                          => __( 'Germany', 'essentials-for-contact-form-7' ),
			'Ghana'                            => __( 'Ghana', 'essentials-for-contact-form-7' ),
			'Greece'                           => __( 'Greece', 'essentials-for-contact-form-7' ),
			'Grenada'                          => __( 'Grenada', 'essentials-for-contact-form-7' ),
			'Guatemala'                        => __( 'Guatemala', 'essentials-for-contact-form-7' ),
			'Guinea'                           => __( 'Guinea', 'essentials-for-contact-form-7' ),
			'Guinea-Bissau'                    => __( 'Guinea-Bissau', 'essentials-for-contact-form-7' ),
			'Guyana'                           => __( 'Guyana', 'essentials-for-contact-form-7' ),
			'Haiti'                            => __( 'Haiti', 'essentials-for-contact-form-7' ),
			'Honduras'                         => __( 'Honduras', 'essentials-for-contact-form-7' ),
			'Hungary'                          => __( 'Hungary', 'essentials-for-contact-form-7' ),
			'Iceland'                          => __( 'Iceland', 'essentials-for-contact-form-7' ),
			'India'                            => __( 'India', 'essentials-for-contact-form-7' ),
			'Indonesia'                        => __( 'Indonesia', 'essentials-for-contact-form-7' ),
			'Iran'                             => __( 'Iran', 'essentials-for-contact-form-7' ),
			'Iraq'                             => __( 'Iraq', 'essentials-for-contact-form-7' ),
			'Ireland'                          => __( 'Ireland', 'essentials-for-contact-form-7' ),
			'Israel'                           => __( 'Israel', 'essentials-for-contact-form-7' ),
			'Italy'                            => __( 'Italy', 'essentials-for-contact-form-7' ),
			'Jamaica'                          => __( 'Jamaica', 'essentials-for-contact-form-7' ),
			'Japan'                            => __( 'Japan', 'essentials-for-contact-form-7' ),
			'Jordan'                           => __( 'Jordan', 'essentials-for-contact-form-7' ),
			'Kazakhstan'                       => __( 'Kazakhstan', 'essentials-for-contact-form-7' ),
			'Kenya'                            => __( 'Kenya', 'essentials-for-contact-form-7' ),
			'Kiribati'                         => __( 'Kiribati', 'essentials-for-contact-form-7' ),
			'Kuwait'                           => __( 'Kuwait', 'essentials-for-contact-form-7' ),
			'Kyrgyzstan'                       => __( 'Kyrgyzstan', 'essentials-for-contact-form-7' ),
			'Laos'                             => __( 'Laos', 'essentials-for-contact-form-7' ),
			'Latvia'                           => __( 'Latvia', 'essentials-for-contact-form-7' ),
			'Lebanon'                          => __( 'Lebanon', 'essentials-for-contact-form-7' ),
			'Lesotho'                          => __( 'Lesotho', 'essentials-for-contact-form-7' ),
			'Liberia'                          => __( 'Liberia', 'essentials-for-contact-form-7' ),
			'Libya'                            => __( 'Libya', 'essentials-for-contact-form-7' ),
			'Liechtenstein'                    => __( 'Liechtenstein', 'essentials-for-contact-form-7' ),
			'Lithuania'                        => __( 'Lithuania', 'essentials-for-contact-form-7' ),
			'Luxembourg'                       => __( 'Luxembourg', 'essentials-for-contact-form-7' ),
			'Madagascar'                       => __( 'Madagascar', 'essentials-for-contact-form-7' ),
			'Malawi'                           => __( 'Malawi', 'essentials-for-contact-form-7' ),
			'Malaysia'                         => __( 'Malaysia', 'essentials-for-contact-form-7' ),
			'Maldives'                         => __( 'Maldives', 'essentials-for-contact-form-7' ),
			'Mali'                             => __( 'Mali', 'essentials-for-contact-form-7' ),
			'Malta'                            => __( 'Malta', 'essentials-for-contact-form-7' ),
			'Marshall Islands'                 => __( 'Marshall Islands', 'essentials-for-contact-form-7' ),
			'Mauritania'                       => __( 'Mauritania', 'essentials-for-contact-form-7' ),
			'Mauritius'                        => __( 'Mauritius', 'essentials-for-contact-form-7' ),
			'Mexico'                           => __( 'Mexico', 'essentials-for-contact-form-7' ),
			'Micronesia'                       => __( 'Micronesia', 'essentials-for-contact-form-7' ),
			'Moldova'                          => __( 'Moldova', 'essentials-for-contact-form-7' ),
			'Monaco'                           => __( 'Monaco', 'essentials-for-contact-form-7' ),
			'Mongolia'                         => __( 'Mongolia', 'essentials-for-contact-form-7' ),
			'Montenegro'                       => __( 'Montenegro', 'essentials-for-contact-form-7' ),
			'Morocco'                          => __( 'Morocco', 'essentials-for-contact-form-7' ),
			'Mozambique'                       => __( 'Mozambique', 'essentials-for-contact-form-7' ),
			'Myanmar'                          => __( 'Myanmar', 'essentials-for-contact-form-7' ),
			'Namibia'                          => __( 'Namibia', 'essentials-for-contact-form-7' ),
			'Nauru'                            => __( 'Nauru', 'essentials-for-contact-form-7' ),
			'Nepal'                            => __( 'Nepal', 'essentials-for-contact-form-7' ),
			'Netherlands'                      => __( 'Netherlands', 'essentials-for-contact-form-7' ),
			'New Zealand'                      => __( 'New Zealand', 'essentials-for-contact-form-7' ),
			'Nicaragua'                        => __( 'Nicaragua', 'essentials-for-contact-form-7' ),
			'Niger'                            => __( 'Niger', 'essentials-for-contact-form-7' ),
			'Nigeria'                          => __( 'Nigeria', 'essentials-for-contact-form-7' ),
			'North Korea'                      => __( 'North Korea', 'essentials-for-contact-form-7' ),
			'North Macedonia'                  => __( 'North Macedonia', 'essentials-for-contact-form-7' ),
			'Norway'                           => __( 'Norway', 'essentials-for-contact-form-7' ),
			'Oman'                             => __( 'Oman', 'essentials-for-contact-form-7' ),
			'Pakistan'                         => __( 'Pakistan', 'essentials-for-contact-form-7' ),
			'Palau'                            => __( 'Palau', 'essentials-for-contact-form-7' ),
			'Palestine'                        => __( 'Palestine', 'essentials-for-contact-form-7' ),
			'Panama'                           => __( 'Panama', 'essentials-for-contact-form-7' ),
			'Papua New Guinea'                 => __( 'Papua New Guinea', 'essentials-for-contact-form-7' ),
			'Paraguay'                         => __( 'Paraguay', 'essentials-for-contact-form-7' ),
			'Peru'                             => __( 'Peru', 'essentials-for-contact-form-7' ),
			'Philippines'                      => __( 'Philippines', 'essentials-for-contact-form-7' ),
			'Poland'                           => __( 'Poland', 'essentials-for-contact-form-7' ),
			'Portugal'                         => __( 'Portugal', 'essentials-for-contact-form-7' ),
			'Qatar'                            => __( 'Qatar', 'essentials-for-contact-form-7' ),
			'Romania'                          => __( 'Romania', 'essentials-for-contact-form-7' ),
			'Russia'                           => __( 'Russia', 'essentials-for-contact-form-7' ),
			'Rwanda'                           => __( 'Rwanda', 'essentials-for-contact-form-7' ),
			'Saint Kitts and Nevis'            => __( 'Saint Kitts and Nevis', 'essentials-for-contact-form-7' ),
			'Saint Lucia'                      => __( 'Saint Lucia', 'essentials-for-contact-form-7' ),
			'Saint Vincent and the Grenadines' => __( 'Saint Vincent and the Grenadines', 'essentials-for-contact-form-7' ),
			'Samoa'                            => __( 'Samoa', 'essentials-for-contact-form-7' ),
			'San Marino'                       => __( 'San Marino', 'essentials-for-contact-form-7' ),
			'Sao Tome and Principe'            => __( 'Sao Tome and Principe', 'essentials-for-contact-form-7' ),
			'Saudi Arabia'                     => __( 'Saudi Arabia', 'essentials-for-contact-form-7' ),
			'Senegal'                          => __( 'Senegal', 'essentials-for-contact-form-7' ),
			'Serbia'                           => __( 'Serbia', 'essentials-for-contact-form-7' ),
			'Seychelles'                       => __( 'Seychelles', 'essentials-for-contact-form-7' ),
			'Sierra Leone'                     => __( 'Sierra Leone', 'essentials-for-contact-form-7' ),
			'Singapore'                        => __( 'Singapore', 'essentials-for-contact-form-7' ),
			'Slovakia'                         => __( 'Slovakia', 'essentials-for-contact-form-7' ),
			'Slovenia'                         => __( 'Slovenia', 'essentials-for-contact-form-7' ),
			'Solomon Islands'                  => __( 'Solomon Islands', 'essentials-for-contact-form-7' ),
			'Somalia'                          => __( 'Somalia', 'essentials-for-contact-form-7' ),
			'South Africa'                     => __( 'South Africa', 'essentials-for-contact-form-7' ),
			'South Korea'                      => __( 'South Korea', 'essentials-for-contact-form-7' ),
			'South Sudan'                      => __( 'South Sudan', 'essentials-for-contact-form-7' ),
			'Spain'                            => __( 'Spain', 'essentials-for-contact-form-7' ),
			'Sri Lanka'                        => __( 'Sri Lanka', 'essentials-for-contact-form-7' ),
			'Sudan'                            => __( 'Sudan', 'essentials-for-contact-form-7' ),
			'Suriname'                         => __( 'Suriname', 'essentials-for-contact-form-7' ),
			'Sweden'                           => __( 'Sweden', 'essentials-for-contact-form-7' ),
			'Switzerland'                      => __( 'Switzerland', 'essentials-for-contact-form-7' ),
			'Syria'                            => __( 'Syria', 'essentials-for-contact-form-7' ),
			'Taiwan'                           => __( 'Taiwan', 'essentials-for-contact-form-7' ),
			'Tajikistan'                       => __( 'Tajikistan', 'essentials-for-contact-form-7' ),
			'Tanzania'                         => __( 'Tanzania', 'essentials-for-contact-form-7' ),
			'Thailand'                         => __( 'Thailand', 'essentials-for-contact-form-7' ),
			'Timor-Leste'                      => __( 'Timor-Leste', 'essentials-for-contact-form-7' ),
			'Togo'                             => __( 'Togo', 'essentials-for-contact-form-7' ),
			'Tonga'                            => __( 'Tonga', 'essentials-for-contact-form-7' ),
			'Trinidad and Tobago'              => __( 'Trinidad and Tobago', 'essentials-for-contact-form-7' ),
			'Tunisia'                          => __( 'Tunisia', 'essentials-for-contact-form-7' ),
			'Turkey'                           => __( 'Turkey', 'essentials-for-contact-form-7' ),
			'Turkmenistan'                     => __( 'Turkmenistan', 'essentials-for-contact-form-7' ),
			'Tuvalu'                           => __( 'Tuvalu', 'essentials-for-contact-form-7' ),
			'Uganda'                           => __( 'Uganda', 'essentials-for-contact-form-7' ),
			'Ukraine'                          => __( 'Ukraine', 'essentials-for-contact-form-7' ),
			'United Arab Emirates'             => __( 'United Arab Emirates', 'essentials-for-contact-form-7' ),
			'United Kingdom'                   => __( 'United Kingdom', 'essentials-for-contact-form-7' ),
			'United States'                    => __( 'United States', 'essentials-for-contact-form-7' ),
			'Uruguay'                          => __( 'Uruguay', 'essentials-for-contact-form-7' ),
			'Uzbekistan'                       => __( 'Uzbekistan', 'essentials-for-contact-form-7' ),
			'Vanuatu'                          => __( 'Vanuatu', 'essentials-for-contact-form-7' ),
			'Vatican City'                     => __( 'Vatican City', 'essentials-for-contact-form-7' ),
			'Venezuela'                        => __( 'Venezuela', 'essentials-for-contact-form-7' ),
			'Vietnam'                          => __( 'Vietnam', 'essentials-for-contact-form-7' ),
			'Yemen'                            => __( 'Yemen', 'essentials-for-contact-form-7' ),
			'Zambia'                           => __( 'Zambia', 'essentials-for-contact-form-7' ),
			'Zimbabwe'                         => __( 'Zimbabwe', 'essentials-for-contact-form-7' ),
		);
	}
}
