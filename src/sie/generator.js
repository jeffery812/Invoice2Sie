function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(/\\s/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  return Number(normalized);
}

export function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0.00";
  }
  return value.toFixed(2);
}

function resolveVatAccount(vatRate, vatAccounts) {
  if (vatRate == null) return vatAccounts[\"0.25\"] || \"2641\";
  const numeric = typeof vatRate === \"number\" ? vatRate : toNumber(vatRate);
  if (!numeric || Number.isNaN(numeric)) return vatAccounts[\"0.25\"] || \"2641\";
  const normalized = numeric > 1 ? numeric / 100 : numeric;
  const key = normalized.toFixed(2);
  return vatAccounts[key] || vatAccounts[\"0.25\"] || \"2641\";
}

function sumTrans(trans) {
  return trans.reduce((acc, item) => acc + item.amount, 0);
}

export function generateSie({ fields, config, isCredit = false }) {
  const invoiceNumber = fields.invoice_number || \"\";\n  const voucherSeries = config.voucherSeries || \"A\";\n  const voucherDate = String(fields.invoice_date || \"\").replace(/-/g, \"\");\n  const description = isCredit ? \"Kreditfaktura\" : \"Leverantörsfaktura\";\n\n  const amountExVat = toNumber(fields.amount_ex_vat);\n  const vatAmount = toNumber(fields.vat_amount);\n  const totalAmount = toNumber(fields.total_amount);\n\n  const safeAmountExVat = Number.isNaN(amountExVat) ? 0 : amountExVat;\n  const safeVatAmount = Number.isNaN(vatAmount) ? 0 : vatAmount;\n  const safeTotalAmount = Number.isNaN(totalAmount) ? safeAmountExVat + safeVatAmount : totalAmount;\n\n  const vatAccount = resolveVatAccount(fields.vat_rate, config.vatAccounts || {});\n  const payableAccount = config.payableAccount || \"2440\";\n  const expenseAccount = config.expenseAccount || \"4010\";\n  const roundingAccount = config.roundingAccount || \"3740\";\n\n  const sign = isCredit ? -1 : 1;\n  const trans = [\n    { account: payableAccount, amount: -safeTotalAmount * sign },\n    { account: vatAccount, amount: safeVatAmount * sign },\n    { account: expenseAccount, amount: safeAmountExVat * sign }\n  ];\n\n  const imbalance = Number((0 - sumTrans(trans)).toFixed(2));\n  if (Math.abs(imbalance) >= 0.01) {\n    trans.push({ account: roundingAccount, amount: imbalance });\n  }\n\n  const lines = [];\n  lines.push(`#VER \"${voucherSeries}\" \"${invoiceNumber}\" ${voucherDate} \"${description}\"`);\n  lines.push(\"{\");\n  for (const item of trans) {\n    lines.push(`#TRANS ${item.account} {} ${formatCurrency(item.amount)}`);\n  }\n  lines.push(\"}\");\n\n  return lines.join(\"\\n\");\n}
