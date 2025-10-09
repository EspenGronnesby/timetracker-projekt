import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ColorTheme = 'light' | 'dark' | 'high-contrast-dark' | 'ocean' | 'forest' | 'sunset';

const RECENT_THEMES_KEY = 'recent_color_themes';

export const useColorTheme = () => {
  const { profile, user } = useAuth();
  const [optimisticTheme, setOptimisticTheme] = useState<ColorTheme | null>(null);
  const [recentThemes, setRecentThemes] = useState<ColorTheme[]>(() => {
    const stored = localStorage.getItem(RECENT_THEMES_KEY);
    return stored ? JSON.parse(stored) : ['light', 'dark'];
  });

  const currentTheme = optimisticTheme || (profile?.color_theme as ColorTheme) || 'light';

  useEffect(() => {
    const applyTheme = (theme: ColorTheme) => {
      const root = document.documentElement;
      
      // Remove all theme classes
      root.classList.remove('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset');
      
      // Apply selected theme
      root.classList.add(theme);
    };

    applyTheme(currentTheme);
  }, [currentTheme]);

  const setColorTheme = async (theme: ColorTheme) => {
    if (!user?.id) return;

    // Apply theme immediately (optimistic update)
    setOptimisticTheme(theme);

    // Update recent themes
    const updatedRecent = [theme, ...recentThemes.filter(t => t !== theme)].slice(0, 2);
    setRecentThemes(updatedRecent);
    localStorage.setItem(RECENT_THEMES_KEY, JSON.stringify(updatedRecent));

    const { error } = await supabase
      .from('profiles')
      .update({ color_theme: theme })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating color theme:', error);
      setOptimisticTheme(null); // Revert on error
      return;
    }

    // Clear optimistic state once DB is updated
    setOptimisticTheme(null);
  };

  return {
    currentTheme,
    setColorTheme,
    recentThemes
  };
};
