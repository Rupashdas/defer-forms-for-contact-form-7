# Hooks

Everything CF7 Nova Lite offers another plugin or a theme's `functions.php`.

These are a promise. Once a version ships with one, sites depend on it, so a
name here does not change and an argument does not move. If one has to go it is
deprecated first and kept working.

Contact Form 7's own hooks all still apply — Nova does not replace CF7, so
`wpcf7_before_send_mail`, `wpcf7_mail_components` and the rest are unaffected.
What is here is only the part CF7 has no equivalent for: the stored entry.

## A submission, in order

One submission runs through these in this order:

```
cf7nl_store_submission  →  cf7nl_submission_data  →  [ row written ]
                        →  [ files kept ]  →  cf7nl_notify  →  cf7nl_submission_stored
```

The order matters twice. `cf7nl_submission_data` is before the row, so what you
remove is never written at all. `cf7nl_submission_stored` is after the files are
kept, which is what turns a file field's value from the hash CF7 uploaded under
into the name the visitor chose.

---

### `cf7nl_store_submission` — filter

Whether this submission is stored at all. The mail still goes: this is about the
row, not the form.

| | |
|---|---|
| `$store` | `bool` — what the settings decided |
| `$contact_form` | `WPCF7_ContactForm` |
| `$status` | `string` — `submitted` or `spam` |

```php
// A form whose answers there is no reason to keep.
add_filter( 'cf7nl_store_submission', function ( $store, $form ) {
	return 42 === $form->id() ? false : $store;
}, 10, 2 );
```

Returning `false` stops everything below it too — there is no entry for the rest
to be about.

---

### `cf7nl_submission_data` — filter

The entry as it will be stored, before it is written.

| | |
|---|---|
| `$data` | `array<string, mixed>` — field name to value |
| `$contact_form` | `WPCF7_ContactForm` |
| `$status` | `string` — `submitted` or `spam` |

```php
// Mail it, do not keep it.
add_filter( 'cf7nl_submission_data', function ( $data ) {
	unset( $data['nid-number'] );
	return $data;
} );

// Or the other way: something the form never asked for.
add_filter( 'cf7nl_submission_data', function ( $data ) {
	$data['utm_source'] = $_COOKIE['utm_source'] ?? 'direct';
	$data['landed_on']  = get_the_title();
	return $data;
} );
```

What you add here is an answer everywhere afterwards — the entry panel, the CSV
export, the chat notifications and the reply all read this one array.

Do not start a key with an underscore. Those are the plugin's own bookkeeping
and the screens that display an entry skip them.

---

### `cf7nl_notify` — action

A fourth place to announce an entry, beside Telegram, Slack and Discord.

| | |
|---|---|
| `$entry` | `CF7NL\CF7\Notification` |

```php
add_action( 'cf7nl_notify', function ( $entry ) {
	wp_remote_post( 'https://example.webhook.office.com/…', array(
		'headers' => array( 'Content-Type' => 'application/json' ),
		'body'    => wp_json_encode( array( 'text' => $entry->title . ' — ' . $entry->link ) ),
	) );
} );
```

`Notification` holds `$entry_id`, `$title` (the form's), `$when`, `$fields`
(field name to value, in the order they were filled in) and `$link` (the entry
in wp-admin). Formatting is yours: the three built-in destinations each mark up
text their own way, so only the content is shared.

Submitted entries only. Spam is stored so a misfiring check can be undone, not
so a bot can make somebody's pocket buzz — use `cf7nl_submission_stored` if you
want to hear about it.

The three built-in destinations have a settings screen. This one does not, so
whatever it sends to lives in your code.

---

### `cf7nl_submission_stored` — action

An entry is stored and complete. This is the one to integrate with.

| | |
|---|---|
| `$id` | `int` — the stored entry |
| `$data` | `array<string, mixed>` — the entry as stored |
| `$contact_form` | `WPCF7_ContactForm` |
| `$status` | `string` — `submitted` or `spam` |

```php
add_action( 'cf7nl_submission_stored', function ( $id, $data, $form, $status ) {
	if ( 'spam' === $status ) {
		return;
	}

	wp_remote_post( 'https://crm.example.com/leads', array(
		'body' => wp_json_encode( array( 'entry' => $id, 'fields' => $data ) ),
	) );
}, 10, 4 );
```

Fires for spam too, with `$status` saying which — a site forwarding entries
somewhere should get to decide that for itself.

This runs after everything the plugin had to do, so a fatal in your callback
cannot take the plugin's own work down with it. It is still synchronous, inside
the visitor's request: a slow endpoint here is a slow form for them.

## Elsewhere

### `cf7nl_capability` — filter

What every CF7 Nova screen and REST route asks for. Defaults to
`manage_options`.

```php
// Hand the submissions screen to editors without handing over wp-admin.
add_filter( 'cf7nl_capability', fn() => 'edit_pages' );
```

### `cf7nl_submissions_deleted` — action

Fires before entries are removed, with the rows still intact. `$rows` is an
array of the rows about to go. The plugin uses this itself to delete the files
kept with them.
