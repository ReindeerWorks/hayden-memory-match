# Hayden's Memory Match

A children's memory card matching game for ages 4+. Every card shows both an image and the word — so kids passively read while they play.

## How to play

Open `index.html` directly in any browser — no server or build step required.

## Shared images

Images are served from the **spell-the-summon** GitHub Pages site:

```
https://reindeerworks.github.io/spell-the-summon/assets/images/[word].png
```

For local development the placeholder fallback (purple square with first letter) will show until images are published. Alternatively, copy PNGs into a local `assets/images/` folder and temporarily swap the paths in `data/words.js`.

### Required images (Trainee set)

```
bat.png  cat.png  fox.png  gem.png  sun.png
hat.png  web.png  egg.png  map.png  cup.png
```

Missing images fall back to a purple placeholder showing the word's first letter.

## Sounds

No audio files required — match chimes and win fanfare are generated with Web Audio API. Voice feedback uses the browser's built-in Web Speech API.

## GitHub Pages

Live at: **https://reindeerworks.github.io/hayden-memory-match**

Both repos must be published under the same GitHub account (`reindeerworks`) so the relative image path `../spell-the-summon/assets/images/` resolves correctly via GitHub Pages.
