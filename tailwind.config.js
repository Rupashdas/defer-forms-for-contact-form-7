/** @type {import('tailwindcss').Config} */
export default {
	prefix: 'cf7e-',
	important: true,
	content: [ './ui/**/*.{js,jsx}' ],
	corePlugins: {
		preflight: false,
	},
	theme: {
		extend: {
			/*
			 * No `sans`, and no `display`.
			 *
			 * There used to be both — "Hanken Grotesk" for body and "Bricolage
			 * Grotesque" for headings — and the plugin never loaded either one.
			 * No @font-face, no Google Fonts link, no files under assets/. They
			 * were names at the head of a stack, so on every machine without
			 * them privately installed the browser fell straight through to the
			 * next entry and the admin has always rendered in a system font
			 * anyway. On the few machines that did have them, these screens
			 * looked unlike the rest of wp-admin for no reason anybody chose.
			 *
			 * Body text now inherits WordPress's own font, set on `body` in
			 * wp-admin/css/common.css — so nothing here has to name it, and it
			 * cannot drift from what every other admin screen uses.
			 *
			 * `mono` stays, because a hex value wants fixed-width digits, and it
			 * is WordPress's own admin stack rather than Tailwind's longer one:
			 * same reasoning, and it downloads nothing either way.
			 */
			fontFamily: {
				mono: [ 'Consolas', 'Monaco', 'monospace' ],
			},
			colors: {
				ink:    '#1b1b22',
				paper:  '#faf9f7',
				line:   '#ebe7e1',
				stroke: '#d9d3c9',
				// Muted text, warmed to match the palette and darkened to be
				// readable: Tailwind's own stone-400 sits at 2.5:1 on white, well
				// under the 4.5:1 that small text needs, and it is the shade most
				// of this admin's secondary copy uses.
				//
				// 50/100 are untouched (backgrounds) and so is 300, which is UI
				// chrome — the toggle's off track and hover borders — not text.
				stone: {
					400: '#6f665d', // 5.6:1 on white
					500: '#544c45', // 8.4:1
					600: '#3d3831', // 11.6:1
				},
				// "Accent" is now a neutral ink scale (no purple): strong tones are
				// near-black, light tones are warm greys for chips/rings/borders.
				accent: {
					50:      '#f1efec',
					100:     '#e6e2db',
					200:     '#d9d3c9',
					500:     '#1b1b22',
					600:     '#15151b',
					700:     '#000000',
					DEFAULT: '#1b1b22',
				},
			},
			boxShadow: {
				card:         '0 1px 2px rgba(27,27,34,0.04), 0 1px 3px rgba(27,27,34,0.05)',
				'card-hover': '0 6px 16px rgba(27,27,34,0.08), 0 2px 6px rgba(27,27,34,0.04)',
				drawer:       '-24px 0 60px rgba(27,27,34,0.16)',
				pop:          '0 10px 34px rgba(27,27,34,0.14)',
			},
			borderRadius: {
				lg:    '0.375rem',
				xl:    '0.5rem',
				'2xl': '0.75rem',
			},
		},
	},
	plugins: [],
};
