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
feedbackbasket bugs list --severity high
```

The first time you log in, a setup wizard walks you through selecting a default project and installing the Claude Code skill.

## Agent Usage

Any AI agent with shell access (Claude Code, Codex, Cursor, OpenCode) can use the CLI directly:

```bash
# Agents should use --agent flag for raw JSON output
feedbackbasket projects list --agent
feedbackbasket feedback list --category BUG --agent
feedbackbasket feedback update <id> --status PLANNED --agent
feedbackbasket widget script myproject --agent
```

### Install Claude Code Skill

```bash
feedbackbasket setup claude
```

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
feedbackbasket projects update myapp --name "New Name"    # Update project
feedbackbasket projects update myapp --reply-to vlad@example.com  # Set default reply-to email
feedbackbasket projects delete myapp                      # Delete (with confirmation)
```

### Feedback

```bash
# Read
feedbackbasket feedback list                              # List recent feedback
feedbackbasket feedback list --project myapp              # Filter by project
feedbackbasket feedback list --category BUG               # Filter by category
feedbackbasket feedback list --status OPEN                # Filter by status
feedbackbasket feedback list --sentiment NEGATIVE          # Filter by sentiment
feedbackbasket feedback list --search "login issue"        # Text search
feedbackbasket feedback show <id>                          # View single item detail
feedbackbasket feedback search "crash on mobile"           # Search shortcut

# Write
feedbackbasket feedback update <id> --status PLANNED       # Update status
feedbackbasket feedback update <id> --category BUG         # Update category
feedbackbasket feedback reply <id> "Thanks for reporting!" # Email the submitter
feedbackbasket feedback replies <id>                       # List sent replies
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
feedbackbasket widget settings myapp --color "#22c55e" --label "Send Feedback"
feedbackbasket widget settings myapp --position bottom-left --display modal
feedbackbasket widget settings myapp --email-required --intro "How can we improve?"

# Get embed code (ready to paste into your HTML)
feedbackbasket widget script myapp
```

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
