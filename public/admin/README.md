# Rethink Aadhaar CMS — editor + admin guide

The site's `/admin/` is a custom-branded instance of
[Decap CMS](https://github.com/decaporg/decap-cms) — a static CMS that
edits Markdown files in this Git repository via the GitHub API. We
refer to it everywhere user-facing as the **Rethink Aadhaar CMS**; the
rest of this document calls out "Decap" only when something is specific
to the underlying engine (version pin, upstream docs, etc.).

- **For editors:** open <https://rethinkaadhaar.in/admin/>, click **Sign in
  with GitHub**, write content. Every save creates a pull request — nothing
  goes live until the PR is reviewed and merged.
- **For admins:** the rest of this document.

---

## What's in this folder

| File | Purpose | Contains secrets? |
|---|---|---|
| `index.html`  | One-line CMS shell, loads Decap from jsDelivr CDN.   | No |
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
       │  Decap CMS (browser app)          │
       │     │                             │
       │     │   1. "Sign in with GitHub"  │
       │     ▼                             │
       │  Auth Proxy Worker  ────OAuth────►│
       │  (No2UID/rethink-cms-auth         │
       │   on Cloudflare Workers)          │
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

## Auth: OAuth via the campaign's own auth proxy

The site uses a custom Cloudflare Worker as its OAuth proxy:

- **Source:** <https://github.com/No2UID/rethink-cms-auth>
- **Endpoint:** `https://rethink-cms-auth.no2uid.workers.dev`
- **Hosting:** Rethink Aadhaar's Cloudflare account; deploys via GitHub
  Actions on push to that worker repo's `main`. No editor needs `wrangler
  login` on their laptop.

The worker is a 270-line, single-file proxy — not the upstream
`decap-server`. It adds two hard gates **before** the access token
ever reaches the browser:

1. The signed-in GitHub `login` must be in the worker's `ALLOWED_USERS`
   allowlist (`No2UID`, `anivar`, `srikanthlogic`).
2. That user's token must have `permissions.push === true` on
   `No2UID/rethink-aadhaar`.

A non-collaborator who completes the OAuth dance lands on an error page
and never receives a token. See the worker repo's `README.md` for the
full security model.

### Adding or removing an editor

1. Add/remove the GitHub username on the
   [collaborators page](https://github.com/No2UID/rethink-aadhaar/settings/access).
2. In `No2UID/rethink-cms-auth`, edit `wrangler.toml` →
   `ALLOWED_USERS = "No2UID,anivar,srikanthlogic"`.
3. Push to that repo's `main` — GitHub Actions redeploys the worker
   automatically.

### Rotating the OAuth client_secret

1. <https://github.com/settings/developers> (as `No2UID`) → the
   "Rethink Aadhaar CMS" app → **Generate a new client secret**.
2. In `No2UID/rethink-cms-auth` → Settings → Secrets and variables →
   Actions, replace `WORKER_OAUTH_CLIENT_SECRET`.
3. Run the **"Sync worker secrets"** Actions workflow once.
4. Revoke the old secret on GitHub.

Both the GitHub OAuth App and the Cloudflare Worker live in accounts
owned by Rethink Aadhaar — no individual's GitHub or Cloudflare account
is in the critical path.

---

## Public-repo / GitHub Pages safety notes

- **Editorial workflow on.** `publish_mode: editorial_workflow` in
  `config.yml` means every save in the CMS becomes a PR against `main`,
  never a direct commit.
- **⚠ Branch protection.** For the editorial workflow to be more than
  honour-system, `main` must reject direct pushes — otherwise an editor
  with write access can bypass the CMS entirely. Verify with
  `gh api repos/No2UID/rethink-aadhaar/branches/main/protection`. If it
  returns 404, see CONTRIBUTING.md for the recommended `gh api -X PUT`
  command.
- **Minimum OAuth scope.** The worker requests `public_repo` — read/write
  to public repos only, no access to private repos or org admin. Editors
  revoke at <https://github.com/settings/applications> (Authorized OAuth
  Apps → Rethink Aadhaar CMS).
- **Editorial drafts are public.** `cms/<collection>/<slug>` branches
  are pushed to a public repo. Do not paste private info into in-flight
  drafts.
- **Image uploads are immediately public** the moment the PR merges.
  `media_folder: public/media` commits images to this public repo.
  Editors must understand this. The CMS shows file size + name on upload
  — sanity-check before publishing.
- **`/admin/` is publicly reachable** but useless without OAuth login.
  `robots.txt` includes `Disallow: /admin/` so it won't appear in search
  results.
- **Schema validation is enforced twice:** Decap's UI guards against
  bad input at write-time, AND `astro check` (in `bun run build`) re-runs
  the Zod schemas at PR-build time. Either layer alone would be enough;
  having both means a malformed front-matter PR fails CI before merge.

---

## Editorial workflow in pictures

1. Editor visits `/admin/` and signs in with GitHub.
2. Editor picks a collection (e.g. **Updates**), clicks **+ New**.
3. Decap generates a slug like `2026-05-12-statement-on-pension-denial`.
4. Editor fills the form, attaches a hero image, hits **Save** then
   sets status **Ready** and clicks **Publish now**.
5. Decap commits to a branch like `cms/update/2026-05-12-statement…`,
   pushes it, opens a PR titled `Create Updates "Statement on…"`.
6. CI runs `bun run build` (= `astro check && astro build`). If the Zod
   schema rejects anything, the PR is red.
7. `.github/workflows/cms-automerge.yml` enables auto-merge on the PR;
   GitHub squash-merges as soon as the `check` status goes green. No
   human click needed — branch protection still requires the check to
   pass.
8. `.github/workflows/deploy.yml` fires on the push to `main`,
   rebuilds the static site, and deploys to GitHub Pages.
9. New post is live in ~2 minutes.

To **edit an existing entry**: open it in `/admin/`, change fields, save.
Same PR flow. Slug never changes (URLs stay stable).

To **delete**: click delete in `/admin/`. Same PR flow.

---

## Updating the CMS itself

`index.html` pins an exact Decap version with a Subresource Integrity hash
so a compromised CDN can't serve us a tampered bundle. To upgrade:

```sh
VER=3.12.2   # the new version
SRI=$(curl -sSL "https://cdn.jsdelivr.net/npm/decap-cms@${VER}/dist/decap-cms.js" \
       | openssl dgst -sha384 -binary | openssl base64 -A)
echo "src = ...@${VER}/...   integrity = sha384-${SRI}"
```

Then update both the version in the `src=` URL and the `integrity=` value
in `public/admin/index.html` in lockstep, open a PR, merge.

---

## Removing the CMS

Delete `public/admin/`, remove `Disallow: /admin/` from `robots.txt`,
revoke the GitHub OAuth App at <https://github.com/settings/developers>.
The CMS leaves no trace anywhere except in this repo.
