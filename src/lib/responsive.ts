export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MIN: 768,
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024,
} as const

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export function getDeviceType(width: number): DeviceType {
  if (width <= BREAKPOINTS.MOBILE_MAX) return 'mobile'
  if (width >= BREAKPOINTS.TABLET_MIN && width <= BREAKPOINTS.TABLET_MAX) return 'tablet'
  return 'desktop'
}

export function getResponsiveColumns(deviceType: DeviceType, columnConfig: {
  mobile: number
  tablet: number
  desktop: number
}): number {
  switch (deviceType) {
    case 'mobile':
      return columnConfig.mobile
    case 'tablet':
      return columnConfig.tablet
    case 'desktop':
      return columnConfig.desktop
  }
}
