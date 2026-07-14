// ----------------------------------------------------------------------
// NOTE: Trimmed down from the source project's animate/index.ts, which
// also re-exports back-to-top, animate-text, animate-logo, animate-avatar,
// animate-border, motion-viewport, scroll-progress, animate-count-up, and
// the full variants barrel (fade/zoom/flip/slide/scale/bounce/rotate/
// actions/transition/background). Only `MotionContainer` (used by
// sections that render a hero inside a MotionContainer) and `MotionLazy`
// are actually needed by the ported marketing pages. Add more exports
// here (and copy the corresponding source file) if a future page needs
// them.
// ----------------------------------------------------------------------

export * from './motion-lazy';

export * from './motion-container';
