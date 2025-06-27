import * as THREE from 'three';
import { RendererManager } from '../managers/renderer-manager';
import { CameraManager } from '../managers/camera-manager';
import { LightManager } from '../managers/light-manager';

export class MainScene {
  private scene: THREE.Scene;
  private rendererManager: RendererManager;
  private cameraManager: CameraManager;
  private lightManager: LightManager;
  private animationId: number | null = null;
  private isRunning = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.rendererManager = new RendererManager(container);
    this.cameraManager = new CameraManager();
    this.lightManager = new LightManager(this.scene);
    
    this.setupScene();
    this.setupEventListeners();
  }

  private setupScene(): void {
    // Set scene background to match renderer clear color (gray)
    this.scene.background = new THREE.Color(0x808080);
    
    // Add a simple reference object (cube) to verify the scene is working
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);

    // Add a ground plane
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.cameraManager.updateAspect(width, height);
    this.rendererManager.resize(width, height);
  }

  private animate(): void {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  private render(): void {
    const camera = this.cameraManager.getCamera();
    this.rendererManager.render(this.scene, camera);
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  public getLightManager(): LightManager {
    return this.lightManager;
  }

  public dispose(): void {
    this.stop();
    this.lightManager.dispose();
    this.rendererManager.dispose();
    window.removeEventListener('resize', this.handleResize);
    
    // Clean up scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
} 