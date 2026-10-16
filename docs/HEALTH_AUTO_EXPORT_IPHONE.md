# iPhone → CycleWorth：配置与验收

当前状态：**READY FOR REAL-DATA REVIEW**。本轮没有迁移远程数据库、没有生产导入、没有部署 Production。以下 REST URL 在相应版本获准部署后才可用；不能将现有生产网址当作本轮代码已上线的证据。

## 开始前

1. 先用 iPhone 的 Health Auto Export 手动导出一小段日期的 **Workouts → JSON → Export Version 2** 文件，打开 **Include Route Data**。不需要导出步数、睡眠或其他 Health Metrics。
2. 在本地 CycleWorth 的 `/settings/health` 选择文件。本地格式检查不会联网查询 rides；数据库 Dry Run 需要已登录，并且目标数据库已获准应用本轮迁移。
3. 先检查一条有 GPS 的户外骑行、一条无 GPS/室内骑行、一个与 Strava 重叠的活动，以及重复上传同一文件。缺失距离显示警告并按 0 米处理；错误单位显示失败。
4. 审核时间、距离、地图、通勤分类、疑似重复和用户手动覆盖。历史导入默认仅预览。历史写入必须另行批准，随后服务器单独启用 `APPLE_HEALTH_HISTORY_WRITES_ENABLED=true`；数据库 Dry Run 后界面才显示确认复选框和导入按钮。自动同步开关不能绕过这一授权。

## 获准的测试环境准备

- 目标只能是 `Personal_Leisure_CycleWorth` / `qmegopdnnkfrnhtohvhe`。
- 在任何远程迁移之前核实实际 Supabase 项目身份、CLI link 和环境 URL，然后运行 `npm run supabase:verify -- --require-dedicated-target`。检查通过不是执行迁移或发布的授权。
- 按 `APPLE_HEALTH_DELIVERY.md` 列出的顺序应用迁移，需要单独批准。保持 `APPLE_HEALTH_WRITES_ENABLED=false` 和 `APPLE_HEALTH_HISTORY_WRITES_ENABLED=false`。
- 用获准的 HTTPS 测试地址访问 CycleWorth，登录，打开 Settings → Account → Apple Health。
- 生成专用凭证。界面仅在本次响应中显示一次，不写入本地存储。复制到 iPhone 后清除显示；遗失时轮换即可。切勿把凭证贴到聊天、截图、Git 或日志。
- 生成凭证时会保存此浏览器当前的通勤规则；调整 Dashboard 的站点/时段后，需在 Apple Health 页面点击“保存当前通勤规则供同步使用”。后台采用数据库保存的规则，时区仍为 Europe/London。

## 获准后的历史导入

真实文件 Dry Run 获得用户明确批准后，才可单独设置服务器 `APPLE_HEALTH_HISTORY_WRITES_ENABLED=true`。重新运行数据库预览，核对新增/已存在/疑似重复/失败数量，勾选“仅新增、不覆盖”确认框并点击确认历史导入。服务器会重新匹配，仅插入真正新增行；候选和已有记录仍不写。历史写入使用 Supabase 登录会话和专门的确认 Header，专用同步凭证不能调用它。完成后关闭历史写入开关。**本轮没有执行这一流程。**

## Health Auto Export 自动化

在 iPhone 打开 Health Auto Export → Automations → New Automation → REST API。

| 设置 | 值 |
| --- | --- |
| URL | `https://<已批准的测试主机>/api/health/sync` |
| 未来生产 URL | `https://cycleworth.vercel.app/api/health/sync`，仅在部署批准后使用 |
| HTTP 方法 | POST（REST API 自动化默认） |
| Header key | `Authorization` |
| Header value | `Bearer <CycleWorth 生成的专用凭证>` |
| Header key | `X-CycleWorth-Dry-Run` |
| 初次 Header value | `true` |
| Content-Type | JSON 自动设置 `application/json`，可显式设置同值 |
| Data Type | **Workouts** |
| Export Format | JSON |
| Export Version | **2** |
| Include Route Data | **ON** |
| Include Workout Metrics | 初次测试 OFF，减少不使用的数据与体积 |
| Batch Requests | **ON** |
| Date Range | 测试用短日期范围；新增同步建议 Default 或 Previous 7 Days |
| Timeout | 建议 60 秒；若应用可选值不同，选足以覆盖短批次的值 |

凭证只放 Header，不放 URL。HTTP 接口拒绝所有 query 参数。
地址栏显示的 localhost 是 Mac 本机地址，iPhone 无法直接用它调用；本轮未建立公网隧道或发布测试环境。

## 测试顺序

1. 保持 `X-CycleWorth-Dry-Run: true`，在自动化内选择 Manual Export，发送一条骑行。
2. 查看 Health Auto Export Activity Logs 和 CycleWorth 数据源状态。应看到 Dry Run 结果、请求时间和预期新增/已存在/疑似重复/失败数量，rides 无变化。
3. 重发相同 JSON：已有数据库记录显示 existing；同批重复 ID 也会被识别。没有写入的预览记录在下次预览中仍显示 new，这是正常的。
4. 验收后，只有获得新增骑行写入批准，才允许在服务器启用 `APPLE_HEALTH_WRITES_ENABLED=true`，并在 CycleWorth 点击“开启新增骑行写入”。最后把 iPhone Header 改为 `X-CycleWorth-Dry-Run: false`。
5. 记录一条**首次生成凭证之后开始**的新骑行并推送。检查数据库所属用户、Dashboard 地图/里程、分类、节省和维护里程。重发后应显示 duplicate / exists，所有总额保持不变。
6. 首次凭证创建时间以前的骑行会被历史保护拦截，即使已开启新增写入。轮换保留这一时间边界，但会再次关闭写入授权。
7. 测试轮换后旧凭证返回 401，新凭证可预览；撤销后新凭证也返回 401。恢复同步需生成新凭证、更新 iPhone Header，并重新授权新增写入。

## 返回值与大路线

- `200`：成功、全重复、无骑行或待复核；以 JSON `status` / `summary` / `items` 为准。
- `207`：一项或多项失败；有效项可成功处理。必须检查逐项结果，修复失败项再重发；不要假设 Health Auto Export 会自动重试每个失败 workout。
- `400`：JSON/envelope/version/batch/header 错误；`401`：凭证无效或撤销；`403`：写入关闭；`413`：过大；`415`：非 JSON；`429`：限流，按 Retry-After 等待；`503`：环境/迁移/数据库不可用。
- 请求体上限 **4 MiB**，每批最多 **100 workouts**，单条最多 **50,000 GPS points**。应用自己限制在常见 Vercel 请求体上限以内；部署平台可能更早拒绝超限请求。
- 长途轨迹可能单条就超过 4 MiB；Batch Requests 不保证拆分单个 workout。应先尝试只导出一条、关闭 Workout Metrics；仍超限时需单独设计大文件导入方案，本轮不会截断原始输入或宣称任意长路线都可上传。
- GPS 地图输出最多采样 5,000 个坐标，保留首末点。距离以 workout.distance 为准，不用采样路线重算；不同 ID 的路线分片不可假定能拼接。本轮同 ID 重推不更新先前记录，也不补回迟到 GPS。
- 建议用有重叠窗口的 Default / Previous 7 Days，利用稳定 ID 去重，降低延迟数据或部分失败被 Since Last Sync 游标跳过的风险。
- iPhone 锁屏和 iOS 后台限制可能延迟 Health 数据读取；同步不是实时承诺。按需启用 Background App Refresh 并检查 Activity Logs。

官方资料：[Workout V2 格式](https://help.healthyapps.dev/en/health-auto-export/export-format/workouts/)、[REST API 自动化](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/)、[JSON 外层结构](https://help.healthyapps.dev/en/health-auto-export/export-format/)。
