=== Essentials for Contact Form 7 - Visual Builder, Multi-Step & Submissions ===
Contributors: deferstudio, rupash
Tags: contact form 7, form builder, multi-step form, submissions, conditional logic
Requires at least: 6.5
Requires Plugins: contact-form-7
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 2.6.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

The missing modern layer for Contact Form 7 — visual builder, multi-step, submissions DB, conditional logic, and more. Free.

== Description ==

Essentials for Contact Form 7 turns Contact Form 7 into a modern visual form builder while keeping CF7's reliability untouched. Drag-and-drop fields, build multi-step flows, capture submissions in a clean dashboard, and apply conditional logic — all without breaking any existing form.

**Highlights**

* Visual drag-and-drop builder (React + dnd-kit)
* Unlimited multi-step forms with progress bar
* Submissions database with search, filter, and CSV export
* Mark an entry replied or done, and answer it from the entry itself
* Attachment storage — Contact Form 7 discards uploads; these are kept
* Visual conditional logic (AND/OR rule builder)
* Grid layout (1–4 columns, responsive)
* Redirect after submit, to a page or a URL
* Extra fields: star rating, country, password, dynamic text, product, quiz, character count
* Import / export — move forms between sites as one JSON file
* Revisions — the last ten versions of a form, with one-click rollback
* Styling controls (colors, typography, spacing), plus a CSS class of your own per form
* Spam protection (honeypot, time-trap, duplicate check)
* Privacy: submissions join WordPress's own export and erase tools
* 20+ ready-made templates
* Telegram, Slack and Discord: every submission posted into a chat or channel as it arrives
* A webhook: every submission posted as JSON to an address of your own, which is how Zapier, Make and n8n reach the rest of what you use

The Features screen lists everything this plugin does, and nothing it does not.

**For developers**

Submissions can be filtered before they are stored and hooked once they are — enough to keep a form out of the table, redact a field, or forward every entry somewhere of your own. See HOOKS.md in the plugin folder.

CF7 Essentials **extends** Contact Form 7 — never replaces it, never breaks existing forms.

== Installation ==

1. Install and activate Contact Form 7.
2. Upload `essentials-for-contact-form-7/` to `/wp-content/plugins/` (or install via WP admin).
3. Activate "Essentials for Contact Form 7" from Plugins screen.
4. Visit **CF7 Essentials** in the admin sidebar.

== Frequently Asked Questions ==

= Does it replace Contact Form 7? =
No. Essentials for Contact Form 7 sits on top of CF7. CF7 must be installed and active.

= Will it break my existing forms? =
No. Existing CF7 shortcodes keep rendering exactly as before. CF7 Essentials features are opt-in per form.

= Does the plugin send my data anywhere? =
Only if you switch on a notification destination and give it a token or a URL of your own. Nothing leaves your site otherwise — there is no telemetry, no licence check and no remote asset. See "External services" below.

== External services ==

This plugin can forward a submission to a chat service, or to an address of your own. All four destinations are **off by default**: nothing is sent until you enter your own credentials under **Submissions → Notifications** and switch that destination on.

When a destination is switched on, each submission is posted to it at the moment the form is submitted. The message contains the form's title, the time of the submission, every field name and the value the visitor entered, and a link back to the entry in your WordPress admin (which includes your site's address). Submissions caught as spam are never sent. The "Send a test message" button on the Notifications screen posts one message containing no visitor data.

**Telegram** — messages are sent to the Telegram Bot API at `https://api.telegram.org`, using the bot token and chat ID you supply.
Terms of Service: https://telegram.org/tos — Privacy Policy: https://telegram.org/privacy

**Slack** — messages are sent to the Slack incoming webhook URL you supply, at `https://hooks.slack.com`.
Terms of Service: https://slack.com/terms-of-service — Privacy Policy: https://slack.com/trust/privacy/privacy-policy

**Discord** — messages are sent to the Discord webhook URL you supply, at `https://discord.com`.
Terms of Service: https://discord.com/terms — Privacy Policy: https://discord.com/privacy

**Webhook** — this one has no fixed service behind it. The submission is posted, as JSON, to whatever address you enter in the Webhook tab, and to no other. Nothing is sent anywhere until you enter one and switch it on, and the plugin neither chooses that address nor contacts it for any other reason. Whose service it belongs to, and what their terms and privacy policy are, is therefore yours to decide before you paste it in — commonly it is an automation service such as Zapier, Make or n8n, or a server of your own.

== Source code ==

The admin screens are React, compiled with Vite into `build/`. The unminified source of every one of those files ships with the plugin, in `ui/`, alongside the build configuration (`package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`). Run `npm install && npm run build` in the plugin folder to rebuild `build/` from it.

The third-party library bundled under `assets/vendor/flatpickr/` is [flatpickr](https://github.com/flatpickr/flatpickr), MIT licensed.

== Screenshots ==

1. The visual builder — drag fields in, arrange them in columns, and see the form as you go.
2. Submissions — every entry in one list, with search, filters and CSV export.
3. An entry opened, with the reply box.
4. Multi-step forms, with the step settings and progress indicator.
5. Conditional logic — an AND/OR rule builder on any field.
6. Styling controls, shared by the front end and the builder preview.
7. The template library — 20+ ready-made forms.
8. Notifications — Telegram, Slack, Discord and a webhook.

== Changelog ==

= 2.6.0 =
* New: a webhook. Every submission is posted as JSON to an address you give it — a Zapier or Make catch hook, an n8n running on your own server, or an endpoint you wrote yourself — which is how a Contact Form 7 entry reaches a spreadsheet row, a mailing list, a CRM record or a task without this plugin having to integrate with each of them. Notifications → Webhook. Spam is never sent, and the test button posts the same shape a real submission will, so the far end can be mapped before a visitor ever fills the form in.

= 2.5.1 =
* Fixed: opening an existing Contact Form 7 form in the builder and saving it could change the form. `[text your-name 40/100]` came back as `40100` — forty thousand characters wide with no limit — and a field with a minimum lost it, with nothing on screen to say so. Round-tripping a form the builder did not write is now covered by its own test suite.
* Fixed: a caption containing a greater-than sign — `Price > 100`, `Age >= 18` — was not recognised. The field came back with no caption and the form gained two blocks of raw HTML, from nothing worse than opening it and pressing Save.
* Fixed: on nine of the starter templates, clicking the question above a radio or checkbox group answered it for the visitor. The templates were writing their own form-tags instead of using the builder's serializer, and captioned those groups with a `<label>`. All twenty-one templates now survive a trip through the builder byte-identically.
* Fixed: the four consent boxes in the templates are required again, and are now written as required rather than relying on the old code ignoring the flag.
* Fixed: every divider that was not the lightest weight became the lightest weight the first time a form was opened in the builder and saved. A divider writes two classes off the same prefix — the line style and the weight — and only the first was ever read.

= 2.5.0 =
* The plugin has been renamed. It was CF7 Nova Lite; it is Essentials for Contact Form 7 now, and the admin menu says CF7 Essentials. The old name said nothing about what the plugin does, and its folder name broke a wordpress.org naming rule.
* New: attachments have a size ceiling — 1 GB by default. Past it, submissions and their mail arrive as normal but the files are no longer copied to the server, and the admin is told. A form that takes uploads is a public endpoint that writes to the disk, and nothing bounded how often it was used. Raise or remove the ceiling with the cf7e_attachment_limit filter.
* New: blocked submissions no longer keep their file uploads. The entry is still stored and still lists what was sent, so a real enquiry caught by mistake can be found — but a caught bot now costs a few kilobytes instead of a megabyte. There is a switch under "Keep blocked submissions" for sites that want the files as well.
* Changed: the Telegram bot token and the Slack and Discord webhook URLs are no longer sent to the browser in full. Every visit to the Notifications page used to carry them across the wire in plain text. They travel masked now; emptying the box removes the stored one, and leaving it alone keeps it.
* Changed: a notification destination shows its settings only while it is switched on.
* Fixed: a personal data export carried the plugin's own bookkeeping keys — including the folder attachments are kept in, and, on sites upgraded from an older version, a signed spam-check token. That file is mailed to whoever asked for it. It now carries only what the visitor answered.
* Fixed: two requests could hold the schema upgrade lock at the same time and run the upgrade together. WordPress core spells add_option() as an INSERT that succeeds for both racers; the lock is a single INSERT IGNORE now.
* Fixed: the CSV export opened its output stream after sending the download headers, so a stream that would not open wrote its error into a half-begun file.
= 2.4.0 =
* New for developers: four hooks on a submission — keep a form out of the table, change what is stored before it is written, announce an entry somewhere of your own, or act on one once it exists. Documented in HOOKS.md.
* Fixed: search boxes and other text fields were four pixels taller than the buttons beside them. WordPress imposes a minimum height on inputs that a plugin has to undo; nineteen controls across six screens were affected.
* Fixed: one file was reported as allowing direct access even though it blocked it. The check only reads the first fifty lines of a file, and that one had too many imports above the line.

= 2.3.1 =
* The Features screen lists marking and answering an entry, which shipped in 2.3.0 without being added to it.
* Fixed: File Uploads Kept drew a generic icon instead of its own.
* The plugin description was out of date — it still described Telegram alone, with no mention of Slack, Discord, or answering an entry.

= 2.3.0 =
* New: mark an entry Replied or Done, so the list stops being a log and starts being an inbox. Press the same button again to take it back off, and filter the list by it.
* New: answer an enquiry from the entry itself, without copying the address into a mail client. Forms that never asked for an email address say so instead of offering a box that could not send.
* The entry panel was rearranged. It is wider, the answers are laid out in two columns, and the reply box waits until you ask for it — it was taking up more room than the entry it was about.
* Fixed: on a quiz field the required star appeared under the box instead of beside the question.

= 2.2.0 =
* New: Slack and Discord. Every submission is posted into a channel as it arrives, alongside Telegram. One webhook URL each, with a button to test it before you switch it on.
* Notifications moved out of Settings onto a page of their own, under Submissions. Old links to the Settings tabs still work.
* New: a CSS class per form, under the form’s Settings tab, for the one form that needs to look different from the rest.
* Fixed: an uploaded file arrived in a notification as a long hash instead of its filename.
* Fixed: a radio or checkbox group sat flush against the field below it, with no gap, on the front end and in the styling preview.
* Fixed: focus outlines were black in some places and the browser’s blue in others. Every clickable thing now shows the same ring, and only when reached from the keyboard.
* Fixed: spam entries appeared among the newest entries on the Dashboard.
* The Dashboard’s notices can be got rid of: unread offers to mark them all read, and the spam notice can be dismissed until more arrives.
* The form’s shortcode is now in the builder toolbar, so it can be copied without leaving.
* The Features page lost its search box, lists Telegram, Slack and Discord as one entry, and now mentions that uploaded files are kept with the entry — which it never did.
= 2.1.0 =
* New: Telegram. Every submission is forwarded to a Telegram chat as it arrives — the form name, the time, every field and its value, and a link to open the entry. Set a bot token and a chat ID under Settings → Telegram, and use the test button to check them before switching it on. Spam is never sent.
* The AI form generator has been dropped rather than built, and no longer appears as planned. The Features screen lists what the plugin does and nothing it does not.
= 2.0.7 =
* Much faster on sites with a lot of entries. Measured at 100,000 submissions: the Forms page went from 970ms to 35ms, and the Dashboard and Submissions screens roughly halved. Two database indexes were missing, and two queries were counting entries in a way that made the database read every row. Nothing about what the screens show has changed — only how long they take.
* This update adds two indexes to the submissions table. On a very large table the first admin page load after updating may take a few seconds while they are built.
= 2.0.6 =
* Multi-step forms no longer jump back to the first step after a successful submit. The success message is shown where you are, and moving you took away the thing you had just been looking at.
* Fixed: a redirect set to open in a new tab did nothing at all. Browsers only allow a new tab for a few seconds after the click, so a longer wait was refused — and the way the tab was being opened made the refusal invisible to the plugin. A refused tab now falls back to opening in the same tab, so the redirect always happens. Around 2 seconds is a reliable wait for a new tab, and the builder says so when the wait is set longer.
* Added "Nowhere — stay on the page" to the redirect setting. Turning a redirect off used to mean choosing a destination and leaving its box empty.
* The Dashboard's spam and unread notices now open Submissions on the matching tab instead of on All.
= 2.0.5 =
* Fixed: saving a form could empty it. A save that reached the server without its fields wrote a blank form over the real one and reported success — no error, nothing in the log, and the first sign would have been a form that had stopped appearing. Emptying a form on purpose still saves; a save that lost its fields on the way is now refused.
* Fixed: headings, paragraphs and dividers lost their alignment, size and style whenever those had never been set — a heading came out with no heading tag at all. Anything built before those settings existed renders properly again.
* Fixed: the form builder had no name in the browser tab, and every visit to it wrote a PHP notice to the debug log.
* Opening an entry now puts it in the address, so you can link to the one you are reading, reload without losing your place, and use Back to close it.
= 2.0.4 =
* Housekeeping only — nothing about the plugin behaves differently. The source now passes the WordPress coding standards with no findings left standing, and two small things in the revision history were rewritten to say plainly what they do.
= 2.0.3 =
* The Dashboard is a different screen. It used to be four figures that read 0 on a new site and repeated each other on a young one; it now shows what has actually been arriving — a thirty-day activity chart, this week against the one before it, which forms are getting the entries, and the latest few. A site with nothing yet gets a way in rather than a row of zeroes.
* Clicking an entry on the Dashboard opens that entry. It used to land on the Submissions list with nothing selected.
* Every admin screen now loads at the size it will keep. Cards used to come up short and grow the moment the data arrived, which moved whatever you were about to click. The Features screen no longer waits at all — its list travels with the page.
= 2.0.2 =
* Removed the manual translation loader. WordPress has loaded plugin translations on its own since 4.6, and this plugin ships none of its own — the template in languages/ is what a translator starts from, and finished translations live in wp-content/languages/plugins/ where an update cannot delete them. Nothing about translating the plugin changes; one warning on every Plugin Check run does.

= 2.0.1 =
* Removed the "See Pro" button from the Features screen. It pointed at a placeholder address, which reads as a broken plugin rather than as a feature that has not been built. Pro is not being built until the free version has had time with real users; the screen still says what it will hold.
* The Features screen moved to a matching address. It was reached at `admin.php?page=cf7-essentials-modules`, left over from when these were modules with a switch beside each one, and is now `admin.php?page=cf7-essentials-features`. Update any bookmark.

= 2.0.0 =
* Full architectural rebuild from scratch.
* Visual builder: grid rows, multi-step page breaks, conditional logic, undo/redo, live preview.
* Submissions database with search, filtering, CSV export and kept attachments.
* Styling controls on a page of their own, shared by the front end and the builder preview.
* Extra fields: star rating, country, password, dynamic text, submission ID, product, quiz, character count.
* Import / export: move forms between sites as one JSON file.
* Redirect after submit, to a page or a URL.
* Privacy: submissions answer WordPress's own export and erase requests.

== Upgrade Notice ==

= 2.6.0 =
Adds a webhook destination: every submission posted as JSON to an address of your own, which is how Zapier, Make and n8n connect a form to the rest of what you use. Nothing changes for existing installs until you switch it on.

= 2.5.1 =
Fixes four ways a form could be damaged by being opened in the builder and saved, including a length limit that turned into a width and a caption lost to a greater-than sign. Recommended for everyone.
