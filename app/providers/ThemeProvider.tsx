'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ColorTheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red'

interface ThemeContextType {
  theme: Theme
  colorTheme: ColorTheme
  setTheme: (theme: Theme) => void
  setColorTheme: (color: ColorTheme) => void
  effectiveTheme: 'light' | 'dark' // The actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('blue')
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null
      const savedColorTheme = localStorage.getItem('colorTheme') as ColorTheme | null

      if (savedTheme) setThemeState(savedTheme)
      if (savedColorTheme) setColorThemeState(savedColorTheme)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement

    // Remove all theme classes first
    root.classList.remove('light', 'dark')
    root.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-orange', 'theme-pink', 'theme-red')

    // Determine effective theme
    let appliedTheme: 'light' | 'dark' = 'light'

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      appliedTheme = systemPrefersDark ? 'dark' : 'light'
    } else {
      appliedTheme = theme as 'light' | 'dark'
    }

    // Apply theme classes
    root.classList.add(appliedTheme)
    root.classList.add(`theme-${colorTheme}`)

    setEffectiveTheme(appliedTheme)

    // Save to localStorage
    localStorage.setItem('theme', theme)
    localStorage.setItem('colorTheme', colorTheme)
  }, [theme, colorTheme])

  // Listen to system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light')
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, setTheme, setColorTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
