import React from 'react'
import tokens from './tokens'
import './mobile.css'

const ThemeContext = React.createContext({ tokens })

export function useMobileTheme() {
  return React.useContext(ThemeContext)
}

export default function MobileThemeProvider({ children }) {
  return (
    <ThemeContext.Provider value={{ tokens }}>
      {children}
    </ThemeContext.Provider>
  )
}
