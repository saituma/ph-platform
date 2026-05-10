# Parent Production Routing

`apps/parent` deploys as its own Vite web app. It must not depend on `apps/onboarding` routes or server internals.

Production hosting must preserve same-origin browser calls from the parent app to the API:

- `GET /api/app/token-status`
- `POST /api/app/logout`
- `POST /api/app/set-token`
- Parent portal API calls under `/api/portal/*`
- Socket.IO under `/socket.io/*`

For Vercel deployments, `apps/parent/vercel.json` rewrites `/api/*` and `/socket.io/*` to the current production API origin:

```text
https://ph-performance-2cae29f7922d.herokuapp.com
```

Vercel `vercel.json` rewrites are static project configuration. Do not assume environment variables are expanded inside rewrite destinations. If the API production origin changes, update `apps/parent/vercel.json` before promoting the parent app.

The parent app should continue to call relative same-origin paths such as `/api/app/token-status` so httpOnly session cookies stay first-party to the parent deployment.
