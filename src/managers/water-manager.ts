import * as THREE from 'three';

export class WaterManager {
  private waterMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private waterMaterial: THREE.ShaderMaterial;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createWaterSurface();
  }

  private createWaterSurface(): void {
    // Su yüzeyi için büyük bir düzlem oluştur
    const geometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
    
    // Basit su shader'ı oluştur
    this.waterMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Dalga efekti
          pos.z += sin(pos.x * 0.01 + time) * 2.0;
          pos.z += sin(pos.y * 0.01 + time * 0.7) * 1.5;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        
        void main() {
          vec3 color = vec3(0.1, 0.5, 0.8);
          
          // Su dalgalarına göre renk değişimi
          float wave = sin(vUv.x * 20.0 + time) * sin(vUv.y * 20.0 + time * 0.5);
          color += wave * 0.1;
          
          gl_FragColor = vec4(color, 0.8);
        }
      `,
      uniforms: {
        time: { value: 0.0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.waterMesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = 0;
    this.scene.add(this.waterMesh);
  }

  // Su animasyonunu güncelle
  public update(delta: number): void {
    this.time += delta;
    if (this.waterMaterial && this.waterMaterial.uniforms) {
      this.waterMaterial.uniforms.time.value = this.time;
    }
  }

  public getWater(): THREE.Mesh {
    return this.waterMesh;
  }

  public dispose(): void {
    this.scene.remove(this.waterMesh);
    this.waterMesh.geometry.dispose();
    this.waterMaterial.dispose();
  }
} 