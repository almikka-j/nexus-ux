'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type HaiMessage = {
  id: string;
  sender: 'hai' | 'officer';
  text: string;
};

type HaiChatDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const INITIAL_MESSAGE: HaiMessage = {
  id: 'hai-welcome',
  sender: 'hai',
  text: 'Hi! I’m HAI. Ask me about an application, bureau report, or the next step in the review process.',
};

function buildPrototypeReply(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('bureau') || normalizedMessage.includes('credit')) {
    return 'Review each uploaded bureau summary and verify the findings against its source document before recording your recommendation.';
  }

  if (normalizedMessage.includes('requirement') || normalizedMessage.includes('document')) {
    return 'Check the Requirement Checklist for missing or incomplete documents before moving the application forward.';
  }

  if (normalizedMessage.includes('disapprove') || normalizedMessage.includes('reconsider')) {
    return 'When you disapprove an application, enter a clear reason. The application will then proceed to Reconsideration.';
  }

  if (normalizedMessage.includes('call report') || normalizedMessage.includes('next step')) {
    return 'Use “Proceed to Call Report” after reviewing the application details, bureau summaries, and recommendation.';
  }

  return 'This is a frontend HAI preview. I can currently provide sample guidance about credit checking, bureau reports, requirements, and review steps.';
}

export function HaiChatDrawer({ open, onClose }: HaiChatDrawerProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<HaiMessage[]>([INITIAL_MESSAGE]);
  const [isReplying, setIsReplying] = useState(false);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isReplying]);

  useEffect(
    () => () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    },
    []
  );

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isReplying) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), sender: 'officer', text: trimmedMessage },
    ]);
    setMessage('');
    setIsReplying(true);

    replyTimerRef.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), sender: 'hai', text: buildPrototypeReply(trimmedMessage) },
      ]);
      setIsReplying(false);
      replyTimerRef.current = null;
    }, 700);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
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
              <Iconify icon="solar:magic-stick-3-bold-duotone" width={20} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14172A' }}>
                HAI Assistant
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#8891A6' }}>Frontend preview</Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} aria-label="Close HAI chat">
            <Iconify icon="solar:close-circle-bold" width={21} />
          </IconButton>
        </Stack>

        <Divider />

        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2.5 }}>
          {messages.map((entry) => (
            <Box
              key={entry.id}
              sx={{
                maxWidth: '85%',
                alignSelf: entry.sender === 'officer' ? 'flex-end' : 'flex-start',
                px: 1.75,
                py: 1.25,
                borderRadius: entry.sender === 'officer' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                bgcolor: entry.sender === 'officer' ? '#1C2A6E' : 'common.white',
                border: entry.sender === 'officer' ? 'none' : '1px solid #E7EAF1',
                boxShadow: entry.sender === 'officer' ? 'none' : '0 1px 2px rgba(20,23,42,0.04)',
              }}
            >
              <Typography
                sx={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: entry.sender === 'officer' ? 'common.white' : '#3B4256',
                }}
              >
                {entry.text}
              </Typography>
            </Box>
          ))}

          {isReplying && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ alignSelf: 'flex-start', px: 1.75, py: 1.25, borderRadius: '14px', bgcolor: 'common.white' }}
            >
              <Iconify icon="svg-spinners:3-dots-fade" width={20} sx={{ color: '#3448B0' }} />
              <Typography sx={{ fontSize: 12, color: '#8891A6' }}>HAI is typing</Typography>
            </Stack>
          )}
          <Box ref={conversationEndRef} />
        </Stack>

        <Box sx={{ p: 2, bgcolor: 'common.white', borderTop: '1px solid #E7EAF1' }}>
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask HAI a question…"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: 14 },
                '& textarea::placeholder': { color: '#98A2B3', opacity: 1 },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!message.trim() || isReplying}
              aria-label="Send message"
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
            Prototype responses only. Verify important information.
          </Typography>
        </Box>
      </Stack>
    </Drawer>
  );
}
