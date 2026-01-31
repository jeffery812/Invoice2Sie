export async function getFromStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

export async function setInStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}
