'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useAdmin } from 'src/auth/admin-context';
import type { BankStatement } from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog, confirmDialogActionToneSx } from 'src/components/custom-dialog';
import { adminCardSx, iconButtonBorderedSx } from 'src/components/admin-ui';
import { CollapsibleSection } from 'src/components/collapsible-section';

import { BankStatementModal } from './bank-statement-modal';
import { formatMonthRange, computeTotalDeposits } from './bank-statement';

// ----------------------------------------------------------------------
// Financial Evaluation's Bank Statement card. Lists each bank statement the
// officer has entered (layout A: avatar + name + account line + summary
// chips), with one primary "Add bank statement" action. Add or edit both
// open the same centered BankStatementModal — no separate route, which was
// the legacy flow's main UX problem. Informational only: this card does not
// gate the page's Endorse / Disapprove decision.
// ----------------------------------------------------------------------

function bankInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 3).toUpperCase();
}

function accountTail(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length < 4) return accountNumber.trim() ? `••••${accountNumber.trim()}` : '';
  return `••••${digits.slice(-4)}`;
}

function BankStatementRow({
  statement,
  onEdit,
  onDelete,
}: {
  statement: BankStatement;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEmpty =
    !statement.accountNumber.trim() &&
    !statement.accountName.trim() &&
    statement.deposits.length === 0 &&
    statement.dailyBalances.length === 0;

  const initials = bankInitials(statement.depositoryBank);
  const tail = accountTail(statement.accountNumber);
  const monthRange = formatMonthRange(statement.monthFrom, statement.monthTo);
  const metaParts = [tail && `Acct ${tail}`, monthRange].filter(Boolean);
  const metaLine = isEmpty && metaParts.length === 0 ? 'Details not entered yet' : metaParts.join(' · ');

  const totalDeposits = computeTotalDeposits(statement.deposits);

  return (
    <Box
      onClick={onEdit}
      sx={{
        borderRadius: '13px',
        border: '1px solid #EBEDF3',
        bgcolor: 'common.white',
        p: 2,
        cursor: 'pointer',
        '&:hover': { borderColor: '#C7CEEA', bgcolor: 'rgba(28,42,110,0.02)' },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: '9px',
              bgcolor: '#EEF1FB',
              color: '#1C2A6E',
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {initials || <Iconify icon="solar:card-2-bold-duotone" width={18} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
              {statement.depositoryBank.trim() || 'Untitled bank'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 11.5, color: '#A0A7B5', mt: 0.25 }}>
              {metaLine || ' '}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          onClick={(event) => event.stopPropagation()}
        >
          {isEmpty ? (
            <Box
              component="span"
              sx={{
                fontSize: 10.5,
                color: '#A0A7B5',
                border: '1px dashed #E1E4ED',
                borderRadius: 20,
                px: 1.25,
                py: 0.375,
              }}
            >
              Empty
            </Box>
          ) : (
            <>
              <Box
                component="span"
                sx={{
                  fontSize: 10.5,
                  color: '#5A6273',
                  border: '1px solid #E1E4ED',
                  borderRadius: 20,
                  px: 1.25,
                  py: 0.375,
                  whiteSpace: 'nowrap',
                }}
              >
                {statement.deposits.length} deposits · {fCurrency(totalDeposits) || '₱0.00'}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: 10.5,
                  color: '#5A6273',
                  border: '1px solid #E1E4ED',
                  borderRadius: 20,
                  px: 1.25,
                  py: 0.375,
                  whiteSpace: 'nowrap',
                }}
              >
                {statement.dailyBalances.length} balances
              </Box>
            </>
          )}
          <IconButton
            size="small"
            onClick={onEdit}
            aria-label="Edit bank statement"
            sx={iconButtonBorderedSx}
          >
            <Iconify icon="solar:pen-bold" width={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            aria-label="Remove bank statement"
            sx={{ ...iconButtonBorderedSx, color: '#E23E3E', '&:hover': { borderColor: '#E23E3E', bgcolor: 'rgba(226,62,62,0.06)' } }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

export function BankStatementCard() {
  const { review, addBankStatement, removeBankStatement } = useAdmin();
  const statements = review.bankStatements;

  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    const id = crypto.randomUUID();
    addBankStatement(id);
    setEditingId(id);
  };

  const confirmDelete = () => {
    if (pendingDeleteId) removeBankStatement(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <Box sx={adminCardSx}>
      <CollapsibleSection
        title="Bank Statement"
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
        badge={
          statements.length > 0 ? (
            <Box
              component="span"
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5A6273',
                bgcolor: '#F1F3F8',
                borderRadius: 20,
                px: 1,
                py: 0.25,
              }}
            >
              {statements.length}
            </Box>
          ) : undefined
        }
      >
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: 13, color: '#8891A6' }}>
              Record each of the applicant&apos;s bank statements. Supporting evidence — not required
              to proceed.
            </Typography>
            <Button
              onClick={handleAdd}
              variant="contained"
              size="small"
              startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
              sx={{
                flexShrink: 0,
                bgcolor: '#1C2A6E',
                borderRadius: '10px',
                px: 2,
                boxShadow: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
              }}
            >
              Add bank statement
            </Button>
          </Stack>

          {statements.length === 0 ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                borderRadius: '11px',
                border: '1px dashed #E1E4ED',
              }}
            >
              <Typography sx={{ fontSize: 12.5, color: '#8891A6' }}>
                No bank statements added yet.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.25}>
              {statements.map((statement) => (
                <BankStatementRow
                  key={statement.id}
                  statement={statement}
                  onEdit={() => setEditingId(statement.id)}
                  onDelete={() => setPendingDeleteId(statement.id)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </CollapsibleSection>

      <BankStatementModal
        open={editingId !== null}
        statementId={editingId}
        onClose={() => setEditingId(null)}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title="Remove this bank statement?"
        content="Its deposits and daily balances will be removed."
        action={
          <Button variant="contained" onClick={confirmDelete} sx={confirmDialogActionToneSx.destructive}>
            Remove
          </Button>
        }
      />
    </Box>
  );
}
