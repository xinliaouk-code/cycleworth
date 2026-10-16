# CycleWorth V2 — Strava Removal Plan

这是后续独立任务的实施计划。本轮保留 Strava，不撤销 OAuth、不修改生产环境、不删除历史骑行。V2 的唯一新增骑行来源将是 Apple Health，经 Health Auto Export Workout JSON V2 接入；现有历史数据继续可查看并参与统计。

## 进入 V2 的条件

- 用户确认 MSI Claw 是否还有未推送修改；如有，先取证并合并必要变化。
- 本轮分支完成真实 iPhone 文件、REST 推送、时区/距离/GPS、通勤、手动覆盖、重复和候选处理验收。
- 获得 V2 的独立范围确认、数据库变更及发布授权，建立生产备份/恢复演练和旧部署回退点。
- 处理依赖审计的发布风险，验证 dedicated Supabase 的 Auth、RLS 和 Data API grants。
- 先定义尚未解决的重叠候选人工处理流程与迟到 GPS 策略；不能通过删除 Strava 数据来消除候选。

## 前端与产品入口

| 文件/功能 | V2 动作 | 保留内容 |
| --- | --- | --- |
| `src/app/dashboard/page.tsx` | 移除 Strava OAuth code 捕获、token exchange、connection 查询、Strava sync/fullResync handler、authorize URL、Strava 连接状态；替换为 Apple Health 状态入口 | rides 查询、手动分类、地图详情、筛选、Dashboard 布局、TfL/ROI/维护统计 |
| `src/app/dashboard/_components/SyncStatus.tsx` | 移除 Connect Strava、重新授权、同步/全量重算按钮和相关 props；改为 Health 状态或复用 HealthSyncPanel 的简洁只读版本 | 适当的 loading/error/最后同步状态，不能误称即时同步 |
| `src/app/dashboard/_lib/i18n.ts`、SettingsPanel、首页/演示/设置文案 | 搜索 `Strava`、连接、OAuth、full resync，替换产品说明 | 通勤站点、时段设置独立保留，持续保存后台所需规则 |
| `src/app/settings/health/*`、HealthSourceLink | 作为主要来源设置，核对无 Strava OAuth/API 依赖 | 凭证生成/轮换/撤销、写入授权、历史预览、现有 rides/map 复用 |
| `src/components/RideMap.tsx`、Dashboard utils/维护组件 | 继续按通用 rides 数据读取；可显示来源标记、缺失路线/距离警告 | 旧 Strava polyline 和手动分类可读，不改变历史里程/金额 |

逐项用 `rg -n -i 'strava|oauth|fullResync|strava_activity_id' src docs README.md .env.example` 核对，避免只删可见按钮而留下回调行为。

## API、OAuth 与环境变量

删除 `/api/strava/sync`、`/api/strava/exchange`、`/api/strava/callback`（对应 `src/app/api/strava/*/route.ts`），并移除所有前端调用。删除仅服务连接显示的 `src/lib/strava/connection-state.ts`。`src/lib/strava/classify.ts` 和 `stations.ts` 是本轮保留的兼容导出；确认所有消费者已直接使用 `src/lib/rides/*` 后才删除这两个包装文件，通用实现必须保留。

在获准的发布窗口中，从每个适用的 Vercel 环境与本地模板删除 `NEXT_PUBLIC_STRAVA_CLIENT_ID`、`STRAVA_CLIENT_SECRET`，检查预览/生产作用域、CI secrets 和文档引用。不要把实际值记录在变更报告。Supabase URL / publishable key 和 Apple Health 写入配置继续保留。

先发布停止请求 Strava 的代码，确认无后台/重试请求，再由用户撤销 Strava 应用连接与 OAuth 授权。保留短期回退所需环境配置，直至 V2 验收；撤销 OAuth 之后回退 Strava 功能可能需要用户重新授权，不能承诺无感回滚。

## 数据库与历史数据

1. 保留 `personal_cycleworth.rides` 的所有行和主键，不将旧来源重新标为 Apple Health。
2. 对迁移后由旧代码写入的 `source='legacy' AND strava_activity_id IS NOT NULL` 行，进行只补来源/通用 ID 的增量回填。与已有通用唯一约束发生冲突时停止并人工检查，不删除行。
3. 核对每用户总行数、Strava ID 数量、去重键、总米数、起止时间、手动标记/分类、polyline 摘要、维护记录、TfL 规则和统计结果。用迁移前后导出/哈希比较确认这些业务字段未变。
4. V2 可先将 `strava_activity_id` 作为历史只读兼容字段保留。新代码只依赖 `source` / `external_activity_id`。只有备份并验证所有外部 ID 后，才在后续单独迁移中考虑移除该列和旧唯一索引。
5. `strava_connections` 含可撤销凭证。先撤销上游授权、取消应用读写 grants，再决定安全删除 token 字段或表的单独迁移。不得通过删除 `auth.users` 清理连接，更不能级联删除 rides。
6. 不修改旧的已执行迁移；基线和 legacy-migrations 是审计历史。若未来需要从零建库，应提供经过验证的新基线流程，不篡改已有远程 migration history。
7. 所有迁移仍须在独立分支审阅、对 exact dedicated ref 运行 `supabase:verify -- --require-dedicated-target`，并先做本地 RLS/回滚验证。历史共享项目始终禁止访问。

V2 停止所有 Strava 写入后，可在单独增量迁移中移除本轮兼容期的 `rides_guard_strava_health_overlap` 触发器及 `personal_cycleworth.guard_strava_health_overlap()`；不删除旧来源行或改写外部 ID。

## 测试与文档清理

- 删除只测试 Strava 连接显示的 `src/lib/strava/connection-state.test.mjs`，取代为 Health 凭证/状态/失败/撤销测试；保留通用 Supabase Auth 测试。
- 将本轮“混合来源共存”的 Strava 写入测试改为“旧 Strava 行只读保留 + Apple Health 重叠候选”验证，保留原始 Strava 历史 fixture。
- 确认没有前端网络请求访问 Strava、没有 OAuth code URL 处理、删除的 API 不再可调用。
- 保留并加强导入幂等、跨用户 RLS、凭证轮换/撤销、历史保护、体积/批次、部分失败、候选/手动覆盖、GPS/时区、节省/维护/图表与回滚测试。
- 测试无 Strava 连接且只有 Health 数据的新用户，以及带手动覆盖/旧 Strava 地图的老用户；比较所有统计和过滤结果。
- 更新 README、MIGRATION_NOTES、iPhone 指南、配置模板和产品文案。当前 `docs/shared-supabase.md` 只保留为明确标注的历史档案；新增文档不能再指导使用共享项目。
- `docs/APPLE_HEALTH_ARCHITECTURE.md` 等本轮验收资料应保留历史事实，新增 V2 完成记录说明执行了哪些计划，不把计划状态改写为已经发生。

## 验证与回滚顺序

先在隔离本地库执行迁移和回滚，随后在获准测试环境重放脱敏数据。运行 `npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`npm run supabase`；做登录用户/另一用户/匿名用户的端到端权限与实际 iPhone 推送验证，再由用户批准 Production。

出问题时先关闭 Apple Health 写入并保留已导入 rides。回退应用部署和可恢复的 schema/grants，不从旧数据库快照覆盖新骑行。回退数据若不可避免，先导出发布后的新增/手动修改行，按主键和通用来源 ID 重放，逐项核对统计。保留历史来源列比提前删除更有利于回退。已撤销的 Strava OAuth 需重新授权，因此删除凭证/列应晚于主要产品切换验收。

完成 V2 的验收标准：Apple Health 是唯一新增数据入口；所有旧骑行、路线、手动修改与维护/节省统计保留；无 Strava API/OAuth/环境变量运行依赖；真实设备与权限验证完成，且回滚演练记录可复查。
