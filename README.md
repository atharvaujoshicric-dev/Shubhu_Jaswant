# Scroll-Driven Wedding Video

Pure HTML/CSS/JS. Scrolling plays the 200 frames in `frames/` forward; scrolling up reverses them.

## Deploy (GitHub Pages)
1. Upload the **contents of this folder** to the repository root (`index.html` at the root, with `css/`, `js/`, `frames/` beside it).
2. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

All paths are relative, so repository subpaths work. Keep `frames/ezgif-frame-001.jpg … 200.jpg` names unchanged (case-sensitive).

## Notes
- Loading screen with percentage; frames load coarse-to-fine, failed frames fall back to the nearest loaded one, and an "Enter now" button appears on slow connections.
- Frames are fitted without distortion; a blurred copy fills empty side/top areas.
- `prefers-reduced-motion`: loads 4 key frames and steps between them without easing.
- To make the animation longer/shorter, change `--track` in `css/styles.css`.
