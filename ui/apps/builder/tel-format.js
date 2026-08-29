/**
 * Phone number formats, and the small state machine behind the picker.
 *
 * "Custom" cannot be worked out from the pattern alone. Deriving it that way
 * meant picking Custom while a preset was selected kept the preset's pattern,
 * which then still matched a preset — so the dropdown snapped straight back and
 * Custom was unreachable unless you went via "No formatting" first.
 *
 * Kept free of imports so the logic can be tested without building the app.
 */

/**
 * The offered patterns, in dropdown order. `#` is a digit slot; every other
 * character is punctuation the field adds by itself.
 *
 * Labels are not here: they need `__()` with a literal string so a translation
 * scanner can find them, and this module stays import-free so it can be tested
 * without building the app. They live beside the dropdown in index.jsx, keyed by
 * pattern, and the test checks the two lists have not drifted apart.
 */
export const TEL_PATTERNS = [
	'',
	'#####-######',
	'+## #####-######',
	'(###) ###-####',
	'##### ######',
	'+## #### ######',
];

export const CUSTOM = '__custom';

export const isPreset = ( pattern ) => TEL_PATTERNS.includes( pattern || '' );

/**
 * Whether the picker should open in custom mode for an already-saved field.
 * An empty pattern is "No formatting" — itself a preset — not a blank custom.
 *
 * @param {string} pattern The saved format.
 * @return {boolean} True when the format is not one of the presets.
 */
export const startsCustom = ( pattern ) => ! isPreset( pattern );

/**
 * What the <select> shows.
 *
 * @param {string}  pattern The current format.
 * @param {boolean} custom  Whether the picker is in custom mode.
 * @return {string} The option value to select.
 */
export const selectValue = ( pattern, custom ) => ( custom ? CUSTOM : pattern || '' );

/**
 * Answer a choice from the dropdown.
 *
 * Choosing Custom keeps whatever pattern is there so it can be edited into
 * shape, rather than throwing the visitor's starting point away.
 *
 * @param {string} chosen  The option just picked.
 * @param {string} pattern The format already in the box.
 * @return {{custom: boolean, pattern: string}} The next state.
 */
export const pick = ( chosen, pattern ) =>
	CUSTOM === chosen
		? { custom: true, pattern: pattern || '' }
		: { custom: false, pattern: chosen };
