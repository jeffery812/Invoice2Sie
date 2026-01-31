export function hasTextLayer(pageTextItems = []) {
  return Array.isArray(pageTextItems) && pageTextItems.length > 0;
}
