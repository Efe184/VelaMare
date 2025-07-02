import * as THREE from 'three';

export class CelestialService {
  private scene: THREE.Scene;
  private moonGroup: THREE.Group;
  private starField: THREE.Points | null = null;
  private moonLight: THREE.DirectionalLight | null = null;
  private isDarkMode = false;
  private time = 0;
  private loader: THREE.TextureLoader;

  // Moon properties
  private moonMesh: THREE.Mesh | null = null;
  private readonly MOON_DISTANCE = 25;
  private readonly MOON_SIZE = 0.8;
  private readonly MOON_ROTATION_SPEED = 0.002;

  // Star properties
  private readonly STAR_COUNT = 2000;
  private readonly STAR_RADIUS_MIN = 30;
  private readonly STAR_RADIUS_MAX = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new THREE.TextureLoader();
    this.moonGroup = new THREE.Group();
    this.scene.add(this.moonGroup);
    
    this.createMoon();
    this.createMoonLight();
    this.createStarField();
    this.setVisible(false); // Initially hidden
  }

  private createMoon(): void {
    // Create moon geometry
    const geometry = new THREE.IcosahedronGeometry(1, 12);
    
    // Create moon material with textures
    const moonMaterial = new THREE.MeshStandardMaterial({
      map: this.loader.load('assets/06_moonmap4k.jpg'),
      bumpMap: this.loader.load('assets/07_moonbump4k.jpg'),
      bumpScale: 2,
    });

    this.moonMesh = new THREE.Mesh(geometry, moonMaterial);
    // Ay sabit pozisyonda duracak - gökyüzünün sağ üst kısmında
    this.moonMesh.position.set(15, 12, -10);
    this.moonMesh.scale.setScalar(this.MOON_SIZE);
    // Ayı düz hale getir (yamukluğu düzelt)
    this.moonMesh.rotation.set(0, 0, 0);
    this.moonGroup.add(this.moonMesh);
  }

  private createMoonLight(): void {
    // Ay ışığı - tekneyi aydınlatmak için
    this.moonLight = new THREE.DirectionalLight(0x9bb5ff, 0.4); // Mavi-beyaz ay ışığı
    this.moonLight.position.set(15, 12, -10); // Ayın pozisyonu ile aynı
    this.moonLight.target.position.set(0, 0, 0); // Sahne merkezine bak
    this.moonLight.castShadow = false; // Performans için shadow yok
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);
  }

  private createStarField(): void {
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < this.STAR_COUNT; i++) {
      const star = this.generateRandomSpherePoint();
      positions.push(star.pos.x, star.pos.y, star.pos.z);
      colors.push(star.color.r, star.color.g, star.color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      map: this.loader.load('assets/stars/circle.png'),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private generateRandomSpherePoint(): { pos: THREE.Vector3; color: THREE.Color } {
    const radius = Math.random() * (this.STAR_RADIUS_MAX - this.STAR_RADIUS_MIN) + this.STAR_RADIUS_MIN;
    const u = Math.random();
    const v = Math.random() * 0.5; // Sadece üst yarım küre için (0-0.5 aralığı)
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(radius * Math.cos(phi)) + 8; // Y pozitif olacak ve su seviyesinden daha yukarıda
    const z = radius * Math.sin(phi) * Math.sin(theta);

    // Create star color with slight variation
    const hue = 0.6 + Math.random() * 0.2; // Blue to white stars
    const saturation = 0.1 + Math.random() * 0.3;
    const lightness = 0.8 + Math.random() * 0.2;
    
    const color = new THREE.Color().setHSL(hue, saturation, lightness);

    return {
      pos: new THREE.Vector3(x, y, z),
      color: color
    };
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.setVisible(isDark);
  }

  private setVisible(visible: boolean): void {
    this.moonGroup.visible = visible;
    if (this.starField) {
      this.starField.visible = visible;
    }
    if (this.moonLight) {
      this.moonLight.visible = visible;
    }
  }

  public update(delta: number): void {
    if (!this.isDarkMode) return;

    this.time += delta;

    // Sadece ayın kendi etrafında dönmesini sağla (pozisyon sabit)
    if (this.moonMesh) {
      this.moonMesh.rotation.y += this.MOON_ROTATION_SPEED;
    }

    // Yıldızları çok yavaş döndür (isteğe bağlı - kaldırabilir)
    if (this.starField) {
      this.starField.rotation.y -= 0.0001; // Daha yavaş
    }
  }



  public dispose(): void {
    this.scene.remove(this.moonGroup);
    
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      if (this.starField.material instanceof THREE.Material) {
        this.starField.material.dispose();
      }
      this.starField = null;
    }

    if (this.moonLight) {
      this.scene.remove(this.moonLight);
      this.scene.remove(this.moonLight.target);
      this.moonLight = null;
    }

    // Dispose moon resources
    this.moonGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
} 