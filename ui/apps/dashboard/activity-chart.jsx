import { __, _n, sprintf } from '@wordpress/i18n';

import { Shimmer } from '@shared/components/ui';

/**
 * Thirty days of submissions, as bars.
 *
 * Bars rather than a line, because these are counts on separate days and not a
 * quantity that moved between them. A line drawn through a fortnight of nothing
 * slopes gently from one busy day to the next, which reads as a trend and is a
 * description of no day that ever happened.
 *
 * Ink, not colour. Colour means status everywhere else in this admin — amber is
 * spam, red is a problem — so painting ordinary activity with it would spend a
 * word this interface has already given a meaning to.
 *
 * A day with nothing still draws: a hairline on the baseline, in the border
 * colour. Without it an empty day is indistinguishable from a day the chart
 * does not cover, and thirty days of white is the shape of "we lost your data"
 * as much as "nobody wrote in".
 */

/** The tallest bar sets the scale; a flat run of zeroes must not fill the box. */
const ceiling = ( days ) => Math.max( 1, ...days.map( ( d ) => d.count ) );

/**
 * A date as the reader's own locale writes a short one.
 *
 * Split rather than `new Date( iso )`: that parses a bare date as UTC and then
 * prints it locally, so anyone west of Greenwich reads every bar as the day
 * before.
 */
const readable = ( iso ) => {
	const [ y, m, d ] = iso.split( '-' ).map( Number );
	return new Date( y, m - 1, d ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
};

export const ActivityChart = ( { days, loading = false } ) => {
	// Thirty flat bars in the border colour, in the same figure with the same
	// caption line beneath it. Drawn here rather than as a separate skeleton so
	// the chart cannot be one height before the fetch and another after — the
	// caption alone was thirty pixels the loading state did not reserve.
	if ( loading ) {
		return (
			<figure className="df7-m-0">
				<svg viewBox="0 0 300 100" preserveAspectRatio="none" className="df7-h-32 df7-w-full df7-animate-pulse" aria-hidden="true">
					{ Array.from( { length: 30 } ).map( ( _, index ) => (
						<rect key={ index } x={ index * 10 + 2 } y="98" width="6" height="2" rx="2" className="df7-fill-line" />
					) ) }
				</svg>
				<figcaption className="df7-mt-2 df7-flex df7-items-baseline df7-justify-between df7-text-[14px] df7-text-stone-400">
					<Shimmer w="df7-w-12" />
					<Shimmer w="df7-w-28" />
					<Shimmer w="df7-w-12" />
				</figcaption>
			</figure>
		);
	}

	if ( ! days.length ) {
		return null;
	}

	const top   = ceiling( days );
	const peak  = days.reduce( ( best, day ) => ( day.count > best.count ? day : best ), days[ 0 ] );
	const total = days.reduce( ( sum, day ) => sum + day.count, 0 );

	return (
		<figure className="df7-m-0">
			<svg
				viewBox={ `0 0 ${ days.length * 10 } 100` }
				preserveAspectRatio="none"
				className="df7-h-32 df7-w-full"
				role="img"
				aria-label={ sprintf(
					/* translators: 1: number of submissions, 2: number of days. */
					__( '%1$s submissions over the last %2$s days.', 'defer-forms-for-contact-form-7' ),
					total.toLocaleString(),
					days.length.toLocaleString()
				) }
			>
				{ days.map( ( day, index ) => {
					const height = day.count ? Math.max( 4, ( day.count / top ) * 92 ) : 2;
					const label  = sprintf(
						/* translators: 1: a date, 2: number of submissions on it. */
						_n( '%1$s — %2$s submission', '%1$s — %2$s submissions', day.count, 'defer-forms-for-contact-form-7' ),
						readable( day.date ),
						day.count.toLocaleString()
					);

					return (
						<rect
							key={ day.date }
							x={ index * 10 + 2 }
							y={ 100 - height }
							width="6"
							height={ height }
							rx="2"
							className={ day.count ? 'df7-fill-ink' : 'df7-fill-line' }
						>
							<title>{ label }</title>
						</rect>
					);
				} ) }
			</svg>

			{ /* Two dates, not thirty. The ends are what tell you the span. */ }
			<figcaption className="df7-mt-2 df7-flex df7-items-baseline df7-justify-between df7-text-[14px] df7-text-stone-400">
				<span>{ readable( days[ 0 ].date ) }</span>
				{ total > 0 && (
					<span className="df7-font-medium df7-text-stone-500">
						{ sprintf(
							/* translators: 1: a date, 2: number of submissions on it. */
							__( 'Busiest: %1$s, %2$s', 'defer-forms-for-contact-form-7' ),
							readable( peak.date ),
							peak.count.toLocaleString()
						) }
					</span>
				) }
				<span>{ readable( days[ days.length - 1 ].date ) }</span>
			</figcaption>
		</figure>
	);
};
