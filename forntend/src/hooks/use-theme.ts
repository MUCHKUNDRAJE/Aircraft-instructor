"use client"
import { useState, useEffect, useCallback } from "react"

export type Theme = "dark" | "light"

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>("dark")

  // On mount: read saved pref or system pref
  useEffect(() => {
    const saved = localStorage.getItem("aero-theme") as Theme | null
    if (saved === "light" || saved === "dark") {
      applyTheme(saved)
      setTheme(saved)
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const initial: Theme = prefersDark ? "dark" : "light"
      applyTheme(initial)
      setTheme(initial)
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      applyTheme(next)
      localStorage.setItem("aero-theme", next)
      return next
    })
  }, [])

  return [theme, toggle]
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
    root.style.colorScheme = "dark"
  } else {
    root.classList.remove("dark")
    root.style.colorScheme = "light"
  }
}
