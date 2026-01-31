import { parsePdfFile } from "../../src/pdf/pdf_parser.js";
import { extractFields } from "../../src/ai/gemini.js";
import { postProcessExtraction } from "../../src/ai/postprocess.js";
import { DEFAULT_CONFIG, mergeConfig } from "../../src/storage/config.js";
import { getFromStorage, setInStorage } from "../../src/storage/store.js";
import { generateSie } from "../../src/sie/generator.js";
import { validateTransBalance } from "../../src/sie/validator.js";

const inputEl = document.getElementById("pdf-input");
const apiKeyEl = document.getElementById("api-key");
const saveKeyBtn = document.getElementById("save-key-btn");
const parseBtn = document.getElementById("parse-btn");
const generateBtn = document.getElementById("generate-btn");
const fieldsEl = document.getElementById("fields-json");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
}

function setFields(value) {
  fieldsEl.value = value;
}

function readFields() {
  try {
    return JSON.parse(fieldsEl.value);
  } catch (error) {
    throw new Error("字段 JSON 解析失败，请检查格式。");
  }
}

async function saveApiKey() {
  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) {
    setStatus("API Key 不能为空。");
    return;
  }
  await setInStorage({ [DEFAULT_CONFIG.apiKeyStorageKey]: apiKey });
  setStatus("API Key 已保存。");
}

saveKeyBtn.addEventListener("click", saveApiKey);

parseBtn.addEventListener("click", async () => {
  const file = inputEl.files?.[0];
  if (!file) {
    setStatus("请先选择 PDF 文件。");
    return;
  }

  parseBtn.disabled = true;
  setStatus("解析中...");
  try {
    const result = await parsePdfFile(file);
    if (result.error) {
      setStatus(result.error);
      return;
    }

    if (result.needsOcr) {
      setStatus("未检测到文本层，建议 OCR 或手动录入。");
      setFields(JSON.stringify({ fields: {}, confidence: {}, trace: {} }, null, 2));
      return;
    }

    const stored = await getFromStorage([
      DEFAULT_CONFIG.apiKeyStorageKey,
      DEFAULT_CONFIG.configStorageKey
    ]);
    const apiKey = stored[DEFAULT_CONFIG.apiKeyStorageKey];
    const config = mergeConfig(stored[DEFAULT_CONFIG.configStorageKey] || {});

    if (!apiKey) {
      setStatus("未找到 API Key，请先保存后再解析。");
      return;
    }

    let aiInput = result.rawText;
    if (aiInput.length > config.aiMaxTextLength) {
      aiInput = aiInput.slice(0, config.aiMaxTextLength);
      setStatus("文本过长，已截断后再发送至 AI。");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
    let aiResult;
    try {
      aiResult = await extractFields({
        rawText: aiInput,
        apiKey,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    const finalResult = postProcessExtraction(aiResult, config.confidenceThreshold);
    setFields(JSON.stringify(finalResult, null, 2));
    if (result.rawText.length <= config.aiMaxTextLength) {
      setStatus(`解析完成。文本长度：${result.rawText.length}`);
    }
  } catch (error) {
    setStatus(`解析失败：${error?.message || error}`);
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
      setStatus("SIE 借贷不平，已阻止导出。");
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
    setStatus("SIE 已生成并触发下载。");
  } catch (error) {
    setStatus(`生成失败：${error?.message || error}`);
  } finally {
    generateBtn.disabled = false;
  }
});
