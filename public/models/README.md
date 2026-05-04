# Model Drop Zone

Place optional `.glb` or `.gltf` character assets here.

This project currently includes starter Kenney Blocky Characters for passengers and traffic police. They are useful as temporary low-poly production stand-ins while the Kathmandu-specific character art direction is refined.

Recommended layout:

```text
public/models/
  passengers/
    student.glb
    office-worker.glb
    elder.glb
    Textures/
  police.glb
  Textures/
  vendor/
    kenney-blocky-characters/
      License.txt
```

The game currently uses Nepali-themed low-poly code-generated fallbacks. `src/game/modelLoader.js` provides a cached Three.js `GLTFLoader` wrapper for replacing those fallbacks with real assets.

## Enable External Models

1. Add your `.glb` files to this folder.
2. Include any referenced texture folders beside the `.glb` files.
3. Update `manifest.json` paths if your filenames are different.
4. Change `"enabled": false` to `"enabled": true`.
5. Restart the dev server if needed.

If a model cannot load, the game keeps using the built-in low-poly fallback so routes remain playable.

## Included Starter Assets

- `passengers/student.glb`
- `passengers/office-worker.glb`
- `passengers/elder.glb`
- `police.glb`

These starter models come from Kenney Blocky Characters. Their license is included at `vendor/kenney-blocky-characters/License.txt`.

## Recommended Sources

- Kenney Blocky Characters: CC0, animated, low-poly.
- Quaternius Universal Base Characters: CC0, glTF/FBX, rigged.
- Ready Player Me: customizable GLB avatars, useful later for generated player/passenger identities.
