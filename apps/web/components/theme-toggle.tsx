'use client';

import { useEffect, useState } from 'react';
import { IconoLuna, IconoSol } from '@/components/ui';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  // Inicializar estado desde HTML (que ya fue parseado por el script del layout) o el media query
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark' || currentTheme === 'light') {
      setTheme(currentTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  if (!theme) return <div style={{ width: 34, height: 34 }} />; // placeholder para evitar saltos

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('acalud-tema', newTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <div className={`theme-toggle__icon ${isDark ? 'theme-toggle__icon--dark' : 'theme-toggle__icon--light'}`}>
        {isDark ? <IconoLuna size={22} /> : <IconoSol size={22} />}
      </div>
    </button>
  );
}
