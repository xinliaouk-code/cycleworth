# CycleWorth V4 — Morning Acceptance

Use the **V4 Preview**, not `cycleworth.vercel.app` (still the previous production app). Preview URL and verification results are in `CYCLEWORTH_V4_DELIVERY.md`.

## Before the first upload

- Restore the paused **Personal_Leisure_CycleWorth** source project `qmegopdnnkfrnhtohvhe` through its dashboard when ready. The agent has not restored or modified it. Real history migration and reconciliation must complete before judging lifetime totals.
- Sign up on V4 with the **same email** as the old account and choose a new password. Enter the verification code from Neon. Unverified email cannot claim historical data. Password hashes and old sessions do not transfer.
- Verify login, logout, login again, “Forgot password”, email delivery, the reset link, and login with the new password. Automated synthetic signup/login checks do not prove your mailbox receives mail.
- Vercel Preview may require your Vercel login. Health Auto Export cannot use an interactive Vercel login: the preview must have a valid deployment-protection bypass header before iPhone automation can reach it. Never put a bypass secret in a URL or screenshot. Application sync authentication is still required.

## iPhone / Apple Watch acceptance

1. Install/open the paid **Health Auto Export** app on iPhone.
2. Grant Apple Health read access to Workouts, routes and other needed cycling metrics. Confirm the watch workouts already appear in iPhone Health.
3. Choose **Workouts → JSON → Version 2**.
4. Enable **Include Route Data**. Use Batch Requests; each request supports up to 100 workouts and 4 MiB. Split date ranges if necessary.
5. In V4 **Settings → Apple Health Sync**, click **Copy Sync URL**, then **Generate Sync Token**. The full token is shown only at creation. Store it in the iPhone automation header.
6. Configure a REST API automation using the copied URL, POST, `Content-Type: application/json`, `Authorization: Bearer <your generated token>`. Initially add `X-CycleWorth-Dry-Run: true`.
7. Choose a small date range containing known historical outdoor rides. Run the first sync manually. Preview should identify new/existing/possible duplicate/failed rides. Possible duplicates are held and never added to totals.
8. Enable new-ride writes in Settings and set `X-CycleWorth-Dry-Run: false`. Run again. Check ride count, distance, active/elapsed time, speed/elevation where present, GPS map, commute classification and fare savings. Missing data must show as unavailable, not invented measurements.
9. Upload the **same batch** again. Ride count, lifetime distance, savings and maintenance odometer must remain unchanged.
10. Check Settings sync attempt/success timestamps, lifetime imported count, current new/duplicate/failed counts and latest failure. Rotate the token, verify the old token is rejected, replace the iPhone header, then test a new upload. Revocation must reject the token too.

## Items you must fill or click

- Original account email, new password and received email verification code.
- V4 Preview URL; generated sync token copied locally into Health Auto Export.
- Vercel Preview protection bypass header if protection remains enabled.
- Test date range, a few expected workouts, their distances and routes.
- Source-project restore and a final approval of the real migration reconciliation.

No real tokens, passwords or GPS records belong in this document or chat logs.

## Acceptance gate

Real-device import, mailbox/reset completion and real-history reconciliation remain manual until observed. Only after they pass should production cutover be approved. See `CYCLEWORTH_V4_OPERATIONS.md` for cutover and rollback.

Official setup references: [Workout V2](https://help.healthyapps.dev/en/health-auto-export/export-format/workouts/) · [REST API automation](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/).
