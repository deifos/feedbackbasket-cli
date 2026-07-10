# Changelog

## Unreleased

---

## [0.10.0] - 2026-07-10

### Added

- **Waitlist capture mode** - `widget settings --capture-mode waitlist|feedback` switches the installed project script between waitlist and feedback capture
- **Waitlist management** - `waitlist list` supports search and pagination, while `waitlist export` provides the dashboard CSV from the terminal
- **Widget security settings** - configure automatic error tracking and visitor-approved console error sharing from the CLI

### Changed

- **Inline widget trigger safety** - docs and packaged skill now explicitly tell agents to use `openFeedbackForm()` instead of internal widget methods such as `open()` or `openModal()`
- **Waitlist integration guidance** - `widget script`, README, and the packaged skill explain how to annotate existing forms for waitlist capture
- **Native HTTP client** - removed Axios and its transitive dependency tree in favor of Node's built-in `fetch`

---

## [0.9.3] - 2026-06-19

### Changed

- **Agent issue filing guidance** - the packaged skill now explains how agents should file discovered issues into the right FeedbackBasket project with short descriptions and structured metadata

---

## [0.9.2] - 2026-06-12

### Changed

- **Project URL safety** - `projects create` and `projects update --url` now require explicit confirmation before saving localhost URLs, and agent mode requires `--allow-local-url`
- **Packaged skill docs** - agents now ask for the real website URL instead of using localhost, and keep basic modal feedback as the default unless guided feedback is requested
- **Widget project selection** - agents now resolve the FeedbackBasket project for the current app instead of relying on the CLI default project when installing widgets
- **Widget guidance** - README, help text, and breadcrumbs no longer nudge users to enable guided feedback by default

---

## [0.9.1] - 2026-06-12

### Changed

- **Inline widget trigger guidance** - `widget script` now shows custom button examples for inline widgets, including trigger-aware popup anchoring
- **Packaged skill docs** - agents now use `openFeedbackForm({ trigger: event.currentTarget })` when installing custom inline trigger buttons

---

## [0.9.0] - 2026-06-11

### Added

- **Widget reply delivery** - `feedback reply` now supports `--delivery email|widget|both` so agents can reply in the widget thread, by email, or both
- **Widget thread visibility** - `feedback show` now includes whether feedback has an active widget thread

### Changed

- **Agent reply safety guidance** - the packaged skill now requires agents to verify reply delivery method before responding

---

## [0.8.0] - 2026-06-11

### Added

- **`feedbackbasket feedback create`** - create feedback from the terminal with project, type, category, status, email, page URL, metadata, and agent JSON output support

### Changed

- **Agent reply safety guidance** - the packaged skill now tells agents to ask for a reply-to email before sending email replies when no project default is configured, and to use widget/dashboard replies for widget-only feedback

---

## [0.7.0] - 2026-06-10

### Added

- **Prefilled email widget settings** - `widget settings` can now configure read-only prefilled emails and hide the email field only when a runtime email is provided
- **Feedback metadata output** - `feedback show` displays submitted widget metadata when available, and agent JSON output includes the metadata payload returned by the API

---

## [0.6.1] - 2026-06-08

### Fixed

- **Attachment links in feedback output** — `feedback show` now displays submitted screenshot/image URLs, and feedback/bug JSON responses include attachment metadata for agents

---

## [0.6.0] - 2026-06-07

### Added

- **`feedbackbasket widget flow`** — view, enable, reset, or apply JSON configs for guided feedback types and follow-up questions
- **Expanded widget settings flags** — configure button size, radius, icon, email visibility, attachments, branding, z-index, and guided mode from the CLI
- **Submitted details in feedback output** — `feedback show` now displays visitor-selected feedback type and follow-up answers

### Changed

- **Agent skill docs** — updated widget setup guidance so agents can customize guided feedback flows during installation

---

## [0.5.0] - 2026-05-10

### Added

- **`feedbackbasket login --manual`** — authenticate remote servers by approving in a browser and pasting the generated CLI token back into the terminal

### Changed

- **Clearer manual-login guidance** — `--manual` is documented as the flow for servers that cannot receive the localhost browser callback, while still requiring outbound HTTPS
- **CLI token validation** — login now rejects MCP API keys (`fb_key_...`) with a clear hint because CLI login requires `fb_cli_...` tokens

---

## [0.4.0] - 2026-04-15

### Added

- **`feedback reply <id> "<content>"`** — send an email reply directly to the feedback submitter. The customer receives a branded email with your reply and the original feedback, and their response goes to the configured reply-to address
- **`feedback replies <id>`** — list all replies sent for a feedback item (content, reply-to, who sent it, timestamp)
- **`--reply-to <email>` on `feedback reply`** — override the project's default reply-to for a single reply
- **`--reply-to <email>` on `projects update`** — set or clear the default reply-to email for a project (e.g. `projects update myapp --reply-to vlad@example.com`)
- **Interactive reply-to prompt** — when sending a reply with no `--reply-to` and no project default, the CLI asks the human whether to use their account email or enter a custom one (agent mode returns a clear error asking the agent to pass `--reply-to` or set a project default)
- **`replyToEmail` in project detail** — `projects show` now displays the configured reply-to address

### API Endpoints

- `POST /api/v1/feedback/:id/replies` — send reply (requires `full` scope)
- `GET /api/v1/feedback/:id/replies` — list replies
- `PATCH /api/v1/projects/:id` — now accepts `replyToEmail` in the body

---

## [0.3.5] - 2026-03-27

### Fixed

- **Name resolution for `--project` flag**: `feedback list --project prontoshoot` and `bugs list --project prontoshoot` now resolve names to IDs — previously returned empty results when using names

### Changed

- **Project name in list output**: Bug list and feedback list now show the project name (in green) instead of just the ID — much easier to scan across projects

---

## [0.3.3] - 2026-03-27

### Added

- **`--all` flag**: `feedback list --all` and `bugs list --all` to query across all projects, bypassing the default project filter

---

## [0.3.2] - 2026-03-27

### Changed

- **Custom help output**: Basecamp-style grouped sections (CORE COMMANDS, SHORTCUTS, SEARCH & EXPORT, AUTH & CONFIG, FLAGS, EXAMPLES, LEARN MORE)
- **Short flags**: `-j` for `--json`, `-q` for `--quiet`, `-m` for `--md`
- **Branded header**: "FeedbackBasket CLI v0.3.2" with logo in help output

---

## [0.3.1] - 2026-03-27

### Fixed

- **Login redirect flow**: Users who aren't logged in are now seamlessly redirected back to the CLI authorize page after login — no more needing to click the link twice

### Added

- **Skills repo**: Standalone [feedbackbasket-skills](https://github.com/deifos/feedbackbasket-skills) repo with install.md and enhanced SKILL.md
- **CLI docs page**: New `/docs/cli` page on feedbackbasket.com with full command reference and terminal demo
- **Landing page updates**: CLI feature card, dark terminal mockup, "Agent-Ready CLI" positioning
- **Published to npm**: `npm install -g feedbackbasket-cli` now available

---

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
