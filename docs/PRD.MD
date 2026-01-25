# Invoice2SIE for Sweden — Product Requirements Document (PRD)

## 1. 产品概述

### 1.1 产品名称
Invoice2SIE for Sweden

### 1.2 一句话定义
一个 Edge 浏览器插件，使用 AI 将瑞典 PDF 发票解析为 **Visma 可导入的 SIE 文件**，用于辅助会计记账。

### 1.3 产品定位
- 会计辅助工具（Pre-bookkeeping Tool）
- 不直接接入 Visma 内部系统
- 不自动完成记账责任判断

---

## 2. 目标用户

### 2.1 核心用户
- 瑞典小公司（AB / Enskild firma）负责人
- 自由职业者
- 会计顾问（Redovisningskonsult）

### 2.2 使用场景
- 客户/供应商发送 PDF 发票
- Visma 官方发票扫描功能成本过高
- 人工录入耗时、易错

---

## 3. 设计原则（必须遵守）

1. **会计责任不自动化**
   - 工具只做字段提取与文件生成
   - 最终确认责任在用户
2. **输出必须可审计**
   - 所有字段可回溯到原 PDF
   - AI 结果必须可人工修改
3. **兼容优先于智能**
   - 严格遵循 SIE 标准
   - 不使用 Visma 私有接口

---

## 4. 功能需求（Functional Requirements）

### FR-1：PDF 发票输入

#### 输入方式
- 浏览器本地上传 PDF
- 浏览器已打开的 PDF 页面（读取内容）
- 右键菜单（Context Menu）：“解析此发票”

#### 支持范围（MVP）
- 瑞典语发票
- 单张 PDF
- 单币种（SEK）
- 页数上限与文件大小上限需配置（默认：100 页 / 20MB）

### FR-2：PDF 文本解析

#### 技术要求
- 使用 PDF.js / wasm 或等价方案
- 支持多页 PDF
- 保留原始文本顺序（用于审计）
- 记录页码与文本位置索引
- 检测是否存在文本层（扫描图片 PDF 需 OCR）

#### 输出
- 原始文本（raw text）
- 页面分段信息
- 文本定位元数据（页码 + 坐标或块索引）

#### OCR 兜底（MVP）
- 若无文本层，提示用户需要 OCR
- 支持全手动录入作为最低兜底

### FR-3：AI 字段抽取

#### AI 能力定位
- 角色：瑞典会计助理（Field Extractor）
- 禁止行为：
  - 不做会计判断
  - 不猜测缺失字段

#### 必须识别字段（MVP）

| 字段 | Key | 是否必需 |
| --- | --- | --- |
| 供应商名称 | supplier_name | ✅ |
| 组织号 | organisation_number | ⚠️ |
| VAT 号 | vat_number | ⚠️ |
| 客户号 | customer_number | ⚠️ |
| 供应商地址 | supplier_address | ⚠️ |
| 发票号 | invoice_number | ✅ |
| 发票日期 | invoice_date | ✅ |
| 到期日 | due_date | ⚠️ |
| 金额（不含税） | amount_ex_vat | ✅ |
| VAT 金额 | vat_amount | ✅ |
| VAT 税率 | vat_rate | ⚠️ |
| 总金额 | total_amount | ✅ |
| Bankgiro / Plusgiro | payment_account | ⚠️ |
| IBAN | iban | ⚠️ |
| BIC | bic | ⚠️ |
| OCR / Reference | payment_reference | ⚠️ |
| 付款条件 | payment_terms | ⚠️ |
| 采购订单号 | purchase_order_number | ⚠️ |

#### 输出格式
```json
{
  "fields": {
    "invoice_number": "12345",
    "total_amount": 12500
  },
  "confidence": {
    "invoice_number": 0.95,
    "total_amount": 0.97
  },
  "trace": {
    "invoice_number": { "page": 1, "block": 14 },
    "total_amount": { "page": 1, "block": 22 }
  }
}
```

#### 置信度策略
- 低于阈值（默认 0.8）字段必须人工确认
- 低于阈值字段未确认时禁止导出
- 组织号（organisation_number）需进行 Luhn 校验，校验失败则降为低置信

### FR-4：人工确认界面（Mandatory）

#### UI 要求
- 左侧：PDF 原文预览
- 右侧：解析字段表单
- 低置信字段高亮提示
- 所有字段可手动修改

#### 规则
- 无确认 → 不允许生成 SIE
- 修改行为必须覆盖 AI 输出
- 修改需记录为审计日志（字段、旧值、新值、时间）
- 支持“全手动录入”模式（不调用 AI）生成 SIE

### FR-5：SIE 文件生成

#### SIE 规格
- SIE4
- UTF-8 编码
- 符合瑞典会计标准
- SIE 头部必须包含 `#GEN` 标签（示例：`#GEN "Invoice2SIE" 1.0`）
 - 生成责任由本地规则引擎承担，AI 不直接生成 SIE

#### 默认分录逻辑（示例）
```
#VER "A" "12345" 20260115 "Leverantörsfaktura"
{
#TRANS 2440 {} -12500
#TRANS 2641 {} 2500
#TRANS 4010 {} 10000
}
```

#### Credit Invoice 分录示例（Kreditfaktura）
```
#VER "A" "K-12345" 20260115 "Kreditfaktura"
{
#TRANS 2440 {} 12500
#TRANS 2641 {} -2500
#TRANS 4010 {} -10000
}
```

#### 舍入处理示例
```
#VER "A" "12346" 20260116 "Leverantörsfaktura"
{
#TRANS 2440 {} -12500.01
#TRANS 2641 {} 2500.00
#TRANS 4010 {} 10000.00
#TRANS 3740 {} 0.01
}
```

#### 规则与约束（MVP）
- 仅 SEK
- 借贷方向固定：供应商发票为 2440 贷方，费用科目与 VAT 为借方
- 金额舍入为 2 位小数
- 凭证日期默认使用发票日期，缺失时允许用户选择
- 所有 `#TRANS` 必须满足借贷平衡：`SUM(#TRANS) = 0`
- 识别为 Credit Invoice 时，分录方向需反向（或按负数处理）
- 若发票包含外币信息，必须记录汇率与折算后的 SEK 金额（标记为非 MVP）
 - AI 仅提供字段抽取结果，最终 SIE 由规则引擎生成并可审计

#### VAT 场景（MVP）
- 标准 VAT（25%）
- 低税率与零税率识别为可选扩展
- 不处理反向 VAT（未来版本）

#### VAT 科目映射（默认示例）

| VAT 税率 | VAT 科目 |
| --- | --- |
| 25% | 2641 |
| 12% | 2642 |
| 6% | 2645 |

#### 可配置项
- 科目映射（4010 / 2641 / 2440）
- VAT 科目映射表（默认示例：25%→2641，12%→2642，6%→2645）
- 允许用户上传自定义 Kontoplan（CSV/JSON）用于科目匹配
- 凭证系列（A/B/C）
- 会计期间
- 默认 VAT 税率
- 舍入科目（默认 3740，Öresavrundning）

### FR-6：SIE 文件输出与下载

#### 导出方式
- 生成 `.sie` 文件并触发浏览器下载
- 文件命名规则：`invoice_{invoice_number}_{yyyymmdd}.sie`

#### 校验
- 生成前进行格式校验
- 校验失败必须提示用户并阻止导出
- 检查舍入差额，必要时自动写入 3740 以平衡分录

---

## 5. 非功能需求（Non-Functional Requirements）

### 5.1 安全与隐私
- PDF 不自动上传
- AI API 调用需用户明确授权
- API Key 由用户在设置页输入并存储于 `chrome.storage.local`（避免明文暴露在前端）
- 本地缓存与日志保留期限可配置（默认 30 天）

### 5.2 性能
- 单 PDF 解析时间 ≤ 3 秒（不含 AI 网络延迟）
- AI 超时需提示用户
- 大文件需提示性能风险

### 5.3 可维护性
- AI Provider 抽象层设计
- SIE 生成模块独立
- 可配置项持久化

### 5.4 可靠性与降级
- AI 调用失败允许手动录入字段并继续生成
- PDF 解析失败需提供重试与诊断提示
- 离线模式下允许手动录入并生成 SIE

---

## 6. 技术架构（建议）

```
Edge Extension (Manifest V3)
├── UI Layer
├── PDF Parser
├── AI Adapter
│   ├── Gemini
│   └── Future Providers
├── Validation & Review
├── Audit Log
└── SIE Generator
```

### 6.1 权限与限制
- 需要的扩展权限：文件读取、下载、网络请求
- 不使用任意网页注入权限（除非读取浏览器内 PDF）
- 插件需在离线状态可打开已下载 PDF 并允许手工录入

---

## 7. 不在范围内（Out of Scope）

- ❌ 自动记账
- ❌ 直接操作 Visma 系统
- ❌ 无人工确认的自动导入
- ❌ 会计或税务建议
- ❌ 反向 VAT 与复杂税务场景
 - ❌ AI 直接生成 SIE（仅作为未来可选能力）

---

## 8. 风险与对策

| 风险 | 级别 | 对策 |
| --- | --- | --- |
| AI 误解析 | 高 | 人工确认 + 置信度阈值 |
| 发票格式多样 | 中 | MVP 限定 + 模板学习（后续） |
| 用户误用 | 中 | 明确免责声明 + 阻断逻辑 |
| Visma 政策变化 | 低 | 依赖 SIE 标准 |
| VAT 规则复杂 | 中 | MVP 限定场景 |
| 供应商名称不匹配 | 中 | 显示原文与建议值，允许手动修正 |
| Credit Invoice 识别错误 | 高 | 强制用户确认发票类型 |
| 舍入处理缺失导致不平 | 高 | 自动写入 3740 并校验平衡 |

---

## 9. MVP 里程碑

### 阶段 1
- PDF → 文本
- AI → 字段 JSON
- 人工确认
- SIE 导出

### 阶段 2
- 批量处理
- 发票模板学习
- 科目配置模板
- 低税率 / 零税率 VAT 支持

---

## 10. 合规声明（必须显示）
本工具为会计辅助工具，不替代会计判断责任。
用户对导入 Visma 的会计数据承担全部法律责任。
