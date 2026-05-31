# Deploy branches (code-split)

These branches contain **only** the app for that tier — files sit at the **repository root** (no `Backend/` or `Frontend/` prefix). That matches Render, Netlify, and most PaaS defaults.

| Branch | Contents | Connect to |
|--------|----------|------------|
| `main` | Full monorepo (dev) | — |
| `backend` | Express API only + `render.yaml` | Render / Railway |
| `frontend` | React app only + `netlify.toml` | Netlify / Vercel |

## Push (first time)

```bash
git push -u origin main
git push -u origin backend
git push -u origin frontend
```

## Render (backend branch)

- **Branch:** `backend`
- **Root directory:** *(leave empty — app is at repo root)*
- **Build:** `npm install`
- **Start:** `npm run start:server`
- **Health check:** `/health`

Set env vars in dashboard: `MONGO_URL`, `JWT_*`, `STRIPE_*`, `FRONTEND_URL`, LLM keys, etc.

## Netlify (frontend branch)

- **Branch:** `frontend`
- **Base directory:** *(leave empty)*
- **Build:** `npm run build`
- **Publish:** `build`

Set `REACT_APP_API_URL=https://YOUR-API.onrender.com/shopai` then rebuild.

## Regenerate split branches from `main`

After merging features into `main`, rebuild deploy branches:

```powershell
# From repo root on main — run deploy/scripts/sync-split-branches.ps1
.\deploy\scripts\sync-split-branches.ps1
```

Or manually merge is **not** supported (orphan histories). Always regenerate from `main` using the script.
