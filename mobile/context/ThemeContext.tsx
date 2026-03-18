import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type SemanticColors } from '../constants/theme';

const THEME_STORAGE_KEY = '@drobeo_theme_mode';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
    colors: SemanticColors;
};

export const ThemeContext = createContext<ThemeContextType>({
    isDarkMode: false,
    toggleTheme: () => {},
    colors: LightColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
    const [loaded, setLoaded] = useState(false);

    // Load persisted preference on mount
    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then(stored => {
            if (stored === 'dark') setIsDarkMode(true);
            else if (stored === 'light') setIsDarkMode(false);
            // else keep system default
            setLoaded(true);
        });
    }, []);

    const toggleTheme = useCallback(() => {
        setIsDarkMode(prev => {
            const next = !prev;
            AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
            return next;
        });
    }, []);

    const colors = isDarkMode ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

/** Full theme context (isDarkMode, toggleTheme, colors) */
export const useTheme = () => useContext(ThemeContext);

/** Shorthand — returns just the semantic color palette for the current mode */
export const useThemeColors = (): SemanticColors => useContext(ThemeContext).colors;
