import * as THREE from 'three';
import { GLTFLoaderService } from '../loaders/gltf-loader-service';
import { BoatService } from './boat-service';

interface FishInstance {
  position: THREE.Vector3;
  rotation: THREE.Vector3;
  speed: number;
  swimDirection: THREE.Vector3;
  swimRadius: number;
  centerPoint: THREE.Vector3;
  phase: number;
  currentTarget: THREE.Vector3;
  targetChangeTimer: number;
  targetChangeDuration: number;
  pauseTimer: number;
  pauseDuration: number;
  verticalPhase: number;
  isPaused: boolean;
  velocity: THREE.Vector3;
  targetRotationY: number;
  currentRotationY: number;
  smoothingFactor: number;
}

export class MarineLifeService {
  private scene: THREE.Scene;
  private boatService: BoatService;
  
  // Normal balıklar
  private fishInstancedMesh: THREE.InstancedMesh | null = null;
  private fishInstances: FishInstance[] = [];
  private fishGeometry: THREE.BufferGeometry | null = null;
  private fishMaterial: THREE.Material | null = null;
  
  // Altın balıklar
  private goldFishInstancedMesh: THREE.InstancedMesh | null = null;
  private goldFishInstances: FishInstance[] = [];
  private goldFishGeometry: THREE.BufferGeometry | null = null;
  private goldFishMaterial: THREE.Material | null = null;
  
  private time = 0;
  private loaded = false;
  private goldFishLoaded = false;
  
  private readonly FISH_COUNT = 20;
  private readonly GOLD_FISH_COUNT = 8; // Daha az altın balık
  private readonly SPAWN_RADIUS = 15; // Tekne çevresindeki alan
  private readonly MIN_DISTANCE_FROM_BOAT = 3; // Tekneye minimum mesafe
  private readonly SWIM_SPEED_MIN = 0.8;
  private readonly SWIM_SPEED_MAX = 2.5;
  private readonly GOLD_FISH_SPEED_MIN = 1.0; // Altın balıklar daha aktif
  private readonly GOLD_FISH_SPEED_MAX = 2.8; // Daha hızlı maksimum hız
  private readonly FISH_SCALE = 0.15; // Daha küçük balıklar
  private readonly GOLD_FISH_SCALE = 0.18; // Altın balıklar biraz daha büyük
  private readonly WATER_DEPTH_MIN = -2;
  private readonly WATER_DEPTH_MAX = -8;
  private readonly GOLD_FISH_DEPTH_MIN = -2.5; // Altın balıklar çok daha derinlerde
  private readonly GOLD_FISH_DEPTH_MAX = -6; // Altın balıklar daha derin seviyede
  private readonly TARGET_CHANGE_MIN = 3.0; // Minimum hedef değiştirme süresi
  private readonly TARGET_CHANGE_MAX = 6.0; // Maksimum hedef değiştirme süresi
  private readonly PAUSE_MIN = 1.0; // Minimum durma süresi
  private readonly PAUSE_MAX = 3.0; // Maksimum durma süresi
  private readonly MOVEMENT_RANGE = 5; // Hareket alanı yarıçapı
  private readonly ACCELERATION = 1.2; // Daha yumuşak hızlanma faktörü
  private readonly DECELERATION = 0.92; // Daha yumuşak yavaşlama faktörü
  private readonly ROTATION_SMOOTHING = 0.06; // Daha yumuşak rotasyon yumuşatma
  private readonly VELOCITY_SMOOTHING = 0.8; // Velocity geçiş yumuşatma
  private readonly WATER_SURFACE_LEVEL = 0.5; // Su yüzeyi seviyesi
  private readonly MAX_DEPTH = -10; // Maksimum derinlik
  private readonly FISH_COLLISION_RADIUS = 0.8; // Balık çarpışma yarıçapı
  private readonly SURFACE_BUFFER = 0.8; // Su yüzeyinden minimum mesafe

  constructor(scene: THREE.Scene, boatService: BoatService) {
    this.scene = scene;
    this.boatService = boatService;
    this.loadFish();
    this.loadGoldFish();
  }

  private isMesh(object: THREE.Object3D): object is THREE.Mesh {
    return object instanceof THREE.Mesh && object.geometry && object.material;
  }

  private async loadFish(): Promise<void> {
    try {
      console.log('Balık modeli yükleniyor...');
      const gltfResult = await GLTFLoaderService.loadModel('assets/models/balık.glb');
      
      // İlk mesh'i al ve geometri/materyal çıkar
      let fishMesh: THREE.Mesh | null = null;
      gltfResult.scene.traverse((child) => {
        if (this.isMesh(child) && !fishMesh) {
          fishMesh = child;
        }
      });

      if (!fishMesh) {
        throw new Error('Balık modelinde mesh bulunamadı');
      }

      const mesh = fishMesh as THREE.Mesh;
      this.fishGeometry = mesh.geometry.clone();
      this.fishMaterial = Array.isArray(mesh.material) 
        ? mesh.material[0].clone() 
        : mesh.material.clone();

      // InstancedMesh oluştur
      this.fishInstancedMesh = new THREE.InstancedMesh(
        this.fishGeometry,
        this.fishMaterial,
        this.FISH_COUNT
      );

      this.scene.add(this.fishInstancedMesh);
      
      // Balık instance'larını oluştur
      this.createFishInstances();
      this.updateInstanceMatrices();
      
      this.loaded = true;
      console.log(`${this.FISH_COUNT} balık tekne çevresine yerleştirildi`);
      
    } catch (error) {
      console.error('Balık modeli yüklenirken hata:', error);
    }
  }

  private async loadGoldFish(): Promise<void> {
    try {
      console.log('Altın balık modeli yükleniyor...');
      const gltfResult = await GLTFLoaderService.loadModel('assets/models/gold_fish.glb');
      
      // İlk mesh'i al ve geometri/materyal çıkar
      let goldFishMesh: THREE.Mesh | null = null;
      gltfResult.scene.traverse((child) => {
        if (this.isMesh(child) && !goldFishMesh) {
          goldFishMesh = child;
        }
      });

      if (!goldFishMesh) {
        throw new Error('Altın balık modelinde mesh bulunamadı');
      }

      const goldMesh = goldFishMesh as THREE.Mesh;
      this.goldFishGeometry = goldMesh.geometry.clone();
      this.goldFishMaterial = Array.isArray(goldMesh.material) 
        ? goldMesh.material[0].clone() 
        : goldMesh.material.clone();

      // InstancedMesh oluştur
      this.goldFishInstancedMesh = new THREE.InstancedMesh(
        this.goldFishGeometry,
        this.goldFishMaterial,
        this.GOLD_FISH_COUNT
      );

      this.scene.add(this.goldFishInstancedMesh);
      
      // Altın balık instance'larını oluştur
      this.createGoldFishInstances();
      this.updateGoldFishInstanceMatrices();
      
      this.goldFishLoaded = true;
      console.log(`${this.GOLD_FISH_COUNT} altın balık tekne çevresine yerleştirildi`);
      
    } catch (error) {
      console.error('Altın balık modeli yüklenirken hata:', error);
    }
  }

  private createFishInstances(): void {
    for (let i = 0; i < this.FISH_COUNT; i++) {
      const instance = this.createFishInstance();
      this.fishInstances.push(instance);
    }
  }

  private createGoldFishInstances(): void {
    for (let i = 0; i < this.GOLD_FISH_COUNT; i++) {
      const instance = this.createGoldFishInstance();
      this.goldFishInstances.push(instance);
    }
  }

  private createFishInstance(): FishInstance {
    const boatPosition = this.boatService.getBoatPosition();
    
    // Tekne çevresinde rastgele pozisyon üret (tekneye çok yakın olmayan)
    let position: THREE.Vector3;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.MIN_DISTANCE_FROM_BOAT + Math.random() * (this.SPAWN_RADIUS - this.MIN_DISTANCE_FROM_BOAT);
      
      position = new THREE.Vector3(
        boatPosition.x + Math.cos(angle) * distance,
        this.WATER_DEPTH_MIN + Math.random() * (this.WATER_DEPTH_MAX - this.WATER_DEPTH_MIN),
        boatPosition.z + Math.sin(angle) * distance
      );
      attempts++;
    } while (position.distanceTo(boatPosition) < this.MIN_DISTANCE_FROM_BOAT && attempts < 10);

    // Balığın yüzme merkezi noktası
    const centerPoint = position.clone();
    
    // Yüzme yarıçapı ve yönü
    const swimRadius = 2 + Math.random() * 3;
    const swimDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.5, // Y ekseninde daha az hareket
      (Math.random() - 0.5) * 2
    ).normalize();

    // İlk hedef noktasını oluştur
    const initialTarget = this.generateNewTarget(centerPoint);
    const initialRotationY = Math.random() * Math.PI * 2;
    
    return {
      position: position,
      rotation: new THREE.Vector3(0, initialRotationY, 0),
      speed: this.SWIM_SPEED_MIN + Math.random() * (this.SWIM_SPEED_MAX - this.SWIM_SPEED_MIN),
      swimDirection: swimDirection,
      swimRadius: swimRadius,
      centerPoint: centerPoint,
      phase: Math.random() * Math.PI * 2, // Animasyon fazı
      currentTarget: initialTarget,
      targetChangeTimer: 0,
      targetChangeDuration: this.TARGET_CHANGE_MIN + Math.random() * (this.TARGET_CHANGE_MAX - this.TARGET_CHANGE_MIN),
      pauseTimer: 0,
      pauseDuration: this.PAUSE_MIN + Math.random() * (this.PAUSE_MAX - this.PAUSE_MIN),
      verticalPhase: Math.random() * Math.PI * 2,
      isPaused: Math.random() < 0.2, // %20 şansla başlangıçta durgun
      velocity: new THREE.Vector3(0, 0, 0),
      targetRotationY: initialRotationY,
      currentRotationY: initialRotationY,
      smoothingFactor: 0.6 + Math.random() * 0.3 // 0.6-0.9 arası daha yumuşak
    };
  }

  private createGoldFishInstance(): FishInstance {
    const boatPosition = this.boatService.getBoatPosition();
    
    // Tekne çevresinde rastgele pozisyon üret (normal balıklardan farklı alan)
    let position: THREE.Vector3;
    let attempts = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const distance = this.MIN_DISTANCE_FROM_BOAT + 2 + Math.random() * (this.SPAWN_RADIUS - this.MIN_DISTANCE_FROM_BOAT - 2);
      
      position = new THREE.Vector3(
        boatPosition.x + Math.cos(angle) * distance,
        this.GOLD_FISH_DEPTH_MIN + Math.random() * (this.GOLD_FISH_DEPTH_MAX - this.GOLD_FISH_DEPTH_MIN), // Su yüzeyine yakın
        boatPosition.z + Math.sin(angle) * distance
      );
      attempts++;
    } while (position.distanceTo(boatPosition) < this.MIN_DISTANCE_FROM_BOAT + 2 && attempts < 10);

    // Altın balığın yüzme merkezi noktası
    const centerPoint = position.clone();
    
    // Yüzme yarıçapı ve yönü
    const swimRadius = 3 + Math.random() * 4; // Daha geniş hareket alanı
    const swimDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.3, // Y ekseninde daha az hareket
      (Math.random() - 0.5) * 2
    ).normalize();

    // İlk hedef noktasını oluştur
    const initialTarget = this.generateNewTarget(centerPoint);
    const initialRotationY = Math.random() * Math.PI * 2;
    
    return {
      position: position,
      rotation: new THREE.Vector3(0, initialRotationY, 0),
      speed: this.GOLD_FISH_SPEED_MIN + Math.random() * (this.GOLD_FISH_SPEED_MAX - this.GOLD_FISH_SPEED_MIN),
      swimDirection: swimDirection,
      swimRadius: swimRadius,
      centerPoint: centerPoint,
      phase: Math.random() * Math.PI * 2,
      currentTarget: initialTarget,
      targetChangeTimer: 0,
      targetChangeDuration: this.TARGET_CHANGE_MIN * 0.7 + Math.random() * (this.TARGET_CHANGE_MAX * 0.8 - this.TARGET_CHANGE_MIN * 0.7), // Daha kısa hedef süresi - daha dinamik
      pauseTimer: 0,
      pauseDuration: this.PAUSE_MIN * 0.5 + Math.random() * (this.PAUSE_MAX * 0.6 - this.PAUSE_MIN * 0.5), // Çok kısa durma - daha aktif
      verticalPhase: Math.random() * Math.PI * 2,
      isPaused: Math.random() < 0.05, // %5 şansla başlangıçta durgun (çok az durma)
      velocity: new THREE.Vector3(0, 0, 0),
      targetRotationY: initialRotationY,
      currentRotationY: initialRotationY,
      smoothingFactor: 0.7 + Math.random() * 0.2 // 0.7-0.9 arası daha hızlı tepki (aktif yüzme)
    };
  }

  private updateInstanceMatrices(): void {
    if (!this.fishInstancedMesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3(this.FISH_SCALE, this.FISH_SCALE, this.FISH_SCALE);

    for (let i = 0; i < this.fishInstances.length; i++) {
      const fish = this.fishInstances[i];
      
      position.copy(fish.position);
      rotation.set(fish.rotation.x, fish.rotation.y, fish.rotation.z);
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      this.fishInstancedMesh.setMatrixAt(i, matrix);
    }

    this.fishInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateGoldFishInstanceMatrices(): void {
    if (!this.goldFishInstancedMesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3(this.GOLD_FISH_SCALE, this.GOLD_FISH_SCALE, this.GOLD_FISH_SCALE);

    for (let i = 0; i < this.goldFishInstances.length; i++) {
      const fish = this.goldFishInstances[i];
      
      position.copy(fish.position);
      
      // Altın balık özel rotasyonu - daha aktif yüzme görünümü
      const velocity = fish.velocity;
      const speed = velocity.length();
      
      // Hızlı hareket halinde daha dinamik rotasyon
      const speedMultiplier = Math.min(speed * 1.5, 2.0); // Hız çarpanı
      const activeSwimming = speed > 0.2 ? speedMultiplier : 0.5; // Aktif yüzme faktörü
      
      rotation.set(
        fish.rotation.x * activeSwimming + 2, // Daha büyük yatırma açısı + aktif hareket
        fish.rotation.y, // Normal Y rotasyonu
        fish.rotation.z * activeSwimming // Z rotasyonunu da hızla çarp
      );
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      this.goldFishInstancedMesh.setMatrixAt(i, matrix);
    }

    this.goldFishInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public update(delta: number): void {
    if (!this.boatService.isBoatLoaded()) return;

    this.time += delta;

    // Normal balıkları güncelle
    if (this.loaded) {
      for (let i = 0; i < this.fishInstances.length; i++) {
        const fish = this.fishInstances[i];
        this.updateFishAnimation(fish, delta);
      }
      this.updateInstanceMatrices();
    }

    // Altın balıkları güncelle
    if (this.goldFishLoaded) {
      for (let i = 0; i < this.goldFishInstances.length; i++) {
        const goldFish = this.goldFishInstances[i];
        this.updateFishAnimation(goldFish, delta);
        // Altın balıklar için özel derinlik kontrolü
        this.enforceGoldFishBoundaries(goldFish);
      }
      this.updateGoldFishInstanceMatrices();
    }
  }

  private generateNewTarget(centerPoint: THREE.Vector3): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = 2 + Math.random() * (this.MOVEMENT_RANGE - 2); // Minimum 2 birim mesafe
    const verticalOffset = (Math.random() - 0.5) * 1.2; // Daha kontrollü yukarı aşağı hareket
    
    // Hedef Y pozisyonunu hesapla
    let targetY = centerPoint.y + verticalOffset;
    
    // Su yüzeyi ve derinlik sınırlarını kontrol et
    targetY = Math.max(this.MAX_DEPTH, Math.min(this.WATER_SURFACE_LEVEL - 0.5, targetY));
    
    return new THREE.Vector3(
      centerPoint.x + Math.cos(angle) * distance,
      targetY,
      centerPoint.z + Math.sin(angle) * distance
    );
  }

  private checkCollisions(fish: FishInstance, fishList: FishInstance[]): THREE.Vector3 {
    const avoidanceForce = new THREE.Vector3(0, 0, 0);
    
    for (const otherFish of fishList) {
      if (otherFish === fish) continue;
      
      const distance = fish.position.distanceTo(otherFish.position);
      if (distance < this.FISH_COLLISION_RADIUS && distance > 0) {
        // Çarpışmayı önlemek için kaçınma kuvveti
        const avoidDirection = fish.position.clone().sub(otherFish.position).normalize();
        const forceStrength = (this.FISH_COLLISION_RADIUS - distance) / this.FISH_COLLISION_RADIUS;
        avoidanceForce.add(avoidDirection.multiplyScalar(forceStrength * 2));
      }
    }
    
    return avoidanceForce;
  }

  private enforceBoundaries(fish: FishInstance): void {
    // Su yüzeyi kontrolü - hiçbir balık geçemez
    const surfaceLimit = this.WATER_SURFACE_LEVEL - this.SURFACE_BUFFER;
    if (fish.position.y > surfaceLimit) {
      fish.position.y = surfaceLimit;
      // Velocity'nin Y bileşenini sıfırla
      if (fish.velocity.y > 0) {
        fish.velocity.y = 0;
      }
    }
    
    // Derinlik kontrolü
    if (fish.position.y < this.MAX_DEPTH) {
      fish.position.y = this.MAX_DEPTH;
      if (fish.velocity.y < 0) {
        fish.velocity.y = 0;
      }
    }
  }

  private enforceGoldFishBoundaries(fish: FishInstance): void {
    // Altın balıklar için özel sınırlar - daha sıkı yukarı kontrol
    const goldFishSurfaceLimit = this.GOLD_FISH_DEPTH_MIN + 0.2; // Minimum derinlikten sadece 0.2 birim yukarı
    if (fish.position.y > goldFishSurfaceLimit) {
      fish.position.y = goldFishSurfaceLimit;
      // Yukarı hareket eden velocity'yi sıfırla
      if (fish.velocity.y > 0) {
        fish.velocity.y = -0.1; // Hafif aşağı itme
      }
    }
    
    // Altın balıklar için maksimum derinlik
    if (fish.position.y < this.GOLD_FISH_DEPTH_MAX - 0.5) {
      fish.position.y = this.GOLD_FISH_DEPTH_MAX - 0.5;
      if (fish.velocity.y < 0) {
        fish.velocity.y = 0;
      }
    }
  }

  private updateFishAnimation(fish: FishInstance, delta: number): void {
    // Timer'ları güncelle
    fish.targetChangeTimer += delta;
    fish.pauseTimer += delta;
    fish.verticalPhase += delta * fish.smoothingFactor;

    // Duraklama durumu kontrolü
    if (fish.isPaused) {
      if (fish.pauseTimer >= fish.pauseDuration) {
        fish.isPaused = false;
        fish.pauseTimer = 0;
        fish.pauseDuration = this.PAUSE_MIN + Math.random() * (this.PAUSE_MAX - this.PAUSE_MIN);
        // Yeni hedef oluştur
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
      }
      
      // Durgun haldeyken velocity'yi çok yumuşakça sıfırla
      fish.velocity.multiplyScalar(this.DECELERATION * 0.98);
      
      // Çarpışma kontrolü - durgun haldeyken de
      const allFish = [...this.fishInstances, ...this.goldFishInstances];
      const avoidanceForce = this.checkCollisions(fish, allFish);
      
      // Çarpışma kaçınma kuvvetini velocity'ye ekle
      if (avoidanceForce.length() > 0) {
        fish.velocity.add(avoidanceForce.multiplyScalar(delta * 2)); // Durgun haldeyken daha yumuşak
      }
      
      // Pozisyonu velocity ile güncelle
      fish.position.add(fish.velocity.clone().multiplyScalar(delta));
      
      // Durgun haldeyken hafif sallanma
      const verticalFloat = Math.sin(fish.verticalPhase * 0.6) * 0.05;
      fish.position.y += verticalFloat * delta;
      
      // Sınır kontrolü
      this.enforceBoundaries(fish);
      
      // Çok yumuşak rotasyon güncellemesi
      fish.currentRotationY = THREE.MathUtils.lerp(
        fish.currentRotationY, 
        fish.targetRotationY, 
        this.ROTATION_SMOOTHING * 0.5 * delta
      );
      fish.rotation.y = fish.currentRotationY;
      
      // Hafif sallanma efekti
      fish.rotation.x = Math.sin(fish.verticalPhase * 1.5) * 0.04;
      fish.rotation.z = Math.cos(fish.verticalPhase * 1.2) * 0.02;
      return;
    }

    // Yeni hedef seçme zamanı
    if (fish.targetChangeTimer >= fish.targetChangeDuration) {
      fish.targetChangeTimer = 0;
      fish.targetChangeDuration = this.TARGET_CHANGE_MIN + Math.random() * (this.TARGET_CHANGE_MAX - this.TARGET_CHANGE_MIN);
      
      // Rastgele durma şansı
      if (Math.random() < 0.15) { // %15 şansla dur
        fish.isPaused = true;
        fish.pauseTimer = 0;
        return;
      }
      
      // Yeni hedef oluştur
      fish.currentTarget = this.generateNewTarget(fish.centerPoint);
    }

    // Hedefe doğru hareket et
    const direction = fish.currentTarget.clone().sub(fish.position);
    const distance = direction.length();
    
    if (distance > 0.5) {
      direction.normalize();
      
      // Mesafeye göre hız ayarı (yakınsa yavaşla, uzaksa hızlan)
      const distanceRatio = Math.min(1.0, distance / 3.0);
      const targetSpeed = fish.speed * distanceRatio;
      
      // Velocity'yi çok yumuşakça hedefe yönlendir
      const targetVelocity = direction.multiplyScalar(targetSpeed);
      fish.velocity.lerp(targetVelocity, this.ACCELERATION * this.VELOCITY_SMOOTHING * delta);
      
      // Hedef rotasyonu hesapla
      fish.targetRotationY = Math.atan2(direction.x, direction.z);
      
      // Rotasyon farkını normalize et (-π ile π arasında)
      let rotationDiff = fish.targetRotationY - fish.currentRotationY;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Çok yumuşak rotasyon geçişi
      fish.currentRotationY += rotationDiff * this.ROTATION_SMOOTHING * fish.smoothingFactor * 0.7;
      fish.rotation.y = fish.currentRotationY;
      
    } else {
      // Hedefe yakın - çok yumuşakça yavaşla ve yeni hedef seç
      fish.velocity.multiplyScalar(this.DECELERATION * 0.96);
      
      if (distance < 0.3) {
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
        fish.targetChangeTimer = 0;
      }
    }

    // Çarpışma kontrolü - tüm balıklarla kontrol et
    const allFish = [...this.fishInstances, ...this.goldFishInstances];
    const avoidanceForce = this.checkCollisions(fish, allFish);
    
    // Çarpışma kaçınma kuvvetini velocity'ye ekle
    if (avoidanceForce.length() > 0) {
      fish.velocity.add(avoidanceForce.multiplyScalar(delta * 3)); // Güçlü kaçınma
    }
    
    // Pozisyonu velocity ile güncelle
    fish.position.add(fish.velocity.clone().multiplyScalar(delta));
    
    // Sınır kontrolü (su yüzeyi ve derinlik)
    this.enforceBoundaries(fish);
    
    // Daha yumuşak yüzme dalgalanması
    const swimPhase = fish.verticalPhase * 2.0;
    const verticalFloat = Math.sin(swimPhase) * 0.08 * Math.min(fish.velocity.length(), 1.0);
    fish.position.y += verticalFloat * delta;
    
    // Su yüzeyi kontrolü tekrar (dalgalanma sonrası)
    fish.position.y = Math.max(this.MAX_DEPTH, Math.min(this.WATER_SURFACE_LEVEL - 0.3, fish.position.y));
    
    // Daha yumuşak yüzme animasyonu - hıza bağlı
    const velocityMagnitude = Math.min(fish.velocity.length(), 1.5);
    fish.rotation.x = Math.sin(swimPhase * 1.5) * 0.04 * velocityMagnitude;
    fish.rotation.z = Math.cos(swimPhase * 1.2) * 0.03 * velocityMagnitude;
  }

  // Tekne hareket ettiğinde balık alanını güncelle
  public updateFishArea(): void {
    const boatPosition = this.boatService.getBoatPosition();
    
    // Normal balıkları güncelle
    if (this.loaded) {
      for (let i = 0; i < this.fishInstances.length; i++) {
        const fish = this.fishInstances[i];
        
        // Mevcut balığın pozisyonunu teknenin yeni pozisyonuna göre ayarla
        const relativePos = fish.centerPoint.clone().sub(boatPosition);
        
        // Eğer balık çok uzaksa, yeni bir pozisyon ver
        if (relativePos.length() > this.SPAWN_RADIUS) {
          const newFish = this.createFishInstance();
          this.fishInstances[i] = newFish;
        } else {
          // Yakın balıkların hedeflerini güncelle
          fish.currentTarget = this.generateNewTarget(fish.centerPoint);
          fish.targetChangeTimer = 0;
        }
      }
    }

    // Altın balıkları güncelle
    if (this.goldFishLoaded) {
      for (let i = 0; i < this.goldFishInstances.length; i++) {
        const goldFish = this.goldFishInstances[i];
        
        // Mevcut altın balığın pozisyonunu teknenin yeni pozisyonuna göre ayarla
        const relativePos = goldFish.centerPoint.clone().sub(boatPosition);
        
        // Eğer altın balık çok uzaksa, yeni bir pozisyon ver
        if (relativePos.length() > this.SPAWN_RADIUS) {
          const newGoldFish = this.createGoldFishInstance();
          this.goldFishInstances[i] = newGoldFish;
        } else {
          // Yakın altın balıkların hedeflerini güncelle
          goldFish.currentTarget = this.generateNewTarget(goldFish.centerPoint);
          goldFish.targetChangeTimer = 0;
        }
      }
    }
  }

  public getFishCount(): number {
    return this.FISH_COUNT;
  }

  public getGoldFishCount(): number {
    return this.GOLD_FISH_COUNT;
  }

  public getTotalFishCount(): number {
    return this.FISH_COUNT + this.GOLD_FISH_COUNT;
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public isGoldFishLoaded(): boolean {
    return this.goldFishLoaded;
  }

  public isFullyLoaded(): boolean {
    return this.loaded && this.goldFishLoaded;
  }

  public dispose(): void {
    // Normal balıkları temizle
    if (this.fishInstancedMesh) {
      this.scene.remove(this.fishInstancedMesh);
      this.fishInstancedMesh = null;
    }

    if (this.fishGeometry) {
      this.fishGeometry.dispose();
      this.fishGeometry = null;
    }

    if (this.fishMaterial) {
      if (this.fishMaterial instanceof Array) {
        this.fishMaterial.forEach(material => material.dispose());
      } else {
        this.fishMaterial.dispose();
      }
      this.fishMaterial = null;
    }

    // Altın balıkları temizle
    if (this.goldFishInstancedMesh) {
      this.scene.remove(this.goldFishInstancedMesh);
      this.goldFishInstancedMesh = null;
    }

    if (this.goldFishGeometry) {
      this.goldFishGeometry.dispose();
      this.goldFishGeometry = null;
    }

    if (this.goldFishMaterial) {
      if (this.goldFishMaterial instanceof Array) {
        this.goldFishMaterial.forEach(material => material.dispose());
      } else {
        this.goldFishMaterial.dispose();
      }
      this.goldFishMaterial = null;
    }

    this.fishInstances = [];
    this.goldFishInstances = [];
    this.loaded = false;
    this.goldFishLoaded = false;
  }
} 