chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "INVOICE2SIE_PARSE_REQUEST") {
    return;
  }
  // Placeholder: actual PDF extraction will be added when PDF.js integration lands.
  console.info("Invoice2SIE parse requested for URL:", message.url);
});
