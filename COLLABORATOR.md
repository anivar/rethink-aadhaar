# Editor runbook — Rethink Aadhaar CMS

For collaborators publishing through the website's editor at
**<https://rethinkaadhaar.in/admin/>**. One screen, four tasks. No code,
no git, no command line.

Sign in once with **Sign in with GitHub**. You stay signed in.

---

## The one thing to know

In the editor, **Save is not Publish.** Saving stores your work; the
entry is still hidden from the public site. To make it live you must
also set the status to **Ready** and click **Publish now**.

There is no separate human review step — once you publish, an automated
check runs and the page goes live on its own in about **2 minutes**.
Nobody has to approve it. So publish only when it is genuinely ready.

---

## 1. Publish something new  (~2 min to live)

1. Open `/admin/`, pick the collection (Updates, Exclusion stories,
   Press coverage, Myths, FAQs, Resources, or Pages).
2. Click **New …**.
3. Fill the form. Leave the **Draft** toggle **OFF**.
4. **Save**.
5. Open the **Workflow** tab, drag the card to **Ready**, click
   **Publish → Publish now**.
6. Done. Live in ~2 minutes.

## 2. Fix or update a live entry

1. Open `/admin/`, open the existing entry.
2. Edit the fields.
3. **Save**, then **Publish now** (same as step 5 above).

The web address of the entry does not change, so existing links keep
working. (Exception: heavily re-wording a long-published **Myth** changes
its link — see the hint on that field.)

## 3. Unpublish (take something off the site, keep the record)

1. Open `/admin/`, open the entry.
2. Turn the **Draft** toggle **ON**.
3. **Save**, then **Publish now**.

The entry disappears from the public site everywhere but stays in the
archive, so you can bring it back later by turning Draft **OFF** again.
This is the normal way to retire content.

## 4. Permanently delete a file (rare)

The editor's delete button is intentionally disabled. To remove a file
for good (an orphaned image, an accidental duplicate):

1. Go to the repository's **Actions** tab →
   **Delete entry (PR)** → **Run workflow**.
2. Paste the file path (e.g. `src/content/update/2026-05-12-foo.md`).
3. **Run workflow**. It removes the file and goes live the same way.

In almost every case you want **Unpublish (3)**, not delete.

---

## If something looks wrong

- **Published but not live after ~5 min?** The automated check may have
  failed (usually a required field left blank). Re-open the entry, check
  every required field is filled, Save and Publish again.
- **An image must never be public?** Don't upload it. Everything in the
  editor lands in a public repository the moment it publishes.
- **Stuck on sign-in?** Your GitHub username must be on the
  collaborator allowlist. Ask an admin (see `public/admin/README.md`).

That's the whole workflow. Admin/security details live in
`public/admin/README.md`.
