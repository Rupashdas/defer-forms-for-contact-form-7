/**
 * A "Visual Builder" link in each row of CF7's contact-forms list.
 *
 * CF7's list table applies no row-action filter, so the link is added in the
 * browser instead — reading each row's own edit link for the form id rather
 * than trying to rebuild the table's markup in PHP.
 *
 * Enqueued into the footer, so the rows this walks are already parsed.
 */
( function () {
	'use strict';

	var data = window.df7RowAction || {};

	if ( ! data.base || ! data.label ) {
		return;
	}

	document.querySelectorAll( '.wp-list-table .row-actions' ).forEach( function ( actions ) {
		var link = actions.querySelector( 'a[href*="action=edit"]' );

		if ( ! link ) {
			return;
		}

		var id = link.href.match( /[?&]post=(\d+)/ );

		if ( ! id ) {
			return;
		}

		var a = document.createElement( 'a' );
		a.href = data.base + id[ 1 ];
		a.textContent = data.label;

		var span = document.createElement( 'span' );
		span.className = 'df7-builder-link';
		span.appendChild( document.createTextNode( ' | ' ) );
		span.appendChild( a );

		actions.appendChild( span );
	} );
} )();
