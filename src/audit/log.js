export function createAuditEntry(field, beforeValue, afterValue) {
  return {
    field,
    beforeValue,
    afterValue,
    timestamp: new Date().toISOString()
  };
}
