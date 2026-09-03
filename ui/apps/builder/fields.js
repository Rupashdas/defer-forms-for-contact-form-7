/**
 * Field catalogue (for the add-field palette) + factory for new fields.
 *
 * Every word here reaches a screen, so every word goes through `__()`. They did
 * not: all twenty-seven palette labels were plain strings, so "Add a field" was
 * the one dialog in the admin that stayed English on a translated site — the
 * rest of the builder around it translated fine, which is what made it hard to
 * notice.
 *
 * The groups became a list for the same reason. They were object keys —
 * `Inputs:`, `Choice:` — printed straight as the section headings, and an
 * object key cannot be translated. The `id` is the stable half now; `label` is
 * the half a person reads.
 *
 * Calling `__()` out here rather than deferring it is safe: WordPress prints
 * `wp_set_script_translations`'s `setLocaleData` as a classic inline script, and
 * our bundles are `type="module"` and therefore deferred, so the locale data is
 * always in place before this file is evaluated.
 */
import { __ } from '@wordpress/i18n';

import {
	Type,
	AtSign,
	Phone,
	Link,
	Hash,
	SlidersHorizontal,
	Calendar,
	Lock,
	AlignLeft,
	ChevronDown,
	CheckSquare,
	CircleDot,
	ShieldCheck,
	Star,
	Globe,
	Braces,
	HelpCircle,
	Sigma,
	Hash as HashIcon,
	ShoppingCart,
	Upload,
	EyeOff,
	Send,
	Heading,
	Pilcrow,
	Minus,
	MoveVertical,
} from 'lucide-react';

export const FIELD_LIBRARY = [
	{
		id:     'inputs',
		label:  __( 'Inputs', 'defer-forms-for-contact-form-7' ),
		fields: [
			{ type: 'text',     label: __( 'Text', 'defer-forms-for-contact-form-7' ),     icon: Type },
			{ type: 'email',    label: __( 'Email', 'defer-forms-for-contact-form-7' ),    icon: AtSign },
			{ type: 'tel',      label: __( 'Phone', 'defer-forms-for-contact-form-7' ),    icon: Phone },
			{ type: 'url',      label: __( 'URL', 'defer-forms-for-contact-form-7' ),      icon: Link },
			{ type: 'number',   label: __( 'Number', 'defer-forms-for-contact-form-7' ),   icon: Hash },
			{ type: 'range',    label: __( 'Range', 'defer-forms-for-contact-form-7' ),    icon: SlidersHorizontal },
			{ type: 'date',     label: __( 'Date', 'defer-forms-for-contact-form-7' ),     icon: Calendar },
			{ type: 'password', label: __( 'Password', 'defer-forms-for-contact-form-7' ), icon: Lock },
			{ type: 'textarea', label: __( 'Textarea', 'defer-forms-for-contact-form-7' ), icon: AlignLeft },
		],
	},
	{
		id:     'choice',
		label:  __( 'Choice', 'defer-forms-for-contact-form-7' ),
		fields: [
			{ type: 'select',     label: __( 'Select', 'defer-forms-for-contact-form-7' ),     icon: ChevronDown },
			{ type: 'checkbox',   label: __( 'Checkbox', 'defer-forms-for-contact-form-7' ),   icon: CheckSquare },
			{ type: 'radio',      label: __( 'Radio', 'defer-forms-for-contact-form-7' ),      icon: CircleDot },
			{ type: 'acceptance', label: __( 'Acceptance', 'defer-forms-for-contact-form-7' ), icon: ShieldCheck },
			{ type: 'rating',     label: __( 'Rating', 'defer-forms-for-contact-form-7' ),     icon: Star },
			{ type: 'country',    label: __( 'Country', 'defer-forms-for-contact-form-7' ),    icon: Globe },
		],
	},
	{
		id:     'advanced',
		label:  __( 'Advanced', 'defer-forms-for-contact-form-7' ),
		fields: [
			{ type: 'dynamictext',   label: __( 'Dynamic', 'defer-forms-for-contact-form-7' ),       icon: Braces },
			{ type: 'quiz',          label: __( 'Quiz', 'defer-forms-for-contact-form-7' ),          icon: HelpCircle },
			{ type: 'count',         label: __( 'Count', 'defer-forms-for-contact-form-7' ),         icon: Sigma },
			{ type: 'submission_id', label: __( 'Submission ID', 'defer-forms-for-contact-form-7' ), icon: HashIcon },
			{ type: 'product',       label: __( 'Product', 'defer-forms-for-contact-form-7' ),       icon: ShoppingCart, requires: 'woocommerce' },
			{ type: 'file',          label: __( 'File', 'defer-forms-for-contact-form-7' ),          icon: Upload },
			{ type: 'hidden',        label: __( 'Hidden', 'defer-forms-for-contact-form-7' ),        icon: EyeOff },
			{ type: 'submit',        label: __( 'Submit', 'defer-forms-for-contact-form-7' ),        icon: Send },
		],
	},
	{
		id:     'layout',
		label:  __( 'Layout', 'defer-forms-for-contact-form-7' ),
		fields: [
			{ type: 'heading',   kind: 'content', label: __( 'Heading', 'defer-forms-for-contact-form-7' ),   icon: Heading },
			{ type: 'paragraph', kind: 'content', label: __( 'Paragraph', 'defer-forms-for-contact-form-7' ), icon: Pilcrow },
			{ type: 'divider',   kind: 'content', label: __( 'Divider', 'defer-forms-for-contact-form-7' ),   icon: Minus },
			{ type: 'spacer',    kind: 'content', label: __( 'Spacer', 'defer-forms-for-contact-form-7' ),    icon: MoveVertical },
		],
	},
];

export const ALL_FIELDS = FIELD_LIBRARY.flatMap( ( group ) => group.fields );

/** A type's name. One lookup, because two copies of it had drifted apart once. */
export const labelForType = ( type ) =>
	ALL_FIELDS.find( ( entry ) => entry.type === type )?.label || type;

// Seed text, so it is written in the language of whoever is building the form
// rather than handing an admin working in Bengali an English placeholder to
// delete. It is saved into the CF7 template as typed, like anything else here.
const CONTENT_DEFAULTS = {
	heading:   { level: 'h2', text: __( 'Heading', 'defer-forms-for-contact-form-7' ), align: 'left' },
	paragraph: { size: 'md', text: __( 'Paragraph text.', 'defer-forms-for-contact-form-7' ), align: 'left' },
	divider:   { style: 'solid', thickness: 1, tier: 'subtle' },
	spacer:    { height: 16 },
};

/**
 * Build a fresh field item of the given type.
 *
 * Name is left blank so it can auto-fill from the label (ACF-style) until the
 * user edits it. Content blocks (heading/paragraph/divider/spacer) are
 * kind:'content'.
 *
 * @param {string} type The field or content type to create.
 * @return {Object} A new builder item.
 */
export function makeField( type ) {
	if ( CONTENT_DEFAULTS[ type ] ) {
		return { kind: 'content', type, ...CONTENT_DEFAULTS[ type ] };
	}

	const base = {
		kind:        'field',
		type,
		name:        '',
		label:       '',
		placeholder: '',
		required:    false,
		choices:     [],
		options:     {},
		default:     '',
	};

	if ( [ 'select', 'checkbox', 'radio' ].includes( type ) ) {
		base.choices = [
			/* translators: placeholder text for the first choice of a new select, checkbox or radio field. */
			__( 'Option 1', 'defer-forms-for-contact-form-7' ),
			/* translators: placeholder text for the second choice of a new select, checkbox or radio field. */
			__( 'Option 2', 'defer-forms-for-contact-form-7' ),
		];
	}

	if ( 'range' === type ) {
		base.options = { min: '0', max: '100', step: '1' };
		base.default = '50';
	}

	if ( 'acceptance' === type ) {
		base.required = true;
	}

	if ( 'rating' === type ) {
		base.options = { max: '5' };
	}

	// One question to start from, in CF7's own `question|answer` shape. The tag
	// falls back to "1+1=?" when it has none, so a blank quiz is a confusing
	// quiz — it asks something the builder never showed.
	if ( 'quiz' === type ) {
		base.choices  = [ '1+1=?|2' ];
		base.required = true;
	}

	if ( 'file' === type ) {
		base.options = { filetypes: 'jpg|jpeg|png|pdf', limit: '2mb' };
	}

	if ( 'submission_id' === type ) {
		base.options = { pad: '5' };
	}

	return base;
}
