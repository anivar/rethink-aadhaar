# Decap CMS source patches

Canonical, upstream-ready source fixes for the exact Decap version this
site pins (`public/admin/index.html` → `decap-cms@<ver>` on jsDelivr,
SRI-locked).

## Important: these patches do not run at runtime

We load Decap from a CDN with Subresource Integrity. There is no
`node_modules` copy and no build step that could apply a patch to the
served bundle. **The behaviour change that is actually live is the
runtime shim in `public/admin/index.html`** (a `MutationObserver` that
removes the dead delete control).

These `.patch` files are the *canonical record of the correct fix*:
the same change expressed properly against Decap source, ready to

- open as an upstream PR to `decaporg/decap-cms`, and/or
- apply to a self-hosted/vendored Decap build if we ever stop using
  the CDN.

Keep the shim and the patch describing the same intent. When one
changes, update the other.

## `decap-cms@3.12.2.patch`

**Problem.** Every collection sets `delete: false`, but in 3.12.2 that
only suppresses the delete button for a *published, unchanged* entry.
The visibility gate in
`packages/decap-cms-core/src/components/Editor/EditorToolbar.js`
(`renderWorkflowControls`) is:

```js
(!showDelete || useOpenAuthoring) && !hasUnpublishedChanges && !isModification ? null : (…)
```

`showDelete` is `false` when `delete: false`, but the button is hidden
only if `hasUnpublishedChanges` and `isModification` are *also* false.
Any entry in the editorial workflow (e.g. after toggling Draft and
Save) has `hasUnpublishedChanges === true`, so the "Delete unpublished
changes/entry" button renders regardless of `delete: false`. There is
no config flag in 3.12.2 to turn it off. In this repo that button is
always dead anyway — `cms-automerge` squash-merges the draft PR and
deletes its branch within ~2 min, so by the time it is clicked Decap
has no open PR to act on and it silently errors.

**Fix.** One line. Make `delete: false` suppress the button
unconditionally, while preserving the original open-authoring
behaviour for collections where delete is enabled:

```js
!showDelete || (useOpenAuthoring && !hasUnpublishedChanges && !isModification) ? null : (…)
```

- `delete: false` (`!showDelete` true) → always `null`. Fixed.
- delete enabled → `!showDelete` is false, so it falls through to
  `useOpenAuthoring && !hasUnpublishedChanges && !isModification`,
  which is exactly the original condition for that branch. No
  behaviour change for delete-enabled collections.

**Apply (against a `decaporg/decap-cms` checkout at the
`decap-cms@3.12.2` tag):**

```sh
git checkout decap-cms@3.12.2
git apply /path/to/patches/decap-cms@3.12.2.patch   # verified: applies clean
```

## When upgrading Decap

`public/admin/README.md` documents the bump procedure. Additionally:

1. Re-fetch `EditorToolbar.js` at the new tag and check whether the
   `renderWorkflowControls` delete gate still matches this patch's
   context. Regenerate the patch (rename it `decap-cms@<newver>.patch`)
   if line numbers or surrounding code moved.
2. Re-check that the runtime shim's label regex in
   `public/admin/index.html` still matches the toolbar button text.
3. If upstream has fixed this (a real `delete: false` /
   editorial-workflow delete option), drop both the shim and the patch.
