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
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    root.style.setProperty(`--${cssVar}`, value)
  })
}

export function getThemeById(id: string): Theme | undefined {
  return themes.find((t) => t.id === id)
}
