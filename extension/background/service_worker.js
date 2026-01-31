// Minimal background service worker for MV3.

const MENU_ID = "invoice2sie-parse-pdf";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Parse this invoice",
    contexts: ["page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: "INVOICE2SIE_PARSE_REQUEST",
    url: info.pageUrl || tab.url || ""
  });
});
