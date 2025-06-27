import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export interface HDRILoadResult {
  environmentMap: THREE.Texture;
  backgroundTexture: THREE.Texture;
  originalTexture: THREE.DataTexture;
}

export class HDRILoaderService {
  private static loader: RGBELoader | null = null;
  private static pmremGenerator: THREE.PMREMGenerator | null = null;

  private static initializeLoader(): RGBELoader {
    if (!this.loader) {
      this.loader = new RGBELoader();
    }
    return this.loader;
  }

  private static initializePMREMGenerator(renderer: THREE.WebGLRenderer): THREE.PMREMGenerator {
    if (!this.pmremGenerator) {
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }
    return this.pmremGenerator;
  }

  public static async loadHDRI(
    url: string,
    renderer: THREE.WebGLRenderer
  ): Promise<HDRILoadResult> {
    const loader = this.initializeLoader();
    const pmremGenerator = this.initializePMREMGenerator(renderer);

    try {
      const originalTexture = await new Promise<THREE.DataTexture>((resolve, reject) => {
        loader.load(
          url,
          (texture) => resolve(texture),
          (progress) => {
            const percentComplete = (progress.loaded / progress.total) * 100;
            console.log(`Loading HDRI: ${percentComplete.toFixed(2)}%`);
          },
          (error) => reject(error)
        );
      });

      const environmentMap = pmremGenerator.fromEquirectangular(originalTexture).texture;
      const backgroundTexture = this.createBackgroundTexture(originalTexture, pmremGenerator);

      return {
        environmentMap,
        backgroundTexture,
        originalTexture,
      };
    } catch (error) {
      console.error(`Failed to load HDRI from ${url}:`, error);
      throw new Error(`HDRI loading failed: ${error}`);
    }
  }

  private static createBackgroundTexture(
    originalTexture: THREE.DataTexture,
    pmremGenerator: THREE.PMREMGenerator
  ): THREE.Texture {
    const backgroundTexture = pmremGenerator.fromEquirectangular(originalTexture).texture;
    backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
    return backgroundTexture;
  }

  public static async loadMultipleHDRIs(
    urls: string[],
    renderer: THREE.WebGLRenderer
  ): Promise<HDRILoadResult[]> {
    try {
      const loadPromises = urls.map((url) => this.loadHDRI(url, renderer));
      return await Promise.all(loadPromises);
    } catch (error) {
      console.error('Failed to load multiple HDRIs:', error);
      throw new Error(`Multiple HDRI loading failed: ${error}`);
    }
  }

  public static createEnvironmentFromCubeTexture(
    cubeTexture: THREE.CubeTexture,
    renderer: THREE.WebGLRenderer
  ): THREE.Texture {
    const pmremGenerator = this.initializePMREMGenerator(renderer);
    return pmremGenerator.fromCubemap(cubeTexture).texture;
  }

  public static optimizeEnvironmentMap(
    environmentMap: THREE.Texture,
    options: {
      minFilter?: THREE.TextureFilter;
      magFilter?: THREE.TextureFilter;
      generateMipmaps?: boolean;
    } = {}
  ): THREE.Texture {
    const {
      minFilter = THREE.LinearMipmapLinearFilter,
      magFilter = THREE.LinearFilter,
      generateMipmaps = true,
    } = options;

    environmentMap.minFilter = minFilter;
    environmentMap.magFilter = magFilter;
    environmentMap.generateMipmaps = generateMipmaps;
    environmentMap.needsUpdate = true;

    return environmentMap;
  }

  public static applyEnvironmentToScene(
    scene: THREE.Scene,
    hdriResult: HDRILoadResult,
    options: {
      useAsBackground?: boolean;
      environmentIntensity?: number;
      backgroundBlurriness?: number;
    } = {}
  ): void {
    const {
      useAsBackground = true,
      environmentIntensity = 1.0,
      backgroundBlurriness = 0,
    } = options;

    scene.environment = hdriResult.environmentMap;

    if (useAsBackground) {
      scene.background = hdriResult.backgroundTexture;
      scene.backgroundBlurriness = backgroundBlurriness;
    }

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) 
          ? object.material 
          : [object.material];

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || 
              material instanceof THREE.MeshPhysicalMaterial) {
            material.envMapIntensity = environmentIntensity;
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  public static disposeHDRIResult(hdriResult: HDRILoadResult): void {
    hdriResult.environmentMap.dispose();
    hdriResult.backgroundTexture.dispose();
    hdriResult.originalTexture.dispose();
  }

  public static dispose(): void {
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
    this.loader = null;
  }
} 