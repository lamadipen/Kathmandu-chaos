import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLibrary {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }

  async load(path) {
    if (!this.cache.has(path)) {
      this.cache.set(path, this.loader.loadAsync(path));
    }
    return this.cache.get(path);
  }

  async cloneScene(path) {
    const gltf = await this.load(path);
    const scene = SkeletonUtils.clone(gltf.scene);
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return scene;
  }
}

export const modelLibrary = new ModelLibrary();
