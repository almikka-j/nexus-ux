'use client';

import { Fragment, useMemo, useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
import ListItemText from '@mui/material/ListItemText';
import TableContainer from '@mui/material/TableContainer';

import { useAdmin, APPRAISER_ROSTER } from 'src/auth/admin-context';
import { useRegisterPageActions } from 'src/layouts/admin/page-actions-context';

import { Iconify } from 'src/components/iconify';
import { adminCardSx, outlinedNavyButtonSx, TONE_COLORS } from 'src/components/admin-ui';

import { APPRAISAL_DOC_META } from '../requirement-checklist-docs';
import { ReadOnlyRequirementDocRow } from '../credit-investigation/credit-investigation-doc-row';

import type { AppraiserType, AppraisalReport, AppraisalCollateralType } from 'src/auth/admin-context';

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

const COLLATERAL_TYPE_LABEL: Record<AppraisalCollateralType, string> = {
  'real-estate': 'Real Estate',
  chattel: 'Chattel',
};

export function AppraisalTctTable({ applicantName }: { applicantName: string }) {
  const {
    review,
    addAppraisalGroup,
    createAppraisalReportBundle,
    addDocumentRequestMessage,
    setAppraisal,
    setAppraisalBundleReport,
    setRequirementChecklist,
  } = useAdmin();
  const { appraisalGroups, documentRequests } = review.requirementChecklist;
  const { reportBundles } = review.appraisal;

  const allGroupsAssigned = appraisalGroups.length > 0 && appraisalGroups.every((group) => group.reportId !== null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignType, setAssignType] = useState<AppraiserType>('inhouse');
  const [assignAppraiserName, setAssignAppraiserName] = useState('');
  const [assignTargetDate, setAssignTargetDate] = useState('');
  const [addTctOpen, setAddTctOpen] = useState(false);
  const [newTctNumber, setNewTctNumber] = useState('');
  const [newCollateralType, setNewCollateralType] = useState<AppraisalCollateralType>('real-estate');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [requestDocOpen, setRequestDocOpen] = useState(false);
  const [requestTctGroupId, setRequestTctGroupId] = useState('');
  const [requestDocKeys, setRequestDocKeys] = useState<string[]>([]);
  const [requestRemarks, setRequestRemarks] = useState('');
  const [requestSentAt, setRequestSentAt] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const pendingScrollRef = useRef(false);

  const isDuplicateTctNumber = appraisalGroups.some(
    (group) => group.tctNumber.trim().toLowerCase() === newTctNumber.trim().toLowerCase()
  );

  const handleAddTctGroup = () => {
    const trimmed = newTctNumber.trim();
    if (!trimmed || isDuplicateTctNumber) return;
    addAppraisalGroup(trimmed, newCollateralType);
    setNewTctNumber('');
    setNewCollateralType('real-estate');
    setAddTctOpen(false);
    pendingScrollRef.current = true;
  };

  const openRequestDocModal = () => {
    setRequestTctGroupId(appraisalGroups[0]?.id ?? '');
    setRequestDocKeys([]);
    setRequestRemarks('');
    setRequestSentAt(null);
    setRequestDocOpen(true);
  };

  const handleSendDocumentRequest = () => {
    if (!requestTctGroupId || requestDocKeys.length === 0) return;
    addDocumentRequestMessage({
      tctGroupId: requestTctGroupId,
      documentKeys: requestDocKeys,
      remarks: requestRemarks.trim(),
    });
    setRequestSentAt(new Date().toISOString());
  };

  // Dev/testing convenience, surfaced via the shared settings popover
  // (useRegisterPageActions) — folds every still-`Unassigned` TCT group into
  // its own single-property in-house bundle so a tester can reach the
  // downstream Assigned Appraiser/fee/report states without clicking
  // through the Assign Appraiser modal per row. Cycles APPRAISER_ROSTER so
  // multiple groups don't all land on the same name.
  const handleAutoAssignAll = () => {
    appraisalGroups
      .filter((group) => group.reportId === null)
      .forEach((group, index) => {
        createAppraisalReportBundle(
          [group.id],
          'inhouse',
          APPRAISER_ROSTER[index % APPRAISER_ROSTER.length],
          null
        );
      });
  };

  // Inverse of the above — deletes every report bundle and resets every
  // group's reportId back to null, regardless of report/fee/approval
  // progress already recorded on those bundles.
  const handleUnassignAll = () => {
    setAppraisal({ reportBundles: [] });
    setRequirementChecklist({
      appraisalGroups: appraisalGroups.map((group) => ({ ...group, reportId: null })),
    });
  };

  // Dev/testing convenience — simulates the Appraiser having already
  // filled in and submitted their report on the Appraisal Appraiser page,
  // for every bundle that has an appraiser assigned but no report yet.
  // In-house bundles get a full sample REM (matching AppraisalReportView's
  // sections so nothing renders as an empty label); external bundles get a
  // fake uploaded file, mirroring what handleExternalFile actually stores.
  // Skips bundles that already have report.uploadedAt so this can be
  // clicked again after new bundles are assigned without clobbering
  // reports an appraiser (or this same action) already submitted.
  const handleSimulateReportSubmission = () => {
    const now = new Date().toISOString();
    reportBundles
      .filter((bundle) => !bundle.report.uploadedAt)
      .forEach((bundle) => {
        if (bundle.appraiserType === 'external') {
          setAppraisalBundleReport(bundle.id, {
            fileName: 'Appraisal-Report-Sample.pdf',
            fileUrl: '#',
            uploadedAt: now,
          });
          return;
        }

        const bundleTctNumbers = appraisalGroups
          .filter((group) => bundle.tctGroupIds.includes(group.id))
          .map((group) => group.tctNumber);

        const sampleReport: Partial<AppraisalReport> = {
          dateReport: now.slice(0, 10),
          dateInspected: now.slice(0, 10),
          requestingOfficer: 'Ramon Cruz',
          branch: 'Head Office',

          registeredOwner: applicantName,
          locationOfProperty: `${bundleTctNumbers.join(', ')}, Quezon City, Metro Manila`,
          landTitles: bundle.report.landTitles.map((title) => ({
            ...title,
            surveyNo: 'Psu-123456',
            bookPageNo: 'Book 45 / Page 12',
            titleRegistrationDate: now.slice(0, 10),
            titleRegistrationPlace: 'Registry of Deeds, Quezon City',
            areaSize: '250',
            lotNo: 'Lot 7',
            zonalValue: '15,000',
            boundaries: 'N: Lot 6; S: Lot 8; E: Road Lot; W: Lot 5',
            technicalSpecification: 'Rectangular lot, level with road, residential zone',
          })),
          encumbrancesRemarks: 'None noted at time of inspection.',

          streetFrontage: '10',
          streetWidth: '8',
          surfacing: 'Concrete',
          averageDepth: '25',
          approxShape: 'Rectangular',
          topography: 'Level',
          neighborhood: "Res'l",
          presentUse: 'Residential',
          highestAndBestUse: 'Residential',

          utilityPublicConveyance: 'Available',
          utilityElectricity: 'Meralco',
          utilityWater: 'Maynilad',
          utilityTelephone: 'PLDT',

          generalConstructionFeatures: 'Single-detached, two-storey residential building',
          floorLevel: 'Ground + 2nd floor',
          externalWalls: 'CHB, painted',
          interiorWallsPartitions: 'Plain cement finish',
          flooring: 'Ceramic tiles',
          doorsWindows: 'Wood panel doors, aluminum sliding windows',
          ceilingRoofing: 'Long-span roofing, gypsum ceiling',

          basisSource: 'Comparable sales within the vicinity',
          basisLocation: 'Same barangay',
          basisAreaSize: '250',
          basisPriceType: 'Selling price',
          basisSellingPrice: '18,000',
          fairMarketValuePerSqm: '15,000',

          itemOfProperty: 'Residential lot and improvement',
          fmvRcn: '3,750,000',
          constructionStatusPercent: '100',
          depreciatedValue: '2,500,000',
          appraisedValueP: '2,500,000',

          appraisedValue: '2500000',
          roundedFigures: '2,500,000',
          amountInWords: 'Two Million Five Hundred Thousand Pesos Only',
          loanableAmount: '2,000,000',

          preparedBy: bundle.appraiserName ?? 'Appraiser',
          reviewedBy: 'Maria Santos',
          endorsedBy: 'Jose Reyes',
          notedBy: 'Ramon Cruz',

          uploadedAt: now,
        };

        setAppraisalBundleReport(bundle.id, sampleReport);
      });
  };

  useRegisterPageActions(
    useMemo(
      () => [
        {
          key: 'appraisal-auto-assign-all',
          label: 'Auto-assign All TCTs',
          icon: 'solar:magic-stick-3-bold-duotone',
          onClick: handleAutoAssignAll,
        },
        {
          key: 'appraisal-unassign-all',
          label: 'Unassign All TCTs',
          icon: 'solar:restart-bold-duotone',
          color: '#B32C22',
          onClick: handleUnassignAll,
        },
        {
          key: 'appraisal-simulate-report-submission',
          label: 'Simulate: Appraiser Submits Report',
          icon: 'solar:document-add-bold-duotone',
          onClick: handleSimulateReportSubmission,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [appraisalGroups, reportBundles]
    )
  );

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

  // Collapse the whole card once every pledged property has an appraiser
  // assigned — there's nothing left to select/assign at that point, so
  // keeping the full table expanded just wastes space on a long page.
  // Before that (including right after "Unassign All TCTs" resets every
  // group's reportId back to null, flipping allGroupsAssigned from true
  // back to false), the table reopens and isn't user-toggleable — the
  // officer has work to do here again, so it can't stay collapsed with no
  // way to reach it (previously this only ever set tableOpen to false,
  // never back to true, so unassigning all rows left the table permanently
  // collapsed with no visible way to reopen it, since the header's click
  // handler is itself gated on allGroupsAssigned).
  useEffect(() => {
    setTableOpen(!allGroupsAssigned);
  }, [allGroupsAssigned]);

  const bundleForGroup = (groupId: string) =>
    reportBundles.find((bundle) => bundle.tctGroupIds.includes(groupId)) ?? null;

  // A row's checkbox locks the moment it's assigned to a bundle — an
  // already-assigned TCT can't be re-selected to combine with other rows,
  // so a fresh selection can only ever be a set of still-Unassigned rows.
  const isRowLocked = (groupId: string) => !!bundleForGroup(groupId);

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

  const clearSelection = () => setSelectedIds([]);

  const openAssignModal = () => {
    setAssignType('inhouse');
    setAssignAppraiserName('');
    setAssignTargetDate('');
    setAssignOpen(true);
  };

  const confirmAssign = () => {
    // Fee decision is no longer made here — the assigned Appraiser
    // requests their own fee from their own page
    // (appraisal-appraiser-view.tsx), so every bundle starts with
    // feeNeeded: null (createAppraisalReportBundle's default when the
    // optional fee param is omitted).
    createAppraisalReportBundle(
      selectedIds,
      assignType,
      assignAppraiserName.trim() || null,
      assignTargetDate || null
    );
    clearSelection();
    setAssignOpen(false);
  };

  const statusFor = (groupId: string) => {
    const bundle = bundleForGroup(groupId);
    if (!bundle) return { label: 'Unassigned', tone: 'warning' as const };
    if (!bundle.appraiserType) return { label: 'Pending appraiser type', tone: 'warning' as const };
    return {
      label: bundle.appraiserType === 'inhouse' ? 'In-house' : 'External',
      tone: 'info' as const,
    };
  };

  const appraiserNameForGroup = (groupId: string) => bundleForGroup(groupId)?.appraiserName ?? null;

  const assignedCount = appraisalGroups.filter((group) => group.reportId !== null).length;
  const selectedGroups = appraisalGroups.filter((group) => selectedIds.includes(group.id));

  return (
    <Box sx={adminCardSx}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={allGroupsAssigned ? () => setTableOpen((open) => !open) : undefined}
          sx={{ cursor: allGroupsAssigned ? 'pointer' : 'default', minWidth: 0 }}
        >
          {allGroupsAssigned && (
            <IconButton size="small" sx={{ flexShrink: 0 }}>
              <Iconify icon={tableOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} width={20} />
            </IconButton>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#14172A' }}>
                Collateral
              </Typography>
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
            <Typography sx={{ fontSize: 13.5, color: '#8891A6' }}>
              Select one or more collateral, then assign an appraiser.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.25} flexShrink={0}>
          <Button
            variant="outlined"
            onClick={openRequestDocModal}
            startIcon={<Iconify icon="solar:document-add-linear" width={18} />}
            sx={{ ...outlinedNavyButtonSx, whiteSpace: 'nowrap' }}
          >
            Request Document
          </Button>
          <Button
            variant="outlined"
            onClick={() => setAddTctOpen((open) => !open)}
            startIcon={<Iconify icon="solar:add-circle-linear" width={18} />}
            sx={{ ...outlinedNavyButtonSx, whiteSpace: 'nowrap' }}
          >
            Add Collateral
          </Button>
        </Stack>
      </Stack>

      <Collapse in={tableOpen} unmountOnExit>
      <Collapse in={addTctOpen} unmountOnExit>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          spacing={1}
          sx={{ mb: 2, p: 1.5, borderRadius: '10px', bgcolor: '#F8F9FC', border: '1px solid #E3E7F0' }}
        >
          <FormControl size="small" sx={{ flexShrink: 0, width: { xs: '100%', sm: 150 } }}>
            <Select
              value={newCollateralType}
              onChange={(event) => setNewCollateralType(event.target.value as AppraisalCollateralType)}
              sx={{ minHeight: 38, borderRadius: '9px', bgcolor: 'common.white', fontSize: 13.5 }}
            >
              <MenuItem value="real-estate">Real Estate</MenuItem>
              <MenuItem value="chattel">Chattel</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            autoFocus
            size="small"
            placeholder={newCollateralType === 'chattel' ? 'e.g. Plate/Serial No.' : 'e.g. TCT-2024-00991'}
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
                setNewCollateralType('real-estate');
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

      <TableContainer
        sx={{
          border: '1px solid #E1E4ED',
          borderRadius: '12px',
          overflowX: 'auto',
        }}
      >
        <Table sx={{ minWidth: 640, tableLayout: 'fixed', borderCollapse: 'separate' }}>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  bgcolor: '#FBFBFD',
                  borderBottom: '1px solid #E1E4ED',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#8891A6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1.5,
                  px: 2,
                  '&:first-of-type': { borderTopLeftRadius: '11px' },
                  '&:last-of-type': { borderTopRightRadius: '11px' },
                },
              }}
            >
              <TableCell padding="checkbox" sx={{ width: 40 }} />
              <TableCell sx={{ width: '18%' }}>Collateral No.</TableCell>
              <TableCell sx={{ width: '14%' }}>Type</TableCell>
              <TableCell sx={{ width: '18%' }}>Documents</TableCell>
              <TableCell sx={{ width: '16%' }}>Status</TableCell>
              <TableCell sx={{ width: '20%' }}>Appraiser</TableCell>
              <TableCell sx={{ width: 44 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {appraisalGroups.map((group, index) => {
              const status = statusFor(group.id);
              const appraiserName = appraiserNameForGroup(group.id);
              const locked = isRowLocked(group.id);
              const expanded = expandedId === group.id;
              const justAdded = justAddedId === group.id;
              const docs = docsCompleteCount(group.id);
              const isLastRow = index === appraisalGroups.length - 1;
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
                      '& td': {
                        borderColor: '#EEF0F5',
                        py: 1.375,
                        px: 2,
                        ...(isLastRow && !expanded ? { borderBottom: 0 } : {}),
                      },
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
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#14172A' }}>
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
                      <Typography sx={{ fontSize: 12.5, color: '#5A6273' }}>
                        {COLLATERAL_TYPE_LABEL[group.collateralType]}
                      </Typography>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{
                          display: 'inline-flex',
                          pl: 0.85,
                          pr: 1.1,
                          py: 0.45,
                          borderRadius: '999px',
                          bgcolor: TONE_COLORS[status.tone].bg,
                        }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: TONE_COLORS[status.tone].solid,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: TONE_COLORS[status.tone].text,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {status.label}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: appraiserName ? 600 : 400,
                          color: appraiserName ? '#14172A' : '#B4BACB',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {appraiserName ?? 'Not yet assigned'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => setExpandedId(expanded ? null : group.id)}>
                        <Iconify
                          icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                          width={18}
                        />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ py: 0, borderColor: '#EEF0F5', borderBottom: expanded && !isLastRow ? undefined : 0 }}
                    >
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
            {selectedIds.length > 1 && (
              <Typography component="span" sx={{ fontSize: 12.5, color: '#3448B0', ml: 1 }}>
                Assigning together creates one consolidated report
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.25} flexShrink={0}>
            <Button onClick={clearSelection} variant="outlined" size="small" sx={outlinedNavyButtonSx}>
              Clear
            </Button>
            <Button
              onClick={openAssignModal}
              variant="contained"
              size="small"
              startIcon={<Iconify icon="solar:user-plus-rounded-bold-duotone" width={16} />}
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', px: 2, boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Assign appraiser
            </Button>
          </Stack>
        </Stack>
      )}
      </Collapse>

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
                  Collateral No. {group.tctNumber}
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
            disabled={!assignAppraiserName.trim()}
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

      <Dialog
        open={requestDocOpen}
        onClose={() => setRequestDocOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#14172A' }}>
                Request Document
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', mt: 0.25 }}>
                Ask the borrower for specific documents on a collateral title.
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setRequestDocOpen(false)} sx={{ mt: -0.5 }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {requestSentAt ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: TONE_COLORS.success.bg,
                }}
              >
                <Iconify icon="solar:check-circle-bold" width={26} sx={{ color: TONE_COLORS.success.solid }} />
              </Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#14172A' }}>
                Document request sent
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#8891A6', textAlign: 'center' }}>
                {requestDocKeys.length} document{requestDocKeys.length === 1 ? '' : 's'} requested for{' '}
                {appraisalGroups.find((group) => group.id === requestTctGroupId)?.tctNumber}.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="request-doc-tct-label" shrink>
                  Collateral No.
                </InputLabel>
                <Select
                  labelId="request-doc-tct-label"
                  label="Collateral No."
                  value={requestTctGroupId}
                  onChange={(event) => setRequestTctGroupId(event.target.value)}
                  displayEmpty
                  notched
                  sx={{ borderRadius: '10px', fontSize: 14 }}
                >
                  {appraisalGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.tctNumber}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="request-doc-keys-label" shrink>
                  Documents
                </InputLabel>
                <Select
                  labelId="request-doc-keys-label"
                  label="Documents"
                  multiple
                  displayEmpty
                  notched
                  value={requestDocKeys}
                  onChange={(event) => {
                    const { value } = event.target;
                    setRequestDocKeys(typeof value === 'string' ? value.split(',') : value);
                  }}
                  renderValue={(selected) =>
                    selected.length === 0 ? (
                      <Typography sx={{ fontSize: 14, color: '#8891A6' }}>Select documents…</Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((key) => (
                          <Chip
                            key={key}
                            size="small"
                            label={APPRAISAL_DOC_META.find((meta) => meta.key === key)?.label ?? key}
                            sx={{ fontSize: 11.5, height: 22 }}
                          />
                        ))}
                      </Stack>
                    )
                  }
                  sx={{ borderRadius: '10px', fontSize: 14, '& .MuiSelect-select': { py: 1 } }}
                >
                  {APPRAISAL_DOC_META.map((meta) => (
                    <MenuItem key={meta.key} value={meta.key}>
                      <Checkbox size="small" checked={requestDocKeys.includes(meta.key)} />
                      <ListItemText primary={meta.label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Remarks"
                placeholder="Optional notes for this request"
                value={requestRemarks}
                onChange={(event) => setRequestRemarks(event.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
              />
            </Stack>
          )}

          {documentRequests.length > 0 && (
            <Stack spacing={1} sx={{ mt: 2.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5A6273', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Request history
              </Typography>
              <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {[...documentRequests]
                  .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                  .map((request) => (
                    <Box
                      key={request.id}
                      sx={{ p: 1.25, borderRadius: '10px', border: '1px solid #EEF0F5' }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#14172A' }}>
                          {appraisalGroups.find((group) => group.id === request.tctGroupId)?.tctNumber ??
                            'Unknown TCT'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#8891A6', flexShrink: 0 }}>
                          {new Date(request.sentAt).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                        {request.documentKeys.map((key) => (
                          <Chip
                            key={key}
                            size="small"
                            label={APPRAISAL_DOC_META.find((meta) => meta.key === key)?.label ?? key}
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        ))}
                      </Stack>
                      {request.remarks && (
                        <Typography sx={{ fontSize: 12, color: '#8891A6', mt: 0.75 }}>
                          {request.remarks}
                        </Typography>
                      )}
                    </Box>
                  ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>

        <Stack direction="row" spacing={1.25} sx={{ p: 2.5, pt: 1.5 }}>
          {requestSentAt ? (
            <Button
              onClick={() => setRequestDocOpen(false)}
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSendDocumentRequest}
                disabled={!requestTctGroupId || requestDocKeys.length === 0}
                fullWidth
                variant="contained"
                sx={{ bgcolor: '#1C2A6E', borderRadius: '10px', boxShadow: 'none', '&:hover': { bgcolor: '#14205A', boxShadow: 'none' } }}
              >
                Send
              </Button>
              <Button onClick={() => setRequestDocOpen(false)} variant="outlined" sx={outlinedNavyButtonSx}>
                Cancel
              </Button>
            </>
          )}
        </Stack>
      </Dialog>
    </Box>
  );
}
