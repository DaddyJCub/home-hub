import { useEffect, useState } from "react"

const TABLET_MIN_BREAKPOINT = 768
const TABLET_MAX_BREAKPOINT = 1024

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth
      return width >= TABLET_MIN_BREAKPOINT && width < TABLET_MAX_BREAKPOINT
    }

    const mql = window.matchMedia(`(min-width: ${TABLET_MIN_BREAKPOINT}px) and (max-width: ${TABLET_MAX_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsTablet(checkIsTablet())
    }
    mql.addEventListener("change", onChange)
    setIsTablet(checkIsTablet())
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isTablet
}
