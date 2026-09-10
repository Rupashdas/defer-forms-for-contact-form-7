import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

import { Page, PageHeader } from '@shared/components/page';
import { Tabs } from '@shared/components/ui';
import {
	TextField,
	ToggleField,
	SaveBar,
	SectionCard,
	SectionStack,
	useSectionForm,
} from '@shared/components/fields';
import '@shared/styles/admin.css';

const TABS = [
	{ id: 'general', label: __( 'General', 'defer-forms-for-contact-form-7' ) },
	{ id: 'spam',    label: __( 'Spam', 'defer-forms-for-contact-form-7' ) },
	{ id: 'privacy', label: __( 'Privacy', 'defer-forms-for-contact-form-7' ) },
];

// Two subjects have been carved out of this page, and a tab that leaves takes
// its address with it. Anyone who bookmarked one — or follows a link written
// before the move — lands where it went, rather than on a General tab that says
// nothing about why.
const MOVED_TO = {
	design:   'admin.php?page=deferforms-styling',
	telegram: 'admin.php?page=deferforms-notifications#telegram',
	slack:    'admin.php?page=deferforms-notifications#slack',
	discord:  'admin.php?page=deferforms-notifications#discord',
};

const getInitialTab = () => {
	const hash = window.location.hash.replace( '#', '' );
	return TABS.some( ( tab ) => tab.id === hash ) ? hash : TABS[ 0 ].id;
};

const GeneralTab = ( { values, onSave, loading = false } ) => {
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave );

	return (
		<SectionStack>
			<SectionCard
				title={ __( 'General', 'defer-forms-for-contact-form-7' ) }
				description={ __( 'Core behaviour for storing and cleaning up submissions.', 'defer-forms-for-contact-form-7' ) }
			>
				<TextField
					loading={ loading }
					label={ __( 'Retention days', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'How long to keep submissions before auto-deletion. Set to 0 to keep forever.', 'defer-forms-for-contact-form-7' ) }
					type="number"
					min="0"
					max="3650"
					width="deferforms-w-32"
					value={ String( local.retention_days ) }
					onChange={ ( value ) => setField( 'retention_days', parseInt( value, 10 ) || 0 ) }
				/>
				<ToggleField
					loading={ loading }
					label={ __( 'Delete all data on uninstall', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'When the plugin is deleted, drop the submissions table and remove all options.', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.delete_on_uninstall }
					onChange={ ( value ) => setField( 'delete_on_uninstall', value ) }
				/>
			</SectionCard>
			<SaveBar dirty={ dirty && ! loading } status={ status } problem={ problem } onSave={ save } />
		</SectionStack>
	);
};

const SpamTab = ( { values, onSave, loading = false } ) => {
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave );

	return (
		<SectionStack>
			<SectionCard
				title={ __( 'Spam', 'defer-forms-for-contact-form-7' ) }
				description={ __( 'Keep automated junk out of your submissions.', 'defer-forms-for-contact-form-7' ) }
			>
				<ToggleField
					loading={ loading }
					label={ __( 'Enable honeypot protection', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Adds a hidden field to forms that real users never see. Bots fill it and get blocked.', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.honeypot_enabled }
					onChange={ ( value ) => setField( 'honeypot_enabled', value ) }
				/>
				<ToggleField
					loading={ loading }
					label={ __( 'Enable time-trap', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Reject submissions sent within a few seconds of the page load — too fast to be a human.', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.time_trap_enabled }
					onChange={ ( value ) => setField( 'time_trap_enabled', value ) }
				/>
				<ToggleField
					loading={ loading }
					label={ __( 'Block duplicate submissions', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Reject an identical submission repeated within a minute (floods and double-posts).', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.dedup_enabled }
					onChange={ ( value ) => setField( 'dedup_enabled', value ) }
				/>
			</SectionCard>

			<SectionCard
				title={ __( 'Blocked submissions', 'defer-forms-for-contact-form-7' ) }
				description={ __( 'What happens to submissions the checks above reject.', 'defer-forms-for-contact-form-7' ) }
			>
				<ToggleField
					loading={ loading }
					label={ __( 'Keep blocked submissions', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Store them under the Spam tab instead of discarding them, so a real enquiry caught by mistake can still be found.', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.store_spam }
					onChange={ ( value ) => setField( 'store_spam', value ) }
				/>
				{ /* Only meaningful while the rows are kept at all. */ }
				{ !! local.store_spam && (
					<ToggleField
						loading={ loading }
						label={ __( 'Keep their file uploads too', 'defer-forms-for-contact-form-7' ) }
						help={ __( 'Off by default. A blocked submission still lists the files it sent, but the files themselves are not copied to the server — a form that takes uploads is otherwise a way for anyone to fill the disk one megabyte at a time.', 'defer-forms-for-contact-form-7' ) }
						checked={ !! local.spam_attachments }
						onChange={ ( value ) => setField( 'spam_attachments', value ) }
					/>
				) }
				<TextField
					loading={ loading }
					label={ __( 'Delete spam after (days)', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Spam is cleared on its own schedule, separate from Retention days. Set to 0 to keep forever.', 'defer-forms-for-contact-form-7' ) }
					type="number"
					min="0"
					max="3650"
					width="deferforms-w-32"
					value={ String( local.spam_retention_days ) }
					onChange={ ( value ) => setField( 'spam_retention_days', parseInt( value, 10 ) || 0 ) }
				/>
			</SectionCard>

			<SaveBar dirty={ dirty && ! loading } status={ status } problem={ problem } onSave={ save } />
		</SectionStack>
	);
};

const PrivacyTab = ( { values, onSave, loading = false } ) => {
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave );

	return (
		<SectionStack>
			<SectionCard
				title={ __( 'Privacy', 'defer-forms-for-contact-form-7' ) }
				description={ __( 'Control what personal data is stored.', 'defer-forms-for-contact-form-7' ) }
			>
				<ToggleField
					loading={ loading }
					label={ __( 'Log submitter IP address', 'defer-forms-for-contact-form-7' ) }
					help={ __( 'Store the IP address with each submission. Disable for stricter privacy compliance.', 'defer-forms-for-contact-form-7' ) }
					checked={ !! local.ip_logging }
					onChange={ ( value ) => setField( 'ip_logging', value ) }
				/>
				<div className="deferforms-rounded-lg deferforms-border deferforms-border-line deferforms-bg-stone-50/60 deferforms-p-4 deferforms-text-[15px] deferforms-leading-relaxed deferforms-text-stone-500">
					{ __( 'Stored submissions plug into WordPress’s built-in privacy tools. Under Tools → Export / Erase Personal Data, a request for a visitor’s email will include or remove their form submissions automatically.', 'defer-forms-for-contact-form-7' ) }
				</div>
			</SectionCard>
			<SaveBar dirty={ dirty && ! loading } status={ status } problem={ problem } onSave={ save } />
		</SectionStack>
	);
};

const App = () => {
	const [ active, setActive ]     = useState( getInitialTab );
	const [ settings, setSettings ] = useState( null );
	const [ error, setError ]       = useState( null );

	// The hashes this page used to answer and no longer does.
	useEffect( () => {
		const follow = () => {
			const gone = MOVED_TO[ window.location.hash.replace( '#', '' ) ];

			if ( gone ) {
				window.location.href = gone;
				return;
			}

			setActive( getInitialTab() );
		};
		follow();
		window.addEventListener( 'hashchange', follow );
		return () => window.removeEventListener( 'hashchange', follow );
	}, [] );

	useEffect( () => {
		apiFetch( { path: 'deferforms/v1/settings' } )
			.then( ( res ) => {
				setSettings( res );
				setError( null );
			} )
			.catch( ( err ) => setError( err.message ) );
	}, [] );

	const selectTab = ( id ) => {
		window.location.hash = id;
		setActive( id );
	};

	const saveSection = async ( section, values ) => {
		const updated = await apiFetch( {
			path:   `deferforms/v1/settings/${ section }`,
			method: 'POST',
			data:   values,
		} );
		setSettings( ( prev ) => ( { ...prev, [ section ]: updated } ) );
	};

	/**
	 * The chosen tab, whether or not its values have arrived.
	 *
	 * A single generic skeleton stood here for all three, and the three are not
	 * the same shape: General is one card of two fields, Spam is two cards of
	 * five, Privacy is one card of one. Whichever tab you opened, the panel
	 * changed height under you as it loaded. Each draws its own shape now, with
	 * its real headings and labels — fixed strings, and worth reading while you
	 * wait — and a shimmer where each control will be.
	 */
	const renderTab = () => {
		const loading   = ! settings;
		const tabValues = settings ? ( settings[ active ] || {} ) : {};
		const onSave    = ( vals ) => saveSection( active, vals );

		switch ( active ) {
			case 'general':
				return <GeneralTab values={ tabValues } onSave={ onSave } loading={ loading } />;
			case 'spam':
				return <SpamTab values={ tabValues } onSave={ onSave } loading={ loading } />;
			case 'privacy':
				return <PrivacyTab values={ tabValues } onSave={ onSave } loading={ loading } />;
			default:
				return null;
		}
	};

	return (
		<Page>
			<PageHeader
				title={ __( 'Settings', 'defer-forms-for-contact-form-7' ) }
				subtitle={ __( 'Configure how Defer Forms captures and handles submissions.', 'defer-forms-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="deferforms-mb-4 deferforms-rounded-lg deferforms-border deferforms-border-red-200 deferforms-bg-red-50 deferforms-px-4 deferforms-py-3 deferforms-text-sm deferforms-font-medium deferforms-text-red-700">
					{ error }
				</div>
			) }

			{ /* The same pill row the builder and submissions use, above the panel
			     rather than beside it. This page had its own vertical sidebar with
			     its own active state, which is the one place in the admin where
			     switching tabs looked like a different product. */ }
			<Tabs
				className="deferforms-mb-6"
				active={ active }
				onChange={ selectTab }
				tabs={ TABS.map( ( tab ) => ( { id: tab.id, label: tab.label } ) ) }
			/>

			<div className="deferforms-min-w-0">{ renderTab() }</div>
		</Page>
	);
};

const mount = document.getElementById( 'deferforms-settings-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
