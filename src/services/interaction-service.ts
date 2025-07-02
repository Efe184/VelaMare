import * as THREE from 'three';

export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export class InteractionService {
  private controlState: ControlState;
  private keyMap: Map<string, keyof ControlState>;
  private isEnabled = true;

  // Movement settings
  private readonly MOVE_SPEED = 8.0;
  private readonly ROTATION_SPEED = 3.0;

  constructor() {
    this.controlState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    // Key mapping for both WASD and arrow keys
    this.keyMap = new Map([
      // WASD controls
      ['KeyW', 'forward'],
      ['KeyS', 'backward'],
      ['KeyA', 'left'],
      ['KeyD', 'right'],
      // Arrow key controls
      ['ArrowUp', 'forward'],
      ['ArrowDown', 'backward'],
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
    ]);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Prevent default browser behavior for arrow keys and WASD
    document.addEventListener('keydown', (event) => {
      if (this.keyMap.has(event.code)) {
        event.preventDefault();
      }
    });

    // Handle focus loss
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const control = this.keyMap.get(event.code);
    if (control) {
      this.controlState[control] = true;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const control = this.keyMap.get(event.code);
    if (control) {
      this.controlState[control] = false;
    }
  }

  private handleWindowBlur(): void {
    // Reset all controls when window loses focus
    this.controlState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };
  }

  public getMovementVector(): THREE.Vector3 {
    const movement = new THREE.Vector3(0, 0, 0);

    // Forward/backward movement (Z axis - local space)
    if (this.controlState.forward) {
      movement.z -= 1; // Forward (teknenin önü)
    }
    if (this.controlState.backward) {
      movement.z += 1; // Backward (teknenin arkası)
    }

    // Left/right movement (X axis - local space)
    if (this.controlState.left) {
      movement.x -= 1; // Sol
    }
    if (this.controlState.right) {
      movement.x += 1; // Sağ
    }

    // Normalize diagonal movement
    if (movement.length() > 0) {
      movement.normalize();
    }

    return movement;
  }

  public getRotationSpeed(): number {
    let rotation = 0;

    // Rotation controls (can be separate from movement)
    // For now, using left/right for rotation when moving
    if (this.controlState.left && (this.controlState.forward || this.controlState.backward)) {
      rotation = this.ROTATION_SPEED;
    }
    if (this.controlState.right && (this.controlState.forward || this.controlState.backward)) {
      rotation = -this.ROTATION_SPEED;
    }

    return rotation;
  }

  public getControlState(): ControlState {
    return { ...this.controlState };
  }

  public isAnyControlActive(): boolean {
    return Object.values(this.controlState).some(state => state);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      // Reset controls when disabled
      this.controlState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
      };
    }
  }

  public setMoveSpeed(speed: number): void {
    // Allow runtime speed adjustment
    (this as any).MOVE_SPEED = speed;
  }

  public setRotationSpeed(speed: number): void {
    // Allow runtime rotation speed adjustment
    (this as any).ROTATION_SPEED = speed;
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('blur', this.handleWindowBlur.bind(this));
  }
} 