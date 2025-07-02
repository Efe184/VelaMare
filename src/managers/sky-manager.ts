import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export class SkyManager {
  private sky: Sky;
  private sun: THREE.Vector3;
  private scene: THREE.Scene;
  private isDarkMode = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);
    this.sun = new THREE.Vector3();
    this.setDefaultSky();
  }

  // Gökyüzü parametrelerini ve güneş pozisyonunu ayarla
  public setSky(options?: {
    turbidity?: number;
    rayleigh?: number;
    mieCoefficient?: number;
    mieDirectionalG?: number;
    elevation?: number;
    azimuth?: number;
    exposure?: number;
  }) {
    const {
      turbidity = 10,
      rayleigh = 2,
      mieCoefficient = 0.005,
      mieDirectionalG = 0.8,
      elevation = 2,
      azimuth = 180,
      exposure = 0.7,
    } = options || {};

    this.sky.material.uniforms['turbidity'].value = turbidity;
    this.sky.material.uniforms['rayleigh'].value = rayleigh;
    this.sky.material.uniforms['mieCoefficient'].value = mieCoefficient;
    this.sky.material.uniforms['mieDirectionalG'].value = mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms['sunPosition'].value.copy(this.sun);

    // Exposure sahneye doğrudan uygulanmalı
    if (this.scene.environment && (this.scene.environment as any).isTexture) {
      (this.scene.environment as any).encoding = THREE.sRGBEncoding;
    }
    
    // Exposure değerini kullan (gelecekte renderer'a uygulanabilir)
    console.log(`Sky exposure set to: ${exposure}`);
  }

  private setDefaultSky() {
    this.setSky();
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkMode = isDark;
    this.updateSkyForMode();
  }

  private updateSkyForMode(): void {
    if (this.isDarkMode) {
      // Dark mode: Night sky settings
      this.setSky({
        turbidity: 0.5,
        rayleigh: 0.2,
        mieCoefficient: 0.1,
        mieDirectionalG: 0.8,
        elevation: -10, // Sun below horizon
        azimuth: 180,
        exposure: 0.1,
      });
    } else {
      // Light mode: Day sky settings
      this.setSky({
        turbidity: 10,
        rayleigh: 2,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.8,
        elevation: 2,
        azimuth: 180,
        exposure: 0.7,
      });
    }
  }

  // Güneş pozisyonunu güncelle
  public setSunPosition(elevation: number, azimuth: number) {
    this.setSky({ elevation, azimuth });
  }

  // Animasyon veya dinamik güncellemeler için update fonksiyonu
  public update(_delta: number) {
    // Şimdilik animasyon yok, ileride dinamik efektler eklenebilir
  }

  public dispose() {
    this.scene.remove(this.sky);
    this.sky.geometry.dispose();
    if (this.sky.material) this.sky.material.dispose();
  }
} 