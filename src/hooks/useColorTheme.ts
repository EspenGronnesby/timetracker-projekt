import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ColorTheme = 'light' | 'dark' | 'high-contrast-dark' | 'ocean' | 'forest' | 'sunset';

const RECENT_THEMES_KEY = 'recent_color_themes';
const CURRENT_THEME_KEY = 'current_color_theme';

export const useColorTheme = () => {
  const { profile, user } = useAuth();
  const [recentThemes, setRecentThemes] = useState<ColorTheme[]>(() => {
    const stored = localStorage.getItem(RECENT_THEMES_KEY);
    return stored ? JSON.parse(stored) : ['light', 'dark'];
  });

  // Get current theme from localStorage first, fallback to profile
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem(CURRENT_THEME_KEY);
    return (stored as ColorTheme) || 'light';
  });

  // Sync with profile when it loads
  useEffect(() => {
    if (profile?.color_theme) {
      const profileTheme = profile.color_theme as ColorTheme;
      const storedTheme = localStorage.getItem(CURRENT_THEME_KEY);
      
      // Only update if different from stored (to avoid override during save)
      if (!storedTheme || storedTheme !== profileTheme) {
        setCurrentTheme(profileTheme);
        localStorage.setItem(CURRENT_THEME_KEY, profileTheme);
      }
    }
  }, [profile?.color_theme]);

  // Apply theme whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset');
    
    // Apply selected theme
    root.classList.add(currentTheme);
  }, [currentTheme]);

  const setColorTheme = async (theme: ColorTheme) => {
    if (!user?.id) return;

    // Apply theme immediately via localStorage
    setCurrentTheme(theme);
    localStorage.setItem(CURRENT_THEME_KEY, theme);

    // Update recent themes
    const updatedRecent = [theme, ...recentThemes.filter(t => t !== theme)].slice(0, 2);
    setRecentThemes(updatedRecent);
    localStorage.setItem(RECENT_THEMES_KEY, JSON.stringify(updatedRecent));

    // Update database in background
    const { error } = await supabase
      .from('profiles')
      .update({ color_theme: theme })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating color theme:', error);
    }
  };

  return {
    currentTheme,
    setColorTheme,
    recentThemes
  };
};
