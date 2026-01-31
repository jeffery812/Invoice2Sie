function parseAmount(line) {
  const parts = line.trim().split(/\s+/);
  const amount = parts[parts.length - 1];
  return Number(amount);
}

export function validateTransBalance(sieContent) {
  const lines = sieContent.split("\n");
  let sum = 0;
  for (const line of lines) {
    if (line.startsWith("#TRANS")) {
      const amount = parseAmount(line);
      if (!Number.isNaN(amount)) {
        sum += amount;
      }
    }
  }
  return Math.abs(sum) < 0.01;
}
