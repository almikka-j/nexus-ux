import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialFinancialStatementDetails,
  hydrateFinancialStatementDetails,
  patchFinancialStatementDetails,
  submitFinancialStatementDetails,
  selectFinancialStatementReportPeriods,
} from '../src/auth/financial-statement-details.ts';

test('creates blank details', () => {
  assert.deepEqual(createInitialFinancialStatementDetails(), {
    productLine: '', amd: '', remarks: '', submittedAt: null,
  });
});

test('hydrates legacy state with safe defaults', () => {
  assert.deepEqual(hydrateFinancialStatementDetails({ productLine: 'Retail' }), {
    productLine: 'Retail', amd: '', remarks: '', submittedAt: null,
  });
  assert.deepEqual(hydrateFinancialStatementDetails(undefined), {
    productLine: '', amd: '', remarks: '', submittedAt: null,
  });
});

test('patches without mutation', () => {
  const current = createInitialFinancialStatementDetails();
  const next = patchFinancialStatementDetails(current, { amd: 'AMD-07' });
  assert.equal(current.amd, '');
  assert.equal(next.amd, 'AMD-07');
});

test('validates and normalizes submission', () => {
  const next = submitFinancialStatementDetails(
    { productLine: '  Wholesale  ', amd: '  AMD-07  ', remarks: '<p>Stable</p>', submittedAt: null },
    '2026-09-09T03:00:00.000Z'
  );
  assert.deepEqual(next, {
    productLine: 'Wholesale', amd: 'AMD-07', remarks: '<p>Stable</p>',
    submittedAt: '2026-09-09T03:00:00.000Z',
  });
  assert.equal(submitFinancialStatementDetails({ ...next, productLine: '   ' }, 'later'), null);
});

test('selects one report period without changing comparative mode', () => {
  const all = ['2023', '2024', '2025', 'interim', 'projected'];
  assert.deepEqual(selectFinancialStatementReportPeriods(all), all);
  assert.deepEqual(selectFinancialStatementReportPeriods(all, '2025'), ['2025']);
});
