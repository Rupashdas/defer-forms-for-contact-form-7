/**
 * Which kind of destination the redirect panel is showing.
 *
 * The same shape of bug as the phone format picker: the choice was worked out
 * from `page_id > 0`, but choosing "a page on this site" cannot set a page id —
 * there is no page yet — so the dropdown answered "no page" and snapped back.
 *
 * The visitor's choice is editor state. It starts as `null`, meaning "follow
 * whatever was saved", which matters because the settings arrive from the server
 * after the panel has already rendered. Once they pick, their pick holds.
 *
 * Kept free of imports so it can be tested without building the app.
 */

export const NONE_MODE = 'none';
export const URL_MODE = 'url';
export const PAGE_MODE = 'page';

/**
 * What the dropdown shows: the pick if there is one, otherwise the saved data.
 *
 * A form with nothing set is not a form that redirects to an empty address; it
 * is a form that stays where it is, which is what almost every form does. That
 * used to show as "a web address" with the box blank, so the only way to say
 * "stay here" was to notice a sentence under the box and leave it empty. Saying
 * nothing should not be something you have to work out.
 *
 * @param {string} chosen   What the visitor picked this session, if anything.
 * @param {Object} redirect The saved redirect settings.
 * @return {string} NONE_MODE, URL_MODE or PAGE_MODE.
 */
export const mode = ( chosen, redirect ) => {
	if ( NONE_MODE === chosen || URL_MODE === chosen || PAGE_MODE === chosen ) {
		return chosen;
	}

	if ( ( redirect && redirect.page_id ) > 0 ) {
		return PAGE_MODE;
	}

	return hasDestination( redirect ) ? URL_MODE : NONE_MODE;
};

/**
 * Answer a choice from the dropdown.
 *
 * Switching away from a kind clears it, so the two can never both be set and
 * leave the saved destination ambiguous. Choosing to stay clears both, which is
 * the whole of what "no redirect" means to the front end.
 *
 * @param {string} chosen The mode just picked.
 * @return {{chosen: string, patch: Object}} The new mode and what to store.
 */
export const choose = ( chosen ) => {
	if ( NONE_MODE === chosen ) {
		return { chosen: NONE_MODE, patch: { url: '', page_id: 0 } };
	}

	return PAGE_MODE === chosen
		? { chosen: PAGE_MODE, patch: { url: '' } }
		: { chosen: URL_MODE, patch: { page_id: 0 } };
};

/**
 * Whether anything is configured to redirect to at all.
 *
 * @param {Object} redirect The saved redirect settings.
 * @return {boolean} True when a page or a URL is set.
 */
export const hasDestination = ( redirect ) =>
	!! ( ( redirect && redirect.page_id ) > 0 || ( ( redirect && redirect.url ) || '' ).trim() );
