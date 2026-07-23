'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { OutreachChannel, OutreachMessage } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// A drawer for requesting outstanding Requirement Checklist documents from
// the applicant — modeled on HaiChatDrawer's layout (header / scrollable
// message list / composer), but for a simulated document-request outreach
// instead of an AI chat. No real message is ever sent on any channel — this
// is a frontend-only prototype, same as every other "outreach"/notification
// affordance in this app (see docs/ADMIN_REQUIREMENT_CHECKLIST.md's
// "Fabricated claims" section).
// ----------------------------------------------------------------------

const CHANNELS: { value: OutreachChannel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: 'solar:letter-bold-duotone' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'mdi:whatsapp' },
  { value: 'viber', label: 'Viber', icon: 'simple-icons:viber' },
];

type RequestDocumentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  applicantName: string;
  missingDocLabels: string[];
  history: OutreachMessage[];
  onSend: (message: { channel: OutreachChannel; text: string }) => void;
};

function buildOutreachText(missingDocLabels: string[]) {
  if (missingDocLabels.length === 0) return '';
  return `Outreach sent. Requested: ${missingDocLabels.join(', ')}.`;
}

export function RequestDocumentsDrawer({
  open,
  onClose,
  applicantName,
  missingDocLabels,
  history,
  onSend,
}: RequestDocumentsDrawerProps) {
  const [channel, setChannel] = useState<OutreachChannel>('email');
  const [draft, setDraft] = useState('');
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(buildOutreachText(missingDocLabels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend({ channel, text: trimmed });
    setDraft('');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          maxWidth: '100%',
          bgcolor: '#F8F9FC',
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2.5, py: 2, bgcolor: 'common.white' }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                bgcolor: '#EEF1FE',
                color: '#3448B0',
              }}
            >
              <Iconify icon="solar:letter-bold-duotone" width={20} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
                Request Documents
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>{applicantName}</Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close request documents drawer">
            <Iconify icon="solar:close-circle-bold" width={21} />
          </IconButton>
        </Stack>

        <Divider />

        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5 }}>
          {missingDocLabels.length > 0 && (
            <Box sx={{ p: 1.75, borderRadius: '11px', bgcolor: '#FEF0D6', border: '1px solid #F7DFA8' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#B36A05', mb: 0.75 }}>
                Still outstanding ({missingDocLabels.length})
              </Typography>
              <Stack spacing={0.25}>
                {missingDocLabels.map((label) => (
                  <Typography key={label} sx={{ fontSize: 12.5, color: '#8A5B0A' }}>
                    · {label}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {history.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: '#B0B6C3', textAlign: 'center', mt: 2 }}>
              No document requests sent yet.
            </Typography>
          ) : (
            history.map((message) => {
              const channelMeta = CHANNELS.find((entry) => entry.value === message.channel);
              return (
                <Box
                  key={message.id}
                  sx={{
                    maxWidth: '90%',
                    alignSelf: 'flex-end',
                    px: 1.75,
                    py: 1.25,
                    borderRadius: '14px 14px 4px 14px',
                    bgcolor: '#1C2A6E',
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                    <Iconify
                      icon={channelMeta?.icon ?? 'solar:letter-bold-duotone'}
                      width={13}
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                    />
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {channelMeta?.label ?? message.channel}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, color: 'common.white' }}>
                    {message.text}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', mt: 0.5 }}>
                    {new Date(message.sentAt).toLocaleString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              );
            })
          )}
          <Box ref={conversationEndRef} />
        </Stack>

        <Box sx={{ p: 2, bgcolor: 'common.white', borderTop: '1px solid #E7EAF1' }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            {CHANNELS.map((entry) => (
              <Chip
                key={entry.value}
                icon={<Iconify icon={entry.icon} width={15} />}
                label={entry.label}
                onClick={() => setChannel(entry.value)}
                sx={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  bgcolor: channel === entry.value ? '#1C2A6E' : '#F5F6FA',
                  color: channel === entry.value ? 'common.white' : '#5A6273',
                  '& .MuiChip-icon': { color: channel === entry.value ? 'common.white' : '#8891A6' },
                  '&:hover': { bgcolor: channel === entry.value ? '#14205A' : '#EEF0F5' },
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message to the applicant…"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: 14 },
                '& textarea::placeholder': { color: '#98A2B3', opacity: 1 },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!draft.trim()}
              aria-label="Send document request"
              sx={{
                width: 44,
                height: 44,
                borderRadius: '11px',
                bgcolor: '#1C2A6E',
                color: 'common.white',
                '&:hover': { bgcolor: '#14205A' },
                '&.Mui-disabled': { bgcolor: '#E7EAF1', color: '#98A2B3' },
              }}
            >
              <Iconify icon="solar:plain-2-bold" width={19} />
            </IconButton>
          </Stack>
          <Typography sx={{ fontSize: 10.5, color: '#98A2B3', textAlign: 'center', mt: 1 }}>
            Prototype outreach only. No real message is sent.
          </Typography>
        </Box>
      </Stack>
    </Drawer>
  );
}
