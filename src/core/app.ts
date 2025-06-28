import { MainScene } from './main-scene';

export class App {
  private mainScene: MainScene | null = null;
  private container: HTMLElement | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.setupContainer();
    this.setupErrorHandling();
  }

  private setupContainer(): void {
    this.container = document.getElementById('app');
    if (!this.container) {
      throw new Error('Container element with id "app" not found');
    }
  }

  private setupErrorHandling(): void {
    window.addEventListener('error', (event) => {
      console.error('Application error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  public start(): void {
    if (!this.container) {
      throw new Error('Container not initialized');
    }

    try {
      this.mainScene = new MainScene(this.container);
      this.mainScene.start();
      console.log('VelaMare application started successfully');
    } catch (error) {
      console.error('Failed to start VelaMare application:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.mainScene) {
      this.mainScene.stop();
    }
  }

  public dispose(): void {
    if (this.mainScene) {
      this.mainScene.dispose();
      this.mainScene = null;
    }
  }

  public getMainScene(): MainScene | null {
    return this.mainScene;
  }
} 