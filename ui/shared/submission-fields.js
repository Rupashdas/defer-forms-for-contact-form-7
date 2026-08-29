/**
 * What a visitor actually answered, out of what was stored with the entry.
 *
 * A row carries more than the form asked. `_` prefixes are Contact Form 7's own
 * bookkeeping and our `_cf7e_files`; `cf7e_` is the honeypot and the
 * time-trap's signed token. The listener strips the second group before writing,
 * but rows stored by an earlier version still carry it, and showing an admin a
 * signed token under a heading that reads like a question they asked is worse
 * than useless.
 *
 * Shared rather than copied. The same rule decides what a CSV export contains
 * (`Entry_Fields::is_answer()`), what the Submissions table shows, and what the
 * dashboard prints beside a recent entry — three places that have to agree
 * about which keys are answers, and two of them are one edit away from drifting.
 */
export const parseFields = ( json ) => {
	try {
		return Object.entries( JSON.parse( json ) ).filter(
			( [ key ] ) => ! key.startsWith( '_' ) && ! key.startsWith( 'cf7e_' )
		);
	} catch {
		return [];
	}
};

/**
 * One line standing for a whole entry.
 *
 * The first answer that has something in it, which on nearly every form is a
 * name or an email address — the thing somebody scanning a list is looking for.
 * An entry where every field was optional and left blank has nothing to show,
 * and says so rather than printing an empty string that reads as a bug.
 */
export const summarise = ( json, fallback ) => {
	for ( const [ , value ] of parseFields( json ) ) {
		const text = Array.isArray( value ) ? value.join( ', ' ) : String( value ?? '' );

		if ( text.trim() ) {
			return text.trim();
		}
	}

	return fallback;
};
