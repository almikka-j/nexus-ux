'use client';

// ----------------------------------------------------------------------
// NOTE: Simplified from the source project's motion-lazy.tsx. The
// original lazily loads a framer-motion feature bundle from
// `./features` (an animation variants module not ported to this
// project). Since nothing in the marketing site currently needs
// LazyMotion's reduced bundle-size trick, this is a plain pass-through
// wrapper that preserves the same component signature so callers don't
// need to change.
// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function MotionLazy({ children }: Props) {
  return <>{children}</>;
}
