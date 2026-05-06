# Kathmandu Chaos Release Checklist

Use this checklist before sharing a playable build.

## Build Check

- Run `npm install` after fresh checkout or dependency changes.
- Run `npm run release:check`.
- Run `npm run preview` and open the local preview URL.
- Confirm the title menu, garage, route start, pause menu, route finish, route failure, and credits screen all open without console errors.

## Desktop Smoke Test

- Start Route 1 from the garage.
- Pick up at least one passenger using the yellow pickup ring.
- Hit the horn once and confirm nearby traffic reacts.
- Finish or fail a route and confirm the results screen appears.
- Return to the garage and confirm fare bank, route status, and selected skin are still saved after refresh.

## Mobile Smoke Test

- Open the preview URL on a phone-size viewport.
- Confirm safe-area spacing keeps HUD and buttons away from screen edges.
- Use touch steering, `Go`, `Brake`, `Horn`, and pause.
- Confirm the game remains readable in the first route intro, during passenger pickup, and on the results screen.

## Asset And License Audit

- Keep Kenney's included license at `public/models/vendor/kenney-blocky-characters/License.txt`.
- Confirm the in-game credits screen mentions Kenney Blocky Characters, CC0, and fallback assets.
- If new models, textures, music, or sound effects are added, list their source, author, license, and local file path here before release.
- Confirm optional external models still have code-generated fallbacks if they fail to load.

## Current Third-Party Assets

| Asset | Source | License | Local Path | Notes |
| --- | --- | --- | --- | --- |
| Kenney Blocky Characters 2.0 | Kenney / kenney.nl | Creative Commons Zero (CC0) | `public/models/passengers/*.glb`, `public/models/police.glb`, `public/models/**/Textures/` | Starter passenger and traffic-police stand-ins with Nepali accessory overlays |

## Known Limitations For First Playable

- The game is a browser prototype with procedural/code-generated city props and vehicles.
- Character models are starter stand-ins, not final Kathmandu-specific character art.
- Audio is generated in code and does not yet include final recorded Kathmandu ambience.
- Progress is saved only in browser `localStorage`.
- There is no analytics, crash reporting, or remote leaderboard yet.

## Release Notes Draft

Kathmandu Chaos is a Three.js and Rapier arcade driving prototype about Maya, a tempo driver trying to save her family permit by completing chaotic Kathmandu routes. This first playable includes five routes, passenger pickup, traffic hazards, garage upgrades, route mastery, Nepali-themed landmarks, mobile controls, generated audio, and in-game credits for starter CC0 assets.
