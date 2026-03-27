# Changelog

## [0.3.0] - 2026-03-26

### Added

- **Feedback delete**: `feedback delete <id>` — permanently remove feedback items with confirmation prompt
- **Bulk status update**: `feedback bulk-update --status CLOSED --ids id1,id2,id3` — update multiple items at once
- **Feedback export**: `feedback export [project] --format csv|md|json` — export all feedback to CSV, Markdown, or JSON
- **Widget management**: `widget settings [project]` — view and update widget configuration (color, label, position, messages, etc.)
- **Widget embed code**: `widget script [project]` — get the embed script tag ready to paste into HTML
- **Team management**: `team list`, `team role <id> --role admin`, `team remove <id>` — manage organization members
- **Note edit/delete**: API support for editing and deleting feedback notes (via PATCH/DELETE endpoints)

### Changed

- **Feedback commands expanded**: `feedback` now has 8 subcommands (list, show, search, update, note, delete, bulk-update, export)

---

## [0.2.0] - 2026-03-26

### Added

- **Project CRUD**: `projects create`, `projects show`, `projects update`, `projects delete` — full project management from the CLI
- **Name resolution**: All project commands accept name or ID (e.g. `projects show feedbackbasket` instead of passing a cuid)
- **Fuzzy matching**: Typo suggestions ("Did you mean: feedbackbasket?") and ambiguity detection when multiple projects match
- **Top-level aliases**: `feedbackbasket login` and `feedbackbasket logout` (no need to type `auth login`)
- **Project alias**: `feedbackbasket project` works as alias for `feedbackbasket projects`
- **Onboarding wizard**: Multi-step first-login flow — authenticate, select default project, install Claude Code skill
- **Default project**: Set during onboarding or via config — auto-applied to `feedback list`, `bugs list`, etc. (override with `--project`)

### Changed

- **Full access by default**: Auth login now defaults to `--scope full` (like Basecamp), no more read-only by default
- **Brand colors**: All terminal output uses FeedbackBasket green (#22c55e) accent instead of generic cyan
- **Centralized theme**: New `src/output/theme.ts` with brand colors, semantic helpers, and logo renderer
- **Doctor command**: Now shows branded "FeedbackBasket CLI Diagnostics" header with logo
- **Login flow**: Shows branded "FeedbackBasket CLI" header with green URL during browser auth
- **Better error messages**: Auth and project fetch errors now show the actual error message instead of silent failures
- **Delete confirmation**: `projects delete` prompts for confirmation in interactive mode (skipped with `--yes` or `--agent`)

---

## [0.1.0] - 2026-03-25

### Added

- Initial release of the FeedbackBasket CLI
- **Authentication**: Browser-based OAuth flow (`auth login`) and manual token input (`auth login --token`)
- **Auth management**: `auth status`, `auth logout`, `auth token` commands
- **Projects**: `projects list` — view all accessible projects with feedback stats
- **Feedback**: `feedback list` with filtering (--project, --category, --status, --sentiment, --search, --limit, --offset, --notes)
- **Feedback detail**: `feedback show <id>` — view single feedback item with full details
- **Feedback search**: `feedback search <query>` — cross-project text search
- **Feedback write**: `feedback update <id>` — update status, category, sentiment (requires full scope)
- **Feedback notes**: `feedback note <id> "<content>"` — add internal notes (requires full scope)
- **Bug reports**: `bugs list` with severity/status filtering, `bugs stats` for summary
- **Diagnostics**: `doctor` command — health checks for auth, connectivity, and integrations
- **Agent integration**: `setup claude` — install SKILL.md for Claude Code
- **Output modes**: Auto-detect (styled TTY / JSON piped), `--json` (envelope with breadcrumbs), `--quiet`/`--agent` (raw data), `--md` (Markdown)
- **JSON envelope**: Basecamp-inspired `{ ok, data, summary, breadcrumbs }` response format
- **Structured errors**: Error codes, exit codes, and recovery hints
- **Credential storage**: `~/.config/feedbackbasket/credentials.json` with `FEEDBACKBASKET_TOKEN` env var support
