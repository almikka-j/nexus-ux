'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { TONE_COLORS, type SemanticTone } from 'src/components/admin-ui';

// ----------------------------------------------------------------------
// Sticky jump-nav for the Requirement Checklist's three cards — mirrors
// the app's left sidebar for quickly locating which section still has
// outstanding items, since the page can run long with Appraisal's
// per-property groups. Sticky-on-md follows the same recipe as
// ApplicationDetailsCard's sticky column in initial-credit-checking-view.
//
// Compact-list redesign: a left accent rail replaces the earlier
// conic-gradient ring per row (lighter at a glance across many sections),
// the overall percentage moves into the header instead of a separate
// bottom-card readout, and the whole thing gains a "stuck" shadow —
// driven by a scroll listener rather than a container-query trick, since
// the sticky ancestor's scroll container is the window itself here — so
// it visually lifts off the page only once it's actually pinned under
// the top nav.
// ----------------------------------------------------------------------

export type ChecklistSectionNavItem = {
  key: string;
  label: string;
  icon: string;
  received: number;
  total: number;
  collapsed: boolean;
};

function statusTone(received: number, total: number): SemanticTone {
  if (total === 0) return 'neutral';
  if (received >= total) return 'success';
  return 'warning';
}

function statusLabel(received: number, total: number) {
  if (total === 0) return 'N/A';
  if (received >= total) return 'Complete';
  return `${total - received} to do`;
}

// Sticky headers have no natural "scrolled past" signal to key off of on
// their own — this just watches window scroll and flags once we're past
// the point the nav would have hit its sticky offset, so the lift/blur
// only kicks in once it's genuinely pinned rather than from page load.
function useIsStuck(offset: number) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const handleScroll = () => setStuck(window.scrollY > offset);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offset]);

  return stuck;
}

export function RequirementChecklistSectionNav({
  items,
  activeKey,
  onJump,
}: {
  items: ChecklistSectionNavItem[];
  /** Section currently scrolled into view, highlighted even without a click. */
  activeKey?: string | null;
  onJump: (key: string) => void;
}) {
  const stuck = useIsStuck(40);
  const totalReceived = items.reduce((sum, item) => sum + item.received, 0);
  const totalDocs = items.reduce((sum, item) => sum + item.total, 0);
  const overallPct = totalDocs > 0 ? Math.round((totalReceived / totalDocs) * 100) : 0;
  const allComplete = totalDocs > 0 && totalReceived >= totalDocs;

  return (
    <Box
      sx={{
        borderRadius: '14px',
        bgcolor: 'common.white',
        border: '1px solid #EBEDF3',
        boxShadow: stuck ? '0 8px 20px rgba(20,23,42,0.08)' : '0 1px 2px rgba(20,23,42,0.04)',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: totalDocs > 0 ? 1 : 0 }}>
          <Typography
            sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8891A6' }}
          >
            Sections
          </Typography>
          {totalDocs > 0 && (
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                color: allComplete ? TONE_COLORS.success.text : '#1C2A6E',
              }}
            >
              {overallPct}%
            </Typography>
          )}
        </Stack>
        {totalDocs > 0 && (
          <Box sx={{ height: 4, borderRadius: 999, bgcolor: '#EEF0F5', overflow: 'hidden' }}>
            <Box
              sx={{
                width: `${overallPct}%`,
                height: '100%',
                borderRadius: 999,
                bgcolor: allComplete ? TONE_COLORS.success.solid : '#1C2A6E',
                transition: 'width 0.2s ease',
              }}
            />
          </Box>
        )}
      </Box>

      <Stack sx={{ px: 1, pb: 1 }} spacing={0.25}>
        {items.map((item) => {
          const tone = statusTone(item.received, item.total);
          const colors = TONE_COLORS[tone];
          const isActive = activeKey === item.key;
          const isComplete = item.total > 0 && item.received >= item.total;
          return (
            <ButtonBase
              key={item.key}
              onClick={() => onJump(item.key)}
              sx={{
                position: 'relative',
                justifyContent: 'flex-start',
                textAlign: 'left',
                pl: 1.75,
                pr: 1.25,
                py: 0.85,
                borderRadius: '9px',
                bgcolor: isActive ? '#F5F7FF' : 'transparent',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: isActive ? '#F5F7FF' : '#FAFBFD' },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: 999,
                  bgcolor: isActive ? '#1C2A6E' : 'transparent',
                  transition: 'background-color 0.15s ease',
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: colors.solid,
                  }}
                />
                <Typography
                  noWrap
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#1C2A6E' : '#14172A',
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isComplete ? TONE_COLORS.success.text : colors.text,
                    flexShrink: 0,
                  }}
                >
                  {statusLabel(item.received, item.total)}
                </Typography>
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Tracks which registered section is closest to the top of the viewport,
// so the nav can highlight "where you are" during a normal scroll, not
// only right after a jump-click. Re-observes whenever the ref map's
// contents could have changed shape (keyed by item count).
export function useActiveSection(
  sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>,
  keys: string[]
) {
  const [activeKey, setActiveKey] = useState<string | null>(keys[0] ?? null);

  useEffect(() => {
    const entries = keys
      .map((key) => [key, sectionRefs.current.get(key)] as const)
      .filter((entry): entry is [string, HTMLDivElement] => !!entry[1]);
    if (entries.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visible = observedEntries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const key = entries.find(([, el]) => el === visible[0].target)?.[0];
          if (key) setActiveKey(key);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );

    entries.forEach(([, el]) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.length]);

  return activeKey;
}
