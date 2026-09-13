# Deploying Threadloom (free tier: Render + Vercel + Neon + Backblaze B2)

## 0. Prerequisites (create these first, note the credentials)

- **Neon** (https://neon.tech) — new project, then copy the **pooled** connection
  string (the one with `-pooler` in the hostname). Make sure it ends with
  `?sslmode=require`.
- **Backblaze B2** (https://www.backblaze.com/sign-up/cloud-storage) — create a
  private bucket, then create an Application Key scoped to just that bucket
  (Read and Write). Note: keyID, applicationKey, bucket name, and the bucket's
  S3-compatible endpoint (shown on the bucket's page, e.g.
  `s3.us-west-002.backblazeb2.com`) — the region segment in that hostname
  (`us-west-002`) is also needed separately.
  (Cloudflare R2 is an equally good alternative here if you have a card to
  verify it with — same idea, `AWS_S3_REGION_NAME` would just be `auto`.)

## 1. Backend on Render

1. Render dashboard → **New** → **Blueprint** → connect the `Threadloom` GitHub repo.
   Render will detect `render.yaml` at the repo root and pre-fill one free web
   service (`threadloom-backend`, rooted at `backend/`).
2. Render will prompt for every env var marked `sync: false` in `render.yaml`.
   Fill in:
   - `DATABASE_URL` — the Neon pooled connection string from step 0.
   - `AWS_ACCESS_KEY_ID` (keyID), `AWS_SECRET_ACCESS_KEY` (applicationKey),
     `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL` (the full
     `https://s3.us-west-002.backblazeb2.com`-style URL), `AWS_S3_REGION_NAME`
     (just the region segment, e.g. `us-west-002`) — the B2 values from step 0.
   - `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` — leave blank for now,
     come back to these in step 3.
3. Deploy. The build runs `pip install`, `collectstatic`, and `migrate`
   automatically (see `buildCommand` in `render.yaml`). Once it's up, note the
   service URL, e.g. `https://threadloom-backend.onrender.com`.
4. One-off setup on the fresh database (Render dashboard → your service →
   **Shell**):
   ```bash
   python manage.py seed_catalog
   python manage.py createsuperuser
   ```
   The catalog seed populates `GarmentType`/`PrintZone`/`GarmentStyleOption` —
   without it the storefront has nothing to design. `createsuperuser` gives
   you a first staff account for `/admin/orders` (or register normally through
   the site and flip `is_staff` on that user from Django admin instead).

## 2. Frontend on Vercel

1. Vercel dashboard → **Add New** → **Project** → import the `Threadloom` repo.
2. This is a monorepo — set **Root Directory** to `frontend` in the import
   screen (Vercel auto-detects Next.js once that's set; no other config needed).
3. Add an environment variable: `NEXT_PUBLIC_API_URL` = the Render URL from
   step 1.3 (e.g. `https://threadloom-backend.onrender.com`).
4. Deploy. Note the resulting URL, e.g. `https://threadloom.vercel.app`.

## 3. Close the loop: point the backend at the frontend

Back in Render → your service → **Environment**:
- `CORS_ALLOWED_ORIGINS` = your Vercel URL from step 2.4.
- `CSRF_TRUSTED_ORIGINS` = your Render URL from step 1.3 (needed for the
  Django admin's login form to work behind Render's proxy).

Saving env vars triggers an automatic redeploy.

## Free-tier things to expect (not bugs)

- **Render**: the free web service spins down after ~15 min idle; the first
  request after that takes 30–50s to wake it back up.
- **Neon**: the free database auto-suspends on idle too, but auto-*resumes* on
  the next query — no action needed, just a few seconds' delay on a cold query.
- **No background worker**: `CELERY_ALWAYS_EAGER=True` means tech-pack PDFs,
  embroidery files, and image cleanup all run inline in the request instead of
  on a queue — fine at low traffic, revisit if the free Render service starts
  timing out on those requests under real load.
