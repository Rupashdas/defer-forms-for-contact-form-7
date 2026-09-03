/**
 * Defer Forms — multi-step forms. Splits a form into steps at each `.df7-pagebreak`
 * divider and adds Next/Back navigation with a progress bar. Steps are hidden with
 * CSS (not removed), so every field still submits from the final step.
 */
( function () {
	'use strict';

	var l10n = window.df7StepsL10n || {};
	var TEXT = {
		prev:   l10n.prev   || 'Back',
		next:   l10n.next   || 'Next',
		status: l10n.status || 'Step %1$d of %2$d',
		step:   l10n.step   || 'Step %d'
	};

	/**
	 * Fills `%d` and numbered `%1$d` placeholders from the extra arguments.
	 *
	 * Numbered ones matter here: "Step 2 of 5" is not that order in every
	 * language, and a translator who cannot move the numbers has to leave the
	 * sentence wrong.
	 */
	function sprintf( template ) {
		var values = Array.prototype.slice.call( arguments, 1 );
		var next = 0;
		return String( template ).replace( /%(?:(\d+)\$)?d/g, function ( whole, position ) {
			return values[ position ? position - 1 : next++ ];
		} );
	}

	// Nodes that must stay visible on every step (CF7 status / response output).
	var KEEP = [ 'screen-reader-response', 'wpcf7-response-output' ];

	function isStructural( node ) {
		if ( 1 !== node.nodeType ) {
			return true;
		}
		if ( KEEP.some( function ( className ) { return node.classList.contains( className ); } ) ) {
			return true;
		}
		return isHiddenBlock( node );
	}

	/**
	 * CF7's own block of hidden inputs (_wpcf7, _wpcf7_unit_tag and friends).
	 *
	 * It is the first child of every form, so putting a page break at the very
	 * top of a form otherwise opened on a step holding nothing a visitor can see.
	 * It is display:none anyway, so leaving it outside the steps costs nothing.
	 */
	function isHiddenBlock( node ) {
		return !! node.querySelector( 'input[type="hidden"]' ) &&
			! node.querySelector( 'input:not([type="hidden"]), select, textarea, button' ) &&
			'' === ( node.textContent || '' ).trim();
	}

	/**
	 * Remembering the step across a reload.
	 *
	 * sessionStorage, not localStorage: coming back to the page tomorrow and
	 * landing on step 4 of a form you no longer remember starting is worse than
	 * starting over. Dying with the tab is the behaviour people expect.
	 *
	 * Storage throws rather than returns null in private-mode Safari and when a
	 * visitor has blocked site data, so every access is guarded — a form that
	 * cannot remember its step must still work.
	 */
	function stepKey( form ) {
		// CF7's unit tag (wpcf7-f12-p34-o1) is what tells two copies of the same
		// form on one page apart. It is NOT on the <form> — that only carries an
		// id when the shortcode was given html_id — it is on the wrapping
		// .wpcf7 div and, more reliably, in this hidden field inside the form.
		var unit = form.querySelector( 'input[name="_wpcf7_unit_tag"]' );
		var tag  = ( unit && unit.value ) ||
			( form.closest( '.wpcf7' ) && form.closest( '.wpcf7' ).id ) ||
			form.id;

		return 'df7_step_' + ( tag || 'form' );
	}

	function readStep( form ) {
		try {
			var raw = window.sessionStorage.getItem( stepKey( form ) );
			var stored = parseInt( raw, 10 );
			return isNaN( stored ) || stored < 0 ? 0 : stored;
		} catch ( e ) {
			return 0;
		}
	}

	function writeStep( form, index ) {
		try {
			window.sessionStorage.setItem( stepKey( form ), String( index ) );
		} catch ( e ) {}
	}

	function forgetStep( form ) {
		try {
			window.sessionStorage.removeItem( stepKey( form ) );
		} catch ( e ) {}
	}

	/**
	 * The first step holding something the visitor still has to deal with, or -1
	 * when the whole form is in order.
	 *
	 * Restoring puts people back where they were without checking the steps
	 * behind them — whether the browser brought their answers back is its
	 * business, and second-guessing it made the restore unpredictable. The
	 * checking happens here instead, at the one moment it matters: on the way
	 * out. That also fixes something older, where a validation error on a step
	 * you were not looking at simply refused to submit with nothing on screen.
	 */
	function firstBadStep( steps ) {
		if ( ! window.df7Validate ) {
			return -1;
		}

		for ( var i = 0; i < steps.length; i++ ) {
			if ( window.df7Validate.container( steps[ i ] ) ) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * The first step holding a field the server refused, or -1 when the reply
	 * named none.
	 *
	 * Read off the reply and not the markup on purpose: Contact Form 7 writes
	 * its `.wpcf7-not-valid-tip` nodes a promise tick after it dispatches this
	 * event, so at the moment we are called there is nothing in the DOM to find.
	 * `invalid_fields[].field` is the tag name, which is what CF7 puts in
	 * `data-name` on the wrapper — the same pairing its own code looks up.
	 */
	function refusedStep( steps, response ) {
		var fields = ( response && response.invalid_fields ) || [];
		if ( ! fields.length ) {
			return -1;
		}

		var names = fields.map( function ( entry ) { return entry.field; } );

		for ( var i = 0; i < steps.length; i++ ) {
			var wraps = steps[ i ].querySelectorAll( '.wpcf7-form-control-wrap[data-name]' );
			var hit = Array.prototype.some.call( wraps, function ( wrap ) {
				return -1 !== names.indexOf( wrap.dataset.name );
			} );

			if ( hit ) {
				return i;
			}
		}

		return -1;
	}

	function build( form ) {
		if ( form.dataset.df7Steps || ! form.querySelector( '.df7-pagebreak' ) ) {
			return;
		}
		form.dataset.df7Steps = '1';

		// Group children into steps, splitting at each pagebreak divider. A divider
		// also carries the settings for the step that follows it, so they are read
		// off it — and kept with that group, not in a parallel array — before it is
		// taken out of the document. An empty group is dropped further down, and
		// its settings have to go with it rather than slide onto its neighbour.
		var groups = [ { settings: {}, nodes: [] } ];
		Array.prototype.slice.call( form.children ).forEach( function ( node ) {
			if ( node.classList && node.classList.contains( 'df7-pagebreak' ) ) {
				groups.push( { settings: Object.assign( {}, node.dataset ), nodes: [] } );
				node.parentNode.removeChild( node );
			} else if ( ! isStructural( node ) ) {
				groups[ groups.length - 1 ].nodes.push( node );
			}
		} );

		groups = groups.filter( function ( group ) { return group.nodes.length; } );
		if ( groups.length < 2 ) {
			return;
		}

		var steps = groups.map( function ( group ) {
			var step  = document.createElement( 'div' );
			var nodes = group.nodes;

			step.className = 'df7-step' + ( group.settings.class ? ' ' + group.settings.class : '' );
			if ( group.settings.id ) {
				step.id = group.settings.id;
			}

			nodes[ 0 ].parentNode.insertBefore( step, nodes[ 0 ] );

			if ( group.settings.title || group.settings.desc ) {
				step.appendChild( heading( group.settings ) );
			}

			nodes.forEach( function ( node ) { step.appendChild( node ); } );
			return step;
		} );

		var total   = steps.length;
		var current = 0;

		// Both indicators are always built; which one is seen is a class on the
		// form and a CSS rule, so a site owner changing the style never depends on
		// this file having been re-read from cache.
		var bar  = el( 'div', 'df7-steps-progress' );
		var fill = el( 'div', 'df7-steps-progress-fill' );
		bar.appendChild( fill );

		var marks = el( 'ol', 'df7-steps-marks' );
		var dots  = groups.map( function ( group, index ) {
			var mark  = el( 'li', 'df7-steps-mark' );
			var num   = el( 'span', 'df7-steps-mark-num' );
			var label = el( 'span', 'df7-steps-mark-label' );

			num.textContent   = String( index + 1 );
			label.textContent = group.settings.title || sprintf( TEXT.step, index + 1 );
			mark.appendChild( num );
			mark.appendChild( label );
			marks.appendChild( mark );
			return mark;
		} );

		var indicator = el( 'div', 'df7-steps-indicator' );
		indicator.appendChild( bar );
		indicator.appendChild( marks );
		steps[ 0 ].parentNode.insertBefore( indicator, steps[ 0 ] );

		var nav    = el( 'div', 'df7-steps-nav' );
		var prev   = btn( 'df7-step-prev', TEXT.prev );
		var status = el( 'span', 'df7-step-status' );
		var next   = btn( 'df7-step-next', TEXT.next );
		nav.appendChild( prev );
		nav.appendChild( status );
		nav.appendChild( next );
		steps[ total - 1 ].parentNode.insertBefore( nav, steps[ total - 1 ].nextSibling );

		// `remember` is off for the opening render: a visitor who only scrolled
		// past a form has not started filling it in, and writing a step for every
		// multi-step form on the page makes "never touched" indistinguishable
		// from "on step 1".
		function show( index, scroll, remember ) {
			current = Math.max( 0, Math.min( total - 1, index ) );
			steps.forEach( function ( step, idx ) {
				step.classList.toggle( 'df7-step-active', idx === current );
			} );
			prev.style.display   = 0 === current ? 'none' : '';
			next.style.display   = current === total - 1 ? 'none' : '';
			// Wording belongs to the step you are standing on, not to the step a
			// button leads to: "Continue to payment" is written on the step before it.
			prev.textContent     = groups[ current ].settings.prev || TEXT.prev;
			next.textContent     = groups[ current ].settings.next || TEXT.next;
			status.textContent   = sprintf( TEXT.status, current + 1, total );
			fill.style.width     = ( ( current + 1 ) / total * 100 ) + '%';
			dots.forEach( function ( mark, idx ) {
				mark.classList.toggle( 'df7-steps-mark-done', idx < current );
				mark.classList.toggle( 'df7-steps-mark-current', idx === current );
				mark.setAttribute( 'aria-current', idx === current ? 'step' : 'false' );
			} );
			if ( false !== remember ) {
				writeStep( form, current );
			}
			if ( scroll ) {
				form.scrollIntoView( { behavior: 'smooth', block: 'start' } );
			}
		}

		next.addEventListener( 'click', function () {
			if ( validStep( steps[ current ] ) ) {
				show( current + 1, true );
			}
		} );
		prev.addEventListener( 'click', function () { show( current - 1, true ); } );

		// CF7 empties the form at two moments that look identical from here and
		// call for opposite things, so they are told apart by this.
		var sent = false;

		/**
		 * A send is over, but the visitor has not gone anywhere.
		 *
		 * The success message is printed where they are, so moving them to step
		 * one puts it above a blank first step and takes away the thing they were
		 * just looking at. They stay.
		 *
		 * The step is still forgotten, which is a different question: that is
		 * where a RETURNING visitor is put, and this filling-in is finished.
		 */
		form.addEventListener( 'wpcf7mailsent', function () {
			sent = true;
			forgetStep( form );
		} );

		/**
		 * An empty form nobody filled in belongs at the beginning.
		 *
		 * This is the other moment: the page came back out of a cache, CF7 empties
		 * the form, and no send was announced at all. Left alone it strands the
		 * visitor on step 4 of a form with nothing in it.
		 *
		 * The reset after a send reaches here too, a tick later, and is the one
		 * case that must not move anybody.
		 */
		window.df7.onReset( form, function () {
			if ( sent ) {
				sent = false;
				return;
			}

			show( 0, false, false );
			forgetStep( form );
		} );

		// Submitting from the last step must not fail on a field the visitor
		// cannot see. Capture phase so this runs before CF7's own handler and can
		// stop it; the check mirrors what CF7 would reject server-side anyway.
		form.addEventListener(
			'submit',
			function ( e ) {
				var bad = firstBadStep( steps );
				if ( bad < 0 ) {
					return;
				}

				e.preventDefault();
				e.stopImmediatePropagation();

				show( bad, true );
				// The scan above already marked the offending controls; this puts
				// the cursor in the first of them.
				validStep( steps[ bad ] );
			},
			true
		);

		// A refusal the scan above could never have caught — a quiz answer, a
		// captcha, anything a wpcf7_validate filter adds — comes back naming
		// fields that may be several steps behind the visitor. Without this they
		// were left on the last step reading "one or more fields have an error"
		// about a field not on screen.
		form.addEventListener( 'wpcf7submit', function ( e ) {
			var refused = refusedStep( steps, e.detail && e.detail.apiResponse );
			if ( refused < 0 || refused === current ) {
				return;
			}

			show( refused, true );
		} );

		// No scroll on restore: the visitor asked for a reload, not to be thrown
		// down the page.
		show( readStep( form ), false, false );
	}
	// Validation lives in validate.js so the Next gate and the live per-field
	// messages can never disagree. That file is enqueued as our dependency; the
	// fallback only matters if it somehow failed to load.
	function validStep( step ) {
		if ( ! window.df7Validate ) {
			return true;
		}

		var first = window.df7Validate.container( step );
		if ( ! first ) {
			return true;
		}

		if ( typeof first.focus === 'function' ) {
			first.focus();
		}
		return false;
	}


	/**
	 * A step's title and description.
	 *
	 * textContent, never innerHTML: these come from a form's own settings, but
	 * they reach the page through a marker tag anyone who can edit the template
	 * can type into, and there is no reason for markup to survive that trip.
	 */
	function heading( settings ) {
		var box = el( 'div', 'df7-step-heading' );

		if ( settings.title ) {
			var title = el( 'h3', 'df7-step-title' );
			title.textContent = settings.title;
			box.appendChild( title );
		}

		if ( settings.desc ) {
			var desc = el( 'p', 'df7-step-desc' );
			desc.textContent = settings.desc;
			box.appendChild( desc );
		}

		return box;
	}

	var el = window.df7.el;

	/**
	 * A navigation button.
	 *
	 * `type` is set explicitly and must stay that way: a <button> inside a form
	 * defaults to type="submit", so leaving it off turns Back and Next into
	 * submit buttons. The form then posts on every step change, and the visitor
	 * is told off by the server for not having filled in a page they have not
	 * reached yet.
	 */
	function btn( className, label ) {
		var button = el( 'button', 'df7-step-btn ' + className, label );
		button.type = 'button';
		return button;
	}

	window.df7.forms( build );
} )();
