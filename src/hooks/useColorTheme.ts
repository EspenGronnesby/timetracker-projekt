import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserStorage } from './useUserStorage';

export type ColorTheme = 'light' | 'dark' | 'high-contrast-dark' | 'ocean' | 'forest' | 'sunset';

export const useColorTheme = () => {
  const { profile, user } = useAuth();

  // Bruker-prefikset localStorage så temavalg ikke lekker mellom kontoer
  // på samme enhet. Gamle uprefikset keys (current_color_theme,
  // recent_color_themes) migreres automatisk første gang en bruker er
  // kjent — se useUserStorage.ts.
  const [currentTheme, setCurrentTheme] = useUserStorage<ColorTheme>('color_theme', 'light');
  const [recentThemes, setRecentThemes] = useUserStorage<ColorTheme[]>(
    'recent_color_themes',
    ['light', 'dark']
  );

  // Sync fra profile hvis den endres server-side (f.eks. etter login)
  useEffect(() => {
    if (profile?.color_theme) {
      const profileTheme = profile.color_theme as ColorTheme;
      if (currentTheme !== profileTheme) {
        setCurrentTheme(profileTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.color_theme]);

  // Bruk tema på <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'high-contrast-dark', 'ocean', 'forest', 'sunset');
    root.classList.add(currentTheme);
  }, [currentTheme]);

  const setColorTheme = async (theme: ColorTheme) => {
    if (!user?.id) return;

    // Oppdater umiddelbart
    setCurrentTheme(theme);
    setRecentThemes((prev) => [theme, ...prev.filter((t) => t !== theme)].slice(0, 2));

    // Skriv til DB i bakgrunnen
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
    recentThemes,
  };
};
