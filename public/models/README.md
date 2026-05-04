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

The game currently uses low-poly code-generated fallbacks. `src/game/modelLoader.js` provides a cached Three.js `GLTFLoader` wrapper for replacing those fallbacks with real assets later.
