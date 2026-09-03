/**
 * Defer Forms — range slider. Wraps each slider so it can sit next to a live value
 * badge, and mirrors the current position into the `--df7-range-p` custom
 * property that range.css uses to fill the track.
 */
( function () {
	'use strict';

	function setup( input ) {
		if ( input.dataset.df7Range ) {
			return;
		}
		input.dataset.df7Range = '1';

		// A span (not a div) keeps the markup valid inside CF7's control wrap.
		var wrap = document.createElement( 'span' );
		wrap.className = 'df7-range';
		input.parentNode.insertBefore( wrap, input );
		wrap.appendChild( input );

		var badge = document.createElement( 'output' );
		badge.className = 'df7-range-value';
		wrap.appendChild( badge );

		var update = function () {
			var min = parseFloat( input.min );
			var max = parseFloat( input.max );
			var val = parseFloat( input.value );

			if ( isNaN( min ) ) { min = 0; }
			if ( isNaN( max ) ) { max = 100; }
			if ( isNaN( val ) ) { val = min; }

			var percent = max > min ? ( ( val - min ) / ( max - min ) ) * 100 : 0;
			input.style.setProperty( '--df7-range-p', percent + '%' );
			badge.textContent = input.value;
		};

		input.addEventListener( 'input', update );
		input.addEventListener( 'change', update );
		if ( input.form ) {
			window.df7.onReset( input.form, update );
		}
		update();
	}

	window.df7.forms( function ( form ) {
		form.querySelectorAll( 'input[type="range"]' ).forEach( setup );
	} );
} )();
