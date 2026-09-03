/**
 * Shared admin page shell: a left-aligned content column (not centered, so it
 * lines up with the WP admin chrome) and a strong, consistent page header.
 */

export const Page = ( { children } ) => (
	<div className="df7-mt-4 df7-w-full df7-pb-14 df7-pr-5">{ children }</div>
);

export const PageHeader = ( { title, subtitle, actions } ) => (
	<div className="df7-mb-6 df7-flex df7-flex-wrap df7-items-end df7-justify-between df7-gap-4 df7-border-b df7-border-line df7-pb-5">
		<div className="df7-min-w-0">
			<h1 className="df7-m-0 df7-p-0 df7-text-[30px] df7-font-extrabold df7-leading-tight df7-tracking-tight df7-text-ink">
				{ title }
			</h1>
			{ subtitle && (
				<p className="df7-mb-0 df7-mt-2 df7-text-[15px] df7-text-stone-500">{ subtitle }</p>
			) }
		</div>
		{ actions ? <div className="df7-flex df7-shrink-0 df7-items-center df7-gap-2">{ actions }</div> : null }
	</div>
);
