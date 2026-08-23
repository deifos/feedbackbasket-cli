# FeedbackBasket CLI

Command-line interface for [FeedbackBasket](https://feedbackbasket.com) — manage feedback, bug reports, projects, and widgets from your terminal or through AI agents.

Inspired by the [Basecamp CLI](https://github.com/basecamp/basecamp-cli). Everything you can do in the dashboard, you can do from the CLI.

## Quick Start

```bash
# Install
npm install -g feedbackbasket-cli

# Authenticate (opens browser, full access by default)
feedbackbasket login

# Or use a token directly (for CI/headless)
feedbackbasket login --token fb_cli_your_token_here

# Remote server flow: use when localhost browser callbacks cannot reach the CLI
feedbackbasket login --manual

# Start exploring
feedbackbasket projects list
feedbackbasket feedback list
feedbackbasket feedback create "Login button is broken" --project myapp --type bug
feedbackbasket bugs list --severity high
```

The first time you log in, a setup wizard walks you through selecting a default project and installing the Claude Code skill.

The CLI uses agent surface version `3.0.0`. CLI login accepts only private CLI credentials. It does not accept MCP keys. Use `--yes` for high-impact commands in agent or machine mode. Interactive use can show a confirmation prompt.

## Agent Usage

Any AI agent with shell access (Claude Code, Codex, Cursor, OpenCode) can use the CLI directly:

```bash
# Agents should use --agent flag for raw JSON output
feedbackbasket projects list --agent
feedbackbasket feedback list --category BUG --agent
feedbackbasket feedback create "Login button is broken" --content "Clicking Log in does nothing in Safari." --project myapp --type bug --agent
feedbackbasket feedback update <id> --status PLANNED --agent
feedbackbasket widget script myproject --agent
feedbackbasket mobile setup myproject --bundle-id com.example.app --include-publishable-key --agent
```

When installing or configuring a widget for the current app, agents should not rely on the CLI default project. First run `feedbackbasket projects list --agent`, match the current app by its real website URL or clearly matching project name, and only create a new project after confirming no existing project belongs to this app. If the only known URL is `localhost`, ask for the production, staging, preview, or intended public URL before creating the project.

### Install Claude Code Skill

```bash
feedbackbasket setup claude
```

<!-- BEGIN GENERATED AGENT CAPABILITIES -->
## Agent capability contract

Agent surface version: `3.0.0`. The CLI and both MCP transports implement the same 31 product operations.

| Product operation | CLI command | MCP tool | Required access | Confirm |
| --- | --- | --- | --- | --- |
| `projects.list` | `projects list` | `list_projects` | `read:projects` | No |
| `projects.get` | `projects show` | `get_project` | `read:projects; allowed project` | No |
| `projects.create` | `projects create` | `create_project` | `write:projects; unrestricted key` | No |
| `projects.update` | `projects update` | `update_project` | `write:projects; allowed project` | No |
| `projects.delete` | `projects delete` | `delete_project` | `write:projects; allowed project` | Yes |
| `feedback.list` | `feedback list` | `get_feedback` | `read:feedback; allowed project` | No |
| `feedback.get` | `feedback show` | `get_feedback_item` | `read:feedback; allowed project` | No |
| `feedback.search` | `feedback search` | `search_feedback` | `read:feedback; allowed project` | No |
| `feedback.create` | `feedback create` | `create_feedback` | `write:feedback; allowed project` | No |
| `feedback.update` | `feedback update` | `update_feedback` | `write:feedback; allowed project` | No |
| `feedback.delete` | `feedback delete` | `delete_feedback` | `write:feedback; allowed project` | Yes |
| `feedback.bulkUpdate` | `feedback bulk-update` | `bulk_update_feedback` | `write:feedback; allowed project` | Yes |
| `feedback.export` | `feedback export` | `export_feedback` | `read:feedback; allowed project` | No |
| `bugs.list` | `bugs list` | `get_bug_reports` | `read:feedback; allowed project` | No |
| `bugs.stats` | `bugs stats` | `get_bug_stats` | `read:feedback; allowed project` | No |
| `notes.create` | `feedback note` | `create_feedback_note` | `write:notes; allowed project` | No |
| `notes.update` | `feedback note update` | `update_feedback_note` | `write:notes; allowed project` | No |
| `notes.delete` | `feedback note delete` | `delete_feedback_note` | `write:notes; allowed project` | Yes |
| `replies.list` | `feedback replies` | `list_feedback_replies` | `read:feedback; allowed project` | No |
| `replies.send` | `feedback reply` | `send_feedback_reply` | `write:replies; allowed project` | Yes |
| `widget.getSettings` | `widget settings` | `get_widget_settings` | `read:projects; allowed project` | No |
| `widget.updateSettings` | `widget update`<br>`widget flow` | `update_widget_settings` | `write:widget; allowed project` | No |
| `widget.getScript` | `widget script` | `get_widget_script` | `read:projects; allowed project` | No |
| `mobile.get` | `mobile status`<br>`mobile verify` | `get_mobile_integration` | `read:projects; allowed project` | No |
| `mobile.update` | `mobile setup`<br>`mobile bundle`<br>`mobile conversations`<br>`mobile disable` | `update_mobile_integration` | `write:mobile; allowed project` | No |
| `mobile.rotateKey` | `mobile rotate-key` | `rotate_mobile_project_key` | `write:mobile; allowed project` | Yes |
| `waitlist.list` | `waitlist list` | `get_waitlist` | `read:feedback; allowed project` | No |
| `waitlist.export` | `waitlist export` | `export_waitlist` | `read:feedback; allowed project` | No |
| `team.list` | `team list` | `list_team_members` | `write:team; unrestricted key` | No |
| `team.updateRole` | `team role` | `update_team_member_role` | `write:team; unrestricted key` | Yes |
| `team.remove` | `team remove` | `remove_team_member` | `write:team; unrestricted key` | Yes |
<!-- END GENERATED AGENT CAPABILITIES -->

## Commands

### Authentication

```bash
feedbackbasket login                   # Browser OAuth flow (alias for auth login)
feedbackbasket login --manual          # No localhost browser callback (remote servers)
feedbackbasket login --token <token>   # Use an existing CLI token (CI / scripts)
feedbackbasket logout                  # Clear credentials (alias for auth logout)
feedbackbasket auth status             # Show auth state, scope, default project
feedbackbasket auth token              # Print raw token (for scripting/piping)
```

CLI tokens start with `fb_cli_`. MCP API keys start with `fb_key_` and are only for MCP server configuration.

### Projects

All project commands accept **name or ID** (e.g. `feedbackbasket` or `cmn3c7sgv...`).

```bash
feedbackbasket projects list                              # List all projects with stats
feedbackbasket projects show <name-or-id>                 # Project details
feedbackbasket projects create "My App" --url https://... # Create project
feedbackbasket projects create "Local Test" --url http://localhost:3000 --allow-local-url
feedbackbasket projects update myapp --name "New Name"    # Update project
feedbackbasket projects update myapp --reply-to vlad@example.com  # Set default reply-to email
feedbackbasket projects delete myapp                      # Delete (with confirmation)
```

Use the production, staging, preview, or intended public website URL for projects. The CLI blocks accidental `localhost`/loopback URLs in agent and non-interactive mode unless you pass `--allow-local-url` for an explicitly local-only test project.

### Feedback

```bash
# Read
feedbackbasket feedback list                              # List recent feedback
feedbackbasket feedback list --project myapp              # Filter by project
feedbackbasket feedback list --category BUG               # Filter by category
feedbackbasket feedback list --status OPEN                # Filter by status
feedbackbasket feedback list --sentiment NEGATIVE          # Filter by sentiment
feedbackbasket feedback list --search "login issue"        # Text search
feedbackbasket feedback show <id>                          # View detail, including attachment links
feedbackbasket feedback search "crash on mobile"           # Search shortcut

# Write
feedbackbasket feedback create "Title" --content "Body" --project myapp
feedbackbasket feedback create "Login bug" --content "Clicking Log in does nothing" --project myapp --type bug --page-url https://example.com/login
feedbackbasket feedback update <id> --status PLANNED       # Update status
feedbackbasket feedback update <id> --category BUG         # Update category
feedbackbasket feedback reply <id> "Thanks!" --delivery email --reply-to support@example.com
feedbackbasket feedback reply <id> "Thanks!" --delivery widget
feedbackbasket feedback reply <id> "Thanks!" --delivery in-app
feedbackbasket feedback reply <id> "Thanks!" --delivery both --reply-to support@example.com
feedbackbasket feedback replies <id>                       # Show the complete conversation
feedbackbasket feedback note <id> "Investigating this..."  # Add internal note
feedbackbasket feedback delete <id>                        # Delete feedback
feedbackbasket feedback bulk-update --status CLOSED --ids id1,id2,id3

# Export
feedbackbasket feedback export myapp --format csv          # Export to CSV
feedbackbasket feedback export myapp --format md           # Export to Markdown
feedbackbasket feedback export myapp --format json         # Export to JSON
```

### Bug Reports

```bash
feedbackbasket bugs list                    # All bugs
feedbackbasket bugs list --severity high    # High severity only
feedbackbasket bugs list --status OPEN      # Open bugs
feedbackbasket bugs stats                   # Bug statistics summary
feedbackbasket bugs stats --project myapp   # Per-project stats
```

### Widget

```bash
# View current settings
feedbackbasket widget settings myapp

# Update widget configuration
feedbackbasket widget settings myapp --capture-mode waitlist
feedbackbasket widget settings myapp --capture-mode feedback
feedbackbasket widget settings myapp --color "#22c55e" --label "Send Feedback"
feedbackbasket widget settings myapp --position bottom-left --display modal
feedbackbasket widget settings myapp --email-required --intro "How can we improve?"
feedbackbasket widget settings myapp --button-radius 10 --button-size regular
feedbackbasket widget settings myapp --show-email --allow-attachments
feedbackbasket widget settings myapp --allow-visitor-replies
feedbackbasket widget settings myapp --no-allow-visitor-replies
feedbackbasket widget settings myapp --email-read-only --hide-email-when-prefilled
feedbackbasket widget settings myapp --error-tracking --allow-console-errors

# Configure guided feedback types and follow-up questions
feedbackbasket widget flow myapp
feedbackbasket widget flow myapp --enable                  # guided only when requested
feedbackbasket widget flow myapp --reset-default --enable  # guided only when requested
feedbackbasket widget flow myapp --config ./feedback-flow.json

# Get embed code (ready to paste into your HTML)
feedbackbasket widget script myapp
```

Waitlist mode uses the same project script. Add `data-feedbackbasket-waitlist` to your own form, with a required `email` field and optional `name` field. The CLI's `widget script` output shows a starter form when waitlist mode is active.

### Waitlist

```bash
feedbackbasket waitlist list myapp
feedbackbasket waitlist list myapp --search "@example.com" --limit 50 --offset 0
feedbackbasket waitlist list myapp --agent
feedbackbasket waitlist export myapp
```

Waitlist listing returns emails, optional names, source pages, total counts, the active capture mode, and pagination. Export prints the dashboard-compatible CSV to stdout.

For inline trigger mode, load the widget once and call the public API from your own button:

```html
<button onclick="window.FeedbackWidget.openFeedbackForm({ trigger: event.currentTarget })">
  Feedback
</button>
```

Passing the trigger element lets popup mode open beside your custom button. Calling `window.FeedbackWidget.openFeedbackForm()` with no arguments still uses the configured widget position.

Use only the public `openFeedbackForm()` API from the snippet. Do not call internal or undocumented methods such as `open()` or `openModal()`.

Use `--email-read-only` and `--hide-email-when-prefilled` with runtime `userEmail` values from your app. These settings do not store visitor emails in FeedbackBasket widget settings.

The default widget experience is a basic modal. Only switch to popup mode or enable guided feedback when you intentionally want that flow.

`widget flow --config` accepts either a `feedbackFlow` object or a JSON object with a `feedbackFlow` key. V1 supports guided mode with `text`, `textarea`, and `single_choice` follow-up questions.

```json
{
  "enabled": true,
  "mode": "guided",
  "types": [
    {
      "id": "bug",
      "emoji": "🐞",
      "label": "Bug report",
      "description": "Something is broken or not working",
      "questions": [
        {
          "id": "steps",
          "label": "What steps can reproduce it?",
          "type": "textarea"
        }
      ]
    }
  ]
}
```

### Mobile Apps

Mobile setup is additive and does not change the website widget. The `fb_mobile_` value is a publishable, write-only project identifier designed to ship in an app; it is not a CLI token or private API key. Mobile commands mask it unless `--include-publishable-key` is explicitly supplied.

```bash
# Enable mobile feedback and add allowed iOS bundle IDs
feedbackbasket mobile setup myapp --bundle-id com.example.app

# Return the publishable key and hosted form URL for an authorized app setup
feedbackbasket mobile setup myapp --bundle-id com.example.app --include-publishable-key --agent

# Inspect and verify the SDK heartbeat
feedbackbasket mobile status myapp
feedbackbasket mobile verify myapp --bundle-id com.example.app --wait 120

# Let users answer team replies in the original in-app conversation
feedbackbasket mobile conversations myapp --enable
feedbackbasket mobile conversations myapp --disable

# Add or remove bundle IDs without replacing the others
feedbackbasket mobile bundle-ids myapp --add com.example.app.beta
feedbackbasket mobile bundle-ids myapp --remove com.example.app.beta

# Actions that can interrupt installed apps require explicit confirmation
feedbackbasket mobile disable myapp --yes
feedbackbasket mobile rotate-key myapp --yes --include-publishable-key
```

Agents should never repeat the full publishable key in their final response. They must never place `fb_cli_` or `fb_key_` credentials in a mobile app. Key rotation invalidates the previous key and therefore requires explicit user authorization.

The native Swift SDK securely stores conversation credentials in the app Keychain, shows an unread badge when the team replies, and lets users answer inside the same thread when mobile conversations are enabled. Host apps do not need to build an inbox or manage reply tokens. Hosted-form integrations remain email-only. Website widget follow-up replies are configured independently with `widget settings`.

### Team

```bash
feedbackbasket team list                          # List organization members
feedbackbasket team role <memberId> --role admin   # Update member role
feedbackbasket team remove <memberId>              # Remove member
```

### Utilities

```bash
feedbackbasket doctor         # Run diagnostics (auth, connectivity, integrations)
feedbackbasket setup claude   # Install Claude Code skill
```

## Output Modes

The CLI automatically detects your environment:

| Context | Behavior |
|---------|----------|
| **Terminal (TTY)** | Styled, human-readable output with FeedbackBasket brand colors |
| **Piped** | JSON output automatically |
| `--json` | Full JSON envelope with breadcrumbs |
| `--quiet` / `--agent` | Raw JSON data only (no envelope) |
| `--md` | Markdown formatted |

### JSON Envelope

```json
{
  "ok": true,
  "data": [...],
  "summary": "12 open bugs, 3 high severity",
  "breadcrumbs": [
    { "action": "View high severity", "cmd": "feedbackbasket bugs list --severity high" }
  ]
}
```

Breadcrumbs suggest the next logical command — useful for both humans and agents navigating without a full command catalog.

## Configuration

Credentials stored in `~/.config/feedbackbasket/credentials.json`. Config in `~/.config/feedbackbasket/config.json`.

### Default Project

Set during the login wizard, or manually:

```bash
# Commands auto-scope to your default project
feedbackbasket feedback list        # uses default project
feedbackbasket feedback list --project other-app  # override
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `FEEDBACKBASKET_TOKEN` | CLI token (bypasses stored credentials) |
| `FEEDBACKBASKET_BASE_URL` | API base URL override |

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Full JSON envelope output |
| `--quiet` / `--agent` | Raw JSON data only |
| `--md` | Markdown output |
| `--base-url <url>` | Override API base URL |

## Filter Options

| Type | Values |
|------|--------|
| **Categories** | `BUG`, `FEATURE_REQUEST`, `IMPROVEMENT`, `QUESTION` |
| **Statuses** | `OPEN`, `UNDER_REVIEW`, `PLANNED`, `IN_PROGRESS`, `COMPLETE`, `CLOSED` |
| **Sentiments** | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| **Bug Severity** | `high`, `medium`, `low` |

## Development

```bash
git clone https://github.com/deifos/feedbackbasket-cli.git
cd feedbackbasket-cli
npm install
npm run dev -- --help         # Run in development
npm run build                 # Build for production
npm run dev -- login          # Test login flow
npm run dev -- doctor         # Test diagnostics
```

## License

MIT
