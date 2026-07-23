# 诊前一步第一阶段实施计划

> 架构基准：《诊前一步：用户流程与信息架构（Codex 执行版 V1.0）》；本文件不扩展产品边界。

## 1. 仓库与技术选择

- 仓库现状：全新 Git 仓库，无提交、源码、Node 约束或构建脚本。
- 运行环境：Node `v24.15.0`。
- 技术栈：React + Vite + TypeScript + React Router `HashRouter`。
- 状态方案：React Context + Reducer，保持唯一全局状态源。
- 样式方案：`src/styles` 中的普通 CSS，移动端优先，桌面内容最大宽度 960px，补充打印样式。
- 本轮范围：工程骨架、全部路由、统一类型、基础全局状态、localStorage 容错持久化、虚构演示数据、空/错误/规划中状态、基础响应式布局。
- 明确不做：诊断、报告解读、用药建议、在线问诊、医院/AI 接口、真实多人协作、支付、医保办理、云同步及其他未定义能力。

## 2. 页面与路由映射

| 路由 | 页面 | 第一阶段交付 |
| --- | --- | --- |
| `/` | `HomePage` | 当前事件/待办/历史的演示态与首次空态 |
| `/patients` | `PatientsPage` | 家庭成员列表与空态 |
| `/patients/new` | `PatientFormPage` | 创建表单骨架 |
| `/patients/:patientId` | `PatientDetailPage` | 患者资料、历史事件、无效 ID 状态 |
| `/patients/:patientId/edit` | `PatientFormPage` | 编辑表单骨架、无效 ID 状态 |
| `/visits` | `VisitsPage` | 事件分组展示与空态 |
| `/visits/new` | `VisitFormPage` | 创建事件表单骨架 |
| `/visits/:visitId` | `VisitOverviewPage` | 事件概览、进度、固定步骤入口 |
| `/visits/:visitId/prep` | `PrepPage` | 四个诊前模块的骨架/空态 |
| `/visits/:visitId/notes` | `DoctorNotesPage` | 五类用户记录骨架/空态 |
| `/visits/:visitId/tasks` | `TasksPage` | 行动任务骨架/空态 |
| `/visits/:visitId/summary` | `SummaryPage` | 实时一页摘要与打印/另存 PDF 入口 |
| `/visits/:visitId/inpatient/tasks` | `InpatientTasksPage` | 住院任务板骨架；非住院事件显示不可用状态 |
| `/visits/:visitId/inpatient/handoff` | `HandoffPage` | 陪护交接骨架；非住院事件显示不可用状态 |
| `/visits/:visitId/inpatient/discharge` | `DischargePage` | 出院清单骨架；非住院事件显示不可用状态 |
| `/history` | `HistoryPage` | 跨患者历史过滤视图骨架 |
| `/settings` | `SettingsPage` | 本地数据说明、演示数据加载/清除、角色预览说明 |
| `/share-preview/:visitId` | `SharePreviewPage` | 本地角色可见范围模拟说明 |
| `*` | `NotFoundPage` | 返回首页/最近事件 |

导航约束：移动端底栏仅 `/`、`/patients`、`/visits`、`/settings`；事件步骤固定为概览 → 诊前准备 → 医生说明 → 行动清单 → 摘要；住院入口仅在住院事件展示。

## 3. 核心实体映射

| 实体 | 关键关系与约束 |
| --- | --- |
| `Patient` | 1:N `VisitEvent`；保存过敏、当前用药、关键病史与可选紧急联系人 |
| `VisitEvent` | 必须关联 `Patient`；承载一次门诊、复诊或住院事件 |
| `Symptom` | N:1 `VisitEvent` |
| `MedicalDocument` | 关联 `Patient`，可选关联 `VisitEvent`，首版仅元信息 |
| `DoctorNote` | N:1 `VisitEvent`；明确为用户记录，可关联转化后的任务 ID |
| `ActionTask` | 关联 `VisitEvent` 与 `Patient`，保留来源类型/来源 ID |
| `InpatientTask` | 仅住院事件 |
| `HandoffEntry` | 仅住院事件 |
| `DischargeItem` | 仅住院事件，可关联行动任务 |

所有实体统一 `id`、`createdAt`、`updatedAt`；日期为 ISO 字符串；可选值保存为 `undefined`；表单草稿单独定义。

## 4. 状态模型映射

事件状态：`draft → preparing → in_progress → follow_up → completed → archived`；归档事件允许恢复为 `completed`。状态迁移由 domain 规则校验，结束事件前对未完成任务作显式提示。

全局状态包含：

- 应用元信息 `meta`：`schemaVersion`、`lastOpenedVisitId`、`demoLoaded`。
- 九类实体集合及页面草稿。
- 启动状态：`loading | ready | corrupted`。
- 保存状态：`idle | saving | saved | error` 与明确错误信息。
- 角色预览：`primary | remoteFamily | companion | redacted`，仅前端模拟。

## 5. localStorage 键映射

| 键 | 数据 |
| --- | --- |
| `zqy.app.meta` | `AppMeta` |
| `zqy.patients` | `Patient[]` |
| `zqy.visits` | `VisitEvent[]` |
| `zqy.symptoms` | `Symptom[]` |
| `zqy.documents` | `MedicalDocument[]` |
| `zqy.doctorNotes` | `DoctorNote[]` |
| `zqy.tasks` | `ActionTask[]` |
| `zqy.inpatient` | `{ tasks, handoffs, dischargeItems }` |
| `zqy.drafts` | `DraftState` |

`storageService` 统一读取、校验 schema、捕获 JSON/写入错误；页面和组件不直接调用 localStorage。当前 schema 版本为 `1`。

## 6. 组件目录映射

- `src/pages`：全部路由页面，仅组合组件和调用 store/domain。
- `src/components/common`：`AppShell`、`PageHeader`、`EmptyState`、`StatusPanel`、`MedicalDisclaimer`、`SaveStatus` 等。
- `src/components/patient`：患者卡片/表单/用药与过敏编辑器（后续细化）。
- `src/components/visit`：`VisitCard`、`VisitStepper`、进度卡。
- `src/components/prep`：症状、资料、材料、问题模块（本轮为模块卡骨架）。
- `src/components/notes`：医生说明分类与转任务入口（后续细化）。
- `src/components/tasks`：任务卡、筛选、编辑器（本轮为列表骨架）。
- `src/components/summary`：摘要分区、隐私模式、打印操作（后续细化）。
- `src/components/inpatient`：住院任务、交接、出院清单（本轮为条件骨架）。
- `src/domain`：进度、状态迁移与四种角色/脱敏字段过滤规则；复诊继承由 store 统一编排。
- `src/store`：Context、Reducer、actions/selectors 与持久化编排。
- `src/services`：`storageService`、演示数据服务；导出服务后续实现。
- `src/types`：实体、枚举、草稿、状态类型。
- `src/data`：虚构演示数据与静态模板。
- `src/styles`：全局响应式与打印样式。

## 7. 文档实施顺序映射

1. Phase 0 仓库检查：本文件与技术选择。
2. Phase 1 应用骨架：Vite/React/TS、HashRouter、AppShell、导航、全部路由、404。
3. Phase 2 数据与状态：types、store、storageService、schemaVersion、演示数据和损坏容错。
4. Phase 3 患者与事件：已实现患者创建/编辑/安全删除、事件创建、表单草稿恢复与基础校验；事件状态迁移已接入概览页。
5. Phase 4 主流程页面：已实现症状、资料索引、材料清单、待问问题、医生说明和行动任务的本地新增/删除/完成流程，以及实时摘要聚合。
6. Phase 5 规则实现：已实现集中进度计算、“医生说明经用户确认转任务”、从历史事件创建复诊（仅继承医疗资料和未完成任务）、事件状态机、主要照护者/远程家属/陪诊员/脱敏导出四类字段过滤预览。所有预览均为单机模拟，不生成分享链接。
7. Phase 6 住院轻量分支：已实现按日期聚合的住院任务新增/认领/完成/筛选，陪护交接新增/编辑/历史，以及出院清单勾选和经确认转行动任务；负责人仅为本机模拟。
8. Phase 7 质量与部署：已完成 A4 打印样式和打印/另存 PDF 入口、历史搜索与筛选、390px/桌面响应式验收、lint/build；Vite 相对资源路径与 HashRouter 已满足 GitHub Pages 静态发布条件，未执行实际发布。

## 8. 验证清单

- [x] 19 个路由匹配（含通配路由），未知地址进入 404。
- [x] 空数据和演示数据两种启动路径可用。
- [x] 刷新后 localStorage 数据保持。
- [x] 损坏 JSON 不白屏，可清空恢复。
- [x] 非住院事件不暴露住院模块功能。
- [x] 390px 无明显横向溢出，桌面内容宽度受控。
- [x] 历史页可按搜索词、家庭成员和事件状态筛选，并可进入归档事件恢复。
- [x] 摘要页提供打印/另存 PDF 入口，打印时隐藏导航、交互按钮和固定医疗提示。
- [x] `npm run lint` 通过。
- [x] `npm run build` 通过。
