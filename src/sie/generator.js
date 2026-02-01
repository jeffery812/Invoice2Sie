function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(/\s/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  return Number(normalized);
}

export function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0.00";
  }
  return value.toFixed(2);
}

function resolveVatAccount(vatRate, vatAccounts) {
  if (vatRate == null) return vatAccounts["0.25"] || "2641";
  const numeric = typeof vatRate === "number" ? vatRate : toNumber(vatRate);
  if (!numeric || Number.isNaN(numeric)) return vatAccounts["0.25"] || "2641";
  const normalized = numeric > 1 ? numeric / 100 : numeric;
  const key = normalized.toFixed(2);
  return vatAccounts[key] || vatAccounts["0.25"] || "2641";
}

function sumTrans(trans) {
  return trans.reduce((acc, item) => acc + item.amount, 0);
}

function formatDateYYYYMMDD(dateInput) {
  if (!dateInput) return "";
  return String(dateInput).replace(/-/g, "");
}

function getFiscalYearRange(config, invoiceDate) {
  if (config.fiscalYearStart && config.fiscalYearEnd) {
    return {
      start: formatDateYYYYMMDD(config.fiscalYearStart),
      end: formatDateYYYYMMDD(config.fiscalYearEnd)
    };
  }
  const yearFromInvoice = invoiceDate ? Number(String(invoiceDate).slice(0, 4)) : NaN;
  const year = yearFromInvoice || config.fiscalYear || new Date().getFullYear();
  return {
    start: `${year}0101`,
    end: `${year}1231`
  };
}

function accountLabel(account) {
  const labels = {
    "2440": "Leverantörsskulder",
    "2641": "Ingående moms 25%",
    "2642": "Ingående moms 12%",
    "2645": "Ingående moms 6%",
    "4010": "Inköp av varor",
    "3740": "Öresavrundning"
  };
  return labels[account] || "Konto";
}

export function generateSie({ fields, config, isCredit = false }) {
  const invoiceNumber = fields.invoice_number || "";
  const voucherSeries = config.voucherSeries || "A";
  const voucherDate = formatDateYYYYMMDD(fields.invoice_date || "");
  const supplierName = fields.supplier_name || "";
  const baseDescription = isCredit ? "Kreditfaktura" : "Leverantörsfaktura";
  let description = supplierName ? `${baseDescription} - ${supplierName}` : baseDescription;
  if (config.includeSupplierDetailsInVer) {
    const extra = [];
    if (fields.vat_number) extra.push(`VAT:${fields.vat_number}`);
    if (fields.organisation_number) extra.push(`ORG:${fields.organisation_number}`);
    if (fields.supplier_address) extra.push(`ADDR:${fields.supplier_address}`);
    if (extra.length) {
      description = `${description} | ${extra.join(" ")}`;
    }
  }

  const amountExVat = toNumber(fields.amount_ex_vat);
  const vatAmount = toNumber(fields.vat_amount);
  const totalAmount = toNumber(fields.total_amount);

  const safeAmountExVat = Number.isNaN(amountExVat) ? 0 : amountExVat;
  const safeVatAmount = Number.isNaN(vatAmount) ? 0 : vatAmount;
  const safeTotalAmount = Number.isNaN(totalAmount) ? safeAmountExVat + safeVatAmount : totalAmount;

  const vatAccount = resolveVatAccount(fields.vat_rate, config.vatAccounts || {});
  const payableAccount = config.payableAccount || "2440";
  const expenseAccount = config.expenseAccount || "4010";
  const roundingAccount = config.roundingAccount || "3740";

  const sign = isCredit ? -1 : 1;
  const trans = [
    { account: payableAccount, amount: -safeTotalAmount * sign },
    { account: vatAccount, amount: safeVatAmount * sign },
    { account: expenseAccount, amount: safeAmountExVat * sign }
  ];

  const imbalance = Number((0 - sumTrans(trans)).toFixed(2));
  if (Math.abs(imbalance) >= 0.01) {
    trans.push({ account: roundingAccount, amount: imbalance });
  }

  const lines = [];
  lines.push("#FLAGGA 0");
  lines.push("#PROGRAM \"Invoice2SIE\" 1.0");
  lines.push("#GEN \"Invoice2SIE\" 1.0");
  lines.push("#SIETYP 4");
  const fiscal = getFiscalYearRange(config, fields.invoice_date);
  if (fiscal.start && fiscal.end) {
    lines.push(`#RAR 0 ${fiscal.start} ${fiscal.end}`);
  }
  const uniqueAccounts = Array.from(new Set(trans.map((item) => item.account)));
  for (const account of uniqueAccounts) {
    lines.push(`#KONTO ${account} \"${accountLabel(account)}\"`);
  }
  lines.push(`#VER \"${voucherSeries}\" \"${invoiceNumber}\" ${voucherDate} \"${description}\"`);
  lines.push("{");
  for (const item of trans) {
    lines.push(`#TRANS ${item.account} {} ${formatCurrency(item.amount)}`);
  }
  lines.push("}");

  return lines.join("\n");
}
