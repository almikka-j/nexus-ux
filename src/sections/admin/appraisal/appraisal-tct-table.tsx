'use client';

import { Fragment, useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { useAdmin } from 'src/auth/admin-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS } from 'src/components/admin-ui';

import { APPRAISAL_DOC_META } from '../requirement-checklist-docs';
import { ReadOnlyRequirementDocRow } from '../credit-investigation/credit-investigation-doc-row';

import type { AppraiserType } from 'src/auth/admin-context';

// ----------------------------------------------------------------------
// Lets an officer select one or more pledged properties (TCT Nos.) and
// fold them into a single "Appraisal Report" bundle with one appraiser —
// or add more properties to a report bundle that hasn't been submitted
// yet. A selection spanning two different existing bundles is blocked
// (merging bundles isn't supported); see the source process diagram's
// "Prepare/upload document for Single/consolidated appraisal report" step,
// which this table implements the selection side of.
// ----------------------------------------------------------------------

export function AppraisalTctTable({ applicantName }: { applicantName: string }) {
  const { review, addAppraisalGroup, createAppraisalReportBundle, addTctGroupsToReportBundle } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignType, setAssignType] = useState<AppraiserType>('inhouse');
  const [newTctNumber, setNewTctNumber] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const pendingScrollRef = useRef(false);

  const isDuplicateTctNumber = appraisalGroups.some(
    (group) => group.tctNumber.trim().toLowerCase() === newTctNumber.trim().toLowerCase()
  );

  const handleAddTctGroup = () => {
    const trimmed = newTctNumber.trim();
    if (!trimmed || isDuplicateTctNumber) return;
    addAppraisalGroup(trimmed);
    setNewTctNumber('');
    pendingScrollRef.current = true;
  };

  // addAppraisalGroup always appends, so once the array grows, its last
  // entry is the one just added — flash and scroll to it, since a table
  // that can grow past a screenful otherwise gives no feedback that
  // anything happened.
  useEffect(() => {
    if (!pendingScrollRef.current || appraisalGroups.length === 0) return;
    pendingScrollRef.current = false;
    const added = appraisalGroups[appraisalGroups.length - 1];
    setJustAddedId(added.id);
    rowRefs.current.get(added.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeout = setTimeout(() => setJustAddedId((current) => (current === added.id ? null : current)), 2000);
    return () => clearTimeout(timeout);
  }, [appraisalGroups]);

  const bundleForGroup = (groupId: string) =>
    reportBundles.find((bundle) => bundle.tctGroupIds.includes(groupId)) ?? null;

  const isRowLocked = (groupId: string) => {
    const bundle = bundleForGroup(groupId);
    return !!bundle?.report.uploadedAt;
  };

  const toggleRow = (groupId: string) => {
    setSelectedIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const selectedBundleIds = Array.from(
    new Set(
      selectedIds
        .map((id) => bundleForGroup(id)?.id)
        .filter((id): id is string => !!id)
    )
  );
  const spansMultipleBundles = selectedBundleIds.length > 1;
  const targetExistingBundleId = selectedBundleIds.length === 1 ? selectedBundleIds[0] : null;

  const clearSelection = () => setSelectedIds([]);

  const confirmAssign = () => {
    createAppraisalReportBundle(selectedIds, assignType);
    clearSelection();
    setAssignOpen(false);
  };

  const confirmAddToExisting = () => {
    if (!targetExistingBundleId) return;
    const newIds = selectedIds.filter((id) => bundleForGroup(id)?.id !== targetExistingBundleId);
    if (newIds.length > 0) addTctGroupsToReportBundle(targetExistingBundleId, newIds);
    clearSelection();
  };

  const statusFor = (groupId: string) => {
    const bundle = bundleForGroup(groupId);
    if (!bundle) return { label: 'Unassigned', tone: 'neutral' as const };
    if (!bundle.appraiserType) return { label: 'Pending appraiser type', tone: 'warning' as const };
    return {
      label: bundle.appraiserType === 'inhouse' ? 'In Report — In-house' : 'In Report — External',
      tone: 'info' as const,
    };
  };

  return (
    <Box sx={adminCardSx}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A', mb: 0.5 }}>
        Pledged Properties
      </Typography>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Select one or more TCT/CCT numbers to assign an appraiser — a report can cover a single
        property or several bundled together.
      </Typography>

      {selectedIds.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: TONE_COLORS.info.bg }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: TONE_COLORS.info.text }}>
            {selectedIds.length} propert{selectedIds.length === 1 ? 'y' : 'ies'} selected
          </Typography>
          {spansMultipleBundles ? (
            <Typography sx={{ fontSize: 12.5, color: '#B36A05' }}>
              Select properties from only one report at a time.
            </Typography>
          ) : targetExistingBundleId ? (
            <Button
              onClick={confirmAddToExisting}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Add to Report
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAssignType('inhouse');
                setAssignOpen(true);
              }}
              variant="contained"
              size="small"
              startIcon={<Iconify icon="solar:user-plus-rounded-bold-duotone" width={16} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Assign Appraiser
            </Button>
          )}
        </Stack>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>TCT No.</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appraisalGroups.map((group) => {
              const status = statusFor(group.id);
              const locked = isRowLocked(group.id);
              const expanded = expandedId === group.id;
              const justAdded = justAddedId === group.id;
              return (
                <Fragment key={group.id}>
                  <TableRow
                    hover
                    ref={(el: HTMLTableRowElement | null) => {
                      if (el) rowRefs.current.set(group.id, el);
                      else rowRefs.current.delete(group.id);
                    }}
                    sx={{
                      transition: 'background-color 0.4s ease',
                      bgcolor: justAdded ? TONE_COLORS.success.bg : undefined,
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(group.id)}
                        disabled={locked}
                        onChange={() => toggleRow(group.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                          {group.tctNumber}
                        </Typography>
                        {justAdded && (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              px: 0.85,
                              py: 0.2,
                              borderRadius: '999px',
                              bgcolor: TONE_COLORS.success.solid,
                              color: 'common.white',
                              fontSize: 10.5,
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}
                          >
                            NEW
                          </Box>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedId(expanded ? null : group.id)}>
                        <Iconify
                          icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                          width={18}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          px: 1,
                          py: 0.5,
                          borderRadius: '999px',
                          bgcolor: TONE_COLORS[status.tone].bg,
                          color: TONE_COLORS[status.tone].text,
                          fontSize: 11.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status.label}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                      <Collapse in={expanded} unmountOnExit>
                        <Stack spacing={1.25} sx={{ py: 2 }}>
                          {APPRAISAL_DOC_META.map((meta) => {
                            const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
                            if (!doc) return null;
                            return (
                              <ReadOnlyRequirementDocRow
                                key={meta.key}
                                label={meta.label}
                                doc={doc}
                                applicantName={applicantName}
                              />
                            );
                          })}
                        </Stack>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          mt: 2.5,
          p: 2,
          borderRadius: '13px',
          bgcolor: '#F8F9FC',
          border: '1px solid #E3E7F0',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#EEF1FE',
              flexShrink: 0,
            }}
          >
            <Iconify icon="solar:home-add-bold-duotone" width={19} sx={{ color: '#1C2A6E' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#14172A' }}>
              Add another pledged property
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#8891A6', mt: 0.25 }}>
              Enter the title number to add a new TCT/CCT row to the table above.
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={{ xs: 1, sm: 1.25 }}
        >
          <TextField
            fullWidth
            size="small"
            label="TCT/CCT number"
            placeholder="e.g. TCT-2024-00991"
            value={newTctNumber}
            onChange={(event) => setNewTctNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTctGroup();
            }}
            error={isDuplicateTctNumber}
            helperText={isDuplicateTctNumber ? 'This property is already included.' : ' '}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:document-text-bold-duotone" width={17} sx={{ color: '#8891A6' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              maxWidth: { sm: 460 },
              '& .MuiOutlinedInput-root': {
                minHeight: 42,
                borderRadius: '10px',
                bgcolor: 'common.white',
                fontSize: 14,
              },
              '& .MuiFormHelperText-root': { mx: 0, fontSize: 11.5 },
            }}
          />
          <Button
            onClick={handleAddTctGroup}
            disabled={!newTctNumber.trim() || isDuplicateTctNumber}
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            sx={{
              minHeight: 42,
              minWidth: { sm: 148 },
              borderRadius: '10px',
              px: 2.25,
              flexShrink: 0,
              bgcolor: '#1C2A6E',
              boxShadow: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#14205A', boxShadow: 'none' },
            }}
          >
            Add Property
          </Button>
        </Stack>
      </Box>

      {assignOpen && (
        <Stack
          spacing={1.5}
          sx={{ mt: 2, p: 2, borderRadius: '12px', border: '1px solid #EEF0F5', bgcolor: '#F9FAFC' }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
            Assign appraiser to {selectedIds.length} propert{selectedIds.length === 1 ? 'y' : 'ies'}
          </Typography>
          <ButtonGroup>
            <Button
              onClick={() => setAssignType('inhouse')}
              variant={assignType === 'inhouse' ? 'contained' : 'outlined'}
              sx={assignType === 'inhouse' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
            >
              In-house
            </Button>
            <Button
              onClick={() => setAssignType('external')}
              variant={assignType === 'external' ? 'contained' : 'outlined'}
              sx={assignType === 'external' ? { bgcolor: '#1C2A6E', '&:hover': { bgcolor: '#14205A' } } : outlinedNavyButtonSx}
            >
              External
            </Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1.25}>
            <Button
              onClick={confirmAssign}
              variant="contained"
              size="small"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Create Report
            </Button>
            <Button onClick={() => setAssignOpen(false)} variant="outlined" size="small" sx={outlinedNavyButtonSx}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
