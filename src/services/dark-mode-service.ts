export class DarkModeService {
  private isDarkMode = false;
  private callbacks: Array<(isDark: boolean) => void> = [];

  constructor() {
    this.loadSavedState();
  }

  private loadSavedState(): void {
    const saved = localStorage.getItem('velaMare_darkMode');
    if (saved !== null) {
      this.isDarkMode = JSON.parse(saved);
    }
  }

  private saveState(): void {
    localStorage.setItem('velaMare_darkMode', JSON.stringify(this.isDarkMode));
  }

  public toggle(): void {
    this.setDarkMode(!this.isDarkMode);
  }

  public setDarkMode(isDark: boolean): void {
    if (this.isDarkMode !== isDark) {
      this.isDarkMode = isDark;
      this.saveState();
      this.notifyCallbacks();
    }
  }

  public isDark(): boolean {
    return this.isDarkMode;
  }

  public onModeChange(callback: (isDark: boolean) => void): void {
    this.callbacks.push(callback);
    // Immediately call with current state
    callback(this.isDarkMode);
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.isDarkMode));
  }

  public dispose(): void {
    this.callbacks = [];
  }
} 