# Kathmandu Chaos

A Three.js + Rapier arcade driving game prototype where you drive a classic Nepali electric tempo through chaotic Kathmandu streets.

You play as Maya, a tempo driver trying to save her family permit by completing routes across the valley. Pick up passengers, avoid traffic, cows, cyclists, and traffic police, then reach the finish before time runs out.

Passengers are marked with bright yellow pickup rings and a floating `PICKUP` marker. Drive the tempo through the yellow ring to collect them. The target guide points to the next passenger, then switches to the finish gate once enough passengers are aboard.

## Play Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open the local URL Vite prints in your terminal.

## Controls

| Key | Action |
| --- | --- |
| `W` or `ArrowUp` | Accelerate |
| `S` or `ArrowDown` | Slow down |
| `A` or `ArrowLeft` | Steer left |
| `D` or `ArrowRight` | Steer right |
| `Space` | Brake |
| `H` | Horn |

On mobile, use the on-screen controls:

| Touch Control | Action |
| --- | --- |
| `‹` / `›` | Steer |
| `Go` | Accelerate |
| `Brake` | Brake |
| `Ⅱ` | Pause |
| `Horn` | Horn |

## Current Features

- Five playable route levels
- Data-driven level configuration
- Nepali-themed low-poly tempo, passengers, traffic police, cows, cyclists, street stalls, prayer flags, shop signs, and landmarks
- Kathmandu street identity pass with bilingual shop signs, Nepali tempo plates, rooftop water tanks, marigold garlands, facade windows, and denser prayer flags
- Route-specific street props including bus stops, shutters, shrines, utility wires, brick stacks, puddles, barriers, and prayer wheels
- Three.js 3D city, road, obstacles, and finish gates
- Rapier physics world and colliders
- Passenger pickup scoring
- Passenger driving requests such as fast pickup, careful pickup, slow boarding, and horn-before-pickup bonuses
- Yellow pickup rings and floating passenger markers
- Target guide with distance and direction
- Pickup chimes, collision feedback, screen flash, camera shake, and speed-line cues
- Passenger pickup barks with short Nepali-flavored lines and voice chirps
- Boarding animation where collected passengers hop/fade into the tempo
- Simple character motion for passenger waving and traffic-police hand signals
- Combo scoring that rewards fast clean passenger pickup streaks
- Route-specific hazards including potholes, puddles, and blocked-lane barriers
- Route intro camera pan with countdown before player control begins
- Time limit, health/chances, route progress, and retry flow
- Longer routes with extra optional passengers so missed pickups can be recovered later in the run
- Responsive HUD and overlay UI
- HUD speed meter with live km/h readout
- Garage route-selection screen with locked routes, tempo stats, and saved best fares
- Garage gameplay toggles for festival/event routes and red-light checkpoints
- Campaign progress saved with `localStorage`
- Fun power-ups for battery boost, blessing shield, fare magnet, and double-fare passenger streaks
- Pause/settings menu with resume, restart, garage, audio toggle, and reset progress
- Route minimap with passenger and police markers
- Upgradeable tempo stats for battery, brakes, and handling
- Garage tempo skins with fare-bank unlocks and saved selection
- Route mastery tracking with saved stars, best fares, route status, and unlock hints
- Tuned 5-route difficulty curve for time limits, traffic density, hazards, and optional bonus rewards
- Starter GLB character models with Nepali accessory overlays for passengers and traffic police
- Loading screen with GLB preloading and built-in character fallback status
- In-game credits/license screen for Kenney CC0 starter models and fallback assets
- Route-specific passenger personality barks for commuters, students, vendors, tourists, and elders
- Passenger callout bubbles and approach barks so waiting customers actively call for the tempo
- Route intro camera labels that spotlight key landmarks before the run starts
- Festival/event routes with route-specific arches, lamp rows, crowds, minimap markers, and optional event-tip bonuses
- Optional landmark bonus objectives that award extra fare without blocking route completion
- Main title/story sequence that frames Maya's permit run before entering the garage
- In-game first-run coach prompts plus a garage `Practice tips` replay for pickups, horn use, braking, and finish gates
- Route visual polish with color grading, route-specific lighting, stronger silhouettes, and readable landmark accents
- Route results screen with fare breakdown, best fare comparison, and 1-3 star rating
- End-of-route reward badges for new bests, unlocks, clean runs, combo streaks, and fare bank payout
- Floating 3D score popups for passenger fares, combo bonuses, hazards, and collisions
- Advanced-route minimap hazard markers for potholes, puddles, and barriers
- Route-specific weather effects with monsoon rain and mist on wet routes
- Gameplay-readable route landmarks including temples, chowks, bus parks, river bridges, and gate arches
- Curved S-turn route roads with traffic, passengers, hazards, landmarks, and finish gates following the road line
- Red-light checkpoints that reward slowing down and penalize blasting through
- Traffic variety with cars, buses, taxis, and scooters
- Light AI traffic behavior with consistent forward movement, lane drift, braking around nearby vehicles, and horn reactions
- Paced moving-traffic spawning with lane-aware gaps to reduce unfair clusters
- Mobile touch controls for steering, acceleration, braking, and pause
- Mobile polish with safe-area spacing, compact HUD, and reduced render cost on phone viewports
- Generated audio layer with ambience, route music, tempo motor, horn, and volume controls
- Route-specific ambient sounds for rain, market texture, temple bells, and police whistles

## Project Structure

```text
src/
  main.js                 App entry point
  styles.css              HUD, overlay, and responsive styling
  game/
    KathmanduChaos.js     Core game loop, rendering, physics, input, entities
    levels.js             Level data and route tuning
    modelLoader.js        Cached GLB/GLTF loader for future external models
    visuals.js            Reusable low-poly Nepali-themed mesh factories
public/
  models/                 Drop zone for optional character GLB assets
```

## Campaign Progress

The garage screen tracks progression in browser `localStorage`.

- Route 1 is unlocked by default.
- Clearing a route unlocks the next route.
- Best fare is saved per route.
- Replaying a cleared route can improve its best fare.
- Cleared-route fare is added to the garage fare bank.
- Fare bank can buy Battery, Brakes, and Handling upgrades.
- Fare bank can unlock and select tempo skins.

## Route Results

Every completed or failed route ends on a results screen.

Scoring includes:

- Passenger fare
- Time bonus
- Combo bonus
- Clean driving bonus
- Collision penalty
- Final fare
- Best fare comparison
- 1-3 star route rating

## Pause And Settings

During a route, press `Esc` or `P` to pause.

Pause menu options:

- Resume
- Restart route
- Return to garage
- Toggle audio
- Review controls

The garage also includes audio toggle and reset progress controls.

## External 3D Models

The current game includes starter Kenney low-poly GLB characters for passengers and traffic police. Kathmandu-themed accessory overlays add dhaka topi shapes, shawls, school bags, reflective traffic vests, and batons on top of those imported models. The code-generated Nepali-themed characters remain as fallbacks so routes stay playable if external assets are disabled or fail to load.

External passenger and police models are configured through `public/models/manifest.json`. To replace them, add new `.glb` files under `public/models/`, include any referenced texture folders, and update the manifest paths and scale values.

## Extending Levels

Levels live in `src/game/levels.js`. Add a new object to `LEVELS` with route name, story, length, time limit, passenger goal, obstacle counts, route theme, signs, and palette.

Example:

```js
{
  name: 'New Road Sprint',
  district: 'New Road to Basantapur',
  story: 'A festival crowd needs quick rides before the streets close.',
  length: 900,
  timeLimit: 95,
  passengerGoal: 6,
  traffic: 26,
  cows: 4,
  cyclists: 9,
  police: 3,
  theme: 'market',
  routeBoard: 'New Road',
  signs: ['New Road', 'Momo', 'Chiya'],
  palette: {
    sky: 0xbfe7ff,
    fog: 0xd9f0ff,
    road: 0x30363a,
    accent: 0xf2c94c
  }
}
```

## Build

Create a production build:

```bash
npm run build
```

Run the release check before sharing a build:

```bash
npm run release:check
```

Preview the production build:

```bash
npm run preview
```

The Vite production build uses relative asset paths, so the generated `dist/` folder can be uploaded to static hosts such as itch.io, Netlify, or a simple web server.

## Release Prep

Before publishing or sharing a playable build, use the release checklist:

- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- [RELEASE_NOTES_v0.1.0.md](./RELEASE_NOTES_v0.1.0.md)

It covers build verification, desktop and mobile smoke tests, asset/license audit, current known limitations, and a short release-notes draft.

## Suggested Next Work

- Add a third title-screen action so `Start Route 1`, `Enter garage`, and `Credits` are all available without hiding quick start.
- Add final low-poly Kathmandu character art: passenger families, vendors, students, monks, and traffic police with route-specific outfits.
- Add a release landing page or itch.io page assets: capsule image, screenshots, short trailer capture list, and controls summary.
- Add a save reset confirmation dialog so players cannot wipe progress with one accidental click.
- Add route balancing telemetry hooks for local testing: average completion time, collision count, missed pickups, and fail reason.
- Add final audio pass with sourced/recorded ambient loops and documented licenses.
- Add more vehicle unlocks after the first playable: microbus, scooter, delivery EV, and upgraded tempo variants.
