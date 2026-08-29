/**
 * Notifications: where a submission goes the moment it arrives.
 *
 * Three destinations were three tabs in Settings, which is where they started
 * and where they had stopped fitting. Each one carries credentials and a button
 * that goes and tries them — a job rather than a preference — and Settings was
 * six tabs deep with three of them on one subject.
 *
 * The page they moved to is the one Styling took first, for the same reason and
 * with the same result: a subject with room to grow rather than a tab competing
 * with unrelated ones. The routing rules go here when they come.
 */
import { createRoot, useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

import { Page, PageHeader } from '@shared/components/page';
import { Button, Tabs } from '@shared/components/ui';
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
	{ id: 'telegram', label: __( 'Telegram', 'essentials-for-contact-form-7' ) },
	{ id: 'slack', label: __( 'Slack', 'essentials-for-contact-form-7' ) },
	{ id: 'discord', label: __( 'Discord', 'essentials-for-contact-form-7' ) },
	{ id: 'webhook', label: __( 'Webhook', 'essentials-for-contact-form-7' ) },
];

const getInitialTab = () => {
	const hash = window.location.hash.replace( '#', '' );
	return TABS.some( ( tab ) => tab.id === hash ) ? hash : TABS[ 0 ].id;
};

/**
 * A notification destination: its credentials, and a button to prove they work.
 *
 * Four of these, differing only in what they are called and which fields they
 * ask for. Written once because the part that matters is the same in all four:
 * the test send.
 *
 * That test is most of the value here. Everything on these tabs is pasted from
 * somebody else's UI — a token from BotFather, a webhook URL from a Slack app
 * page — and pasting the wrong one of two long strings is the normal outcome.
 * Without a way to check, the first sign is a submission that never arrives,
 * hours later, with nothing to say which half was wrong.
 */
const NotifierTab = ( { section, title, description, toggleLabel, fields, values, onSave, loading = false } ) => {
	const { local, setField, dirty, status, problem, save } = useSectionForm( values, onSave );
	const [ test, setTest ] = useState( null );

	const sendTest = () => {
		setTest( { state: 'sending' } );

		apiFetch( { path: `cf7e/v1/settings/${ section }/test`, method: 'POST' } )
			.then( () => setTest( { state: 'sent' } ) )
			.catch( ( err ) => setTest( { state: 'failed', message: err.message } ) );
	};

	/*
	 * The credentials, and the button that tries them, are the whole of what a
	 * destination is — and none of it is worth reading while the destination is
	 * switched off. A tab that is not in use is the toggle and nothing else.
	 *
	 * Shown while loading, though. The answer has not arrived yet, and the
	 * loading state exists to hold the shape of what is coming rather than to
	 * guess at it: hiding on `false` before `false` is known would flash an
	 * empty tab at everyone whose destination is on.
	 */
	const configuring = loading || !! local.enabled;

	return (
		<SectionStack>
			<SectionCard title={ title } description={ description }>
				<ToggleField
					loading={ loading }
					label={ toggleLabel }
					help={ __( 'Spam is never sent.', 'essentials-for-contact-form-7' ) }
					checked={ !! local.enabled }
					onChange={ ( value ) => setField( 'enabled', value ) }
				/>
				{ configuring && fields.map( ( field ) => {
					/*
					 * A stored secret arrives masked, so the box holds something
					 * like `1234…8765` that nobody typed. Without a word about it
					 * that reads as a value the plugin has mangled — so while the
					 * mask is still what is in the box, the help text says what it
					 * is and what the two ways out of it are.
					 */
					const masked = field.secret && !! values[ field.key ] && local[ field.key ] === values[ field.key ];

					return (
						<TextField
							key={ field.key }
							loading={ loading }
							label={ field.label }
							help={ masked
								? __( 'Saved, and shown only in part. Paste a new one to replace it, or empty the box to remove it.', 'essentials-for-contact-form-7' )
								: field.help }
							placeholder={ field.placeholder }
							value={ local[ field.key ] || '' }
							onChange={ ( value ) => setField( field.key, value ) }
						/>
					);
				} ) }
			</SectionCard>

			{ configuring && (
			<SectionCard
				title={ __( 'Check it works', 'essentials-for-contact-form-7' ) }
				description={ __( 'Sends one message, using the settings as they are saved.', 'essentials-for-contact-form-7' ) }
			>
				{ /* Saved, not typed: the button asks the server, and the server
				     reads what is stored. Testing what is on screen would pass on
				     settings that were never kept. */ }
				<div className="cf7e-flex cf7e-flex-wrap cf7e-items-center cf7e-gap-3">
					<Button
						variant="ghost"
						onClick={ sendTest }
						disabled={ loading || dirty || 'sending' === test?.state }
					>
						{ 'sending' === test?.state
							? __( 'Sending…', 'essentials-for-contact-form-7' )
							: __( 'Send a test message', 'essentials-for-contact-form-7' ) }
					</Button>

					{ dirty && (
						<span className="cf7e-text-sm cf7e-text-stone-500">
							{ __( 'Save first — the test uses the saved settings.', 'essentials-for-contact-form-7' ) }
						</span>
					) }

					{ 'sent' === test?.state && (
						<span className="cf7e-text-sm cf7e-font-medium cf7e-text-emerald-700">
							{ __( 'Sent. Go and look.', 'essentials-for-contact-form-7' ) }
						</span>
					) }
				</div>

				{ /* Their own words, not ours: "chat not found", "Unauthorized",
				     "no_service" and "Unknown Webhook" each name which part is
				     wrong, which is more than any message written here could. */ }
				{ 'failed' === test?.state && (
					<div className="cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
						{ test.message }
					</div>
				) }
			</SectionCard>
			) }

			<SaveBar dirty={ dirty && ! loading } status={ status } problem={ problem } onSave={ save } />
		</SectionStack>
	);
};

/**
 * What each destination is called and what it needs.
 *
 * A URL carries its own destination and identity, so three of the four ask for
 * one field where Telegram needs two that have to match each other.
 *
 * The help text is the whole of the documentation for these. Every value on
 * this page is pasted from somewhere else, and the sentence saying where to go
 * and get it is what stops the tab from being a box with no answer in it.
 */
const NOTIFIERS = {
	telegram: {
		title:       __( 'Telegram', 'essentials-for-contact-form-7' ),
		description: __( 'Send every submission to a Telegram chat as it arrives.', 'essentials-for-contact-form-7' ),
		toggleLabel: __( 'Send submissions to Telegram', 'essentials-for-contact-form-7' ),
		fields:      [
			{
				key:         'bot_token',
				secret:      true,
				label:       __( 'Bot token', 'essentials-for-contact-form-7' ),
				help:        __( 'Message @BotFather on Telegram, send /newbot, and paste the token it gives you.', 'essentials-for-contact-form-7' ),
				placeholder: '123456789:AAE...',
			},
			{
				key:         'chat_id',
				label:       __( 'Chat ID', 'essentials-for-contact-form-7' ),
				help:        __( 'Send your bot a message first — it cannot write to you until you do. Then open api.telegram.org/bot<token>/getUpdates and read the chat id from it.', 'essentials-for-contact-form-7' ),
				placeholder: '-1001234567890',
			},
		],
	},
	slack: {
		title:       __( 'Slack', 'essentials-for-contact-form-7' ),
		description: __( 'Post every submission into a Slack channel as it arrives.', 'essentials-for-contact-form-7' ),
		toggleLabel: __( 'Send submissions to Slack', 'essentials-for-contact-form-7' ),
		fields:      [
			{
				key:         'webhook_url',
				secret:      true,
				label:       __( 'Webhook URL', 'essentials-for-contact-form-7' ),
				help:        __( 'At api.slack.com/apps, make an app for your workspace, turn on Incoming Webhooks, and add one for the channel you want.', 'essentials-for-contact-form-7' ),
				placeholder: 'https://hooks.slack.com/services/...',
			},
		],
	},
	discord: {
		title:       __( 'Discord', 'essentials-for-contact-form-7' ),
		description: __( 'Post every submission into a Discord channel as it arrives.', 'essentials-for-contact-form-7' ),
		toggleLabel: __( 'Send submissions to Discord', 'essentials-for-contact-form-7' ),
		fields:      [
			{
				key:         'webhook_url',
				secret:      true,
				label:       __( 'Webhook URL', 'essentials-for-contact-form-7' ),
				help:        __( 'In the channel: Edit Channel → Integrations → Webhooks → New Webhook, then Copy Webhook URL.', 'essentials-for-contact-form-7' ),
				placeholder: 'https://discord.com/api/webhooks/...',
			},
		],
	},
	webhook: {
		title:       __( 'Webhook', 'essentials-for-contact-form-7' ),
		description: __( 'Post every submission to an address of your own, as JSON.', 'essentials-for-contact-form-7' ),
		toggleLabel: __( 'Send submissions to a webhook', 'essentials-for-contact-form-7' ),
		fields:      [
			{
				key:         'webhook_url',
				secret:      true,
				label:       __( 'Endpoint URL', 'essentials-for-contact-form-7' ),
				help:        __( 'Anything that accepts a JSON POST. Zapier, Make and n8n each hand you one to paste here, and connect onward from there to whatever you actually use.', 'essentials-for-contact-form-7' ),
				placeholder: 'https://hooks.zapier.com/hooks/catch/...',
			},
		],
	},
};

const App = () => {
	const [ active, setActive ]     = useState( getInitialTab );
	const [ settings, setSettings ] = useState( null );
	const [ error, setError ]       = useState( null );

	useEffect( () => {
		const follow = () => setActive( getInitialTab() );
		window.addEventListener( 'hashchange', follow );
		return () => window.removeEventListener( 'hashchange', follow );
	}, [] );

	// The whole settings object, because a section is not separately fetchable
	// and four destinations are four sections of it.
	useEffect( () => {
		apiFetch( { path: 'cf7e/v1/settings' } )
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
			path:   `cf7e/v1/settings/${ section }`,
			method: 'POST',
			data:   values,
		} );

		setSettings( ( prev ) => ( { ...prev, [ section ]: updated } ) );
	};

	return (
		<Page>
			<PageHeader
				title={ __( 'Notifications', 'essentials-for-contact-form-7' ) }
				subtitle={ __( 'Send every submission onward the moment it arrives.', 'essentials-for-contact-form-7' ) }
			/>

			{ error && (
				<div className="cf7e-mb-4 cf7e-rounded-lg cf7e-border cf7e-border-red-200 cf7e-bg-red-50 cf7e-px-4 cf7e-py-3 cf7e-text-sm cf7e-font-medium cf7e-text-red-700">
					{ error }
				</div>
			) }

			<Tabs
				className="cf7e-mb-6"
				active={ active }
				onChange={ selectTab }
				tabs={ TABS.map( ( tab ) => ( { id: tab.id, label: tab.label } ) ) }
			/>

			<div className="cf7e-min-w-0">
				{ /*
				  * Keyed by section, and it has to be.
				  *
				  * All four tabs are the same component in the same place, so
				  * without a key React keeps the instance and only swaps the
				  * props — and the form state inside it, which is the half-typed
				  * values of the tab you just left, stays. Switch from Telegram
				  * with its toggle on to Slack and Slack's toggle is on too;
				  * press Save there and Telegram's answer is written into
				  * Slack's settings. A key makes each destination its own form.
				  */ }
				<NotifierTab
					key={ active }
					section={ active }
					{ ...NOTIFIERS[ active ] }
					values={ settings ? ( settings[ active ] || {} ) : {} }
					onSave={ ( values ) => saveSection( active, values ) }
					loading={ ! settings }
				/>
			</div>
		</Page>
	);
};

const mount = document.getElementById( 'cf7e-notifications-root' );
if ( mount ) {
	createRoot( mount ).render( <App /> );
}
