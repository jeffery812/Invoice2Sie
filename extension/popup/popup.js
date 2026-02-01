import { parsePdfFile } from "../../src/pdf/pdf_parser.js";
import { extractFields } from "../../src/ai/gemini.js";
import { postProcessExtraction } from "../../src/ai/postprocess.js";
import { DEFAULT_CONFIG, mergeConfig } from "../../src/storage/config.js";
import { getFromStorage, setInStorage } from "../../src/storage/store.js";
import { generateSie } from "../../src/sie/generator.js";
import { validateTransBalance } from "../../src/sie/validator.js";

const inputEl = document.getElementById("pdf-input");
const apiKeyEl = document.getElementById("api-key");
const apiModelEl = document.getElementById("api-model");
const fiscalStartEl = document.getElementById("fiscal-start");
const fiscalEndEl = document.getElementById("fiscal-end");
const includeSupplierDetailsEl = document.getElementById("include-supplier-details");
const saveKeyBtn = document.getElementById("save-key-btn");
const parseBtn = document.getElementById("parse-btn");
const generateBtn = document.getElementById("generate-btn");
const fieldsEl = document.getElementById("fields-json");
const statusEl = document.getElementById("status");

function setStatus(message) {
  if (!statusEl) {
    console.warn("status element missing:", message);
    return;
  }
  statusEl.textContent = message;
}

function setFields(value) {
  fieldsEl.value = value;
}

function readFields() {
  try {
    return JSON.parse(fieldsEl.value);
  } catch (error) {
    throw new Error("Fields JSON parse failed. Please check the format.");
  }
}

let modelFetchTimer = null;

function setModelOptions(models, selected) {
  if (!apiModelEl) return;
  apiModelEl.innerHTML = "";
  if (!models.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No available models";
    apiModelEl.appendChild(option);
    return;
  }
  for (const name of models) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (selected && selected === name) {
      option.selected = true;
    }
    apiModelEl.appendChild(option);
  }
}

async function fetchModels(apiKey) {
  if (!apiKey) {
    setModelOptions([], "");
    return;
  }
  setStatus("Loading model list...");
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model list fetch failed: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    const models = (data.models || [])
      .filter((model) => Array.isArray(model.supportedGenerationMethods))
      .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
      .map((model) => model.name || "")
      .filter(Boolean)
      .map((name) => (name.startsWith("models/") ? name.slice("models/".length) : name));
    const stored = await getFromStorage([DEFAULT_CONFIG.configStorageKey]);
    const storedConfig = stored[DEFAULT_CONFIG.configStorageKey] || {};
    setModelOptions(models, storedConfig.aiModel);
    setStatus("Model list updated.");
  } catch (error) {
    setModelOptions([], "");
    setStatus(error?.message || "Model list fetch failed.");
  }
}

function scheduleModelRefresh(apiKey) {
  if (modelFetchTimer) {
    clearTimeout(modelFetchTimer);
  }
  modelFetchTimer = setTimeout(() => {
    fetchModels(apiKey);
  }, 500);
}

async function saveConfigPartial(partialConfig) {
  const stored = await getFromStorage([DEFAULT_CONFIG.configStorageKey]);
  const current = stored[DEFAULT_CONFIG.configStorageKey] || {};
  await setInStorage({
    [DEFAULT_CONFIG.configStorageKey]: {
      ...current,
      ...partialConfig
    }
  });
}

async function saveApiKey() {
  if (!apiKeyEl || !saveKeyBtn || !apiModelEl) {
    return;
  }
  const apiKey = apiKeyEl.value.trim();
  const model = apiModelEl.value;
  const fiscalYearStart = fiscalStartEl?.value || "";
  const fiscalYearEnd = fiscalEndEl?.value || "";
  const includeSupplierDetailsInVer = Boolean(includeSupplierDetailsEl?.checked);
  if (!apiKey) {
    setStatus("API Key is required.");
    return;
  }
  if (!model) {
    setStatus("Model name is required.");
    return;
  }
  saveKeyBtn.disabled = true;
  setStatus("Saving...");
  try {
    await setInStorage({
      [DEFAULT_CONFIG.apiKeyStorageKey]: apiKey,
      [DEFAULT_CONFIG.configStorageKey]: {
        aiModel: model,
        fiscalYearStart,
        fiscalYearEnd,
        includeSupplierDetailsInVer
      }
    });
    apiKeyEl.value = "";
    apiKeyEl.placeholder = "Saved (hidden for security)";
    setStatus("API Key and model saved to chrome.storage.local.");
    scheduleModelRefresh(apiKey);
  } catch (error) {
    setStatus(`Save failed: ${error?.message || error}`);
  } finally {
    saveKeyBtn.disabled = false;
  }
}

if (saveKeyBtn) {
  saveKeyBtn.addEventListener("click", saveApiKey);
}

async function initPopup() {
  console.info("Invoice2SIE popup loaded.");
  setStatus("Popup loaded.");
  const stored = await getFromStorage([
    DEFAULT_CONFIG.apiKeyStorageKey,
    DEFAULT_CONFIG.configStorageKey
  ]);
  if (stored[DEFAULT_CONFIG.apiKeyStorageKey]) {
    apiKeyEl.placeholder = "Saved (hidden for security)";
    setStatus("Saved API Key detected.");
    scheduleModelRefresh(stored[DEFAULT_CONFIG.apiKeyStorageKey]);
  } else {
    apiKeyEl.placeholder = "Enter and save";
  }
  const storedConfig = stored[DEFAULT_CONFIG.configStorageKey] || {};
  if (storedConfig.aiModel) {
    apiModelEl.value = storedConfig.aiModel;
  }
  if (fiscalStartEl) {
    fiscalStartEl.value = storedConfig.fiscalYearStart || "";
  }
  if (fiscalEndEl) {
    fiscalEndEl.value = storedConfig.fiscalYearEnd || "";
  }
  if (includeSupplierDetailsEl) {
    includeSupplierDetailsEl.checked = Boolean(storedConfig.includeSupplierDetailsInVer);
  }
}

initPopup();

if (apiKeyEl) {
  apiKeyEl.addEventListener("input", () => {
    const apiKey = apiKeyEl.value.trim();
    if (apiKey.length > 10) {
      scheduleModelRefresh(apiKey);
    }
  });
}

if (apiModelEl) {
  apiModelEl.addEventListener("change", async () => {
    const model = apiModelEl.value;
    if (!model) return;
    try {
      await saveConfigPartial({ aiModel: model });
      setStatus(`Model saved: ${model}`);
    } catch (error) {
      setStatus(`Failed to save model: ${error?.message || error}`);
    }
  });
}

parseBtn.addEventListener("click", async () => {
  const file = inputEl.files?.[0];
  if (!file) {
    setStatus("Please select a PDF file.");
    return;
  }

  parseBtn.disabled = true;
  setStatus("Parsing...");
  console.info("Parse clicked:", {
    fileName: file.name,
    fileSize: file.size
  });
  try {
    const result = await parsePdfFile(file);
    console.info("PDF parse result:", result);
    if (result.error) {
      setStatus(result.error);
      return;
    }

    if (result.needsOcr) {
      setStatus("No text layer detected. Use OCR or manual input.");
      setFields(JSON.stringify({ fields: {}, confidence: {}, trace: {} }, null, 2));
      return;
    }

    const stored = await getFromStorage([
      DEFAULT_CONFIG.apiKeyStorageKey,
      DEFAULT_CONFIG.configStorageKey
    ]);
    let apiKey = stored[DEFAULT_CONFIG.apiKeyStorageKey];
    const config = mergeConfig(stored[DEFAULT_CONFIG.configStorageKey] || {});

    if (!apiKey && apiKeyEl?.value?.trim()) {
      apiKey = apiKeyEl.value.trim();
      setStatus("Using current API Key (not saved).");
    }
    if (!apiKey) {
      setStatus("API Key not found. Save it before parsing.");
      return;
    }
    const selectedModel = apiModelEl?.value || "";
    const modelToUse = config.aiModel || selectedModel;
    if (!modelToUse) {
      setStatus("Model not set. Save or select a model first.");
      return;
    }

    let aiInput = result.rawText;
    if (aiInput.length > config.aiMaxTextLength) {
      aiInput = aiInput.slice(0, config.aiMaxTextLength);
      setStatus("Text too long. Truncated before sending to AI.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    let aiResult;
    try {
      aiResult = await extractFields({
        rawText: aiInput,
        apiKey,
        model: modelToUse,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    console.info("AI extraction result:", aiResult);
    const finalResult = postProcessExtraction(aiResult, config.confidenceThreshold);
    setFields(JSON.stringify(finalResult, null, 2));
    if (result.rawText.length <= config.aiMaxTextLength) {
      setStatus(`Parsing complete. Text length: ${result.rawText.length}`);
    }
  } catch (error) {
    setStatus(`Parsing failed: ${error?.message || error}`);
  } finally {
    parseBtn.disabled = false;
  }
});

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true;
  try {
    const payload = readFields();
    const fields = payload.fields || {};
    const isCredit = Number(fields.total_amount) < 0;
    const { [DEFAULT_CONFIG.configStorageKey]: storedConfig } = await getFromStorage([
      DEFAULT_CONFIG.configStorageKey
    ]);
    const config = mergeConfig(storedConfig || {});
    const sie = generateSie({
      fields,
      config,
      isCredit
    });

    if (!validateTransBalance(sie)) {
      setStatus("SIE is not balanced. Export blocked.");
      return;
    }

    const blob = new Blob([sie], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const name = `invoice_${fields.invoice_number || "unknown"}_${String(
      fields.invoice_date || ""
    ).replace(/-/g, "")}.sie`;

    chrome.downloads.download({
      url,
      filename: name,
      saveAs: true
    });
    setStatus("SIE generated and download triggered.");
  } catch (error) {
    setStatus(`Generation failed: ${error?.message || error}`);
  } finally {
    generateBtn.disabled = false;
  }
});
