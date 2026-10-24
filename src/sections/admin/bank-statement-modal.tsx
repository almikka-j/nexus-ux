'use client';

import { useRef, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';

import { useAdmin } from 'src/auth/admin-context';

import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { TONE_COLORS, outlinedNavyButtonSx } from 'src/components/admin-ui';

import {
  MONTHS,
  PHILIPPINE_BANKS,
  computeTotalDeposits,
  computeAvgDailyBalance,
} from './bank-statement';

// ----------------------------------------------------------------------
// Add / edit one bank statement, in a centered Dialog (the admin app's
// `<Dialog fullWidth maxWidth="md" scroll="paper">` convention — same as
// CreditCheckingResultModal / the "Full application" modal) so the officer
// never leaves the Financial Evaluation page — the UX problem with the
// legacy "click edit → separate full page" flow.
//
// Deposits and Account Daily Balance use the app's inline-editable-row
// pattern (CashFlowStatementCard's "Add Other Loan"): the Add button appends
// an empty editable row, the trailing ✕ removes it — no staging row, no "+"
// to commit. Every field persists on change via the useAdmin() setters, so
// the footer is just a "Done" button, not a save.
//
// "Upload bank statement" (addBankStatementFile) attaches a file (data URL
// only, no parsing) and, when the statement is still blank, auto-fills
// every field below it with deterministic sample values — simulating an
// extraction the same way every other "AI" feature in this app does (no
// real OCR). It never overwrites fields the officer already filled in by
// hand.
//
// delete-if-blank on close: opening via "Add bank statement" then closing
// with the statement still completely empty removes it, so no ghost row is
// left behind.
// ----------------------------------------------------------------------

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14, bgcolor: 'common.white' },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3B4256', mb: 0.75 }}>
      {children}
    </Typography>
  );
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#8891A6',
      }}
    >
      {children}
    </Typography>
  );
}

function CurrencyInput({
  placeholder = '0.00',
  value,
  onValueChange,
}: {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <NumericFormat
      fullWidth
      size="small"
      customInput={TextField}
      placeholder={placeholder}
      value={value}
      onValueChange={({ value: next }) => onValueChange(next)}
      thousandSeparator=","
      decimalScale={2}
      allowNegative={false}
      valueIsNumericString
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: TONE_COLORS.info.solid }}>₱</Typography>
          </InputAdornment>
        ),
      }}
      sx={fieldSx}
    />
  );
}

type BankStatementModalProps = {
  open: boolean;
  statementId: string | null;
  onClose: () => void;
};

export function BankStatementModal({ open, statementId, onClose }: BankStatementModalProps) {
  const {
    review,
    updateBankStatement,
    removeBankStatement,
    addBankStatementDeposit,
    updateBankStatementDeposit,
    removeBankStatementDeposit,
    addBankStatementDailyBalance,
    updateBankStatementDailyBalance,
    removeBankStatementDailyBalance,
    uploadBankStatementFile,
    removeBankStatementFile,
  } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statement = review.bankStatements.find((entry) => entry.id === statementId) ?? null;

  // Statement was deleted elsewhere while the modal was open.
  useEffect(() => {
    if (open && statementId && !statement) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, statementId, statement]);

  const isBlank =
    !!statement &&
    !statement.depositoryBank.trim() &&
    !statement.accountName.trim() &&
    !statement.accountNumber.trim() &&
    !statement.monthFrom &&
    !statement.monthTo &&
    statement.deposits.length === 0 &&
    statement.dailyBalances.length === 0 &&
    !statement.statementFileName;

  const handleClose = () => {
    if (statement && isBlank) removeBankStatement(statement.id);
    onClose();
  };

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!statement || !file) return;
    uploadBankStatementFile(statement.id, file.name);
  };

  const handleRemoveFile = () => {
    if (statement) removeBankStatementFile(statement.id);
  };

  const totalDeposits = statement ? computeTotalDeposits(statement.deposits) : 0;
  const avgDailyBalance = statement ? computeAvgDailyBalance(statement.dailyBalances) : null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" scroll="paper">
      {statement && (
        <>
          <DialogTitle sx={{ p: 3, pb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
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
                  <Iconify icon="solar:bill-list-bold-duotone" width={20} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#14172A' }}>
                    Bank Statement
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                    {statement.depositoryBank.trim() || 'New statement'}
                  </Typography>
                </Box>
              </Stack>
              <IconButton onClick={handleClose} aria-label="Close bank statement">
                <Iconify icon="mingcute:close-line" width={22} />
              </IconButton>
            </Stack>
          </DialogTitle>

          <Divider />

          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              {/* Upload — same row layout as CI Report's own transcript
                  upload (ci-report-card.tsx): icon + filename/status +
                  Upload/Replace + Remove, all in one bordered row. */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ p: 2, borderRadius: '11px', bgcolor: '#F9FAFC', border: '1px solid #EEF0F5' }}
              >
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" hidden onChange={handleUploadFile} />
                <Iconify icon="solar:bill-list-bold-duotone" width={20} sx={{ color: '#5A6273', flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
                    {statement.statementFileName ?? 'No bank statement uploaded'}
                  </Typography>
                  {statement.statementFileName && (
                    <Typography sx={{ fontSize: 11.5, color: '#A0A7B5' }}>
                      Uploaded {new Date(statement.statementUploadedAt!).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  )}
                </Box>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon="solar:upload-bold-duotone" width={16} />}
                  sx={{ ...outlinedNavyButtonSx, flexShrink: 0 }}
                >
                  {statement.statementFileName ? 'Replace statement' : 'Upload bank statement'}
                </Button>
                {statement.statementFileName && (
                  <Button
                    onClick={handleRemoveFile}
                    size="small"
                    startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
                    sx={{ color: '#F04438', flexShrink: 0 }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>

              <Divider />

              {/* Account details */}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FieldLabel>Depository Bank</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={statement.depositoryBank}
                    onChange={(event) =>
                      updateBankStatement(statement.id, { depositoryBank: event.target.value })
                    }
                    sx={fieldSx}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {/* A legacy value not in the list still renders as an option
                        so it isn't silently blanked. */}
                    {statement.depositoryBank &&
                      !PHILIPPINE_BANKS.includes(
                        statement.depositoryBank as (typeof PHILIPPINE_BANKS)[number]
                      ) && (
                        <MenuItem value={statement.depositoryBank}>
                          {statement.depositoryBank}
                        </MenuItem>
                      )}
                    {PHILIPPINE_BANKS.map((bank) => (
                      <MenuItem key={bank} value={bank}>
                        {bank}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FieldLabel>Account Name</FieldLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={statement.accountName}
                    onChange={(event) =>
                      updateBankStatement(statement.id, { accountName: event.target.value })
                    }
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FieldLabel>Account Number</FieldLabel>
                  <TextField
                    fullWidth
                    size="small"
                    value={statement.accountNumber}
                    onChange={(event) =>
                      updateBankStatement(statement.id, { accountNumber: event.target.value })
                    }
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FieldLabel>Month Range (From)</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={statement.monthFrom}
                    onChange={(event) =>
                      updateBankStatement(statement.id, { monthFrom: event.target.value })
                    }
                    sx={fieldSx}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {MONTHS.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <FieldLabel>Month Range (To)</FieldLabel>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={statement.monthTo}
                    onChange={(event) =>
                      updateBankStatement(statement.id, { monthTo: event.target.value })
                    }
                    sx={fieldSx}
                  >
                    <MenuItem value="">Select…</MenuItem>
                    {MONTHS.map((month) => (
                      <MenuItem key={month} value={month}>
                        {month}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Divider />

              {/* Deposits */}
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <SubsectionLabel>Deposits</SubsectionLabel>
                  <Button
                    onClick={() => addBankStatementDeposit(statement.id)}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                    sx={outlinedNavyButtonSx}
                  >
                    Add deposit
                  </Button>
                </Stack>

                {statement.deposits.length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: '#B0B6C3' }}>
                    No deposits added yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {statement.deposits.map((deposit) => (
                      <Grid container spacing={1} alignItems="center" key={deposit.id}>
                        <Grid item xs={5.5}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            value={deposit.date}
                            onChange={(event) =>
                              updateBankStatementDeposit(statement.id, deposit.id, {
                                date: event.target.value,
                              })
                            }
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={5.5}>
                          <CurrencyInput
                            value={deposit.amount}
                            onValueChange={(value) =>
                              updateBankStatementDeposit(statement.id, deposit.id, { amount: value })
                            }
                          />
                        </Grid>
                        <Grid item xs={1}>
                          <IconButton
                            size="small"
                            onClick={() => removeBankStatementDeposit(statement.id, deposit.id)}
                            aria-label="Remove deposit"
                          >
                            <Iconify icon="mingcute:close-line" width={16} />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>
                )}

                <Stack direction="row" justifyContent="flex-end">
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    Total deposits:{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#14172A' }}>
                      {fCurrency(totalDeposits) || '₱0.00'}
                    </Box>
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              {/* Account Daily Balance */}
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <SubsectionLabel>Account Daily Balance</SubsectionLabel>
                  <Button
                    onClick={() => addBankStatementDailyBalance(statement.id)}
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
                    sx={outlinedNavyButtonSx}
                  >
                    Add balance
                  </Button>
                </Stack>

                {statement.dailyBalances.length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: '#B0B6C3' }}>
                    No daily balance rows added yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {statement.dailyBalances.map((balance) => (
                      <Grid container spacing={1} alignItems="center" key={balance.id}>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            value={balance.periodFrom}
                            onChange={(event) =>
                              updateBankStatementDailyBalance(statement.id, balance.id, {
                                periodFrom: event.target.value,
                              })
                            }
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            value={balance.periodTo}
                            onChange={(event) =>
                              updateBankStatementDailyBalance(statement.id, balance.id, {
                                periodTo: event.target.value,
                              })
                            }
                            sx={fieldSx}
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <CurrencyInput
                            value={balance.balance}
                            onValueChange={(value) =>
                              updateBankStatementDailyBalance(statement.id, balance.id, {
                                balance: value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={1}>
                          <IconButton
                            size="small"
                            onClick={() => removeBankStatementDailyBalance(statement.id, balance.id)}
                            aria-label="Remove daily balance row"
                          >
                            <Iconify icon="mingcute:close-line" width={16} />
                          </IconButton>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>
                )}

                <Stack direction="row" justifyContent="flex-end">
                  <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                    Average daily balance:{' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#14172A' }}>
                      {avgDailyBalance === null ? '—' : fCurrency(avgDailyBalance) || '₱0.00'}
                    </Box>
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </DialogContent>

          <Divider />

          <DialogActions sx={{ p: 2.5 }}>
            <Button
              onClick={handleClose}
              variant="contained"
              sx={{
                bgcolor: '#1C2A6E',
                borderRadius: '10px',
                px: 3,
                fontWeight: 700,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
              }}
            >
              Done
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
