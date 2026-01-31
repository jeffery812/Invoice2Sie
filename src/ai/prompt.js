export function buildExtractionPrompt(rawText) {
  return (
    `You are a Swedish accounting assistant. Extract invoice fields from the text below.\n\n` +
    `Return ONLY a JSON object with keys: fields, confidence, trace.\n` +
    `- fields: key-value pairs (string or number)\n` +
    `- confidence: 0-1 per field\n` +
    `- trace: page/block if available (can be empty)\n\n` +
    `Fields to extract (if present): supplier_name, organisation_number, vat_number, customer_number, ` +
    `supplier_address, invoice_number, invoice_date, due_date, amount_ex_vat, vat_amount, vat_rate, ` +
    `total_amount, payment_account, iban, bic, payment_reference, payment_terms, purchase_order_number.\n\n` +
    `Invoice text:\n${rawText}`
  );
}
