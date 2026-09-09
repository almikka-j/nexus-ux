export type FinancialStatementDetails = {
  productLine: string;
  amd: string;
  remarks: string;
  submittedAt: string | null;
};

export function createInitialFinancialStatementDetails(): FinancialStatementDetails {
  return { productLine: '', amd: '', remarks: '', submittedAt: null };
}

export function hydrateFinancialStatementDetails(
  value?: Partial<FinancialStatementDetails> | null
): FinancialStatementDetails {
  return { ...createInitialFinancialStatementDetails(), ...value };
}

export function patchFinancialStatementDetails(
  current: FinancialStatementDetails,
  patch: Partial<FinancialStatementDetails>
): FinancialStatementDetails {
  return { ...current, ...patch };
}

export function submitFinancialStatementDetails(
  current: FinancialStatementDetails,
  submittedAt: string
): FinancialStatementDetails | null {
  const productLine = current.productLine.trim();
  if (!productLine) return null;
  return { ...current, productLine, amd: current.amd.trim(), submittedAt };
}

export function selectFinancialStatementReportPeriods<T>(
  all: readonly T[], selected?: T
): readonly T[] {
  return selected === undefined ? all : [selected];
}
