import type { DialogProps } from '@mui/material/Dialog';

// ----------------------------------------------------------------------

export type ConfirmDialogProps = Omit<DialogProps, 'title' | 'content'> & {
  onClose: () => void;
  title: React.ReactNode;
  action: React.ReactNode;
  content?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Colors the `action` button when it's rendered via `renderAction` below,
   * instead of every call site hand-writing its own bgcolor/hover sx.
   * 'destructive' → app's canonical red (disapprove/delete-style actions).
   * 'default' (or omitted) → app's canonical navy (everything else).
   */
  tone?: 'default' | 'destructive';
};
