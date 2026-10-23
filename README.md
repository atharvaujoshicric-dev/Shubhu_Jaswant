# Cinematic Wedding Invitation (scroll-driven)

A static website — plain HTML, CSS and JavaScript. No build step, no backend, no npm.
Scrolling plays the 200 video frames in `frames/` forward; scrolling up reverses them.

## 1. Edit your wedding details
Open **`js/config.js`** — it is the only file you need to edit. Everything in `[square brackets]`
is a placeholder (shown with a dotted underline on the site until you replace it):
names, welcome message, date/time, venue, schedule, RSVP email, closing message.

- `date.iso` (e.g. `"2026-12-12T16:00"`) turns on the live countdown and "Add to Calendar" button.
- `venue.mapUrl` shows a "View Map" button. Empty values hide optional items.

> Note: the supplied video frames themselves contain artwork/text (names, date, venue) baked into the
> images. The website text is placeholder-only; make sure the two match before sharing.

## 2. RSVP
GitHub Pages has no server, so replies are **not stored**. "Send RSVP by Email" opens the guest's email
app with the reply pre-filled (`mailto:`) — they must press Send. "Copy Reply Text" lets them send it by
message instead. Set `rsvp.email` in `config.js`; until then the form explains it is not set up.
For stored submissions use an external form service (e.g. Formspree, Google Forms).

## 3. Deploy to GitHub Pages
1. Create a repository (e.g. `wedding-invitation`) and upload **the contents of this folder**
   (`index.html` must be at the repository root, with `css/`, `js/`, `frames/` beside it).
   Drag-and-drop on github.com works; if the 200 files exceed one upload, upload in batches.
2. Repository **Settings → Pages → Build and deployment**: Source **Deploy from a branch**,
   branch `main`, folder `/ (root)`, Save.
3. After a minute the site is live at `https://<user>.github.io/wedding-invitation/`.

All paths are relative, so subpath hosting works. Filenames are case-sensitive:
keep `frames/ezgif-frame-001.jpg … ezgif-frame-200.jpg` unchanged. `.nojekyll` is included.

## How it works
- Sticky full-screen `<canvas>`; scroll progress → frame 1–200, eased with a frame-rate-independent lerp.
- Frames load coarse-to-fine (every 40th, 20th, 10th… frame) with a percentage loader, so scrubbing works
  even on slow links. Failed frames retry once, then the nearest loaded frame is shown. After 7 s
  (or immediately on slow/data-saver connections) an "Enter now" button appears.
- Frames are drawn "contain"-fit (never stretched); a blurred copy fills any letterbox area.
- `prefers-reduced-motion`: only 4 key frames load and the scene steps between them with no easing,
  smooth scrolling or reveal animations.
- Fonts come from Google Fonts; offline they fall back to Georgia/cursive. Remove the `<link>` tags in
  `index.html` if you want zero external requests.

## Files
`index.html` · `css/styles.css` · `js/config.js` (edit) · `js/main.js` · `frames/` (200 JPGs) · `.nojekyll`
