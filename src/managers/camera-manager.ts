import * as THREE from 'three';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private aspect: number;

  constructor(aspect: number = window.innerWidth / window.innerHeight) {
    this.aspect = aspect;
    this.camera = this.createCamera();
    this.setupCamera();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const FOV = 75;
    const NEAR = 0.01; // Çok daha küçük near plane - yakın objeler kaybolmasın
    const FAR = 1000;

    return new THREE.PerspectiveCamera(FOV, this.aspect, NEAR, FAR);
  }

  private setupCamera(): void {
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public updateAspect(width: number, height: number): void {
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  public setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  public lookAt(target: THREE.Vector3 | number, y?: number, z?: number): void {
    if (typeof target === 'number' && y !== undefined && z !== undefined) {
      this.camera.lookAt(target, y, z);
    } else if (target instanceof THREE.Vector3) {
      this.camera.lookAt(target);
    }
  }

  public getFov(): number {
    return this.camera.fov;
  }

  public setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
} 