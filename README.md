# Chromatic Drift website

Website for **Chromatic Drift**, the color-rules puzzle for iPhone and iPad (code name "Chroma", app repo
`MathCatsMathCats/Chromatic-drift`). Plain HTML and CSS. Nothing to install and nothing to build.

Live at **https://makohippo.com/ChromaticDrift/** (repo `MathCatsMathCats/ChromaticDrift`, GitHub Pages
from `main`, root folder).

| Page | File |
|---|---|
| Home, with the playable demo | `index.html` |
| Support (the App Store "Support URL") | `support/index.html` |
| Privacy (this website + a summary of the app) | `privacy/index.html` |
| Impressum (German) | `impressum/index.html` |
| Page not found | `404.html` |

- Colors and layout: `assets/site.css`. The colors and fonts follow the app's title screen
  (`design_handoff_title_screen`, option 2b).
- The demo: `assets/demo.js`. It's a small copy of the game's rules (`Chroma/Core/Simulation.swift`). Its words are
  at the top of the file. The 28 × 28 field and the "balanced start" check keep the starting loop from collapsing on
  its own before the visitor changes a rule. One change (for example Blue + Red → Red wins) solves it in about
  10–15 seconds.
- Fonts: Big Shoulders Display and Archivo, self-hosted and cut down to Latin characters (`assets/fonts/`, SIL OFL).
  The site loads nothing from other servers.

## Editing text

Open a page and search for `EDIT`. Each numbered comment marks text you can change.
Change only the words between `>` and `<`, then commit and push. The change is live in about a minute.

What the site may say about the app:
- No counts of levels, chapters, achievements or skips (keep numbers off).
- No Sandbox and no gravity, for now.
- Never call it "for kids". No price in the text: say "one-time purchase".

## Screenshots

From the iOS Simulator (iPhone 17 Pro) with the app's debug launch arguments, for example
`-noAds -screen game -level 45 -begin -seconds 60 -style emotions -zoom 3`. The game is deterministic, so the same
level and seconds give the same field in every ball style. Saved as WebP at 600 px wide (`assets/img/`).
Avoid the level intro card: it shows the number of skips left.

## When the app is live on the App Store

In `index.html`:

1. **EDIT 4**: swap "Coming soon" for the App Store link (or the official badge, downloaded from Apple Marketing Tools).
2. **EDIT 11**: change the closing text and add the App Store link.
3. **LINK EDIT** near the top: add the App Store ID for Safari's app banner.

## App Store Connect

- **Support URL:** `https://makohippo.com/ChromaticDrift/support/`
- **Marketing URL:** `https://makohippo.com/ChromaticDrift/`. AdMob looks for `app-ads.txt` at the root
  of that domain, `https://makohippo.com/app-ads.txt`, which already exists in the
  `MathCatsMathCats.github.io` repo. Keep that file.
- **Privacy Policy URL:** stays `https://mathcatsmathcats.github.io/ChromaticDrift-privacy/privacy-policy.html` (it redirects to makohippo.com),
  because that address is also built into the app (Settings → Privacy policy). This site links to it.
  Never reuse the names `ChromaticDrift-privacy`, `MakoCatsMath-privacy` or `MathCats-privacy`.

`app-ads.txt` in this folder is only a spare copy: AdMob reads the one at the domain root.

## The domain

The site is served at `https://makohippo.com/ChromaticDrift/`: the custom domain `makohippo.com` is set on the root
repo `MathCatsMathCats.github.io` (DNS at Cloudflare, "DNS only"). Every project site inherits it, and the old
github.io addresses redirect there. Don't set a custom domain on this repository.

`404.html` has a fixed `<base href="/ChromaticDrift/">`, so its links work at any depth.
