=== CF7 Nova Lite ===
Contributors: rupashdas
Tags: contact form 7, form builder, multi-step form, submissions, conditional logic
Requires at least: 6.5
Requires Plugins: contact-form-7
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 2.1.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

The missing modern layer for Contact Form 7 — visual builder, multi-step, submissions DB, conditional logic, and more. Free.

== Description ==

CF7 Nova Lite turns Contact Form 7 into a modern visual form builder while keeping CF7's reliability untouched. Drag-and-drop fields, build multi-step flows, capture submissions in a clean dashboard, and apply conditional logic — all without breaking any existing form.

**Highlights**

* Visual drag-and-drop builder (React + dnd-kit)
* Unlimited multi-step forms with progress bar
* Submissions database with search, filter, and CSV export
* Attachment storage — Contact Form 7 discards uploads; these are kept
* Visual conditional logic (AND/OR rule builder)
* Grid layout (1–4 columns, responsive)
* Redirect after submit, to a page or a URL
* Extra fields: star rating, country, password, dynamic text, product, quiz, character count
* Import / export — move forms between sites as one JSON file
* Revisions — the last ten versions of a form, with one-click rollback
* Styling controls (colors, typography, spacing)
* Spam protection (honeypot, time-trap, duplicate check)
* Privacy: submissions join WordPress's own export and erase tools
* 20+ ready-made templates
* Telegram: every submission forwarded to a chat as it arrives

The Features screen lists everything this plugin does, and nothing it does not.

CF7 Nova **extends** Contact Form 7 — never replaces it, never breaks existing forms.

== Installation ==

1. Install and activate Contact Form 7.
2. Upload `cf7-nova-lite/` to `/wp-content/plugins/` (or install via WP admin).
3. Activate "CF7 Nova Lite" from Plugins screen.
4. Visit **CF7 Nova** in the admin sidebar.

== Frequently Asked Questions ==

= Does it replace Contact Form 7? =
No. CF7 Nova Lite sits on top of CF7. CF7 must be installed and active.

= Will it break my existing forms? =
No. Existing CF7 shortcodes keep rendering exactly as before. Nova features are opt-in per form.

== Changelog ==

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
* The Features screen moved to a matching address. It was reached at `admin.php?page=cf7-nova-modules`, left over from when these were modules with a switch beside each one, and is now `admin.php?page=cf7-nova-features`. Update any bookmark.

= 2.0.0 =
* Full architectural rebuild from scratch.
* Visual builder: grid rows, multi-step page breaks, conditional logic, undo/redo, live preview.
* Submissions database with search, filtering, CSV export and kept attachments.
* Styling controls on a page of their own, shared by the front end and the builder preview.
* Extra fields: star rating, country, password, dynamic text, submission ID, product, quiz, character count.
* Import / export: move forms between sites as one JSON file.
* Redirect after submit, to a page or a URL.
* Privacy: submissions answer WordPress's own export and erase requests.
