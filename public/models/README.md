# Model Drop Zone

Place optional `.glb` or `.gltf` character assets here.

Recommended layout:

```text
public/models/
  passengers/
    student.glb
    office-worker.glb
    elder.glb
  police.glb
```

The game currently uses Nepali-themed low-poly code-generated fallbacks. `src/game/modelLoader.js` provides a cached Three.js `GLTFLoader` wrapper for replacing those fallbacks with real assets.

## Enable External Models

1. Add your `.glb` files to this folder.
2. Update `manifest.json` paths if your filenames are different.
3. Change `"enabled": false` to `"enabled": true`.
4. Restart the dev server if needed.

If a model cannot load, the game keeps using the built-in low-poly fallback so routes remain playable.

## Recommended Sources

- Kenney Blocky Characters: CC0, animated, low-poly.
- Quaternius Universal Base Characters: CC0, glTF/FBX, rigged.
- Ready Player Me: customizable GLB avatars, useful later for generated player/passenger identities.
