# Invoice2SIE — 实现步骤拆解（PO 视角）

## 0. 目标与范围确认
- 明确 MVP 仅支持：瑞典语 PDF、单张、SEK、本地规则生成 SIE
- 明确不可做项：AI 直接生成 SIE、反向 VAT、无确认自动导入
- 确定成功标准：可导入 Visma，SIE 校验通过，借贷平衡

---

## 1. 基础架构与项目脚手架
1.1 选型与初始化
- Edge Extension (Manifest V3)
- UI 框架（轻量化，支持表单与 PDF 预览）
- PDF 解析库（PDF.js / wasm）
- 状态管理与本地存储（chrome.storage.local）

1.2 项目结构
- UI Layer / PDF Parser / AI Adapter / Validation & Review / Audit Log / SIE Generator

---

## 2. PDF 读取与解析
2.1 输入方式
- 本地上传 PDF
- 已打开 PDF 页面读取
- 右键菜单（Context Menu）解析当前 PDF

2.2 解析输出
- 原始文本 raw text
- 页码与块索引（trace 可回溯）
- 文本层存在性检测（区分扫描 PDF）

2.3 OCR 兜底流程（MVP）
- 无文本层时提示用户需要 OCR
- 默认走手动录入模式生成 SIE
- 未来可接入本地 OCR 或外部 OCR 服务

2.4 性能目标
- 单 PDF 解析 ≤ 3 秒（不含 AI）

---

## 3. AI 字段抽取（只做结构化输出）
3.1 字段定义
- MVP 必填：供应商名称、发票号、发票日期、金额（不含税）、VAT 金额、总金额
- 可选：组织号、VAT 号、客户号、地址、付款账号、IBAN/BIC、OCR、付款条件等

3.2 置信度与审计
- 置信度低于 0.8 强制人工确认
- 记录 trace：字段 -> 页码/块索引
- 组织号 Luhn 校验失败降为低置信

3.3 失败降级
- AI 调用失败可全手动录入

---

## 4. 人工确认与审计
4.1 UI
- 左侧 PDF 原文预览
- 右侧字段表单
- 低置信高亮

4.2 规则
- 未确认禁止导出
- 修改覆盖 AI 输出
- 审计日志记录（字段、旧值、新值、时间）

---

## 5. SIE 规则引擎（本地生成）
5.1 SIE 头与结构
- SIE4 + UTF-8
- 必须含 `#GEN "Invoice2SIE" 1.0`

5.2 分录逻辑（MVP）
- 供应商发票：2440 贷方，费用科目与 VAT 为借方
- Credit Invoice 反向处理
- SUM(#TRANS) = 0 校验
- 金额保留 2 位小数
- 舍入差额写入 3740

5.3 VAT 科目映射
- 25% → 2641
- 12% → 2642
- 6% → 2645

5.4 可配置项
- 科目映射（含自定义 Kontoplan CSV/JSON）
- 凭证系列、会计期间、默认 VAT 税率

---

## 6. SIE 导出与校验
6.1 导出
- 生成 `.sie` 文件并下载
- 命名：`invoice_{invoice_number}_{yyyymmdd}.sie`

6.2 校验
- 借贷平衡
- 字段完整性
- 舍入处理
- 失败阻断导出

---

## 7. 设置与安全
- 用户输入 Gemini API Key
- 存储于 `chrome.storage.local`
- 本地缓存/日志保留期限可配置（默认 30 天）

---

## 8. 测试与验收
8.1 测试用例
- 标准 VAT 25% 发票
- 低税率 12%/6% 发票
- Credit Invoice
- 舍入差额
- 缺字段与低置信

8.2 验收标准
- Visma 可导入
- SIE 校验通过
- 审计可追溯

---

## 9. 里程碑
- 里程碑 1：PDF 解析 + 字段抽取
- 里程碑 2：人工确认 UI + 审计日志
- 里程碑 3：SIE 规则引擎 + 导出
- 里程碑 4：完整流程联调 + 验收
