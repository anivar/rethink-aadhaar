# Rethink Aadhaar — task runner.
# `just`         lists every recipe.
# `just <name>`  runs one. Recipes wrap the package.json scripts so the
# whole repo has a single entry point regardless of bun/node/npm preference.

set shell := ["bash", "-cu"]

# Default: list recipes.
default:
    @just --list

# ---- Dev ---------------------------------------------------------------

# Start dev server on http://localhost:4321
dev:
    bun run dev

# Production build (optimize-images + astro check + build + SEO check)
build:
    bun run build

# Serve dist/ on http://localhost:4321
preview:
    bun run preview

# Biome lint + format check (read-only)
check:
    bun run check

# Biome auto-fix (safe rules only)
fix:
    bun run fix

# Astro type-check only — useful when biome is already clean
typecheck:
    bun astro check

# ---- Content -----------------------------------------------------------

# Examples:
#   just new update    "Statement on the latest exclusion incident"
#   just new exclusion "Aadhaar-linked pension denial in Khunti"
#   just new press     "Outlet headline" --publication "The Wire" --href https://...
# Scaffold a new content entry as a draft Markdown file.
new CATEGORY TITLE *FLAGS:
    bun run new -- {{CATEGORY}} "{{TITLE}}" {{FLAGS}}

# Crawl rethinkaadhaar.in/sitemap.xml and write any new entries as drafts.
sync:
    bun run sync

# ---- Deploy / verify ---------------------------------------------------

# Show the latest 5 deploy runs.
deploys:
    gh run list --workflow deploy.yml --limit 5

# Watch the most recent in-progress / queued deploy until it finishes.
watch-deploy:
    gh run watch $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId') --exit-status

# Quick sanity-check: fetch /, /myths, /about and count aria-current.
verify-deploy:
    @set -e; \
    BASE="https://anivar.github.io/rethink-aadhaar"; \
    for path in "/" "/myths/" "/about/"; do \
        curl -sL "$BASE$path" -o /tmp/_rethink-verify.html; \
        n=$(rg -c 'aria-current="page"' /tmp/_rethink-verify.html || true); \
        printf "  %-12s aria-current=page count: %s\n" "$path" "$n"; \
    done

# Open the deployed admin in the default browser.
admin-open:
    xdg-open https://anivar.github.io/rethink-aadhaar/admin/

# Usage: just admin-sri 0.160.0
# Then update both @VERSION in src= and integrity= in public/admin/index.html.
# Recompute the SRI hash for a Sveltia version (for CMS upgrades).
admin-sri VERSION:
    @SRI=$(curl -sSL "https://cdn.jsdelivr.net/npm/@sveltia/cms@{{VERSION}}/dist/sveltia-cms.js" \
            | openssl dgst -sha384 -binary | openssl base64 -A); \
     printf "  src       = https://cdn.jsdelivr.net/npm/@sveltia/cms@{{VERSION}}/dist/sveltia-cms.js\n  integrity = sha384-%s\n" "$SRI"

# ---- PR helpers --------------------------------------------------------

# List open PRs with title + author + checks status.
prs:
    gh pr list --state open --json number,title,author,statusCheckRollup \
      -q '.[] | "  #\(.number)  \(.title)  — @\(.author.login)  [\(.statusCheckRollup[0].conclusion // "pending")]"'

# Show the PR for the current branch (if any).
pr:
    gh pr view --web
