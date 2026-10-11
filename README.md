# Taskmaster iPad Web App

A touch-first, single-page web app prototype for an iPad treasure hunt. It runs as a static site with no build step or package dependencies.

## Run locally

From this folder, start a local web server:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000> in a browser. To try it on an iPad, open the Mac's local network address on the iPad while both devices are on the same Wi-Fi network.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository settings, open **Pages**.
3. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Open the Pages URL on the iPad. In Safari, use **Add to Home Screen** to install the standalone web app.

## Project files

- `index.html` — page structure and web app metadata
- `style.css` — responsive, iPad-friendly presentation
- `app.js` — screens, decision flow, passcode checks, games, and timers
- `manifest.json` — Home Screen web app settings
- `music.mp3` — audio used in Relaxed Mode

The Google Font is loaded from Google Fonts, so the typewriter face requires an internet connection. The app itself has no build or install step.
