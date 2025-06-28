import * as THREE from 'three';
import { GLTFLoaderService } from '../loaders/gltf-loader-service';
import { CameraManager } from '../managers/camera-manager';

export class BoatService {
  private scene: THREE.Scene;
  private boatModel: THREE.Group | null = null;
  private boatWrapper: THREE.Object3D;
  private cameraManager: CameraManager;
  private animationMixer: THREE.AnimationMixer | null = null;
  private animationActions: THREE.AnimationAction[] = [];
  private time = 0;
  private isLoaded = false;
  private basePosition = new THREE.Vector3(0, 0, 0);
  private floatingAmplitude = 0.4; // Dengeli floating - gerçekçi dalgalanma
  private floatingSpeed = 1.2;
  private MINIMUM_HEIGHT = 0.1; // Tekne su seviyesine yakın - bazen batar
  private WATER_LEVEL = 0;
  private originalModelPosition = new THREE.Vector3(0, 0, 0);
  
  // Smooth camera following properties
  private currentCameraPosition = new THREE.Vector3();
  private targetCameraPosition = new THREE.Vector3();
  private currentLookAtPosition = new THREE.Vector3();
  private targetLookAtPosition = new THREE.Vector3();
  private cameraLerpFactor = 0.08; // Smooth following speed
  private cameraLookAtLerpFactor = 0.12; // Look-at smoothing speed

  constructor(scene: THREE.Scene, cameraManager: CameraManager) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    
    // Floating animasyonu için wrapper oluştur
    this.boatWrapper = new THREE.Object3D();
    this.boatWrapper.position.copy(this.basePosition);
    this.scene.add(this.boatWrapper);
    
    this.loadBoat();
  }

  private async loadBoat(): Promise<void> {
    try {
      console.log('Tekne modeli yükleniyor...');
      const gltfResult = await GLTFLoaderService.loadModel('assets/models/boat.glb');
      
      this.boatModel = gltfResult.scene;
      GLTFLoaderService.optimizeModel(this.boatModel);
      
      // Tekne modelini wrapper'ın içine ekle
      this.boatModel.position.set(0, 0, 0);
      this.boatModel.scale.setScalar(1);
      this.originalModelPosition.copy(this.boatModel.position);
      this.boatWrapper.add(this.boatModel);
      
      // Built-in animasyonları kurulum
      this.setupAnimations(gltfResult.animations);
      
      this.isLoaded = true;
      console.log('Tekne modeli başarıyla yüklendi');
      
      // Kamerayı teknenin arkasına konumlandır ve smooth following başlat
      this.initializeCameraPosition();
      this.updateCameraPosition();
      
    } catch (error) {
      console.error('Tekne modeli yüklenirken hata:', error);
    }
  }

  private setupAnimations(animations: THREE.AnimationClip[]): void {
    if (!this.boatModel || animations.length === 0) {
      console.log('Tekne modelinde built-in animasyon bulunamadı');
      return;
    }

    // AnimationMixer oluştur
    this.animationMixer = new THREE.AnimationMixer(this.boatModel);
    
    // Animasyonları filtrele - Y pozisyonunu etkileyen track'leri kaldır
    animations.forEach((clip, index) => {
      const filteredClip = this.filterYPositionTracks(clip);
      const action = this.animationMixer!.clipAction(filteredClip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      
      // İlk animasyonu otomatik oynat
      if (index === 0) {
        action.play();
        console.log(`Tekne animasyonu oynatılıyor: ${clip.name || 'unnamed'}`);
      }
      
      this.animationActions.push(action);
    });
  }

  // Y pozisyon track'lerini filtrele
  private filterYPositionTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
    const filteredTracks = clip.tracks.filter(track => {
      // Y pozisyon track'lerini kaldır
      return !track.name.includes('.position[1]') && !track.name.includes('.position.y');
    });
    
    return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
  }

  public update(delta: number): void {
    if (!this.isLoaded) return;

    this.time += delta;

    // Built-in animasyonları güncelle
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }

    // Floating animasyonu hesapla
    const floatingOffset = Math.sin(this.time * this.floatingSpeed) * this.floatingAmplitude;
    const targetY = this.WATER_LEVEL + this.MINIMUM_HEIGHT + floatingOffset;

    // Pozisyonu güncelle - tekne su seviyesinin altına da inebilir
    this.boatWrapper.position.x = this.basePosition.x;
    this.boatWrapper.position.y = targetY; // Math.max kaldırıldı - tekne su altına da inebilir
    this.boatWrapper.position.z = this.basePosition.z;

    // Hafif sallanma efekti - sadece rotasyon
    this.boatWrapper.rotation.z = Math.sin(this.time * this.floatingSpeed * 0.7) * 0.03;
    this.boatWrapper.rotation.x = Math.cos(this.time * this.floatingSpeed * 0.5) * 0.02;

    // Kamera pozisyonunu güncelle
    this.updateCameraPosition();
  }

  private initializeCameraPosition(): void {
    if (!this.boatWrapper) return;

    const boatPosition = this.boatWrapper.position;
    const cameraOffset = new THREE.Vector3(0, 6, 12);
    
    cameraOffset.applyQuaternion(this.boatWrapper.quaternion);
    
    // Initialize both current and target positions to avoid jarring on first load
    this.currentCameraPosition.copy(boatPosition).add(cameraOffset);
    this.targetCameraPosition.copy(this.currentCameraPosition);
    
    this.currentLookAtPosition.copy(boatPosition).add(new THREE.Vector3(0, 2, 0));
    this.targetLookAtPosition.copy(this.currentLookAtPosition);

    // Set initial camera position immediately
    this.cameraManager.setPosition(
      this.currentCameraPosition.x,
      this.currentCameraPosition.y,
      this.currentCameraPosition.z
    );
    this.cameraManager.lookAt(this.currentLookAtPosition);
  }

  private updateCameraPosition(): void {
    if (!this.boatWrapper) return;

    const boatPosition = this.boatWrapper.position;
    const cameraOffset = new THREE.Vector3(0, 6, 12);
    
    // Apply boat rotation to camera offset for dynamic positioning
    cameraOffset.applyQuaternion(this.boatWrapper.quaternion);
    
    // Add subtle camera sway based on time for organic feeling
    const cameraSwayX = Math.sin(this.time * 0.8) * 0.3;
    const cameraSwayY = Math.cos(this.time * 0.6) * 0.2;
    cameraOffset.add(new THREE.Vector3(cameraSwayX, cameraSwayY, 0));
    
    // Calculate target positions
    this.targetCameraPosition.copy(boatPosition).add(cameraOffset);
    this.targetLookAtPosition.copy(boatPosition).add(new THREE.Vector3(0, 2, 0));
    
    // Smooth interpolation towards target positions
    this.currentCameraPosition.lerp(this.targetCameraPosition, this.cameraLerpFactor);
    this.currentLookAtPosition.lerp(this.targetLookAtPosition, this.cameraLookAtLerpFactor);

    // Apply smoothed positions to camera
    this.cameraManager.setPosition(
      this.currentCameraPosition.x,
      this.currentCameraPosition.y,
      this.currentCameraPosition.z
    );
    this.cameraManager.lookAt(this.currentLookAtPosition);
  }

  // Tekneyi hareket ettir
  public moveBoat(direction: THREE.Vector3, speed: number): void {
    if (!this.boatWrapper) return;

    direction.normalize();
    this.basePosition.add(direction.multiplyScalar(speed));
    
    // Wrapper'ı hareket yönüne doğru döndür
    if (direction.length() > 0) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.boatWrapper.rotation.y = THREE.MathUtils.lerp(
        this.boatWrapper.rotation.y,
        targetRotation,
        0.08
      );
    }
  }

  // Su seviyesini ayarla
  public setWaterLevel(level: number): void {
    this.WATER_LEVEL = level;
  }

  // Minimum yüksekliği ayarla
  public setMinimumHeight(height: number): void {
    this.MINIMUM_HEIGHT = height;
  }

  // Belirli bir animasyonu oynat
  public playAnimation(animationIndex: number): void {
    if (!this.animationActions[animationIndex]) return;
    
    this.animationActions.forEach(action => action.stop());
    this.animationActions[animationIndex].play();
  }

  public getBoatPosition(): THREE.Vector3 {
    return this.boatWrapper ? this.boatWrapper.position.clone() : new THREE.Vector3();
  }

  public getAnimationNames(): string[] {
    return this.animationActions.map((action, index) => 
      action.getClip().name || `Animation ${index + 1}`
    );
  }

  public isBoatLoaded(): boolean {
    return this.isLoaded;
  }

  public dispose(): void {
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
    this.animationActions = [];

    if (this.boatModel) {
      GLTFLoaderService.disposeModel(this.boatModel);
      this.boatModel = null;
    }
    
    if (this.boatWrapper) {
      this.scene.remove(this.boatWrapper);
    }
    
    this.isLoaded = false;
  }
} 