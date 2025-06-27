import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface GLTFLoadResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  userData: any;
}

export class GLTFLoaderService {
  private static loader: GLTFLoader | null = null;
  private static dracoLoader: DRACOLoader | null = null;

  private static initializeLoader(): GLTFLoader {
    if (!this.loader) {
      this.loader = new GLTFLoader();
      
      // Setup DRACO loader for compressed models
      if (!this.dracoLoader) {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
      }
    }
    return this.loader;
  }

  public static async loadModel(url: string): Promise<GLTFLoadResult> {
    const loader = this.initializeLoader();

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => {
            const percentComplete = (progress.loaded / progress.total) * 100;
            console.log(`Loading model: ${percentComplete.toFixed(2)}%`);
          },
          (error) => reject(error)
        );
      });

      return {
        scene: gltf.scene,
        animations: gltf.animations || [],
        cameras: gltf.cameras || [],
        userData: gltf.userData || {},
      };
    } catch (error) {
      console.error(`Failed to load GLTF model from ${url}:`, error);
      throw new Error(`GLTF loading failed: ${error}`);
    }
  }

  public static async loadMultipleModels(urls: string[]): Promise<GLTFLoadResult[]> {
    try {
      const loadPromises = urls.map((url) => this.loadModel(url));
      return await Promise.all(loadPromises);
    } catch (error) {
      console.error('Failed to load multiple GLTF models:', error);
      throw new Error(`Multiple GLTF loading failed: ${error}`);
    }
  }

  public static optimizeModel(scene: THREE.Group): THREE.Group {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadow casting and receiving
        child.castShadow = true;
        child.receiveShadow = true;

        // Optimize geometry if needed
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }

        // Optimize materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              this.optimizeMaterial(material);
            });
          } else {
            this.optimizeMaterial(child.material);
          }
        }
      }
    });

    return scene;
  }

  private static optimizeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Enable environment mapping if available
      material.envMapIntensity = 1.0;
      material.needsUpdate = true;
    }
  }

  public static cloneModel(originalScene: THREE.Group): THREE.Group {
    const clonedScene = originalScene.clone(true);
    
    // Deep clone materials to avoid shared references
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((material) => material.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    return clonedScene;
  }

  public static disposeModel(scene: THREE.Group): void {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Dispose geometry
        if (child.geometry) {
          child.geometry.dispose();
        }

        // Dispose materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });
  }

  private static disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.values(material).forEach((value) => {
      if (value && value.isTexture) {
        value.dispose();
      }
    });

    material.dispose();
  }

  public static dispose(): void {
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
    this.loader = null;
  }
} 