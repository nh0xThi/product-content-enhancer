// Utility functions for managing app settings (logo, favicon, etc.)

const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
  logo?: string;
  favicon?: string;
  shopName?: string;
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    
    // Update favicon if provided
    if (settings.favicon) {
      updateFavicon(settings.favicon);
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: updated }));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

function updateFavicon(faviconUrl: string): void {
  if (typeof document === 'undefined') return;
  
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach((link) => link.remove());
  
  // Add new favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/x-icon';
  link.href = faviconUrl;
  document.head.appendChild(link);
}
