/**
 * Which step a page break opens, and making sure the first one has an owner.
 *
 * A break carries the settings of the step *after* it. Taken literally that
 * leaves the opening step — everything before the first break — with nowhere to
 * put a title, which is what made the feature feel half-finished.
 *
 * The fix is to let a form open with a break. `steps.js` already drops the empty
 * group in front of it, so a leading break costs nothing on the page and gives
 * step 1 the same settings every other step has.
 *
 * Kept free of imports so it can be tested without building the app.
 */

export const isBreak = ( item ) => !! item && 'pagebreak' === item.kind;

export const hasBreak = ( items ) => ( items || [] ).some( isBreak );

/**
 * Whether the form already opens with a break, i.e. step 1 has settings.
 *
 * @param {Array} items The builder's item list.
 * @return {boolean} True when the first item is a page break.
 */
export const opensWithBreak = ( items ) => isBreak( ( items || [] )[ 0 ] );

/**
 * The step number each page break opens, keyed by item id.
 *
 * On a form that does not open with a break, the first break opens step 2 —
 * step 1 is the unnamed group in front of it. Numbering has to say so, or the
 * bars read one step out and every title lands on the wrong screen.
 *
 * @param {Array} items The builder's item list.
 * @return {Object} Map of page-break `_id` to step number.
 */
export const stepNumbers = ( items ) => {
	const list = items || [];
	const out = {};
	let stepNumber = opensWithBreak( list ) ? 0 : 1;

	for ( const item of list ) {
		if ( isBreak( item ) ) {
			stepNumber++;
			out[ item._id ] = stepNumber;
		}
	}

	return out;
};

/**
 * How many steps the form has, breaks and the opening group together.
 *
 * @param {Array} items The builder's item list.
 * @return {number} The number of steps, at least 1.
 */
export const stepCount = ( items ) => {
	const list = items || [];
	const breaks = list.filter( isBreak ).length;

	if ( 0 === breaks ) {
		return 1;
	}

	return opensWithBreak( list ) ? breaks : breaks + 1;
};

/**
 * Which navigation buttons the step a page break opens actually renders.
 *
 * Step 1 has nothing to go back to and the last step submits rather than going
 * on, so neither gets the button the other does. Wording for a button that never
 * appears is wording nobody reads.
 *
 * @param {Array}  items The builder's item list.
 * @param {string} id    A page break's `_id`.
 * @return {{prev: boolean, next: boolean}} Whether each button is rendered.
 */
export const stepNav = ( items, id ) => {
	const number = stepNumbers( items )[ id ];

	// A break we cannot place keeps both — hiding one on a guess loses a setting.
	if ( ! number ) {
		return { prev: true, next: true };
	}

	return { prev: number > 1, next: number < stepCount( items ) };
};
