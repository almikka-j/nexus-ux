import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as detailsHelpers from '../src/auth/financial-statement-details.ts';

const periods = ['2023', '2024', '2025', 'interim', 'projected'];
const source = readFileSync(new URL('../src/sections/admin/financial-statement-modal.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

// Exercise the component's render branches and handlers without a DOM framework.
// MUI children remain opaque; this checks composition, not animation or layout.
function createHarness() {
  const slots = [];
  let cursor = 0;
  let closeCount = 0;
  const review = {
    financialStatement: Object.fromEntries(periods.map((period) => [period, {}])),
    financialStatementDetails: detailsHelpers.createInitialFinancialStatementDetails(),
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = value; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-number-format': { NumericFormat: 'NumericFormat' },
    'src/auth/admin-context': {
      useAdmin: () => ({
        review,
        setFinancialStatementDetails: (patch) => Object.assign(review.financialStatementDetails, patch),
      }),
      FINANCIAL_PERIODS: periods,
      FINANCIAL_PERIOD_LABELS: Object.fromEntries(periods.map((period) => [period, period])),
    },
    'src/auth/registration-context': { useRegistration: () => ({ application: {} }) },
    'src/auth/financial-statement-details': detailsHelpers,
    'src/utils/format-number': {},
    'src/components/iconify': { Iconify: 'Iconify' },
    'src/components/admin-ui': { TONE_COLORS: { neutral: {}, success: {} } },
    'src/components/rich-text-field': { RichTextField: 'RichTextField' },
    './financial-summary-calcs': { parseNum: Number },
    './financial-statement-report': { FinancialStatementReport: 'FinancialStatementReport' },
  };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name.startsWith('@mui/material/')) return { default: name.split('/').at(-1) };
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
  });
  return {
    review,
    get closeCount() { return closeCount; },
    render(open = true) {
      cursor = 0;
      return exports.FinancialStatementModal({ open, onClose: () => { closeCount += 1; } });
    },
  };
}

function findAll(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...findAll(node.props?.children, predicate)];
}

test('period View swaps a single dialog and returns to landing without an unfiltered report', () => {
  const harness = createHarness();
  periods.forEach((period, index) => {
    const landing = harness.render();
    assert.equal(landing.type, 'Dialog');
    assert.equal(findAll(landing, (node) => node.type === 'FinancialStatementReport').length, 0);
    const views = findAll(landing, (node) => node.type === 'Button' && node.props.children === 'View');
    assert.equal(views.length, 5);
    views[index].props.onClick();
    const report = harness.render();
    assert.equal(report.type, 'FinancialStatementReport');
    assert.equal(report.props.period, period);
    assert.equal(report.props.open, true);
    assert.equal(harness.render(false).props.period, period);
    report.props.onClose();
    assert.equal(harness.render().type, 'Dialog');
    assert.equal(harness.closeCount, 0);
  });
});

test('invalid Submit focuses and scrolls Product Line, exposes its error, and preserves the draft', () => {
  const harness = createHarness();
  harness.review.financialStatementDetails.remarks = '<p>Draft remarks</p>';
  const landing = harness.render();
  const field = findAll(landing, (node) => node.props.label === 'Product Line')[0];
  const calls = [];
  field.props.inputRef.current = {
    focus: (options) => calls.push(['focus', options.preventScroll]),
    scrollIntoView: (options) => calls.push(['scroll', options.block]),
  };
  findAll(landing, (node) => node.type === 'Button' && node.props.children === 'Submit')[0].props.onClick();
  assert.deepEqual(calls, [['focus', true], ['scroll', 'center']]);
  const updated = findAll(harness.render(), (node) => node.props.label === 'Product Line')[0];
  assert.equal(updated.props.error, true);
  assert.equal(updated.props.helperText, 'Product Line is required.');
  assert.equal(harness.closeCount, 0);
  assert.equal(harness.review.financialStatementDetails.submittedAt, null);
  assert.equal(harness.review.financialStatementDetails.remarks, '<p>Draft remarks</p>');
});
