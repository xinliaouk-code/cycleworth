# CycleWorth Apple Health V1–V3 — 本地交付

**READY FOR REAL-DATA REVIEW** · 2026-10-16（Asia/Shanghai）

本轮在 Mac mini 的 `/Users/starxin/Developer/Projects/DevHobby1 - Cycle` 完成代码开发。GitHub main 在开始和收尾核对均为 `68fb5b7a42a8f8a082f6c94f69509b5efb6a6f3a`。开发分支为 `feature/cycleworth-apple-health-sync`，仅本地提交，未推送、未创建 PR、未发布 Production。

MSI Claw 是否存在未推送修改尚无法核实。这里的工作完整保留 GitHub 已有代码；未推测或补造缺失业务逻辑。仓库缺少安全检查所引用的 `.env.example`，本轮补入空白模板。

## 阶段提交与验收点

| 阶段 | 提交 | 已完成 |
| --- | --- | --- |
| V1 | `9ad016c` | 通用来源/外部 ID、保留旧 Strava ID、增量 schema、回滚、通用通勤/站点工具、RLS/唯一性测试、审计说明 |
| V2 | `f6c8c7d` | Workout V2 解析、时间/单位/GPS、地图预览、历史 Dry Run、数据库原子去重/候选隔离、手动覆盖保护 |
| V3 | 本文件所在提交（`git log -1`） | HTTPS/Header API、专用凭证、轮换/撤销、默认禁写与新增时间边界、状态界面、限流/批次/错误处理、回归与回滚测试、iPhone 指南、V2 移除计划 |

V1、V2 已独立完成本地测试和提交；V3 在最终提交前执行同一检查集。各提交可独立审阅；它们不是用户实际设备验收或生产发布记录。

## 变更和 API

- 新来源 `source='apple_health'`，使用 `external_activity_id`，唯一键包含 user_id/source。新 Health 路径不依赖 Strava API/OAuth。
- 共用现有 `personal_cycleworth.rides`、Leaflet polyline、London 通勤、TfL 节省、Dashboard/维护统计；无平行统计库。
- Strava 保留。只调整其增量基线、来源标记和匹配范围，并在 Strava 后到时返回 Health 重叠候选，避免漏拉、同名误更新和反向重复计数。数据库插入触发器与 Health importer 使用同一用户锁，防止预览后并发写入竞态；竞态下返回 409，重试后列为候选。
- `POST /api/health/import`：Supabase 会话 Header 鉴权，默认历史预览；历史写入另需服务器 `APPLE_HEALTH_HISTORY_WRITES_ENABLED=true` 和显式确认 Header/UI。
- `GET/POST /api/health/credentials`：会话验证后查看状态、生成/轮换、撤销、保存通勤规则、明确授权/关闭新增骑行写入。
- `POST /api/health/sync`：`Authorization: Bearer <专用凭证>`，默认 Dry Run；显式 Header `X-CycleWorth-Dry-Run: false` 才请求写入。HTTPS 必需（开发模式 loopback 例外）；禁止 URL query 凭证。
- 4 MiB / 100 workouts / 每条 50,000 route points；持久化地图采样最多 5,000 点。每用户每分钟最多 30 次服务端同步请求；返回 429 / Retry-After。
- 成功、全重复、候选待复核、部分失败分别报告。候选不入库；旧记录、Strava ID、手动分类不覆盖。失败项不阻止同批有效项，重试仍幂等。

## 安全设计

运行时只使用 Supabase publishable key，没有引入高权限密钥。新 Health 路径在任何远程调用前拒绝 dedicated URL 之外的目标。

凭证由 Node crypto 生成 256 位随机值，只保存 SHA-256 哈希；哈希也不对客户端提供。明文仅在管理操作的 no-store 响应中返回一次，界面不写 localStorage、不写 URL 或日志。轮换/撤销锁定凭证行，与正在进行的数据库写事务协调。

Rides 保留原有 owner RLS。凭证和状态表也启用 RLS，并撤销所有客户端直接表权限。Data API 只暴露 `personal_cycleworth` 的 invoker wrappers；需要凭证能力的 definer 实现放在未暴露的 `personal_cycleworth_private` schema，清空 search_path、撤销 PUBLIC EXECUTE。会话函数从 auth.uid() 取 owner；推送函数从有效 credential 取 owner，永不使用请求传来的 user_id。跨用户 helper 无客户端 EXECUTE 权限。

历史写入使用单独的 `APPLE_HEALTH_HISTORY_WRITES_ENABLED=true` 开关、Supabase 会话和显式确认 Header；界面先预览，再勾选确认和点击导入。本轮没有开启该开关或执行生产导入。

自动写入需要三个条件：服务器 `APPLE_HEALTH_WRITES_ENABLED=true`、该凭证已由用户在 UI 授权新增写入、请求 Header 明确关闭 Dry Run。生成和轮换都会关闭凭证写入授权。首次创建凭证前的历史骑行仍被 SQL 层拦截；轮换保留原始时间边界。数据库中的历史导入函数仅在本地 fixture 测试写过，没有在生产执行。

## 数据库迁移与回滚

迁移顺序：

1. 已有 `202608270001_cycleworth_isolated_baseline.sql`（保留不改）。
2. `20261016142153_apple_health_sources.sql`：增列、回填来源、唯一约束、后台通勤设置。
3. `20261016142547_apple_health_import.sql`：私有导入 helper 和 owner session wrapper。
4. `20261016142738_apple_health_sync.sql`：受保护凭证/状态表，凭证鉴权、授权、限流、同步函数和 Strava/Health 并发插入保护。

本轮未运行任何远程 migration。Mac 无本地 Supabase CLI link，也没有配置远程运行凭证。`supabase:verify -- --require-dedicated-target` 按预期失败，阻止远程操作。默认 `npm run supabase` 是安全扫描别名，**不是**启动 Supabase 或验证远程连接。

将来任何远程迁移均须先获得授权、核实项目名/ref/URL、CLI link 与运行环境一致，再通过上述 strict verify。只允许 `Personal_Leisure_CycleWorth` / `qmegopdnnkfrnhtohvhe`。不得操作历史共享项目；config.toml 的 project_id 本身不代表远程身份已经被验证。

回滚首选：关闭服务器写入开关、撤销/关闭凭证写入授权、回退应用，保留所有 rides 与增量列。结构回滚脚本位于 `supabase/rollback/`，按 sync → import → sources 顺序；sources 脚本若发现任何 Health ride 会主动拒绝。sync 回滚保留不可直接访问的凭证/状态审计表。所有远程回滚仍须单独批准与验证目标，禁止用清空 rides 恢复状态。

本地 PostgreSQL 迁移及回滚测试验证：Strava 行主键、原始 ID、距离、分类和手动覆盖不变。PGlite 模拟 auth.users/auth.uid 和角色，执行实际 PostgreSQL SQL；它不等价于 Supabase 托管 Auth、PostgREST、网络或平台 Advisor 的验证。

## 最终验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | 24/24 PASS（原有 7 项 + 新增 17 项） |
| `npm run lint` | PASS，0 errors / 13 既有 warnings |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS；占位环境构建，不代表真实登录/远程 schema 验证 |
| `npm run supabase` / `supabase:verify` | PASS；无 link 时标注远程身份 pending |
| strict dedicated target 检查 | 正确拒绝缺少 link 的远程操作 |
| 本地 HTTP 页面 | `/`、`/dashboard`、`/demo`、`/settings`、`/settings/health`、`/maintenance`、`/login` 均 200 |
| 本地 HTTP 未登录 API | Strava sync 为 401；production-mode HTTP Health history / sync 均拒绝为 400（需要 HTTPS）；HTTPS handler 测试未认证为 401 |
| 浏览器合成文件 | 2 条格式有效、1 条失败、1 条非骑行跳过；未登录 Dry Run 显示登录提示；中英文与 GPS polyline 可见 |
| 真实 iPhone / Apple Health / 上游 Strava | 未验证 |
| Production 迁移 / 历史导入 / 部署 | 未执行 |

测试包括单位/时区/DST、缺字段/错误单位/GPS、重试幂等、同批和跨源候选、RLS/所有权伪造、凭证隔离/轮换/撤销、写入默认关闭/历史保护、HTTPS/请求体/批次/限流、迁移/回滚、现有节省/通勤/维护/周图表回归。由于真实 Strava 账号不在本地测试范围内，不能把保留 API 和本地 401 测试描述为 OAuth/上游同步已通过实测。

日志与截图：`evidence/apple-health-local/`。截图仅为合成坐标；不是私人真实骑行数据。浏览器发现旧 CARTO 端点返回 API-key-required 占位图，因此本轮将公共地图组件改为 OSM 标准 tiles 并显示 attribution，保留 polyline 渲染。该公共底图是 best-effort 服务；生产放量前应评估供应商方案，参见 [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) 与 [Leaflet guide](https://leafletjs.com/examples/quick-start/)。

## 待用户人工完成与已知边界

1. 确认 MSI Claw 是否有未推送修改；若有，先提供可比较的分支/提交或工作区，勿直接覆盖此分支。
2. 按 `HEALTH_AUTO_EXPORT_IPHONE.md` 先导出小范围真实 Workout V2 文件，检查格式、真实距离/时间、GPS 和分类。
3. 审阅本轮提交、迁移与风险。若要在 iPhone 测 REST API，须另行批准配置远程测试环境及迁移；本轮未创建 HTTPS 隧道或外部部署。
4. 待真实数据 Dry Run 验收后，再决定历史写入入口、候选人工处理、自动新增写入和 Production 部署。历史写入 HTTP/UI 已准备好但默认关闭；不能以该功能已实现当作生产导入已获批准。
5. 依赖审计沿用既有锁文件，报告 10 项漏洞（9 high / 1 critical，含 Next；上游提供修复版本）。本轮没有自动升级框架；公开部署前需单独处理与回归。
6. 极长单条 GPS 超过 4 MiB 时，需要后续大文件方案；Batch Requests 不保证拆分单条 workout。同 ID 迟到 GPS/距离不会覆盖已导入行；不同 ID 的片段不自动拼接。
7. 疑似重复仅返回待复核候选，不自动合并或补写到 Strava，暂不提供候选裁决 UI。缺 GPS/室内/远离伦敦站点按休闲处理；缺距离计 0，人工复核后可沿用既有手动分类。
8. 后台同步使用已保存的通勤规则；浏览器本地规则变化不会静默应用到历史或已导入骑行。自动化有 iOS 锁屏/后台时机限制。
9. 能量/心率/功率等可选 Health metrics 本轮不持久化；Dashboard 热量可能为空。原有 Strava 可用指标和现有历史数据保持。

后续 V2 彻底移除 Strava 的范围、历史保留、验收和回滚见 `CYCLEWORTH_V2_STRAVA_REMOVAL_PLAN.md`。本轮没有执行该计划。

本机工具链说明：shell 最初没有独立 node/npm；本轮使用 Codex bundled Node
24.19.0，以及从官方 npm registry 取得的 npm 11.10.1 临时 launcher 执行上述
命令。开发依赖新增并锁定 `@electric-sql/pglite@0.5.10`。继续手动开发前需要
可用的 Node/npm PATH（或继续使用 bundled runtime）；没有改动系统全局工具链。

浏览器回归中另发现保存中文后刷新的既有 hydration mismatch。LanguageProvider
改为使用稳定 server snapshot 的 useSyncExternalStore 订阅浏览器语言偏好；
最终 Dashboard 中文恢复后未出现新的 console error，记录见 dashboard-console.json。
参考 React 官方 useSyncExternalStore 的 server-rendering 说明。
