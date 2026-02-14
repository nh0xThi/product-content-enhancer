'use client';

import { useEffect } from 'react';
import { getSettings } from '@/lib/settings';

export default function FaviconUpdater() {
  useEffect(() => {
    // Update favicon on mount and when settings change
    const settings = getSettings();
    if (settings.favicon && typeof document !== 'undefined') {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      existingLinks.forEach((link) => link.remove());
      
      // Add new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/x-icon';
      link.href = settings.favicon;
      document.head.appendChild(link);
    }
  }, []);

  return null;
}
