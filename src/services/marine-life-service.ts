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
  
  // 07 balıklar
  private fish07InstancedMesh: THREE.InstancedMesh | null = null;
  private fish07Instances: FishInstance[] = [];
  private fish07Geometry: THREE.BufferGeometry | null = null;
  private fish07Material: THREE.Material | null = null;
  
  private time = 0;
  private loaded = false;
  private goldFishLoaded = false;
  private fish07Loaded = false;
  private isDarkMode = false;
  
  private readonly FISH_COUNT = 60; // 256x256 alan için daha fazla balık
  private readonly GOLD_FISH_COUNT = 20; // Daha fazla altın balık
  private readonly FISH_07_COUNT = 30; // Daha fazla 07 balık
  private readonly BOUNDARY_SIZE = 128; // Tekne ile aynı sınır - 256x256 alan
  private readonly MIN_DISTANCE_FROM_BOAT = 3; // Tekneye minimum mesafe
  private readonly GRID_SIZE = 16; // 256x256 alan için daha büyük grid
  private readonly SWIM_SPEED_MIN = 0.8;
  private readonly SWIM_SPEED_MAX = 2.5;
  private readonly GOLD_FISH_SPEED_MIN = 1.0; // Altın balıklar daha aktif
  private readonly GOLD_FISH_SPEED_MAX = 2.8; // Daha hızlı maksimum hız
  private readonly FISH_07_SPEED_MIN = 0.3; // 07 balıklar çok yavaş - kaybolmasın
  private readonly FISH_07_SPEED_MAX = 1.0; // Daha yavaş hareket
  private readonly FISH_SCALE = 0.15; // Daha küçük balıklar
  private readonly GOLD_FISH_SCALE = 0.18; // Altın balıklar biraz daha büyük
  private readonly FISH_07_SCALE = 0.36; // 07 balıklar 3 kat büyük (0.12 * 3)
  private readonly WATER_DEPTH_MIN = -2;
  private readonly WATER_DEPTH_MAX = -8;
  private readonly GOLD_FISH_DEPTH_MIN = -2.5; // Altın balıklar çok daha derinlerde
  private readonly GOLD_FISH_DEPTH_MAX = -6; // Altın balıklar daha derin seviyede
  private readonly FISH_07_DEPTH_MIN = -0.8; // 07 balıklar su altında kalır
  private readonly FISH_07_DEPTH_MAX = -3.0; // Daha derin sınır
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
    this.loadFish07();
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

  private async loadFish07(): Promise<void> {
    try {
      console.log('07 balık modeli yükleniyor...');
      const gltfResult = await GLTFLoaderService.loadModel('assets/models/07fish.glb');
      
      // İlk mesh'i al ve geometri/materyal çıkar
      let fish07Mesh: THREE.Mesh | null = null;
      gltfResult.scene.traverse((child) => {
        if (this.isMesh(child) && !fish07Mesh) {
          fish07Mesh = child;
        }
      });

      if (!fish07Mesh) {
        throw new Error('07 balık modelinde mesh bulunamadı');
      }

      const mesh07 = fish07Mesh as THREE.Mesh;
      this.fish07Geometry = mesh07.geometry.clone();
      
      // 07fish için su altında görünür parlak materyal oluştur
      this.fish07Material = new THREE.MeshStandardMaterial({
        color: 0xff6666, // Daha parlak kırmızı renk
        metalness: 0.1, // Az metalik
        roughness: 0.3, // Daha parlak yüzey
        emissive: 0xff2222, // Güçlü kırmızı parıltı - su altında görünür
        emissiveIntensity: 0.5 // Daha güçlü parıltı
      });

      // InstancedMesh oluştur
      this.fish07InstancedMesh = new THREE.InstancedMesh(
        this.fish07Geometry,
        this.fish07Material,
        this.FISH_07_COUNT
      );

      this.scene.add(this.fish07InstancedMesh);
      
      // 07 balık instance'larını oluştur
      this.createFish07Instances();
      this.updateFish07InstanceMatrices();
      
      this.fish07Loaded = true;
      console.log(`${this.FISH_07_COUNT} 07 balık tekne çevresine yerleştirildi`);
      
    } catch (error) {
      console.error('07 balık modeli yüklenirken hata:', error);
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

  private createFish07Instances(): void {
    for (let i = 0; i < this.FISH_07_COUNT; i++) {
      const instance = this.createFish07Instance();
      this.fish07Instances.push(instance);
    }
  }

  private createFishInstance(): FishInstance {
    // Homojen grid tabanlı pozisyon oluştur
    const position = this.getHomogeneousPosition();
    
    // Eğer tekneye çok yakınsa, farklı bir grid pozisyonu dene
    const boatPosition = this.boatService.getBoatPosition();
    if (position.distanceTo(boatPosition) < this.MIN_DISTANCE_FROM_BOAT) {
      // Alternatif grid pozisyonu
      const gridX = Math.floor(Math.random() * this.GRID_SIZE);
      const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
      const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
      
      position.x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
      position.z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    }

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
    // Homojen grid tabanlı pozisyon (altın balık için)
    const position = this.getHomogeneousGoldFishPosition();
    
    // Tekneye mesafe kontrolü
    const boatPosition = this.boatService.getBoatPosition();
    if (position.distanceTo(boatPosition) < this.MIN_DISTANCE_FROM_BOAT + 2) {
      // Farklı grid pozisyonu dene
      const gridX = Math.floor(Math.random() * this.GRID_SIZE);
      const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
      const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
      
      position.x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
      position.z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    }

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

  private createFish07Instance(): FishInstance {
    // Homojen grid tabanlı pozisyon (07 balık için)
    const position = this.getHomogeneousFish07Position();
    
    // Tekneye mesafe kontrolü
    const boatPosition = this.boatService.getBoatPosition();
    if (position.distanceTo(boatPosition) < this.MIN_DISTANCE_FROM_BOAT) {
      // Farklı grid pozisyonu dene
      const gridX = Math.floor(Math.random() * this.GRID_SIZE);
      const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
      const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
      
      position.x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
      position.z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    }

    // 07 balığın yüzme merkezi noktası
    const centerPoint = position.clone();
    
    // Yüzme yarıçapı ve yönü (küçük ama stabil alan)
    const swimRadius = 1.0 + Math.random() * 1.0; // Küçük hareket alanı (1.0-2.0)
    const swimDirection = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 0.4, // Y ekseninde daha az hareket
      (Math.random() - 0.5) * 2
    ).normalize();

    // İlk hedef noktasını oluştur
    const initialTarget = this.generateNewTarget(centerPoint);
    const initialRotationY = Math.random() * Math.PI * 2;
    
    return {
      position: position,
      rotation: new THREE.Vector3(0, initialRotationY, 0),
      speed: this.FISH_07_SPEED_MIN + Math.random() * (this.FISH_07_SPEED_MAX - this.FISH_07_SPEED_MIN),
      swimDirection: swimDirection,
      swimRadius: swimRadius,
      centerPoint: centerPoint,
      phase: Math.random() * Math.PI * 2,
      currentTarget: initialTarget,
      targetChangeTimer: 0,
      targetChangeDuration: this.TARGET_CHANGE_MIN + Math.random() * (this.TARGET_CHANGE_MAX - this.TARGET_CHANGE_MIN),
      pauseTimer: 0,
      pauseDuration: this.PAUSE_MIN + Math.random() * (this.PAUSE_MAX - this.PAUSE_MIN),
      verticalPhase: Math.random() * Math.PI * 2,
      isPaused: Math.random() < 0.05, // %5 şansla başlangıçta durgun - daha aktif
      velocity: new THREE.Vector3(0, 0, 0),
      targetRotationY: initialRotationY,
      currentRotationY: initialRotationY,
      smoothingFactor: 0.95 + Math.random() * 0.05 // 0.95-1.0 arası çok stabil hareket
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
      
      // Altın balık normal rotasyonu - dik duruş, takla atmaz
      rotation.set(
        fish.rotation.x + Math.PI / 2, // 90 derece dik duruş + normal animasyon
        fish.rotation.y, // Normal Y rotasyonu
        fish.rotation.z // Normal Z rotasyonu - takla atmaz
      );
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      this.goldFishInstancedMesh.setMatrixAt(i, matrix);
    }

    this.goldFishInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateFish07InstanceMatrices(): void {
    if (!this.fish07InstancedMesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3(this.FISH_07_SCALE, this.FISH_07_SCALE, this.FISH_07_SCALE);

    for (let i = 0; i < this.fish07Instances.length; i++) {
      const fish = this.fish07Instances[i];
      
      position.copy(fish.position);
      
      // 07 balık normal rotasyonu - dik duruş (yan yatmış halden düzelt)
      rotation.set(
        fish.rotation.x + Math.PI / 2, // 90 derece çevir - dik dursun
        fish.rotation.y, 
        fish.rotation.z // Normal Z rotasyonu
      );
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      this.fish07InstancedMesh.setMatrixAt(i, matrix);
    }

    this.fish07InstancedMesh.instanceMatrix.needsUpdate = true;
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
        this.updateGoldFishAnimation(goldFish, delta); // Özel gerçekçi animasyon
        // Altın balıklar için özel derinlik kontrolü
        this.enforceGoldFishBoundaries(goldFish);
      }
      this.updateGoldFishInstanceMatrices();
    }

    // 07 balıkları güncelle
    if (this.fish07Loaded) {
      for (let i = 0; i < this.fish07Instances.length; i++) {
        const fish07 = this.fish07Instances[i];
        this.updateFish07Animation(fish07, delta); // Özel gerçekçi animasyon
        // 07 balıklar için özel sınır kontrolü (su yüzeyinin üstüne çıkabilir)
        this.enforceFish07Boundaries(fish07);
      }
      this.updateFish07InstanceMatrices();
    }
  }

  private generateNewTarget(centerPoint: THREE.Vector3): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const distance = 2 + Math.random() * (this.MOVEMENT_RANGE - 2);
    const verticalOffset = (Math.random() - 0.5) * 1.2;
    
    // Hedef pozisyonları hesapla
    let targetX = centerPoint.x + Math.cos(angle) * distance;
    let targetZ = centerPoint.z + Math.sin(angle) * distance;
    let targetY = centerPoint.y + verticalOffset;
    
    // Boundary kontrolü (horizontal)
    targetX = Math.max(-this.BOUNDARY_SIZE + 2, Math.min(this.BOUNDARY_SIZE - 2, targetX));
    targetZ = Math.max(-this.BOUNDARY_SIZE + 2, Math.min(this.BOUNDARY_SIZE - 2, targetZ));
    
    // Su yüzeyi ve derinlik sınırlarını kontrol et
    targetY = Math.max(this.MAX_DEPTH, Math.min(this.WATER_SURFACE_LEVEL - 0.5, targetY));
    
    return new THREE.Vector3(targetX, targetY, targetZ);
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
    // Horizontal sınırları (64x64 alan)
    if (fish.position.x > this.BOUNDARY_SIZE - 1) {
      fish.position.x = this.BOUNDARY_SIZE - 1;
      fish.velocity.x = Math.min(0, fish.velocity.x);
    } else if (fish.position.x < -this.BOUNDARY_SIZE + 1) {
      fish.position.x = -this.BOUNDARY_SIZE + 1;
      fish.velocity.x = Math.max(0, fish.velocity.x);
    }

    if (fish.position.z > this.BOUNDARY_SIZE - 1) {
      fish.position.z = this.BOUNDARY_SIZE - 1;
      fish.velocity.z = Math.min(0, fish.velocity.z);
    } else if (fish.position.z < -this.BOUNDARY_SIZE + 1) {
      fish.position.z = -this.BOUNDARY_SIZE + 1;
      fish.velocity.z = Math.max(0, fish.velocity.z);
    }

    // Su yüzeyi kontrolü
    const surfaceLimit = this.WATER_SURFACE_LEVEL - this.SURFACE_BUFFER;
    if (fish.position.y > surfaceLimit) {
      fish.position.y = surfaceLimit;
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
    // Horizontal sınırları (aynı 64x64 alan)
    if (fish.position.x > this.BOUNDARY_SIZE - 1) {
      fish.position.x = this.BOUNDARY_SIZE - 1;
      fish.velocity.x = Math.min(0, fish.velocity.x);
    } else if (fish.position.x < -this.BOUNDARY_SIZE + 1) {
      fish.position.x = -this.BOUNDARY_SIZE + 1;
      fish.velocity.x = Math.max(0, fish.velocity.x);
    }

    if (fish.position.z > this.BOUNDARY_SIZE - 1) {
      fish.position.z = this.BOUNDARY_SIZE - 1;
      fish.velocity.z = Math.min(0, fish.velocity.z);
    } else if (fish.position.z < -this.BOUNDARY_SIZE + 1) {
      fish.position.z = -this.BOUNDARY_SIZE + 1;
      fish.velocity.z = Math.max(0, fish.velocity.z);
    }

    // Altın balıklar için özel sınırlar
    const goldFishSurfaceLimit = this.GOLD_FISH_DEPTH_MIN + 0.2;
    if (fish.position.y > goldFishSurfaceLimit) {
      fish.position.y = goldFishSurfaceLimit;
      if (fish.velocity.y > 0) {
        fish.velocity.y = -0.1;
      }
    }
    
    if (fish.position.y < this.GOLD_FISH_DEPTH_MAX - 0.5) {
      fish.position.y = this.GOLD_FISH_DEPTH_MAX - 0.5;
      if (fish.velocity.y < 0) {
        fish.velocity.y = 0;
      }
    }
  }

  private enforceFish07Boundaries(fish: FishInstance): void {
    // Horizontal sınırları (aynı 64x64 alan)
    if (fish.position.x > this.BOUNDARY_SIZE - 1) {
      fish.position.x = this.BOUNDARY_SIZE - 1;
      fish.velocity.x = Math.min(0, fish.velocity.x);
    } else if (fish.position.x < -this.BOUNDARY_SIZE + 1) {
      fish.position.x = -this.BOUNDARY_SIZE + 1;
      fish.velocity.x = Math.max(0, fish.velocity.x);
    }

    if (fish.position.z > this.BOUNDARY_SIZE - 1) {
      fish.position.z = this.BOUNDARY_SIZE - 1;
      fish.velocity.z = Math.min(0, fish.velocity.z);
    } else if (fish.position.z < -this.BOUNDARY_SIZE + 1) {
      fish.position.z = -this.BOUNDARY_SIZE + 1;
      fish.velocity.z = Math.max(0, fish.velocity.z);
    }

    // 07 balıklar için sıkı sınırlar
    const fish07SurfaceLimit = this.WATER_SURFACE_LEVEL - 0.5;
    if (fish.position.y > fish07SurfaceLimit) {
      fish.position.y = fish07SurfaceLimit;
      fish.velocity.y = -0.2;
    }
    
    if (fish.position.y < this.FISH_07_DEPTH_MAX - 0.3) {
      fish.position.y = this.FISH_07_DEPTH_MAX - 0.3;
      if (fish.velocity.y < 0) {
        fish.velocity.y = 0.08;
      }
    }
  }

  private updateGoldFishAnimation(fish: FishInstance, delta: number): void {
    // Gold balıklar için gerçekçi animasyon - takla atmaz, yumuşak hareket
    this.time += delta;
    
    // Timer'ları güncelle
    fish.targetChangeTimer += delta;
    fish.pauseTimer += delta;
    fish.verticalPhase += delta * 0.7; // Orta hızlı vertical hareket

    // Duraklama durumu kontrolü (az durma)
    if (fish.isPaused) {
      if (fish.pauseTimer >= fish.pauseDuration * 0.4) { // Kısa durma
        fish.isPaused = false;
        fish.pauseTimer = 0;
        fish.pauseDuration = this.PAUSE_MIN * 0.2 + Math.random() * (this.PAUSE_MAX * 0.2 - this.PAUSE_MIN * 0.2);
        // Yeni hedef oluştur
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
      }
      
      // Durgun haldeyken yumuşak hareket
      fish.velocity.multiplyScalar(0.96);
      
      // Çarpışma kontrolü
      const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
      const avoidanceForce = this.checkCollisions(fish, allFish);
      
      if (avoidanceForce.length() > 0) {
        fish.velocity.add(avoidanceForce.multiplyScalar(delta * 0.7)); // Yumuşak kaçınma
      }
      
      // Pozisyonu güncelle
      fish.position.add(fish.velocity.clone().multiplyScalar(delta));
      
      // Hafif yüzme hareketi
      const gentleFloat = Math.sin(fish.verticalPhase * 0.4) * 0.03;
      fish.position.y += gentleFloat * delta;
      
      // Yumuşak rotasyon
      fish.currentRotationY = THREE.MathUtils.lerp(fish.currentRotationY, fish.targetRotationY, 0.03 * delta);
      fish.rotation.y = fish.currentRotationY;
      
      // Az sallanma
      fish.rotation.x = Math.sin(fish.verticalPhase * 1.0) * 0.02;
      fish.rotation.z = Math.cos(fish.verticalPhase * 0.8) * 0.01;
      return;
    }

    // Yeni hedef seçme zamanı (orta aralıklar)
    if (fish.targetChangeTimer >= fish.targetChangeDuration * 0.8) {
      fish.targetChangeTimer = 0;
      fish.targetChangeDuration = this.TARGET_CHANGE_MIN * 0.7 + Math.random() * (this.TARGET_CHANGE_MAX * 0.8 - this.TARGET_CHANGE_MIN * 0.7);
      
      // Az durma şansı
      if (Math.random() < 0.03) { // %3 şansla dur
        fish.isPaused = true;
        fish.pauseTimer = 0;
        return;
      }
      
      // Yeni hedef oluştur
      fish.currentTarget = this.generateNewTarget(fish.centerPoint);
    }

    // Hedefe doğru yumuşak ama aktif hareket
    const direction = fish.currentTarget.clone().sub(fish.position);
    const distance = direction.length();
    
    if (distance > 0.4) {
      direction.normalize();
      
      // Yumuşak hız kontrolü
      const distanceRatio = Math.min(1.0, distance / 2.5);
      const targetSpeed = fish.speed * distanceRatio * 0.8; // Biraz yavaş
      
      // Yumuşak velocity geçişi
      const targetVelocity = direction.multiplyScalar(targetSpeed);
      fish.velocity.lerp(targetVelocity, 0.5 * delta); // Orta yumuşaklık
      
      // Hedef rotasyonu hesapla
      fish.targetRotationY = Math.atan2(direction.x, direction.z);
      
      // Rotasyon farkını normalize et
      let rotationDiff = fish.targetRotationY - fish.currentRotationY;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Yumuşak rotasyon geçişi
      fish.currentRotationY += rotationDiff * 0.04 * delta; // Orta hızlı rotasyon
      fish.rotation.y = fish.currentRotationY;
      
    } else {
      // Hedefe yakın - yumuşakça yavaşla
      fish.velocity.multiplyScalar(0.93);
      
      if (distance < 0.25) {
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
        fish.targetChangeTimer = 0;
      }
    }

    // Çarpışma kontrolü - orta güçte
    const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
    const avoidanceForce = this.checkCollisions(fish, allFish);
    
    if (avoidanceForce.length() > 0) {
      fish.velocity.add(avoidanceForce.multiplyScalar(delta * 1.2)); // Orta güçte kaçınma
    }
    
    // Pozisyonu velocity ile güncelle
    fish.position.add(fish.velocity.clone().multiplyScalar(delta));
    
    // Yumuşak yüzme dalgalanması
    const swimPhase = fish.verticalPhase * 1.2; // Orta hız
    const verticalFloat = Math.sin(swimPhase) * 0.04 * Math.min(fish.velocity.length(), 0.8); // Orta hareket
    fish.position.y += verticalFloat * delta;
    
    // Yumuşak yüzme animasyonu - takla atmaz
    const velocityMagnitude = Math.min(fish.velocity.length(), 1.0);
    fish.rotation.x = Math.sin(swimPhase * 1.0) * 0.025 * velocityMagnitude; // Az sallanma
    fish.rotation.z = Math.cos(swimPhase * 0.8) * 0.015 * velocityMagnitude; // Minimal roll
  }

  private updateFish07Animation(fish: FishInstance, delta: number): void {
    // 07 balıklar için gerçekçi animasyon - parelde atmaz, yumuşak hareket
    this.time += delta;
    
    // Timer'ları güncelle
    fish.targetChangeTimer += delta;
    fish.pauseTimer += delta;
    fish.verticalPhase += delta * 0.5; // Daha yavaş vertical hareket

    // Duraklama durumu kontrolü (daha az durma)
    if (fish.isPaused) {
      if (fish.pauseTimer >= fish.pauseDuration * 0.5) { // Daha kısa durma
        fish.isPaused = false;
        fish.pauseTimer = 0;
        fish.pauseDuration = this.PAUSE_MIN * 0.3 + Math.random() * (this.PAUSE_MAX * 0.3 - this.PAUSE_MIN * 0.3);
        // Yeni hedef oluştur
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
      }
      
      // Durgun haldeyken çok yumuşak hareket
      fish.velocity.multiplyScalar(0.98);
      
      // Çarpışma kontrolü
      const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
      const avoidanceForce = this.checkCollisions(fish, allFish);
      
      if (avoidanceForce.length() > 0) {
        fish.velocity.add(avoidanceForce.multiplyScalar(delta * 0.5)); // Çok yumuşak kaçınma
      }
      
      // Pozisyonu güncelle
      fish.position.add(fish.velocity.clone().multiplyScalar(delta));
      
      // Çok hafif yüzme hareketi
      const gentleFloat = Math.sin(fish.verticalPhase * 0.3) * 0.02;
      fish.position.y += gentleFloat * delta;
      
      // Çok yumuşak rotasyon
      fish.currentRotationY = THREE.MathUtils.lerp(fish.currentRotationY, fish.targetRotationY, 0.02 * delta);
      fish.rotation.y = fish.currentRotationY;
      
      // Minimal sallanma
      fish.rotation.x = Math.sin(fish.verticalPhase * 0.8) * 0.01;
      fish.rotation.z = Math.cos(fish.verticalPhase * 0.6) * 0.005;
      return;
    }

    // Yeni hedef seçme zamanı (daha uzun aralıklar)
    if (fish.targetChangeTimer >= fish.targetChangeDuration * 1.5) {
      fish.targetChangeTimer = 0;
      fish.targetChangeDuration = this.TARGET_CHANGE_MIN * 2 + Math.random() * (this.TARGET_CHANGE_MAX * 2 - this.TARGET_CHANGE_MIN * 2);
      
      // Az durma şansı
      if (Math.random() < 0.05) { // %5 şansla dur
        fish.isPaused = true;
        fish.pauseTimer = 0;
        return;
      }
      
      // Yeni hedef oluştur
      fish.currentTarget = this.generateNewTarget(fish.centerPoint);
    }

    // Hedefe doğru çok yumuşak hareket
    const direction = fish.currentTarget.clone().sub(fish.position);
    const distance = direction.length();
    
    if (distance > 0.3) {
      direction.normalize();
      
      // Çok yumuşak hız kontrolü
      const distanceRatio = Math.min(1.0, distance / 2.0);
      const targetSpeed = fish.speed * distanceRatio * 0.6; // Daha yavaş
      
      // Çok yumuşak velocity geçişi
      const targetVelocity = direction.multiplyScalar(targetSpeed);
      fish.velocity.lerp(targetVelocity, 0.3 * delta); // Çok yumuşak lerp
      
      // Hedef rotasyonu hesapla
      fish.targetRotationY = Math.atan2(direction.x, direction.z);
      
      // Rotasyon farkını normalize et
      let rotationDiff = fish.targetRotationY - fish.currentRotationY;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Çok yumuşak rotasyon geçişi
      fish.currentRotationY += rotationDiff * 0.02 * delta; // Çok yavaş rotasyon
      fish.rotation.y = fish.currentRotationY;
      
    } else {
      // Hedefe yakın - çok yumuşakça yavaşla
      fish.velocity.multiplyScalar(0.95);
      
      if (distance < 0.2) {
        fish.currentTarget = this.generateNewTarget(fish.centerPoint);
        fish.targetChangeTimer = 0;
      }
    }

    // Çarpışma kontrolü - çok yumuşak
    const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
    const avoidanceForce = this.checkCollisions(fish, allFish);
    
    if (avoidanceForce.length() > 0) {
      fish.velocity.add(avoidanceForce.multiplyScalar(delta * 0.8)); // Yumuşak kaçınma
    }
    
    // Pozisyonu velocity ile güncelle
    fish.position.add(fish.velocity.clone().multiplyScalar(delta));
    
    // Çok yumuşak yüzme dalgalanması
    const swimPhase = fish.verticalPhase * 0.8; // Daha yavaş
    const verticalFloat = Math.sin(swimPhase) * 0.03 * Math.min(fish.velocity.length(), 0.5); // Daha az hareket
    fish.position.y += verticalFloat * delta;
    
    // Çok yumuşak yüzme animasyonu
    const velocityMagnitude = Math.min(fish.velocity.length(), 0.8);
    fish.rotation.x = Math.sin(swimPhase * 0.8) * 0.015 * velocityMagnitude; // Çok az sallanma
    fish.rotation.z = Math.cos(swimPhase * 0.6) * 0.01 * velocityMagnitude; // Minimal roll
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
      const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
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
    const allFish = [...this.fishInstances, ...this.goldFishInstances, ...this.fish07Instances];
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

  // Artık balıklar sabit alanda (64x64) homojen dağıtıldığı için
  // tekne hareket ettiğinde balık alanını güncellemeye gerek yok
  public updateFishArea(): void {
    // Bu metod backward compatibility için boş bırakıldı
    // Balıklar artık boundary kontrolü ile sabit alanda tutuluyor
  }

  public getFishCount(): number {
    return this.FISH_COUNT;
  }

  public getGoldFishCount(): number {
    return this.GOLD_FISH_COUNT;
  }

  public getFish07Count(): number {
    return this.FISH_07_COUNT;
  }

  public getTotalFishCount(): number {
    return this.FISH_COUNT + this.GOLD_FISH_COUNT + this.FISH_07_COUNT;
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public isGoldFishLoaded(): boolean {
    return this.goldFishLoaded;
  }

  public isFish07Loaded(): boolean {
    return this.fish07Loaded;
  }

  public isFullyLoaded(): boolean {
    return this.loaded && this.goldFishLoaded && this.fish07Loaded;
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.updateMaterialsForDarkMode();
  }

  private getHomogeneousPosition(): THREE.Vector3 {
    // Grid tabanlı homojen dağılım
    const gridX = Math.floor(Math.random() * this.GRID_SIZE);
    const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
    const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
    
    // Grid hücresinin merkezi + rastgele offset
    const x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    const y = this.WATER_DEPTH_MIN + Math.random() * (this.WATER_DEPTH_MAX - this.WATER_DEPTH_MIN);
    const z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    
    return new THREE.Vector3(x, y, z);
  }

  private getHomogeneousGoldFishPosition(): THREE.Vector3 {
    // Grid tabanlı homojen dağılım (altın balık için)
    const gridX = Math.floor(Math.random() * this.GRID_SIZE);
    const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
    const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
    
    const x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    const y = this.GOLD_FISH_DEPTH_MIN + Math.random() * (this.GOLD_FISH_DEPTH_MAX - this.GOLD_FISH_DEPTH_MIN);
    const z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    
    return new THREE.Vector3(x, y, z);
  }

  private getHomogeneousFish07Position(): THREE.Vector3 {
    // Grid tabanlı homojen dağılım (07 balık için)
    const gridX = Math.floor(Math.random() * this.GRID_SIZE);
    const gridZ = Math.floor(Math.random() * this.GRID_SIZE);
    const cellSize = (this.BOUNDARY_SIZE * 2) / this.GRID_SIZE;
    
    const x = -this.BOUNDARY_SIZE + (gridX + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    const y = this.FISH_07_DEPTH_MIN + Math.random() * (this.FISH_07_DEPTH_MAX - this.FISH_07_DEPTH_MIN);
    const z = -this.BOUNDARY_SIZE + (gridZ + 0.5) * cellSize + (Math.random() - 0.5) * cellSize * 0.8;
    
    return new THREE.Vector3(x, y, z);
  }

  private updateMaterialsForDarkMode(): void {
    // Normal balık materyalini güncelle
    if (this.fishMaterial) {
      if (this.fishMaterial instanceof THREE.Material) {
        this.fishMaterial.opacity = this.isDarkMode ? 0.7 : 1.0;
        this.fishMaterial.transparent = this.isDarkMode;
      }
    }

    // Altın balık materyalini güncelle (dark mode'da emissive'i azalt)
    if (this.goldFishMaterial) {
      if (this.goldFishMaterial instanceof THREE.MeshStandardMaterial) {
        if (this.isDarkMode) {
          this.goldFishMaterial.emissive.setHex(0x221100); // Çok hafif altın parıltı
          this.goldFishMaterial.emissiveIntensity = 0.2;
        } else {
          this.goldFishMaterial.emissive.setHex(0x443300); // Normal altın parıltı
          this.goldFishMaterial.emissiveIntensity = 0.4;
        }
      }
    }

    // 07 balık materyalini güncelle (kırmızı balık - dark mode'da parlaklığı azalt)
    if (this.fish07Material) {
      if (this.fish07Material instanceof THREE.MeshStandardMaterial) {
        if (this.isDarkMode) {
          this.fish07Material.emissive.setHex(0x110000); // Çok hafif kırmızı parıltı
          this.fish07Material.emissiveIntensity = 0.1;
          this.fish07Material.opacity = 0.8;
          this.fish07Material.transparent = true;
        } else {
          this.fish07Material.emissive.setHex(0x330000); // Normal kırmızı parıltı
          this.fish07Material.emissiveIntensity = 0.3;
          this.fish07Material.opacity = 1.0;
          this.fish07Material.transparent = false;
        }
      }
    }
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

    // 07 balıkları temizle
    if (this.fish07InstancedMesh) {
      this.scene.remove(this.fish07InstancedMesh);
      this.fish07InstancedMesh = null;
    }

    if (this.fish07Geometry) {
      this.fish07Geometry.dispose();
      this.fish07Geometry = null;
    }

    if (this.fish07Material) {
      if (this.fish07Material instanceof Array) {
        this.fish07Material.forEach(material => material.dispose());
      } else {
        this.fish07Material.dispose();
      }
      this.fish07Material = null;
    }

    this.fishInstances = [];
    this.goldFishInstances = [];
    this.fish07Instances = [];
    this.loaded = false;
    this.goldFishLoaded = false;
    this.fish07Loaded = false;
  }
} 