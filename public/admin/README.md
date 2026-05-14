# Sveltia CMS — editor + admin guide

This site uses [Sveltia CMS](https://github.com/sveltia/sveltia-cms), a
modern static-CMS that edits Markdown files in this Git repository via the
GitHub API.

- **For editors:** open <https://no2uid.github.io/rethink-aadhaar/admin/>,
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

## Auth options

### Option A — Personal Access Token (no backend) ★ default

`config.yml` ships with no `backend.base_url` set, which switches Sveltia
into PAT (Personal Access Token) mode. **No OAuth App, no callback URL,
no auth proxy, no Cloudflare Worker.**

**Setup per editor (~2 minutes):**

1. Editor visits <https://no2uid.github.io/rethink-aadhaar/admin/>.
2. Clicks **Sign In with Token**.
3. Follows the GitHub link in the prompt — it lands on the fine-grained
   PAT page with the required scopes pre-selected (Contents + Pull
   Requests on this repo only).
4. Generates the token, copies it, pastes it into Sveltia's dialog.
5. Token is stored in the editor's browser `localStorage`; subsequent
   visits sign in automatically until the token expires.

**Trade-offs:**
- ✅ Zero infrastructure. No third-party uptime dependency.
- ✅ Each editor's token is independently revocable at
  <https://github.com/settings/tokens>.
- ⚠️ Editors manage their own token rotation (90-day default expiry).
- ⚠️ Token sits in browser localStorage — a malicious browser extension
  could exfiltrate it. Editors should use a profile they trust for CMS
  work; revoke immediately if a browser is compromised.

### Option B — OAuth via self-hosted auth proxy (multi-editor convenience)

> **Note:** the previously-recommended hosted proxy at `auth.sveltia.dev`
> was decommissioned. The domain now serves an unrelated site. Don't
> point any new OAuth Apps at that callback URL.

You can run Sveltia's auth proxy yourself on Cloudflare Workers, Vercel,
Netlify Functions, or Deno Deploy — any platform that lets you deploy a
single serverless function with two secrets (`GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`). Once you have the worker URL, register a
GitHub OAuth App at <https://github.com/settings/applications/new> with:

- Homepage URL: `https://no2uid.github.io/rethink-aadhaar/`
- Authorization callback URL: `https://YOUR-PROXY-URL/callback`

Then add to `config.yml`:

```yaml
backend:
  base_url: https://your-proxy.example/
  auth_scope: public_repo
```

Editors then sign in with **Sign in with GitHub** instead of pasting a
PAT. Only the proxy holds the `client_secret` — never the repo.

#### Worked example: Cloudflare Workers

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
   - Homepage URL: `https://no2uid.github.io/rethink-aadhaar/`
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
  never a direct commit.
- **⚠ Branch protection.** For the editorial workflow to be more than
  honour-system, `main` must reject direct pushes — otherwise an editor
  with write access can bypass the CMS entirely. Verify with
  `gh api repos/No2UID/rethink-aadhaar/branches/main/protection`. If it
  returns 404, see CONTRIBUTING.md for the recommended `gh api -X PUT`
  command.
- **Minimum token / OAuth scope.** PAT mode prompts for a fine-grained
  token scoped to *this repo only* (Contents + Pull Requests). OAuth
  mode (Option B) uses `auth_scope: public_repo` — read/write to public
  repos only. Either way, editors revoke at
  <https://github.com/settings/tokens> (PAT) or
  <https://github.com/settings/applications> (OAuth).
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

`index.html` pins an exact Sveltia version with a Subresource Integrity hash
so a compromised CDN can't serve us a tampered bundle. To upgrade:

```sh
VER=0.160.0   # the new version
SRI=$(curl -sSL "https://cdn.jsdelivr.net/npm/@sveltia/cms@${VER}/dist/sveltia-cms.js" \
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
