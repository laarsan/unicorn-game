---
name: release
description: Derive the next semver version from conventional commits, update CHANGELOG.md, create a git tag, and (for online repos) publish a GitHub release. Always shows a dry-run preview and waits for confirmation before writing anything. Use when you want to cut a release — "/release", "release this", "bump version", "tag a release", "create a GitHub release", "what would the next version be".
---

<what-to-do>

Cut a release for the current repository. The steps are: derive the version, show a dry-run, wait for confirmation, write artefacts, push, and (if a GitHub remote is detected) publish a GitHub release.

## Step 1 — Determine the base version

Run `git tag --sort=-v:refname` and take the highest semver tag (e.g. `v1.2.3`). If no tags exist, the base is `v0.0.0`.

## Step 2 — Read commits since the last tag

```
git log <last-tag>..HEAD --pretty=format:"%s"
```

If there are no tags, read all commits: `git log --pretty=format:"%s"`.

If there are no unreleased commits, report "No unreleased commits since `<last-tag>`. Nothing to release." and stop.

## Step 3 — Derive bump type from conventional commits

Scan each commit subject for these patterns (first match wins, checked top to bottom):

| Pattern | Bump |
|---|---|
| `feat!:` / `BREAKING CHANGE:` in commit body/footer | **MAJOR** |
| `feat:` | **MINOR** |
| `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, anything else | **PATCH** |

Apply the highest bump found across all unreleased commits.

Calculate the new version:
- MAJOR → `(MAJOR+1).0.0`
- MINOR → `MAJOR.(MINOR+1).0`
- PATCH → `MAJOR.MINOR.(PATCH+1)`

## Step 4 — Build the dry-run preview

Compose a preview and present it to the user before writing anything:

```
Ej-releasade commits sedan <last-tag> (<N> commits):
  feat: add release skill
  fix: correct manifest path
  docs: update ADR index

Bump-typ: MINOR (feat utan breaking change)
Föreslagen version: v1.3.0

Changelog-utkast (Keep a Changelog):
## [1.3.0] — <today's date>

### Added
- add release skill

### Fixed
- correct manifest path

### Documentation
- update ADR index

Artefakter som skrivs:
  CHANGELOG.md (prepend om den finns, skapa om inte)
  git tag v1.3.0
  git push + git push --tags
  [Om GitHub remote] gh release create v1.3.0 --title "v1.3.0" --notes "..."
  [Om VERSION finns i rot] VERSION uppdateras till 1.3.0

Fortsätta? (j/n)
```

Wait for the user to confirm. If the answer is anything other than "j" / "y" / "yes" / "ja", abort: "Avbröt utan att skriva något."

## Step 5 — Detect online / local repo

Run `git remote -v`. If any remote URL contains `github.com`, the repo is online. Otherwise it is local-only.

## Step 6 — Write artefacts

### 6a — Update CHANGELOG.md

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Group commits into sections: **Added** (feat), **Fixed** (fix), **Changed** (refactor), **Documentation** (docs), **Other** (chore, test, rest).

If `CHANGELOG.md` exists, prepend the new block after the `# Changelog` header (or at the top if no header). If it does not exist, create it with this structure:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [<version>] — <date>

### Added
- ...
```

### 6b — Optional VERSION file

If a file named `VERSION` exists in the repository root, update its content to `<MAJOR>.<MINOR>.<PATCH>` (no `v` prefix, single line, UTF-8 no-BOM). Do not create the file if it does not already exist.

### 6c — Commit changelog (and VERSION if updated)

```
git add CHANGELOG.md [VERSION]
git commit -m "chore(release): v<version>"
```

### 6d — Create git tag

```
git tag v<version>
```

### 6e — Push

```
git push
git push --tags
```

### 6f — GitHub release (online repos only)

```
gh release create v<version> \
  --title "v<version>" \
  --notes "<changelog block for this version>"
```

This publishes the release on GitHub. A GitHub release triggers `on: release: types: [published]` in GitHub Actions — the natural hook for CD automation. The current template `ci.yml` does not configure CD; projects that want deployment automation wire it in here.

## Step 7 — Confirm completion

Report what was done:

```
Release v<version> klar.
  ✓ CHANGELOG.md uppdaterad
  ✓ git tag v<version> skapad
  ✓ Pushad till origin
  [Om online] ✓ GitHub release publicerad: <url>
  [Om VERSION uppdaterad] ✓ VERSION uppdaterad
```

</what-to-do>
