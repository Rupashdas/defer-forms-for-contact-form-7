/**
 * CF7 Essentials — the two things every front-end script here needed.
 *
 * Each of them carried its own copy of the same boot block: run now if the
 * document is ready, wait for DOMContentLoaded if it is not, and run again on
 * `wpcf7init` for forms that arrive later. Six copies of a six-line rule that is
 * easy to get subtly wrong — an optimisation plugin deferring scripts past
 * DOMContentLoaded broke exactly one of them once, and the fix went into that
 * one file.
 *
 * `el()` was the other: three identical element helpers in three files.
 *
 * This is a dependency of every other cf7e script, so it is on the page before
 * any of them run.
 */
( function () {
	'use strict';

	var cf7e = window.cf7e || ( window.cf7e = {} );

	/**
	 * Run something once the document is usable, and again whenever Contact Form
	 * 7 announces a form it rendered later (AJAX, popups, block editors).
	 *
	 * The readyState check matters: a deferred or async script can start after
	 * DOMContentLoaded has already fired, and waiting for an event that is never
	 * coming means the feature simply never starts.
	 */
	cf7e.ready = function ( fn ) {
		if ( 'loading' === document.readyState ) {
			document.addEventListener( 'DOMContentLoaded', fn );
		} else {
			fn();
		}

		document.addEventListener( 'wpcf7init', fn );
	};

	/**
	 * Hand every form this plugin renders to a callback, now and later.
	 *
	 * Callers guard against being run twice on the same form with their own
	 * `dataset` flag — `wpcf7init` fires per form, so this deliberately re-scans
	 * rather than trying to work out what is new.
	 */
	cf7e.forms = function ( fn ) {
		cf7e.ready( function () {
			document.querySelectorAll( '.wpcf7-form' ).forEach( fn );
		} );
	};

	/**
	 * Run something once Contact Form 7 has emptied a form.
	 *
	 * CF7 resets a form after a successful send, and again on load when the page
	 * came out of a cache. It does it with a plain `form.reset()`, which puts
	 * every control back to its default and dispatches nothing — no `input`, no
	 * `change`. Every widget here draws its state from those two events, so
	 * without this each one carries on showing the answers that have just been
	 * thrown away.
	 *
	 * Deferred by a tick on purpose: the `reset` event fires BEFORE the controls
	 * are restored, so a callback running immediately would re-read the values
	 * being discarded and conclude nothing had changed.
	 */
	cf7e.onReset = function ( form, fn ) {
		form.addEventListener( 'reset', function () {
			window.setTimeout( fn, 0 );
		} );
	};

	/**
	 * An element, its class and its text. textContent, never innerHTML — none of
	 * the callers has markup to place, and one of them is handling a form's own
	 * settings.
	 */
	cf7e.el = function ( tag, className, text ) {
		var node = document.createElement( tag );

		if ( className ) {
			node.className = className;
		}
		if ( text ) {
			node.textContent = text;
		}

		return node;
	};
} )();
