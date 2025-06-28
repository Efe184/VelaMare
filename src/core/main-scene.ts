import * as THREE from 'three';
import { RendererManager } from '../managers/renderer-manager';
import { CameraManager } from '../managers/camera-manager';
import { LightManager } from '../managers/light-manager';
import { SkyManager } from '../managers/sky-manager';
import { WaterManager } from '../managers/water-manager';
import { BoatService } from '../services/boat-service';
import { MarineLifeService } from '../services/marine-life-service';

export class MainScene {
  private scene: THREE.Scene;
  private rendererManager: RendererManager;
  private cameraManager: CameraManager;
  private lightManager: LightManager;
  private skyManager: SkyManager;
  private waterManager: WaterManager;
  private boatService: BoatService;
  private marineLifeService: MarineLifeService;
  private animationId: number | null = null;
  private isRunning = false;
  private lastTime = performance.now();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.rendererManager = new RendererManager(container);
    this.cameraManager = new CameraManager();
    this.lightManager = new LightManager(this.scene);
    this.skyManager = new SkyManager(this.scene);
    this.waterManager = new WaterManager(this.scene);
    this.boatService = new BoatService(this.scene, this.cameraManager);
    this.marineLifeService = new MarineLifeService(this.scene, this.boatService);
    
    this.setupScene();
    this.setupEventListeners();
  }

  private setupScene(): void {
    // Sadece sky ve water yöneticileri sahneye ekleniyor
    // SkyManager ve WaterManager kendi objelerini sahneye ekler
    this.scene.background = null; // Sky objesi arka planı yönetecek
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
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.update(delta);
    this.render();
  }

  // Sky, Water, Boat ve Marine Life animasyonlarını güncelle
  private update(delta: number): void {
    this.skyManager.update(delta);
    this.waterManager.update(delta);
    this.boatService.update(delta);
    this.marineLifeService.update(delta);
  }

  private render(): void {
    const camera = this.cameraManager.getCamera();
    this.rendererManager.render(this.scene, camera);
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
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
    this.marineLifeService.dispose();
    this.boatService.dispose();
    this.skyManager.dispose();
    this.waterManager.dispose();
    this.lightManager.dispose();
    this.rendererManager.dispose();
    window.removeEventListener('resize', this.handleResize);
    // Sahnedeki tüm meshleri temizle
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