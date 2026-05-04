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

## Current Features

- Five playable route levels
- Data-driven level configuration
- Nepali-themed low-poly tempo, passengers, traffic police, cows, cyclists, street stalls, prayer flags, shop signs, and landmarks
- Three.js 3D city, road, obstacles, and finish gates
- Rapier physics world and colliders
- Passenger pickup scoring
- Yellow pickup rings and floating passenger markers
- Target guide with distance and direction
- Pickup chimes, collision feedback, screen flash, camera shake, and speed-line cues
- Time limit, health/chances, route progress, and retry flow
- Responsive HUD and overlay UI
- Garage route-selection screen with locked routes, tempo stats, and saved best fares
- Campaign progress saved with `localStorage`

## Project Structure

```text
src/
  main.js                 App entry point
  styles.css              HUD, overlay, and responsive styling
  game/
    KathmanduChaos.js     Core game loop, rendering, physics, input, entities
    levels.js             Level data and route tuning
    visuals.js            Reusable low-poly Nepali-themed mesh factories
```

## Campaign Progress

The garage screen tracks progression in browser `localStorage`.

- Route 1 is unlocked by default.
- Clearing a route unlocks the next route.
- Best fare is saved per route.
- Replaying a cleared route can improve its best fare.

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

Preview the production build:

```bash
npm run preview
```

## Future Ideas

- Vehicle unlocks: tempo, microbus, scooter, delivery EV
- Route-specific hazards: potholes, rain puddles, road closures, festival crowds
- Combo scoring for clean driving and fast pickups
- Garage upgrades for handling, battery, braking, and passenger capacity
- Audio: horns, street ambience, pickup sounds, police whistle
