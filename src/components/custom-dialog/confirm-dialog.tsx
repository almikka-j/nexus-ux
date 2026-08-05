import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import type { ConfirmDialogProps } from './types';

// ----------------------------------------------------------------------

export function ConfirmDialog({
  title,
  content,
  action,
  open,
  onClose,
  size = 'xs',
  tone: _tone,
  ...other
}: ConfirmDialogProps) {
  return (
    <Dialog fullWidth maxWidth={size} open={open} onClose={onClose} {...other}>
      <DialogTitle sx={{ pb: 2 }}>{title}</DialogTitle>

      {content && <DialogContent sx={{ typography: 'body2' }}> {content} </DialogContent>}

      <DialogActions>
        {action}

        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Standard action-button colors for ConfirmDialog's `action` prop, so
// individual call sites stop hand-writing bgcolor/hover per dialog —
// see docs/UI_UX_AUDIT.md's "confirm dialogs hard-code color per call
// site" finding. Pass `tone="destructive"` for disapprove/reject/delete
// confirmations; omit (or "default") for every other confirm action.
export const confirmDialogActionToneSx = {
  default: { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } },
  destructive: { bgcolor: '#F04438', '&:hover': { bgcolor: '#B32C22' } },
} as const;
