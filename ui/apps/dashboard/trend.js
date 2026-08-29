/**
 * This week measured against the one before it.
 *
 * Its own file, with no JSX and nothing imported, because a comparison is the
 * easiest thing on a screen to state wrongly with a straight face and this is
 * the part worth testing on its own.
 */

export const sum = ( days ) => days.reduce( ( total, day ) => total + day.count, 0 );

/**
 * Returns a shape rather than a number, so the caller never has to decide what
 * a missing comparison looks like.
 *
 * `new` is the case arithmetic gets wrong: one entry after a silent week is not
 * a hundred per cent rise, it is a week with nothing to have risen from.
 * Dividing by that zero gives Infinity, and Infinity rounds to a number the
 * page would print as though it meant something.
 *
 * `null` for a window too short to hold two weeks. Thirty days is what the
 * dashboard asks for, but seven compared against itself is always level, and
 * always a lie.
 *
 * @param {Array<{count: number}>} days Oldest first.
 * @return {?{direction: string, percent?: number}} How the week went.
 */
export const trend = ( days ) => {
	if ( days.length < 14 ) {
		return null;
	}

	const now  = sum( days.slice( -7 ) );
	const then = sum( days.slice( -14, -7 ) );

	if ( ! then ) {
		return now ? { direction: 'new' } : null;
	}

	return {
		direction: now === then ? 'level' : now > then ? 'up' : 'down',
		percent: Math.round( Math.abs( ( now - then ) / then ) * 100 ),
	};
};
