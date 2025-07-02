export class DarkModeToggle {
  private button: HTMLButtonElement;
  private isDarkMode = false;
  private callbacks: Array<(isDark: boolean) => void> = [];

  constructor(container: HTMLElement) {
    this.createButton();
    this.setupEventListeners();
    container.appendChild(this.button);
  }

  private createButton(): void {
    this.button = document.createElement('button');
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    `;
    
    this.styleButton();
  }

  private styleButton(): void {
    Object.assign(this.button.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.9)',
      color: '#333',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      zIndex: '1000',
      backdropFilter: 'blur(10px)',
    });

    // Hover effect
    this.button.addEventListener('mouseenter', () => {
      this.button.style.transform = 'scale(1.1)';
      this.button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.transform = 'scale(1)';
      this.button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });
  }

  private setupEventListeners(): void {
    this.button.addEventListener('click', () => {
      this.toggle();
    });
  }

  private toggle(): void {
    this.isDarkMode = !this.isDarkMode;
    this.updateButtonAppearance();
    this.notifyCallbacks();
  }

  private updateButtonAppearance(): void {
    if (this.isDarkMode) {
      // Dark mode: Show moon icon
      this.button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
      Object.assign(this.button.style, {
        background: 'rgba(30, 30, 30, 0.9)',
        color: '#fff',
      });
    } else {
      // Light mode: Show sun icon
      this.button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      `;
      Object.assign(this.button.style, {
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#333',
      });
    }
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.isDarkMode));
  }

  public onToggle(callback: (isDark: boolean) => void): void {
    this.callbacks.push(callback);
  }

  public getDarkMode(): boolean {
    return this.isDarkMode;
  }

  public setDarkMode(isDark: boolean): void {
    if (this.isDarkMode !== isDark) {
      this.isDarkMode = isDark;
      this.updateButtonAppearance();
      this.notifyCallbacks();
    }
  }

  public dispose(): void {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    this.callbacks = [];
  }
} 