import type { Variants, Transition } from 'framer-motion'

// ── Shared transitions ──────────────────────────────────────────────────────

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
}

// ── Fade in ─────────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// ── Slide up (good for page/section enters) ─────────────────────────────────

export const slideUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

// ── Scale in (good for cards/modals popping in) ─────────────────────────────

export const scaleIn: Variants = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.96, opacity: 0 },
}

// ── List item stagger ───────────────────────────────────────────────────────

export const listContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
}

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

// ── Checkmark (satisfying spring for check-off) ─────────────────────────────

export const checkmark: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },
}

// ── Collapsible height animation ────────────────────────────────────────────

export const collapsible: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'visible',
    transition: { duration: 0.25, ease: 'easeInOut' },
  },
}

// ── Chevron rotation ────────────────────────────────────────────────────────

export const chevronRotate: Variants = {
  collapsed: { rotate: 0, transition: { duration: 0.2 } },
  expanded: { rotate: 180, transition: { duration: 0.2 } },
}
