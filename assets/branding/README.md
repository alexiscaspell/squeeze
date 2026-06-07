# Squeeze branding

Canonical logo assets for the project and app.

| File | Use |
|------|-----|
| `logo.png` | Full logo (mascot + wordmark). Splash screen, homepage, favicon, loading states. |
| `textlogo.png` | Text-only wordmark (cropped, transparent). Menu bar header. |

The app imports these via the `squeeze-branding` webpack alias. Static copies of `logo.png` are emitted to `images/squeeze-logo.png` and `images/apple-touch-icon.png` at build time.

When replacing assets, keep filenames the same or update `packages/scratch-gui/webpack.squeeze.js` and `packages/scratch-gui/src/lib/squeeze-brand.js`.
