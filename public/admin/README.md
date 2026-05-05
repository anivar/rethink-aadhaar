# Sveltia CMS — editor + admin guide

This site uses [Sveltia CMS](https://github.com/sveltia/sveltia-cms), a
modern static-CMS that edits Markdown files in this Git repository via the
GitHub API.

- **For editors:** open <https://anivar.github.io/rethink-aadhaar/admin/>,
  click **Sign in with GitHub**, write content. Every save creates a pull
  request — nothing goes live until the PR is reviewed and merged.
- **For admins:** the rest of this document.

---

## What's in this folder

| File | Purpose | Contains secrets? |
|---|---|---|
| `index.html`  | One-line CMS shell, loads Sveltia from jsDelivr CDN. | No |
| `config.yml`  | Collection schema. Mirrors `src/content/config.ts`.  | No |
| `README.md`   | This file.                                           | No |

**Nothing in `/public/admin/` is a secret.** The only secret in the whole
system is the OAuth `client_secret`, which lives in your auth-proxy
worker's environment — never in the repo.

---

## Architecture

```
  Editor's browser                       GitHub
       │                                   ▲
       │  /admin/  (static HTML on Pages)  │
       │     │                             │
       │     ▼                             │
       │  Sveltia CMS (browser app)        │
       │     │                             │
       │     │   1. "Sign in with GitHub"  │
       │     ▼                             │
       │  Auth Proxy Worker  ────OAuth────►│
       │  (Cloudflare /                    │
       │   Sveltia hosted)                 │
       │     │                             │
       │     │   2. access_token           │
       │     ◄──────────                   │
       │                                   │
       │   3. Read/write content via       │
       │      api.github.com using token   │
       └──────────────────────────────────►│
                                           │
                       4. PR opened ───────┤
                                           │
                       5. Review + merge ──┤
                                           │
                       6. deploy.yml fires ▼
                                       GitHub Pages
```

**Why an auth proxy?** GitHub OAuth requires an Authorization Code Grant
flow with a `client_secret`. The CMS runs in the editor's browser, so the
secret CANNOT live there. A tiny proxy completes the OAuth handshake on
behalf of the CMS and hands the resulting access token back.

---

## Auth proxy options

### Option A — Sveltia's hosted proxy (fast start)

`config.yml` ships pointing at `https://auth.sveltia.dev`, the
free open-source proxy maintained by the Sveltia project.

**Setup (10 minutes):**

1. **Register a GitHub OAuth App** at
   <https://github.com/settings/applications/new>:
   - Application name: `Rethink Aadhaar CMS`
   - Homepage URL: `https://anivar.github.io/rethink-aadhaar/`
   - Authorization callback URL: `https://auth.sveltia.dev/callback`
   - **Save** and note the **Client ID** and **Client Secret**.
2. **Register the OAuth App with Sveltia's proxy**: open
   <https://auth.sveltia.dev/admin/> and follow the on-screen instructions
   to register your `client_id` + `client_secret`. Sveltia stores it
   server-side; you don't put it in this repo.
3. Visit `/admin/` on the deployed site, click **Sign in with GitHub**,
   approve the OAuth scope, you're in.

**Trust trade-off:** you depend on the Sveltia maintainer's worker being
up. If they ever take it offline, you reconfigure `base_url` to your own
worker (Option B). The data is in your Git repo — you can never lose it.

### Option B — Self-hosted Cloudflare Worker (recommended for production)

Run the same proxy on Cloudflare Workers' free tier. Full control, no
third-party dependency.

**Setup (~30 minutes):**

1. Install the [Cloudflare wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/):
   `npm install -g wrangler && wrangler login`
2. Clone Sveltia's auth proxy:
   ```sh
   git clone https://github.com/sveltia/sveltia-cms-auth.git
   cd sveltia-cms-auth
   ```
3. **Register a GitHub OAuth App** at
   <https://github.com/settings/applications/new>:
   - Homepage URL: `https://anivar.github.io/rethink-aadhaar/`
   - Authorization callback URL: `https://YOUR-WORKER.YOUR-CF-SUBDOMAIN.workers.dev/callback`
     (you'll know the worker URL after step 5).
4. **Set the secrets** (these live ONLY in Cloudflare, never in the repo):
   ```sh
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   ```
5. **Deploy**:
   ```sh
   wrangler deploy
   ```
   You'll get a worker URL like `https://sveltia-cms-auth.<you>.workers.dev`.
6. **Update the GitHub OAuth App's callback URL** to match the worker URL +
   `/callback`.
7. **Edit `public/admin/config.yml`** in this repo, change `base_url:` to
   your worker URL, open a PR, merge.
8. Visit `/admin/`, sign in. Done.

---

## Public-repo / GitHub Pages safety notes

- **Editorial workflow on.** `publish_mode: editorial_workflow` in
  `config.yml` means every save in the CMS becomes a PR against `main`,
  never a direct commit. The branch protection on `main` (no direct push)
  is the safety net.
- **Minimum OAuth scope.** `auth_scope: public_repo` requests only
  read/write to public repos — not your private repos. Editors can revoke
  the OAuth grant anytime at <https://github.com/settings/applications>.
- **Editorial drafts are public.** `chore/cms-edit-*` branches are
  pushed to a public repo. Do not paste private info into in-flight drafts.
- **Image uploads are immediately public** the moment the PR merges.
  `media_folder: public/media` commits images to this public repo.
  Editors must understand this. The CMS shows file size + name on upload
  — sanity-check before publishing.
- **`/admin/` is publicly reachable** but useless without OAuth login.
  `robots.txt` includes `Disallow: /admin/` so it won't appear in search
  results.
- **Schema validation is enforced twice:** Sveltia's UI guards against
  bad input at write-time, AND `astro check` (in `npm run build`) re-runs
  the Zod schemas at PR-build time. Either layer alone would be enough;
  having both means a malformed front-matter PR fails CI before merge.

---

## Editorial workflow in pictures

1. Editor visits `/admin/` and signs in with GitHub.
2. Editor picks a collection (e.g. **Updates**), clicks **+ New**.
3. Sveltia generates a slug like `2026-05-12-statement-on-pension-denial`.
4. Editor fills the form, attaches a hero image, hits **Save** then
   **Publish (open PR)**.
5. Sveltia commits to a branch like `cms/update/2026-05-12-statement…`,
   pushes it, opens a PR titled `Create Updates "Statement on…"`.
6. CI runs `npm run build` (= `astro check && astro build`). If the Zod
   schema rejects anything, the PR is red.
7. A reviewer with merge rights approves and squash-merges.
8. `.github/workflows/deploy.yml` fires on the push to `main`,
   rebuilds the static site, and deploys to GitHub Pages.
9. New post is live in ~2 minutes.

To **edit an existing entry**: open it in `/admin/`, change fields, save.
Same PR flow. Slug never changes (URLs stay stable).

To **delete**: click delete in `/admin/`. Same PR flow.

---

## Updating the CMS itself

`index.html` loads from `cdn.jsdelivr.net/npm/@sveltia/cms/dist/sveltia-cms.js`
without a version pin — you always get the latest stable. To pin a version
(e.g. for a regression):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@sveltia/cms@1.2.3/dist/sveltia-cms.js"></script>
```

---

## Removing the CMS

Delete `public/admin/`, remove `Disallow: /admin/` from `robots.txt`,
revoke the GitHub OAuth App at <https://github.com/settings/developers>.
The CMS leaves no trace anywhere except in this repo.
