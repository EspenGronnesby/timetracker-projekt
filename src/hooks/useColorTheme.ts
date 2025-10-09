import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ColorTheme = 'light' | 'dark' | 'high-contrast-dark' | 'ocean' | 'forest' | 'sunset';

export const useColorTheme = () => {
  const { profile, user } = useAuth();

  useEffect(() => {
    const applyTheme = (theme: ColorTheme) => {
      const root = document.documentElement;
      
      // Remove all theme classes
      root.classList.remove('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset');
      
      // Apply selected theme
      root.classList.add(theme);
    };

    if (profile?.color_theme) {
      applyTheme(profile.color_theme as ColorTheme);
    }
  }, [profile?.color_theme]);

  const setColorTheme = async (theme: ColorTheme) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ color_theme: theme })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating color theme:', error);
      return;
    }

    // Apply theme immediately
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset');
    root.classList.add(theme);
  };

  return {
    currentTheme: (profile?.color_theme as ColorTheme) || 'light',
    setColorTheme
  };
};
