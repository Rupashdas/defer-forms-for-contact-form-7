/**
 * Defer Forms — live validation.
 *
 * CF7 only tells the visitor what is wrong after they submit. This checks a
 * field as soon as they leave it, and clears the complaint the moment they fix
 * it — so nobody fills a long form only to be sent back to the top.
 *
 * It is also the single owner of "is this field valid": steps.js calls into
 * `window.df7Validate` for its per-step gate, so both use identical rules.
 *
 * Nothing here blocks submission — CF7's own server-side validation remains the
 * authority. This is only a faster, kinder message.
 */
( function () {
	'use strict';

	var l10n = window.df7ValidateL10n || {};
	var TEXT = {
		required: l10n.required || 'Please complete this field.',
		invalid:  l10n.invalid  || 'Please check this entry.'
	};

	function isEmpty( control ) {
		if ( 'checkbox' === control.type || 'radio' === control.type ) {
			var name = ( window.CSS && CSS.escape ) ? CSS.escape( control.name ) : control.name;
			var group = control.form ? control.form.querySelectorAll( '[name="' + name + '"]' ) : [ control ];
			return ! Array.prototype.some.call( group, function ( one ) { return one.checked; } );
		}
		if ( control.multiple && control.selectedOptions ) {
			return 0 === control.selectedOptions.length;
		}
		return '' === String( control.value ).trim();
	}

	/** Controls that carry a value the visitor can get wrong. */
	function isCheckable( control ) {
		return ! control.disabled &&
			'hidden' !== control.type &&
			'submit' !== control.type &&
			'button' !== control.type;
	}

	/**
	 * CF7 marks required fields with aria-required, not the native attribute.
	 * Radio groups are always required, except in our star-rating widget which
	 * sets aria-required itself and may legitimately be optional.
	 *
	 * An acceptance box gets neither: CF7 keeps its rule in the server-side SWV
	 * schema and renders the checkbox bare. Reading only aria-required, this gate
	 * saw nothing to check and let a visitor walk past the step holding it — and
	 * the finished submission then came back refused, naming a checkbox two steps
	 * behind them. What CF7 does put in the markup is `optional` on the wrapper
	 * (modules/acceptance.php), so the absence of it is CF7's own "this is
	 * required", read rather than guessed.
	 */
	function isRequired( control ) {
		if ( 'radio' === control.type && ! control.closest( '.df7-rating' ) ) {
			return true;
		}

		var acceptance = control.closest( '.wpcf7-acceptance' );
		if ( acceptance ) {
			return ! acceptance.classList.contains( 'optional' );
		}

		return 'true' === control.getAttribute( 'aria-required' );
	}

	function wrapOf( control ) {
		return control.closest( '.wpcf7-form-control-wrap' ) || control.parentNode;
	}

	/** CF7 marks its own findings with this; ours are `.df7-field-error`. */
	function cf7Complaint( wrap ) {
		return wrap ? wrap.querySelector( '.wpcf7-not-valid-tip' ) : null;
	}

	function clear( control ) {
		var wrap = wrapOf( control );
		var name = ( window.CSS && CSS.escape ) ? CSS.escape( control.name ) : control.name;
		var group = control.form ? control.form.querySelectorAll( '[name="' + name + '"]' ) : [ control ];

		Array.prototype.forEach.call( group, function ( one ) {
			// Undo only what we put there. CF7's own validator sets the same
			// class, and stripping that left its message on screen with the
			// styling gone — a red-flagged field that no longer looks flagged.
			if ( ! one.hasAttribute( 'data-df7-invalid' ) ) {
				return;
			}
			one.removeAttribute( 'data-df7-invalid' );
			one.classList.remove( 'wpcf7-not-valid' );
			one.removeAttribute( 'aria-invalid' );
		} );

		if ( wrap ) {
			var tip = wrap.querySelector( '.df7-field-error' );
			if ( tip ) {
				tip.parentNode.removeChild( tip );
			}
		}
	}

	function complain( control, message ) {
		var wrap = wrapOf( control );

		// Contact Form 7 validates natively as well, and says the same thing in
		// the wording the site owner configured. Where it has already spoken,
		// stay quiet: two messages under one field is worse than either alone.
		if ( cf7Complaint( wrap ) ) {
			return;
		}

		control.setAttribute( 'data-df7-invalid', '1' );
		control.classList.add( 'wpcf7-not-valid' );
		control.setAttribute( 'aria-invalid', 'true' );

		// No need to check for one of ours already being here: every caller runs
		// clear() first, which takes it away.
		if ( ! wrap ) {
			return;
		}
		var tip = document.createElement( 'span' );
		tip.className = 'df7-field-error';
		tip.setAttribute( 'role', 'alert' );
		tip.textContent = message;
		wrap.appendChild( tip );
	}

	/**
	 * Validate one control. Returns true when it is fine.
	 */
	function field( control, options ) {
		options = options || {};

		if ( ! isCheckable( control ) ) {
			return true;
		}

		clear( control );

		if ( isRequired( control ) && isEmpty( control ) ) {
			// While typing, an untouched empty field shouldn't be scolded.
			if ( options.quiet ) {
				return false;
			}
			complain( control, TEXT.required );
			return false;
		}

		// Format rules (email, url, number range) come free from the browser.
		if ( ! isEmpty( control ) && typeof control.checkValidity === 'function' && ! control.checkValidity() ) {
			complain( control, control.validationMessage || TEXT.invalid );
			return false;
		}

		return true;
	}

	/**
	 * Validate everything inside an element. Returns the first bad control, or
	 * null when all of them pass. steps.js uses this to gate its Next button and
	 * to find the step a blocked submit should jump back to.
	 */
	function container( element ) {
		var first = null;

		Array.prototype.forEach.call(
			element.querySelectorAll( 'input, textarea, select' ),
			function ( control ) {
				if ( ! field( control ) && ! first ) {
					first = control;
				}
			}
		);

		return first;
	}

	/**
	 * The caption a field is announced by: the fieldset's legend for a group of
	 * choices, otherwise the label wrapping the control.
	 */
	function captionFor( control ) {
		var fieldset = control.closest( 'fieldset' );
		var legend = fieldset ? fieldset.querySelector( 'legend' ) : null;
		if ( legend ) {
			return legend;
		}

		// An acceptance box puts its own text in a span beside the checkbox; the
		// outer label is the one carrying the wording.
		var inner = control.closest( '.wpcf7-list-item-label' );
		if ( inner ) {
			return inner;
		}

		var label = control.closest( 'label' );

		/*
		 * A quiz keeps its question in a span of its own, and the label wraps the
		 * question AND the box. Returning the label put the star after the last
		 * thing in it, which is the box — so the mark sat under the field instead
		 * of beside the question it belongs to.
		 *
		 * Every other field type has its wording last inside the label, or in a
		 * legend, which is why this was the only one that showed it.
		 */
		var quiz = label ? label.querySelector( '.wpcf7-quiz-label' ) : null;

		return quiz || label;
	}

	/**
	 * Mark required fields so a visitor can see which ones they are.
	 *
	 * Contact Form 7 only sets `aria-required`, leaving the asterisk for whoever
	 * writes the label — but the builder shows one in its preview, so without
	 * this the two disagree about the same form. Placed here rather than in the
	 * markup because it then uses the very same isRequired() the step gate does,
	 * and cannot drift from it.
	 */
	function markRequired( form ) {
		Array.prototype.forEach.call( form.querySelectorAll( '[aria-required="true"], input[type="radio"]' ), function ( control ) {
			if ( ! isCheckable( control ) || ! isRequired( control ) ) {
				return;
			}

			var caption = captionFor( control );
			if ( ! caption || caption.querySelector( '.df7-required' ) ) {
				return;
			}

			// A label that already says so — hand-written CF7 forms usually do —
			// should not end up with two.
			if ( /[*∗﹡＊]/.test( caption.textContent ) ) {
				return;
			}

			var star = document.createElement( 'span' );
			star.className = 'df7-required';
			// aria-required already tells a screen reader; this is for eyes only.
			star.setAttribute( 'aria-hidden', 'true' );
			star.textContent = '*';

			// Before the line break, so it follows the caption rather than
			// landing next to the control on the line below.
			var br = caption.querySelector( 'br' );
			var wrap = caption.querySelector( '.wpcf7-form-control-wrap' );
			var before = br || wrap;

			if ( before && before.parentNode === caption ) {
				caption.insertBefore( star, before );
			} else {
				caption.appendChild( star );
			}
		} );
	}

	/**
	 * Stand down wherever CF7 has spoken.
	 *
	 * complain() checks before writing, but CF7 validates on its own schedule
	 * and can arrive second — change one field and it re-checks everything above
	 * it, dropping a tip beside a message of ours that was already there. Then
	 * the visitor gets the same problem told twice, in two different wordings
	 * and two different sizes.
	 *
	 * CF7's is the one to keep: it is the wording the site owner configured, and
	 * it is what the server will say too.
	 */
	function dropOursWhereCf7Spoke( form ) {
		Array.prototype.forEach.call( form.querySelectorAll( '.wpcf7-not-valid-tip' ), function ( theirs ) {
			var wrap = theirs.closest( '.wpcf7-form-control-wrap' ) || theirs.parentNode;
			var ours = wrap ? wrap.querySelector( '.df7-field-error' ) : null;
			if ( ours ) {
				ours.parentNode.removeChild( ours );
			}
		} );
	}

	/**
	 * Give back a submit button CF7 disabled over an acceptance box.
	 *
	 * CF7 disables every `.wpcf7-submit` while a non-optional acceptance box is
	 * unticked. Beside the box that reads clearly — the button greys out, the
	 * reason is the line above it. On a form split into steps the box can be on
	 * a step the visitor has left, and a conditional region can hide it outright;
	 * then the button is dead with nothing on screen saying why, and clicking it
	 * fires no event at all, so nothing here ever gets to speak.
	 *
	 * isRequired() already reads a non-optional acceptance as required, so the
	 * gate holds the same rule and can name the field and take the visitor to
	 * it. Standing the button back up hands them something that answers.
	 *
	 * Not on a form using `invert`, where the box has to be left *un*ticked:
	 * isRequired() cannot express that, and demanding the opposite would be a
	 * worse thing to leave behind than the button CF7 disabled.
	 */
	function releaseSubmit( form ) {
		if (
			! form.querySelector( '.wpcf7-acceptance:not(.optional)' ) ||
			form.querySelector( '.wpcf7-acceptance.invert' )
		) {
			return;
		}

		Array.prototype.forEach.call( form.querySelectorAll( '.wpcf7-submit[disabled]' ), function ( button ) {
			button.disabled = false;
		} );
	}

	function watch( form ) {
		if ( form.dataset.df7Validate ) {
			return;
		}
		form.dataset.df7Validate = '1';

		markRequired( form );
		releaseSubmit( form );

		// CF7 writes its tips straight into the DOM with no event of its own, so
		// watching the form is the only way to hear about them. It takes the
		// submit button away the same way — no event, just a property set — so
		// the same observer hears that too, and neither of them depends on our
		// script having been queued after theirs.
		if ( window.MutationObserver ) {
			new window.MutationObserver( function () {
				dropOursWhereCf7Spoke( form );
				releaseSubmit( form );
			} ).observe( form, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [ 'disabled' ]
			} );
		}

		// Check when a field is left…
		form.addEventListener( 'blur', function ( e ) {
			if ( isCheckable( e.target ) && e.target.form === form ) {
				field( e.target );
			}
		}, true );

		// …and stop complaining as soon as it is put right.
		form.addEventListener( 'input', function ( e ) {
			if ( isCheckable( e.target ) && e.target.classList.contains( 'wpcf7-not-valid' ) ) {
				field( e.target, { quiet: true } );
			}
		} );

		form.addEventListener( 'change', function ( e ) {
			if ( isCheckable( e.target ) && e.target.classList.contains( 'wpcf7-not-valid' ) ) {
				field( e.target, { quiet: true } );
			}
		} );

		// CF7 re-renders its own messages after a submit; ours would be stale.
		form.addEventListener( 'wpcf7submit', function () {
			Array.prototype.forEach.call( form.querySelectorAll( '.df7-field-error' ), function ( tip ) {
				tip.parentNode.removeChild( tip );
			} );
		} );
	}

	window.df7Validate = { field: field, container: container, clear: clear, isEmpty: isEmpty, isRequired: isRequired };

	window.df7.forms( watch );
} )();
