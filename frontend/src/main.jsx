import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { BrowserRouter } from 'react-router-dom'

const keyInStorage = localStorage.getItem('VITE_ORS_API_KEY')

if (!import.meta.env.VITE_ORS_API_KEY && keyInStorage) {
  import.meta.env.VITE_ORS_API_KEY = keyInStorage
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  </StrictMode>,
)
