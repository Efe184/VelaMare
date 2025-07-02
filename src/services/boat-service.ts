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
  private isDarkMode = false;
  private originalMaterials: Map<THREE.Material, { emissive: THREE.Color; emissiveIntensity: number }> = new Map();
  
  // Movement properties
  private velocity = new THREE.Vector3();
  private acceleration = new THREE.Vector3();
  private angularVelocity = 0; // Rotasyon hızı
  private readonly MAX_SPEED = 45; // Gerçekçi speedboat hızı
  private readonly ACCELERATION_FORCE = 25; // Daha gerçekçi ivme
  private readonly DRAG_COEFFICIENT = 0.96; // Su direnci - gerçekçi
  private readonly ANGULAR_DRAG = 0.88; // Rotasyon sürtünmesi
  private readonly MAX_ANGULAR_SPEED = 1.8; // Gerçekçi dönüş hızı
  private readonly TURN_FORCE = 3.5; // Gerçekçi dönüş kuvveti
  
  // Gerçekçi tekne fiziği parametreleri
  private readonly HULL_RESISTANCE = 0.94; // Tekne gövde direnci
  private readonly WAKE_RESISTANCE = 0.92; // Dalga direnci (yüksek hızda)
  private readonly SPEED_DEPENDENT_TURN = true; // Hıza bağlı dönüş etkinliği
  
  // Animasyon değişkenleri
  private bankingAngle = 0; // Teknenin yatma açısı (Z rotasyonu)
  private pitchAngle = 0; // Teknenin baş-kıç sallanması (X rotasyonu)
  private targetBanking = 0;
  private targetPitch = 0;
  private readonly MAX_BANKING_ANGLE = 0.15; // Maksimum yatma açısı (radyan)
  private readonly MAX_PITCH_ANGLE = 0.08; // Maksimum baş-kıç sallanma
  private readonly ANIMATION_LERP_SPEED = 12.0; // Animasyon geçiş hızı
  
  // Boundary settings
  private readonly BOUNDARY_SIZE = 128; // 256x256 alan için yarıçap (128 her yöne)
  private readonly BOUNDARY_PADDING = 5; // Sınırdan biraz içeride dur
  
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
      
      // Orijinal materyalleri kaydet
      this.storeOriginalMaterials();
      
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

    // === ANİMASYON GÜNCELLEMELERİ ===
    // Banking ve pitch açılarını yumuşakça güncelle
    this.bankingAngle = THREE.MathUtils.lerp(this.bankingAngle, this.targetBanking, this.ANIMATION_LERP_SPEED * delta);
    this.pitchAngle = THREE.MathUtils.lerp(this.pitchAngle, this.targetPitch, this.ANIMATION_LERP_SPEED * delta);
    
    // Doğal sallanma efekti (floating)
    const naturalRoll = Math.sin(this.time * this.floatingSpeed * 0.7) * 0.02;
    const naturalPitch = Math.cos(this.time * this.floatingSpeed * 0.5) * 0.015;
    
    // Banking, pitch ve doğal sallanmayı birleştir
    this.boatWrapper.rotation.z = this.bankingAngle + naturalRoll;
    this.boatWrapper.rotation.x = this.pitchAngle + naturalPitch;

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

  // Gerçekçi fizik tabanlı hareket sistemi - hibrit yaklaşım
  public applyMovementInput(inputDirection: THREE.Vector3, delta: number): void {
    if (!this.boatWrapper) return;

    const hasForward = inputDirection.z < -0.1;
    const hasBackward = inputDirection.z > 0.1;
    const hasLeft = inputDirection.x < -0.1;
    const hasRight = inputDirection.x > 0.1;
    
    const currentSpeed = this.velocity.length();
    
    // === GERÇEK TEKNE FİZİĞİ: THRUST BAZLI SİSTEM ===
    
    // 1. İleri/Geri Thrust (Motor gücü)
    let thrustForce = 0;
    if (hasForward) {
      thrustForce = this.ACCELERATION_FORCE; // İleri tam güç
    } else if (hasBackward) {
      thrustForce = -this.ACCELERATION_FORCE * 0.6; // Geri daha zayıf
    }
    
    // Thrust'ı teknenin ileri yönünde uygula
    if (thrustForce !== 0) {
      const thrustDirection = new THREE.Vector3(0, 0, -1); // Teknenin ileri yönü
      thrustDirection.applyQuaternion(this.boatWrapper.quaternion);
      this.acceleration.add(thrustDirection.multiplyScalar(thrustForce));
    }
    
    // 2. Dönüş Sistemi - Sadece hareket halindeyken etkili (gerçekçi)
    let steerInput = 0;
    if (hasLeft) steerInput += 1;
    if (hasRight) steerInput -= 1;
    
    if (steerInput !== 0) {
      // Hıza bağlı dönüş etkinliği - yavaşken zor döner, hızlıyken kolay
      const speedFactor = this.SPEED_DEPENDENT_TURN ? 
        Math.min(currentSpeed / 10, 1.0) : 1.0; // 10 hız üzerinde tam etkinlik
      
      // İleri giderken normal dönüş, geri giderken ters dönüş
      const directionMultiplier = hasBackward ? -1 : 1;
      
      const turnEffectiveness = speedFactor * directionMultiplier;
      this.angularVelocity += steerInput * this.TURN_FORCE * turnEffectiveness * delta;
    }
    
    // === GERÇEK SU DİRENCİ SİSTEMİ ===
    
    // Hıza bağlı direnç - yüksek hızda daha fazla direnç
    let dynamicDrag = this.DRAG_COEFFICIENT;
    if (currentSpeed > 20) {
      // Yüksek hızda dalga direnci devreye girer
      const wakeEffect = Math.min((currentSpeed - 20) / 20, 1.0);
      dynamicDrag = THREE.MathUtils.lerp(this.DRAG_COEFFICIENT, this.WAKE_RESISTANCE, wakeEffect);
    }
    
    // Hull direnci (tekne gövdesinin su ile teması)
    const hullDrag = THREE.MathUtils.lerp(1.0, this.HULL_RESISTANCE, Math.min(currentSpeed / 15, 1.0));
    
    // === ANGULAR VELOCITY LİMİTLERİ VE DRAG ===
    this.angularVelocity = Math.max(-this.MAX_ANGULAR_SPEED, 
                                   Math.min(this.MAX_ANGULAR_SPEED, this.angularVelocity));
    this.angularVelocity *= this.ANGULAR_DRAG;
    
    // === GERÇEKÇİ ANİMASYON HESAPLAMALARI ===
    // Banking - dönüş sırasında tekne yatar
    this.targetBanking = -this.angularVelocity * this.MAX_BANKING_ANGLE / this.MAX_ANGULAR_SPEED;
    
    // Pitch - ivme/fren sırasında baş-kıç sallanır
    const forwardAcceleration = this.acceleration.clone();
    if (this.boatWrapper) {
      const inverseQuaternion = this.boatWrapper.quaternion.clone().invert();
      forwardAcceleration.applyQuaternion(inverseQuaternion);
      this.targetPitch = -forwardAcceleration.z * this.MAX_PITCH_ANGLE / this.ACCELERATION_FORCE;
    }
    
    // === ROTASYONU UYGULA ===
    this.boatWrapper.rotation.y += this.angularVelocity * delta;
    
    // === LINEAR VELOCITY GÜNCELLE ===
    this.velocity.add(this.acceleration.clone().multiplyScalar(delta));
    
    // Maksimum hız sınırı
    if (this.velocity.length() > this.MAX_SPEED) {
      this.velocity.normalize().multiplyScalar(this.MAX_SPEED);
    }

    // Dinamik direnç uygula
    this.velocity.multiplyScalar(dynamicDrag * hullDrag);
    
    // === POZİSYON GÜNCELLE ===
    this.basePosition.add(this.velocity.clone().multiplyScalar(delta));
    
    // === SINIRLARI KONTROL ET ===
    this.enforceBoundaries();
    
    // Acceleration'ı sıfırla (her frame'de yeniden hesaplanacak)
    this.acceleration.set(0, 0, 0);
  }

  public getCurrentVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public getCurrentSpeed(): number {
    return this.velocity.length();
  }

  public getAngularVelocity(): number {
    return this.angularVelocity;
  }

  public getBankingAngle(): number {
    return this.bankingAngle;
  }

  public getPitchAngle(): number {
    return this.pitchAngle;
  }

  private enforceBoundaries(): void {
    const maxPos = this.BOUNDARY_SIZE - this.BOUNDARY_PADDING;
    const minPos = -this.BOUNDARY_SIZE + this.BOUNDARY_PADDING;

    // X ekseni sınırları
    if (this.basePosition.x > maxPos) {
      this.basePosition.x = maxPos;
      this.velocity.x = Math.min(0, this.velocity.x); // Sadece içeri doğru hareket
    } else if (this.basePosition.x < minPos) {
      this.basePosition.x = minPos;
      this.velocity.x = Math.max(0, this.velocity.x); // Sadece içeri doğru hareket
    }

    // Z ekseni sınırları
    if (this.basePosition.z > maxPos) {
      this.basePosition.z = maxPos;
      this.velocity.z = Math.min(0, this.velocity.z); // Sadece içeri doğru hareket
    } else if (this.basePosition.z < minPos) {
      this.basePosition.z = minPos;
      this.velocity.z = Math.max(0, this.velocity.z); // Sadece içeri doğru hareket
    }
  }

  public getBoundarySize(): number {
    return this.BOUNDARY_SIZE;
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

  private storeOriginalMaterials(): void {
    if (!this.boatModel) return;

    this.boatModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          this.originalMaterials.set(material, {
            emissive: material.emissive.clone(),
            emissiveIntensity: material.emissiveIntensity
          });
        }
      }
    });
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.updateBoatMaterialsForDarkMode();
  }

  private updateBoatMaterialsForDarkMode(): void {
    if (!this.boatModel) return;

    this.boatModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          const original = this.originalMaterials.get(material);
          
          if (this.isDarkMode) {
            // Dark mode: Tekneye daha güçlü ışık ver
            material.emissive.setHex(0x555555); // Daha parlak gri ışık
            material.emissiveIntensity = 0.5;
            // Biraz daha parlak yap
            material.opacity = 1.0;
            material.transparent = false;
          } else {
            // Light mode: Orijinal değerlere dön
            if (original) {
              material.emissive.copy(original.emissive);
              material.emissiveIntensity = original.emissiveIntensity;
            } else {
              material.emissive.setHex(0x000000);
              material.emissiveIntensity = 0.0;
            }
            material.opacity = 1.0;
            material.transparent = false;
          }
        }
      }
    });
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