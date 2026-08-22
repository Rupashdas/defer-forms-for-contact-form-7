# CF7 Nova Lite

A modern layer on top of [Contact Form 7](https://wordpress.org/plugins/contact-form-7/): a
drag-and-drop builder, multi-step forms, conditional logic, and a submissions database — without
changing how Contact Form 7 itself works.

Nova **extends** Contact Form 7. It does not replace it, and it does not rewrite your existing
forms: every form it builds is ordinary CF7 form-tag markup, so anything already on your site keeps
working, and you can stop using Nova at any time without losing a form.

## Requirements

| | |
|---|---|
| WordPress | 6.5 or newer |
| PHP | 8.0 or newer |
| Contact Form 7 | required, any current version |

## Installation

1. Download this repository as a ZIP — **Code → Download ZIP**.
2. In WordPress, go to **Plugins → Add New → Upload Plugin** and choose the file.
3. Activate. A **CF7 Nova** menu appears in the sidebar.

The download is ready to run: the admin bundles are compiled and included, so there is nothing to
build. GitHub names the folder `cf7-nova-lite-main`; renaming it to `cf7-nova-lite` is tidier but
not required.

## What it does

**Building forms**

- Drag-and-drop builder with undo/redo and a live preview
- Grid rows — 1 to 4 responsive columns
- Multi-step forms with a progress bar and per-step titles
- Conditional logic with an AND/OR rule builder
- 20+ ready-made templates
- Revisions — the last ten versions of a form, with one-click rollback
- Import / export — move forms between sites as one JSON file

**Extra fields**

Star rating, country picker, password, dynamic text, product, quiz and character count — plus a
searchable select and a drag-and-drop file upload with previews.

**After the form is sent**

- Submissions database with search, filtering and CSV export
- Uploaded files are kept — Contact Form 7 discards them after mailing
- Mark an entry replied or done, and answer it from the entry itself
- Telegram, Slack and Discord — every submission posted into a chat or channel as it arrives
- Redirect after submit, to a page or a URL
- Privacy: submissions answer WordPress's own export and erase requests

**Everything else**

- Styling controls for colours, typography and spacing, with no CSS to write, and a CSS class of your own for the one form that needs it
- Spam protection: honeypot, time-trap and a duplicate check

The plugin's own **Features** screen lists what is here and what is not. Nothing is listed there as
coming: Telegram was the last thing waiting on that list and it shipped, and the AI generator was
dropped rather than built.

## Support

Found something broken? Open an issue with the WordPress version, the PHP version, the Contact
Form 7 version, and what the form looked like when it happened.

## License

GPL-2.0-or-later. See [LICENSE](https://www.gnu.org/licenses/gpl-2.0.html).
