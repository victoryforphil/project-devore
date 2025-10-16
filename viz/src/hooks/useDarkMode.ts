import { useEffect } from 'react'

/**
 * Hook to manage dark mode using system preference
 * Stores preference in localStorage
 */
export function useDarkMode() {
  useEffect(() => {
    // Check for stored preference or system preference
    const stored = localStorage.getItem('theme-mode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const isDark = stored === 'dark' || (!stored && prefersDark)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])
}

/**
 * Get current theme and toggle function
 */
export function useTheme() {
  const isDark = document.documentElement.classList.contains('dark')

  const toggleTheme = () => {
    const newIsDark = !isDark
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme-mode', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme-mode', 'light')
    }
    // Trigger re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark: newIsDark } }))
  }

  return { isDark, toggleTheme }
}
