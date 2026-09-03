/**
 * Defer Forms — front-end date picker (flatpickr) for CF7 date fields.
 *
 * Single dates only. There was a range mode here for a date-range field that was
 * never built: nothing emits `df7-daterange`, and if anything had, flatpickr
 * would have written `2024-01-01 to 2024-01-05` into a field Contact Form 7
 * validates as a date — so every submission would have been rejected. It comes
 * back with the field, and with a validator that understands it.
 */
( function () {
	'use strict';

	function init( input ) {
		if ( input._df7Fp || ! window.flatpickr ) {
			return;
		}

		var opts = {
			dateFormat: 'Y-m-d',
			allowInput: true,
			disableMobile: true,
		};

		if ( input.getAttribute( 'min' ) ) {
			opts.minDate = input.getAttribute( 'min' );
		}
		if ( input.getAttribute( 'max' ) ) {
			opts.maxDate = input.getAttribute( 'max' );
		}
		// Swap the native date UI for flatpickr's so they don't compete.
		if ( 'date' === input.type ) {
			input.type = 'text';
		}

		input._df7Fp = window.flatpickr( input, opts );
	}

	window.df7.forms( function ( form ) {
		form.querySelectorAll( 'input.df7-fp' ).forEach( init );
	} );
} )();
