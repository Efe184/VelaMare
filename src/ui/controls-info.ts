export class ControlsInfo {
  private infoElement: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.createInfoElement();
    container.appendChild(this.infoElement);
    this.setupAutoHide();
  }

  private createInfoElement(): void {
    this.infoElement = document.createElement('div');
    this.infoElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      ">
        <div style="font-weight: bold; color: #fff; margin-bottom: 4px;">⌨️ Tekne Kontrolü</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-family: monospace;">W</span>
          <span style="color: #ccc;">veya</span>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">↑</span>
          <span style="color: #ccc;">İleri</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-family: monospace;">S</span>
          <span style="color: #ccc;">veya</span>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">↓</span>
          <span style="color: #ccc;">Geri</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px; font-family: monospace;">A D</span>
          <span style="color: #ccc;">veya</span>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">← →</span>
          <span style="color: #ccc;">Sağ/Sol</span>
        </div>
      </div>
    `;
    
    this.styleInfoElement();
  }

  private styleInfoElement(): void {
    Object.assign(this.infoElement.style, {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      zIndex: '1000',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      transition: 'opacity 0.3s ease',
      maxWidth: '300px',
    });
  }

  private setupAutoHide(): void {
    // Show for 8 seconds, then fade out
    setTimeout(() => {
      this.infoElement.style.opacity = '0.6';
    }, 8000);

    // Hide after 15 seconds
    setTimeout(() => {
      this.infoElement.style.opacity = '0.2';
    }, 15000);

    // Show on mouse over
    this.infoElement.addEventListener('mouseenter', () => {
      this.infoElement.style.opacity = '1';
    });

    this.infoElement.addEventListener('mouseleave', () => {
      this.infoElement.style.opacity = '0.6';
    });
  }

  public show(): void {
    this.infoElement.style.opacity = '1';
  }

  public hide(): void {
    this.infoElement.style.opacity = '0';
  }

  public dispose(): void {
    if (this.infoElement && this.infoElement.parentNode) {
      this.infoElement.parentNode.removeChild(this.infoElement);
    }
  }
} 