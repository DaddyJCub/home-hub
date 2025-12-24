export interface Theme {
  id: string
  name: string
  description: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
  darkColors?: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
}

export const themes: Theme[] = [
  {
    id: 'warm-home',
    name: 'Warm Home',
    description: 'Cozy terracotta and sage (default)',
    colors: {
      background: 'oklch(0.95 0.02 85)',
      foreground: 'oklch(0.25 0.02 35)',
      card: 'oklch(0.98 0.01 85)',
      cardForeground: 'oklch(0.25 0.02 35)',
      popover: 'oklch(0.98 0.01 85)',
      popoverForeground: 'oklch(0.25 0.02 35)',
      primary: 'oklch(0.62 0.15 35)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.75 0.08 145)',
      secondaryForeground: 'oklch(0.25 0.02 35)',
      muted: 'oklch(0.92 0.02 85)',
      mutedForeground: 'oklch(0.5 0.02 35)',
      accent: 'oklch(0.68 0.18 45)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.88 0.02 85)',
      input: 'oklch(0.88 0.02 85)',
      ring: 'oklch(0.68 0.18 45)',
    },
    darkColors: {
      background: 'oklch(0.18 0.02 35)',
      foreground: 'oklch(0.95 0.01 85)',
      card: 'oklch(0.22 0.02 35)',
      cardForeground: 'oklch(0.95 0.01 85)',
      popover: 'oklch(0.22 0.02 35)',
      popoverForeground: 'oklch(0.95 0.01 85)',
      primary: 'oklch(0.70 0.18 40)',
      primaryForeground: 'oklch(0.15 0.02 35)',
      secondary: 'oklch(0.45 0.08 145)',
      secondaryForeground: 'oklch(0.95 0.01 85)',
      muted: 'oklch(0.28 0.02 35)',
      mutedForeground: 'oklch(0.65 0.02 85)',
      accent: 'oklch(0.72 0.20 45)',
      accentForeground: 'oklch(0.15 0.02 35)',
      destructive: 'oklch(0.65 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.35 0.02 35)',
      input: 'oklch(0.35 0.02 35)',
      ring: 'oklch(0.72 0.20 45)',
    },
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Cool blues and aqua tones',
    colors: {
      background: 'oklch(0.96 0.01 220)',
      foreground: 'oklch(0.20 0.02 240)',
      card: 'oklch(0.98 0.005 220)',
      cardForeground: 'oklch(0.20 0.02 240)',
      popover: 'oklch(0.98 0.005 220)',
      popoverForeground: 'oklch(0.20 0.02 240)',
      primary: 'oklch(0.55 0.14 240)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.72 0.10 200)',
      secondaryForeground: 'oklch(0.20 0.02 240)',
      muted: 'oklch(0.93 0.01 220)',
      mutedForeground: 'oklch(0.48 0.02 240)',
      accent: 'oklch(0.65 0.16 200)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.88 0.01 220)',
      input: 'oklch(0.88 0.01 220)',
      ring: 'oklch(0.65 0.16 200)',
    },
    darkColors: {
      background: 'oklch(0.16 0.02 240)',
      foreground: 'oklch(0.94 0.01 220)',
      card: 'oklch(0.20 0.02 240)',
      cardForeground: 'oklch(0.94 0.01 220)',
      popover: 'oklch(0.20 0.02 240)',
      popoverForeground: 'oklch(0.94 0.01 220)',
      primary: 'oklch(0.65 0.18 220)',
      primaryForeground: 'oklch(0.12 0.02 240)',
      secondary: 'oklch(0.45 0.12 200)',
      secondaryForeground: 'oklch(0.94 0.01 220)',
      muted: 'oklch(0.26 0.02 240)',
      mutedForeground: 'oklch(0.62 0.02 220)',
      accent: 'oklch(0.68 0.20 200)',
      accentForeground: 'oklch(0.12 0.02 240)',
      destructive: 'oklch(0.65 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.32 0.02 240)',
      input: 'oklch(0.32 0.02 240)',
      ring: 'oklch(0.68 0.20 200)',
    },
  },
  {
    id: 'forest-calm',
    name: 'Forest Calm',
    description: 'Deep greens and earth tones',
    colors: {
      background: 'oklch(0.94 0.02 150)',
      foreground: 'oklch(0.22 0.03 140)',
      card: 'oklch(0.97 0.01 150)',
      cardForeground: 'oklch(0.22 0.03 140)',
      popover: 'oklch(0.97 0.01 150)',
      popoverForeground: 'oklch(0.22 0.03 140)',
      primary: 'oklch(0.50 0.12 155)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.70 0.08 130)',
      secondaryForeground: 'oklch(0.22 0.03 140)',
      muted: 'oklch(0.90 0.02 150)',
      mutedForeground: 'oklch(0.48 0.03 140)',
      accent: 'oklch(0.60 0.15 165)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.86 0.02 150)',
      input: 'oklch(0.86 0.02 150)',
      ring: 'oklch(0.60 0.15 165)',
    },
    darkColors: {
      background: 'oklch(0.17 0.03 140)',
      foreground: 'oklch(0.93 0.02 150)',
      card: 'oklch(0.21 0.03 140)',
      cardForeground: 'oklch(0.93 0.02 150)',
      popover: 'oklch(0.21 0.03 140)',
      popoverForeground: 'oklch(0.93 0.02 150)',
      primary: 'oklch(0.62 0.16 155)',
      primaryForeground: 'oklch(0.12 0.03 140)',
      secondary: 'oklch(0.48 0.10 130)',
      secondaryForeground: 'oklch(0.93 0.02 150)',
      muted: 'oklch(0.27 0.03 140)',
      mutedForeground: 'oklch(0.64 0.03 150)',
      accent: 'oklch(0.66 0.18 165)',
      accentForeground: 'oklch(0.12 0.03 140)',
      destructive: 'oklch(0.65 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.33 0.03 140)',
      input: 'oklch(0.33 0.03 140)',
      ring: 'oklch(0.66 0.18 165)',
    },
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    description: 'Warm oranges and purples',
    colors: {
      background: 'oklch(0.96 0.02 60)',
      foreground: 'oklch(0.24 0.02 30)',
      card: 'oklch(0.98 0.01 60)',
      cardForeground: 'oklch(0.24 0.02 30)',
      popover: 'oklch(0.98 0.01 60)',
      popoverForeground: 'oklch(0.24 0.02 30)',
      primary: 'oklch(0.58 0.20 30)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.68 0.12 300)',
      secondaryForeground: 'oklch(0.98 0 0)',
      muted: 'oklch(0.92 0.02 60)',
      mutedForeground: 'oklch(0.48 0.02 30)',
      accent: 'oklch(0.64 0.24 40)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.88 0.02 60)',
      input: 'oklch(0.88 0.02 60)',
      ring: 'oklch(0.64 0.24 40)',
    },
    darkColors: {
      background: 'oklch(0.18 0.02 30)',
      foreground: 'oklch(0.94 0.02 60)',
      card: 'oklch(0.22 0.02 30)',
      cardForeground: 'oklch(0.94 0.02 60)',
      popover: 'oklch(0.22 0.02 30)',
      popoverForeground: 'oklch(0.94 0.02 60)',
      primary: 'oklch(0.68 0.24 35)',
      primaryForeground: 'oklch(0.14 0.02 30)',
      secondary: 'oklch(0.55 0.16 300)',
      secondaryForeground: 'oklch(0.98 0 0)',
      muted: 'oklch(0.28 0.02 30)',
      mutedForeground: 'oklch(0.64 0.02 60)',
      accent: 'oklch(0.70 0.28 40)',
      accentForeground: 'oklch(0.14 0.02 30)',
      destructive: 'oklch(0.65 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.34 0.02 30)',
      input: 'oklch(0.34 0.02 30)',
      ring: 'oklch(0.70 0.28 40)',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Clean black and white',
    colors: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.20 0 0)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.92 0 0)',
      secondaryForeground: 'oklch(0.20 0 0)',
      muted: 'oklch(0.94 0 0)',
      mutedForeground: 'oklch(0.50 0 0)',
      accent: 'oklch(0.35 0 0)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.90 0 0)',
      input: 'oklch(0.90 0 0)',
      ring: 'oklch(0.35 0 0)',
    },
    darkColors: {
      background: 'oklch(0.10 0 0)',
      foreground: 'oklch(0.98 0 0)',
      card: 'oklch(0.15 0 0)',
      cardForeground: 'oklch(0.98 0 0)',
      popover: 'oklch(0.15 0 0)',
      popoverForeground: 'oklch(0.98 0 0)',
      primary: 'oklch(0.92 0.05 120)',
      primaryForeground: 'oklch(0.08 0 0)',
      secondary: 'oklch(0.25 0 0)',
      secondaryForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.20 0 0)',
      mutedForeground: 'oklch(0.70 0 0)',
      accent: 'oklch(0.85 0.08 80)',
      accentForeground: 'oklch(0.08 0 0)',
      destructive: 'oklch(0.70 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.30 0 0)',
      input: 'oklch(0.28 0 0)',
      ring: 'oklch(0.85 0.08 80)',
    },
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    description: 'Soft purples and pinks',
    colors: {
      background: 'oklch(0.96 0.02 310)',
      foreground: 'oklch(0.24 0.03 300)',
      card: 'oklch(0.98 0.01 310)',
      cardForeground: 'oklch(0.24 0.03 300)',
      popover: 'oklch(0.98 0.01 310)',
      popoverForeground: 'oklch(0.24 0.03 300)',
      primary: 'oklch(0.62 0.18 300)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.75 0.10 330)',
      secondaryForeground: 'oklch(0.24 0.03 300)',
      muted: 'oklch(0.92 0.02 310)',
      mutedForeground: 'oklch(0.50 0.03 300)',
      accent: 'oklch(0.70 0.20 320)',
      accentForeground: 'oklch(0.98 0 0)',
      destructive: 'oklch(0.577 0.245 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.88 0.02 310)',
      input: 'oklch(0.88 0.02 310)',
      ring: 'oklch(0.70 0.20 320)',
    },
    darkColors: {
      background: 'oklch(0.16 0.03 300)',
      foreground: 'oklch(0.94 0.02 310)',
      card: 'oklch(0.20 0.03 300)',
      cardForeground: 'oklch(0.94 0.02 310)',
      popover: 'oklch(0.20 0.03 300)',
      popoverForeground: 'oklch(0.94 0.02 310)',
      primary: 'oklch(0.70 0.22 310)',
      primaryForeground: 'oklch(0.12 0.03 300)',
      secondary: 'oklch(0.50 0.14 330)',
      secondaryForeground: 'oklch(0.94 0.02 310)',
      muted: 'oklch(0.26 0.03 300)',
      mutedForeground: 'oklch(0.66 0.03 310)',
      accent: 'oklch(0.74 0.24 320)',
      accentForeground: 'oklch(0.12 0.03 300)',
      destructive: 'oklch(0.65 0.25 27.325)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.32 0.03 300)',
      input: 'oklch(0.32 0.03 300)',
      ring: 'oklch(0.74 0.24 320)',
    },
  },
]

export function applyTheme(theme: Theme, isDark: boolean = false) {
  const root = document.documentElement
  const colors = isDark && theme.darkColors ? theme.darkColors : theme.colors
  
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    root.style.setProperty(`--${cssVar}`, value)
  })
}

export function getThemeById(id: string): Theme | undefined {
  return themes.find((t) => t.id === id)
}
