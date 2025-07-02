import * as THREE from 'three';
import { RendererManager } from '../managers/renderer-manager';
import { CameraManager } from '../managers/camera-manager';
import { LightManager } from '../managers/light-manager';
import { SkyManager } from '../managers/sky-manager';
import { WaterManager } from '../managers/water-manager';
import { BoatService } from '../services/boat-service';
import { MarineLifeService } from '../services/marine-life-service';
import { DarkModeService } from '../services/dark-mode-service';
import { CelestialService } from '../services/celestial-service';
import { InteractionService } from '../services/interaction-service';
import { DarkModeToggle } from '../ui/dark-mode-toggle';
import { ControlsInfo } from '../ui/controls-info';

export class MainScene {
  private scene: THREE.Scene;
  private rendererManager: RendererManager;
  private cameraManager: CameraManager;
  private lightManager: LightManager;
  private skyManager: SkyManager;
  private waterManager: WaterManager;
  private boatService: BoatService;
  private marineLifeService: MarineLifeService;
  private celestialService: CelestialService;
  private interactionService: InteractionService;
  private darkModeService: DarkModeService;
  private darkModeToggle: DarkModeToggle;
  private controlsInfo: ControlsInfo;
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
    this.celestialService = new CelestialService(this.scene);
    this.interactionService = new InteractionService();
    
    // Dark mode setup
    this.darkModeService = new DarkModeService();
    this.darkModeToggle = new DarkModeToggle(container);
    this.controlsInfo = new ControlsInfo(container);
    
    this.setupScene();
    this.setupEventListeners();
    this.setupDarkModeListeners();
  }

  private setupScene(): void {
    // Sadece sky ve water yöneticileri sahneye ekleniyor
    // SkyManager ve WaterManager kendi objelerini sahneye ekler
    this.scene.background = null; // Sky objesi arka planı yönetecek
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private setupDarkModeListeners(): void {
    // Connect toggle button to service
    this.darkModeToggle.onToggle((isDark: boolean) => {
      this.darkModeService.setDarkMode(isDark);
    });

    // Listen to service changes and update managers
    this.darkModeService.onModeChange((isDark: boolean) => {
      this.handleDarkModeChange(isDark);
      // Sync toggle button state
      this.darkModeToggle.setDarkMode(isDark);
    });
  }

  private handleDarkModeChange(isDark: boolean): void {
    // Update sky manager for dark mode
    if (this.skyManager && typeof this.skyManager.setDarkMode === 'function') {
      this.skyManager.setDarkMode(isDark);
    }

    // Update light manager for dark mode
    if (this.lightManager && typeof this.lightManager.setDarkMode === 'function') {
      this.lightManager.setDarkMode(isDark);
    }

    // Update water manager for dark mode
    if (this.waterManager && typeof this.waterManager.setDarkMode === 'function') {
      this.waterManager.setDarkMode(isDark);
    }

    // Update boat service for dark mode
    if (this.boatService && typeof this.boatService.setDarkMode === 'function') {
      this.boatService.setDarkMode(isDark);
    }

    // Update marine life service for dark mode
    if (this.marineLifeService && typeof this.marineLifeService.setDarkMode === 'function') {
      this.marineLifeService.setDarkMode(isDark);
    }

    // Update celestial service for dark mode
    if (this.celestialService && typeof this.celestialService.setDarkMode === 'function') {
      this.celestialService.setDarkMode(isDark);
    }

    console.log(`Dark mode ${isDark ? 'enabled' : 'disabled'}`);
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

  // Sky, Water, Boat, Marine Life ve Celestial animasyonlarını güncelle
  private update(delta: number): void {
    // Klavye input'unu al ve tekneye uygula
    const movementInput = this.interactionService.getMovementVector();
    const controlState = this.interactionService.getControlState();
    
    if (movementInput.length() > 0) {
      this.boatService.applyMovementInput(movementInput, delta);
      
             // Debug: hangi tuşların basılı olduğunu göster
       const activeKeys = [];
       if (controlState.forward) activeKeys.push('W↑');
       if (controlState.backward) activeKeys.push('S↓');
       if (controlState.left) activeKeys.push('A←');
       if (controlState.right) activeKeys.push('D→');
       
       // Hareket tipini belirle (yeni physics sistemi)
       const hasForwardBackward = controlState.forward || controlState.backward;
       const hasLeftRight = controlState.left || controlState.right;
       let moveType = '';
       if (hasForwardBackward && hasLeftRight) moveType = 'THRUST+STEER';
       else if (hasForwardBackward) moveType = 'THRUST_ONLY';
       else if (hasLeftRight) moveType = 'STEER_ONLY';
       
       const banking = (this.boatService.getBankingAngle() * 180 / Math.PI).toFixed(1);
       const pitch = (this.boatService.getPitchAngle() * 180 / Math.PI).toFixed(1);
       
       const speed = this.boatService.getCurrentSpeed().toFixed(1);
       const velocity = this.boatService.getCurrentVelocity();
       const velocityInfo = `v(${velocity.x.toFixed(1)},${velocity.z.toFixed(1)})`;
       console.log(`${moveType}: ${activeKeys.join('+')} | ⚡Speed:${speed} ${velocityInfo} | Banking:${banking}° | Pitch:${pitch}°`);
    }

    this.skyManager.update(delta);
    this.waterManager.update(delta);
    this.boatService.update(delta);
    this.marineLifeService.update(delta);
    this.celestialService.update(delta);
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
    this.interactionService.dispose();
    this.controlsInfo.dispose();
    this.darkModeToggle.dispose();
    this.darkModeService.dispose();
    this.celestialService.dispose();
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