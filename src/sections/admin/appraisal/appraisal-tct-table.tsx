'use client';

import { Fragment, useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { useAdmin, APPRAISER_ROSTER } from 'src/auth/admin-context';

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
// which this table implements the selection side of. Assigning happens
// through a modal (not an inline panel) so the In-house/External choice,
// named appraiser, and target completion date all live in one focused
// step, matching this page's design reference.
// ----------------------------------------------------------------------

function AppraiserTypeOption({
  type,
  selected,
  onSelect,
}: {
  type: AppraiserType;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = type === 'inhouse' ? 'In-house' : 'External';
  const abbrev = type === 'inhouse' ? 'IN' : 'EX';
  const description = type === 'inhouse' ? 'Fills report in system' : 'Uploads their report';

  return (
    <Box
      onClick={onSelect}
      role="button"
      sx={{
        flex: 1,
        p: 1.5,
        borderRadius: '12px',
        border: '1.5px solid',
        borderColor: selected ? '#1C2A6E' : '#E1E4ED',
        bgcolor: selected ? '#EEF1FE' : 'common.white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '9px',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          bgcolor: selected ? '#1C2A6E' : '#F5F6FA',
          color: selected ? 'common.white' : '#5A6273',
          fontSize: 11.5,
          fontWeight: 700,
        }}
      >
        {abbrev}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, color: '#8891A6' }}>{description}</Typography>
      </Box>
    </Box>
  );
}

export function AppraisalTctTable({ applicantName }: { applicantName: string }) {
  const { review, addAppraisalGroup, createAppraisalReportBundle, addTctGroupsToReportBundle } = useAdmin();
  const { appraisalGroups } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignType, setAssignType] = useState<AppraiserType>('inhouse');
  const [assignAppraiserName, setAssignAppraiserName] = useState('');
  const [assignTargetDate, setAssignTargetDate] = useState('');
  const [addTctOpen, setAddTctOpen] = useState(false);
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
    setAddTctOpen(false);
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

  const docsCompleteCount = (groupId: string) => {
    const group = appraisalGroups.find((entry) => entry.id === groupId);
    if (!group) return { done: 0, total: APPRAISAL_DOC_META.length };
    const done = APPRAISAL_DOC_META.filter((meta) => {
      const doc = group.documents.find((groupDoc) => groupDoc.key === meta.key);
      return doc?.status === 'verified';
    }).length;
    return { done, total: APPRAISAL_DOC_META.length };
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

  const openAssignModal = () => {
    setAssignType('inhouse');
    setAssignAppraiserName('');
    setAssignTargetDate('');
    setAssignOpen(true);
  };

  const confirmAssign = () => {
    createAppraisalReportBundle(
      selectedIds,
      assignType,
      assignAppraiserName.trim() || null,
      assignTargetDate || null
    );
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
    if (!bundle) return { label: 'Unassigned', tone: 'warning' as const };
    if (!bundle.appraiserType) return { label: 'Pending appraiser type', tone: 'warning' as const };
    return {
      label: bundle.appraiserType === 'inhouse' ? 'In Report — In-house' : 'In Report — External',
      tone: 'info' as const,
    };
  };

  const assignedCount = appraisalGroups.filter((group) => group.reportId !== null).length;
  const selectedGroups = appraisalGroups.filter((group) => selectedIds.includes(group.id));

  return (
    <Box sx={adminCardSx}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
            Collateral titles
          </Typography>
          <Button
            size="small"
            onClick={() => setAddTctOpen((open) => !open)}
            startIcon={<Iconify icon="solar:add-circle-linear" width={15} />}
            sx={{ ...outlinedNavyButtonSx, minHeight: 28, px: 1.25, fontSize: 12, fontWeight: 700 }}
          >
            Add TCT
          </Button>
        </Stack>
        <Box
          sx={{
            display: 'inline-flex',
            px: 1.25,
            py: 0.5,
            borderRadius: '999px',
            bgcolor: TONE_COLORS.warning.bg,
            color: TONE_COLORS.warning.text,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {assignedCount} of {appraisalGroups.length} assigned
        </Box>
      </Stack>
      <Typography sx={{ fontSize: 13.5, color: '#8891A6', mb: 2.5 }}>
        Select one or more TCT numbers, then assign an appraiser.
      </Typography>

      <Collapse in={addTctOpen} unmountOnExit>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={1}
          sx={{ mb: 2, p: 1.5, borderRadius: '10px', bgcolor: '#F8F9FC', border: '1px solid #E3E7F0' }}
        >
          <TextField
            fullWidth
            autoFocus
            size="small"
            placeholder="e.g. TCT-2024-00991"
            value={newTctNumber}
            onChange={(event) => setNewTctNumber(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTctGroup();
              if (event.key === 'Escape') setAddTctOpen(false);
            }}
            error={isDuplicateTctNumber}
            helperText={isDuplicateTctNumber ? 'This property is already included.' : ' '}
            sx={{
              flex: 1,
              maxWidth: { sm: 320 },
              '& .MuiOutlinedInput-root': { minHeight: 38, borderRadius: '9px', bgcolor: 'common.white', fontSize: 13.5 },
              '& .MuiFormHelperText-root': { mx: 0, fontSize: 11 },
            }}
          />
          <Stack direction="row" spacing={0.75} flexShrink={0}>
            <Button
              onClick={handleAddTctGroup}
              disabled={!newTctNumber.trim() || isDuplicateTctNumber}
              variant="contained"
              size="small"
              sx={{ minHeight: 38, borderRadius: '9px', px: 1.75, bgcolor: '#1C2A6E', boxShadow: 'none', fontWeight: 700, '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Add
            </Button>
            <Button
              onClick={() => {
                setAddTctOpen(false);
                setNewTctNumber('');
              }}
              variant="outlined"
              size="small"
              sx={{ ...outlinedNavyButtonSx, minHeight: 38 }}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Collapse>

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
              const docs = docsCompleteCount(group.id);
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
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            px: 1,
                            py: 0.4,
                            borderRadius: '999px',
                            bgcolor: docs.done === docs.total ? TONE_COLORS.success.bg : TONE_COLORS.neutral.bg,
                            color: docs.done === docs.total ? TONE_COLORS.success.text : TONE_COLORS.neutral.text,
                            fontSize: 11.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {docs.done}/{docs.total} docs
                        </Box>
                        <IconButton size="small" onClick={() => setExpandedId(expanded ? null : group.id)}>
                          <Iconify
                            icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                            width={18}
                          />
                        </IconButton>
                      </Stack>
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

      {selectedIds.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mt: 2, p: 1.5, borderRadius: '12px', bgcolor: '#F5F6FA' }}
        >
          <Box>
            <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: '#14172A' }}>
              {selectedIds.length} title{selectedIds.length === 1 ? '' : 's'} selected
            </Typography>
            {!spansMultipleBundles && !targetExistingBundleId && selectedIds.length > 1 && (
              <Typography component="span" sx={{ fontSize: 12.5, color: '#3448B0', ml: 1 }}>
                Assigning together creates one consolidated report
              </Typography>
            )}
            {spansMultipleBundles && (
              <Typography component="span" sx={{ fontSize: 12.5, color: '#B36A05', ml: 1 }}>
                Select properties from only one report at a time.
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.25} flexShrink={0}>
            <Button onClick={clearSelection} variant="outlined" size="small" sx={outlinedNavyButtonSx}>
              Clear
            </Button>
            {targetExistingBundleId && !spansMultipleBundles ? (
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
                onClick={openAssignModal}
                disabled={spansMultipleBundles}
                variant="contained"
                size="small"
                startIcon={<Iconify icon="solar:user-plus-rounded-bold-duotone" width={16} />}
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Assign appraiser
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Assign appraiser
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                {selectedIds.length} title{selectedIds.length === 1 ? '' : 's'}
                {selectedIds.length > 1 ? ' · consolidated report' : ''}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setAssignOpen(false)} sx={{ mt: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1} sx={{ mb: 2.5 }}>
            {selectedGroups.map((group) => (
              <Stack
                key={group.id}
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ p: 1.5, borderRadius: '10px', border: '1px solid #EBEDF3' }}
              >
                <Iconify icon="solar:home-2-bold-duotone" width={18} sx={{ color: '#1C2A6E', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#14172A' }}>
                  TCT No. {group.tctNumber}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8891A6', mb: 1 }}>
            Appraiser
          </Typography>
          <Stack direction="row" spacing={1.25} sx={{ mb: 2.5 }}>
            <AppraiserTypeOption type="inhouse" selected={assignType === 'inhouse'} onSelect={() => setAssignType('inhouse')} />
            <AppraiserTypeOption type="external" selected={assignType === 'external'} onSelect={() => setAssignType('external')} />
          </Stack>

          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="assign-appraiser-name-label" shrink>
                Assign to
              </InputLabel>
              <Select
                labelId="assign-appraiser-name-label"
                label="Assign to"
                value={assignAppraiserName}
                onChange={(event) => setAssignAppraiserName(event.target.value)}
                displayEmpty
                notched
                sx={{ borderRadius: '10px', fontSize: 14 }}
              >
                <MenuItem value="">
                  <Typography sx={{ fontSize: 14, color: '#8891A6' }}>Select appraiser…</Typography>
                </MenuItem>
                {APPRAISER_ROSTER.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              type="date"
              label="Target completion date"
              value={assignTargetDate}
              onChange={(event) => setAssignTargetDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
            />
          </Stack>
        </DialogContent>

        <Stack direction="row" spacing={1.25} sx={{ p: 2.5, pt: 1.5 }}>
          <Button
            onClick={confirmAssign}
            fullWidth
            variant="contained"
            sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
          >
            Assign appraiser
          </Button>
          <Button onClick={() => setAssignOpen(false)} variant="outlined" sx={outlinedNavyButtonSx}>
            Cancel
          </Button>
        </Stack>
      </Dialog>
    </Box>
  );
}
