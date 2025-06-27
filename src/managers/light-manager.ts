import * as THREE from 'three';

export class LightManager {
  private lights: Map<string, THREE.Light>;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lights = new Map();
    this.setupLights();
  }

  private setupLights(): void {
    this.createDirectionalLight();
    this.createAmbientLight();
  }

  private createDirectionalLight(): void {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;

    this.lights.set('directional', directionalLight);
    this.scene.add(directionalLight);
  }

  private createAmbientLight(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.lights.set('ambient', ambientLight);
    this.scene.add(ambientLight);
  }

  public getLight(name: string): THREE.Light | undefined {
    return this.lights.get(name);
  }

  public addLight(name: string, light: THREE.Light): void {
    if (this.lights.has(name)) {
      this.removeLight(name);
    }
    this.lights.set(name, light);
    this.scene.add(light);
  }

  public removeLight(name: string): void {
    const light = this.lights.get(name);
    if (light) {
      this.scene.remove(light);
      this.lights.delete(name);
    }
  }

  public setDirectionalLightPosition(x: number, y: number, z: number): void {
    const directionalLight = this.lights.get('directional');
    if (directionalLight) {
      directionalLight.position.set(x, y, z);
    }
  }

  public setDirectionalLightIntensity(intensity: number): void {
    const directionalLight = this.lights.get('directional');
    if (directionalLight) {
      directionalLight.intensity = intensity;
    }
  }

  public dispose(): void {
    this.lights.forEach((light) => {
      this.scene.remove(light);
    });
    this.lights.clear();
  }
} 