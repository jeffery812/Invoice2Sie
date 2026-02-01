# Invoice2SIE 🇸🇪

**Invoice2SIE** is a Microsoft Edge extension designed for the Swedish market. It bridges the gap between static PDF invoices and accounting systems like Visma by converting unstructured data into audit-ready **SIE4 files**.

> **Audit-First Design**: AI handles the heavy lifting of extraction, while local deterministic rules ensure your SIE vouchers are always balanced and compliant.

## ✨ Key Features
- **Local PDF Processing**: Uses `PDF.js` to read text layers without uploading files to a middleman.
- **AI-Powered Extraction**: Leverages Google Gemini to identify complex Swedish invoice fields (OCR-nummer, VAT rates, Org.nr).
- **Audit-Ready**: Manual review UI ensures you remain the "Human in the Loop" as required by *Bokföringslagen*.
- **Smart SIE Generation**: Automatic balance checks, rounding support (`3740`), and Swedish VAT account mapping.
- **Privacy-Centric**: Your API key and invoice data never leave your browser (except to Google's API).

## 🛠 Prerequisites
- **Microsoft Edge** (Chromium-based)
- **Google Gemini API Key** (Free tier available)

## 🔑 Get Your API Key (The Fast Way)
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Click **"Get API key"** on the left sidebar.
3. Click **"Create API key in new project"**.
4. Copy the key and paste it into the Extension's settings.

*Note: For enterprise users who prefer Google Cloud Console, see [Advanced Setup](docs/setup-gcp.md).*

## 🚀 Installation (Developer Mode)
1. **Build**: `npm run build`
2. **Load**: Go to `edge://extensions`, enable "Developer mode", and click "Load unpacked".
3. **Select**: Point to the `dist/` directory.

## 📦 Packaging for Sharing

### Quick package (keep current version)
1. Build and package:
   - `npm run build`
   - `npm run pack`
2. Output file:
   - `dist-pack/Invoice2SIE-v<version>.zip`

### Interactive release package (choose version bump)
Run:

`npm run release:pack`

You will be prompted to choose:
1. Keep current version `x.y.z`
2. Patch bump `x.y.(z+1)`
3. Minor bump `x.(y+1).0`
4. Major bump `(x+1).0.0`

The script updates `extension/manifest.json` and `package.json`, then builds and packages automatically.

## 📖 How to Use
1. Click the **Invoice2SIE** icon in your toolbar.
2. Enter your **API Key** (stored securely in `chrome.storage.local`).
3. Open/Select a Swedish PDF invoice.
4. Review the extracted fields. **Pro-tip: Check the VAT account mapping.**
5. Click **"Generate SIE & Download"**.
6. Import the `.sie` file directly into **Visma** or other Swedish accounting software.

## 🛡 Security & Privacy
- **Direct Connection**: The extension communicates directly with Google's API. No third-party servers.
- **No Data Training**: If using a Gemini "Paid" tier, your data is not used to train Google's models. 
- **Local Storage**: The API key is stored locally and is never synced or exposed.

## 📝 Technical Notes
- **SIE Standard**: Follows the SIE4 specification.
- **OCR**: Currently requires a text layer in the PDF. Scanned images require a pre-processing OCR step (coming soon).
