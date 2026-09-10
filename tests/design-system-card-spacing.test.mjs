import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/sections/admin/design-system-view.tsx', import.meta.url),
  'utf8'
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
});

function renderDesignSystemView() {
  const jsx = (type, props) => ({ type, props });
  const tone = { bg: '#fff', border: '#ddd', text: '#111', solid: '#000' };
  const modules = {
    react: { useState: (initial) => [initial, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-number-format': { NumericFormat: 'NumericFormat' },
    'src/components/iconify': { Iconify: 'Iconify' },
    'src/components/custom-dialog': {
      ConfirmDialog: 'ConfirmDialog',
      confirmDialogActionToneSx: {},
    },
    'src/components/admin-ui': {
      TONE_COLORS: {
        success: tone,
        warning: tone,
        error: tone,
        neutral: tone,
        info: tone,
      },
      STEP_TONE: {},
      StatusBadge: 'StatusBadge',
      AiReviewCard: 'AiReviewCard',
      adminCardSx: {},
      AI_REVIEW_RISK_STYLES: { watch: {} },
      outlinedNavyButtonSx: {},
      iconButtonBorderedSx: {},
    },
    'src/components/collapsible-section': {
      CollapsibleSection: 'CollapsibleSection',
      CollapsibleSectionBadge: 'CollapsibleSectionBadge',
    },
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

  return exports.DesignSystemView();
}

function findAll(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...findAll(node.props?.children, predicate)];
}

test('card header showcase separates the example card and guidance callout by 16px', () => {
  const tree = renderDesignSystemView();
  const section = findAll(
    tree,
    (node) =>
      typeof node.type === 'function' &&
      node.type.name === 'SectionCard' &&
      node.props.title === 'Cards & containers — the CollapsibleSection header contract'
  )[0];

  assert.ok(section, 'Cards & containers showcase section should render');
  assert.equal(section.props.children.type, 'Stack');
  assert.equal(section.props.children.props.spacing, 2);
});
