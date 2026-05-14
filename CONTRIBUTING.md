# Contributing

Two paths in:

- **Editor (no Git, no terminal):** use the in-browser CMS at
  <https://no2uid.github.io/rethink-aadhaar/admin/>. Sign in with GitHub,
  fill the form, hit Publish — Sveltia opens a pull request on your behalf.
  Skip to [Editorial workflow](#editorial-workflow-via-admin).
- **Developer / power editor:** clone the repo, edit Markdown directly,
  open a PR. Skip to [Local development](#local-development).

Either way the same pre-merge checks run, and the same `deploy.yml` ships
the result to GitHub Pages on merge.

---

## Editorial workflow (via /admin/)

1. Open <https://no2uid.github.io/rethink-aadhaar/admin/> and sign in with
   GitHub. (You need write access to `No2UID/rethink-aadhaar`. Ask an
   admin to add you as a collaborator if you don't.)
2. Pick a collection — Updates, Exclusion stories, Press, Myths, FAQs,
   Resources, or Pages.
3. Click **+ New** (or open an existing entry to edit).
4. Fill the form. The CMS validates required fields and URL patterns
   inline; `astro check` re-validates against the Zod schemas at PR-build
   time, so a malformed entry fails CI.
5. **Save → Publish (open PR).** Sveltia commits to a branch like
   `cms/update/2026-05-12-…` and opens a PR titled
   `Create Updates "..."`.
6. A maintainer reviews, requests changes if needed, and squash-merges.
7. `deploy.yml` fires, rebuilds, and the entry is live in ~2 minutes.

**Drafts.** New `update/` entries default to `draft: true`. Drafts are
hidden from the home page, blog index, RSS, sitemap, and `llms.txt`. Flip
to `draft: false` (in the CMS or in the Markdown frontmatter) to publish.

**Image uploads.** Land in `public/media/` and become publicly visible the
moment the PR merges. Don't upload anything you wouldn't paste into a
public Slack channel.

For full architecture and OAuth-proxy setup, see
[`public/admin/README.md`](./public/admin/README.md).

---

## Local development

Bun 1.3+ and Node 24+ required.

```sh
bun install
bun run dev          # http://localhost:4321
bun run build        # optimize-images + astro check + astro build + SEO check
bun run preview      # serve dist/
bun run check        # biome lint + format check
bun run fix          # biome auto-fix (safe)
```

Or use the `justfile`:

```sh
just              # list all recipes
just dev          # start dev server
just build        # full production build
just verify URL   # fetch a deployed page and grep aria-current
```

### Adding content from the CLI

```sh
bun run new -- update    "Statement on the latest exclusion incident"
bun run new -- exclusion "Aadhaar-linked pension denial in Khunti" \
  --location "Khunti, Jharkhand" \
  --summary "Two-line summary used on cards."
bun run new -- press     "Outlet headline" \
  --publication "The Wire" \
  --href https://thewire.in/...
```

The script writes a draft Markdown file with the right slug
(`YYYY-MM-DD-kebab-title.md`) into the right collection. Edit the body,
then either commit on a branch and open a PR, or run `bun run sync` to see
it in the upstream-sync report.

---

## Frontmatter reference

Match `src/content/config.ts` (Zod) exactly — `astro check` will reject
mismatches. Quick reference:

| Collection  | Required fields                                         | Optional fields |
|-------------|---------------------------------------------------------|-----------------|
| `update`    | `title`, `date`                                         | `excerpt`, `hero`, `sourceUrl`, `draft` (default `false`; CLI scaffold sets `true`) |
| `exclusion` | `title`, `date`                                         | `location`, `summary`, `shareImage`, `sourceUrl` |
| `press`     | `title`, `publication`, `date`, `href`                  | — (no body — link-only by editorial decision) |
| `myth`      | `order` (int ≥ 1), `myth`                               | `fact` |
| `faq`       | `order` (int ≥ 1), `question`                           | `short` (one-line summary, used in `llms.txt`) |
| `resource`  | `title`, `section` (enum), `href`                       | `description`, `order` (default 0) |
| `page`      | `title`                                                 | `intro`, plus structured fields used by the About template (`tagline`, `hashtags`, `friends`, `interns`, `internsNote`, `contact`) |

`section` enum for `resource`: `Primers`, `Government documents`,
`Hunger deaths 2015–18`, `Case documents`, `Templates`, `Articles archive`.

Dates are ISO `YYYY-MM-DD`.

URL fields (`href`, `sourceUrl`) must be full `http(s)://…`.

---

## Internal links

Always wrap internal hrefs with the `link()` helper from `src/lib/link.ts`
so they resolve correctly under the `/rethink-aadhaar/` base path on
GitHub Pages:

```astro
---
import { link } from '~/lib/link';
---
<a href={link('/myths')}>Myths</a>
```

Raw `<a href="/myths">` will 404 in production.

---

## Pull request conventions

- One logical change per PR. Smaller is faster to review.
- PR titles: imperative mood, ≤70 chars. Examples:
  - `Header: strip base prefix so aria-current/.active fire`
  - `Press: add three Nov 2025 outlets`
  - `Myths: rewrite myth 03 to address consent revocation`
- The CMS produces titles like `Create Updates "..."` automatically — fine
  to leave as-is.
- pr-check.yml runs biome + `astro check` + build + SEO check. All four
  must pass before merge.
- Squash-merge to `main` (default); branch is auto-deleted.

---

## Deploy

Every merge to `main` triggers `.github/workflows/deploy.yml`:
build → upload `dist/` → `actions/deploy-pages`. Live in ~2 minutes at
<https://no2uid.github.io/rethink-aadhaar/>.

To verify a deploy from the CLI:

```sh
just verify-deploy   # fetches /, /myths, /about, counts aria-current="page"
```

---

## Upstream content sync

`.github/workflows/sync.yml` runs every Monday at 06:00 UTC. It crawls
`rethinkaadhaar.in/sitemap.xml`, writes new `update/` and `exclusion/`
entries as drafts, and opens a PR titled
`Upstream sync — new updates / exclusion stories`. Reviewers edit the
body, flip `draft: true → false` on `update/` entries to publish, then
merge.

Trigger manually: **Actions → Weekly upstream content sync → Run workflow**
(or `gh workflow run sync.yml`).
