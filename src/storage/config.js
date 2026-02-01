export const DEFAULT_CONFIG = {
  vatDefaultRate: 0.25,
  vatAccounts: {
    "0.25": "2641",
    "0.12": "2642",
    "0.06": "2645"
  },
  roundingAccount: "3740",
  payableAccount: "2440",
  expenseAccount: "4010",
  voucherSeries: "A",
  fiscalYear: new Date().getFullYear(),
  fiscalYearStart: "",
  fiscalYearEnd: "",
  includeSupplierDetailsInVer: false,
  apiKeyStorageKey: "geminiApiKey",
  configStorageKey: "invoice2sieConfig",
  aiModel: "",
  aiMaxTextLength: 12000,
  aiTimeoutMs: 20000,
  confidenceThreshold: 0.8
};

export function mergeConfig(overrides = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    vatAccounts: {
      ...DEFAULT_CONFIG.vatAccounts,
      ...(overrides.vatAccounts || {})
    }
  };
}
