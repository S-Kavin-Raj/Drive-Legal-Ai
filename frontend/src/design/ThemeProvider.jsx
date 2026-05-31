import React, { createContext, useContext, useEffect } from 'react'
import { tokens } from './tokens'

const ThemeContext = createContext(tokens)

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement
    
    // Inject CSS variables for colors
    Object.entries(tokens.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-${key}`, value)
      } else {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue)
        })
      }
    })

    // Set body background and text color to match theme
    document.body.style.backgroundColor = tokens.colors.background
    document.body.style.color = tokens.colors.text.primary
    document.body.style.margin = '0'
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif'
    
  }, [])

  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
