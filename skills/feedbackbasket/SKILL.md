---
name: FeedbackBasket
description: Manage FeedbackBasket projects, feedback, and bug reports from the command line
triggers:
  - feedbackbasket
  - feedback
  - bugs
  - bug reports
  - user feedback
invocable: true
argument-hint: "<command> [options]"
---

# FeedbackBasket CLI

Command-line interface for managing feedback, bug reports, and projects in FeedbackBasket.

## Authentication

Before using any commands, authenticate:
```bash
feedbackbasket auth login           # Opens browser for login
feedbackbasket auth login --token <TOKEN>  # Manual token (CI/headless)
feedbackbasket auth status          # Check auth state
```

## Output Modes

| Flag | When to Use | Output |
|------|------------|--------|
| (none) | Terminal | Styled, human-readable |
| `--json` | Parse full response | JSON envelope with breadcrumbs |
| `--agent` | Agent automation | Raw JSON data only |
| `--quiet` | Scripting | Raw JSON data only |
| `--md` | Documentation | Markdown formatted |

**Agent rule**: Always use `--agent` for programmatic access. Parse the JSON output directly.

## Quick Reference

| Task | Command |
|------|---------|
| List projects | `feedbackbasket projects list` |
| List feedback | `feedbackbasket feedback list` |
| Filter by project | `feedbackbasket feedback list --project <id>` |
| Filter by category | `feedbackbasket feedback list --category BUG` |
| Filter by status | `feedbackbasket feedback list --status OPEN` |
| Search feedback | `feedbackbasket feedback search "query"` |
| View single item | `feedbackbasket feedback show <id>` |
| List bugs | `feedbackbasket bugs list` |
| High severity bugs | `feedbackbasket bugs list --severity high` |
| Bug statistics | `feedbackbasket bugs stats` |
| Update status | `feedbackbasket feedback update <id> --status PLANNED` |
| Add note | `feedbackbasket feedback note <id> "note content"` |
| Health check | `feedbackbasket doctor` |

## Common Workflows

### Triage new feedback
```bash
feedbackbasket feedback list --status OPEN --agent
# Review items, then update status:
feedbackbasket feedback update <id> --status UNDER_REVIEW
feedbackbasket feedback note <id> "Reviewing — appears related to auth flow"
```

### Investigate bugs
```bash
feedbackbasket bugs list --severity high --agent
feedbackbasket feedback show <id> --agent
# Shows full details including browser, OS, page URL, AI analysis
```

### Search for patterns
```bash
feedbackbasket feedback search "login" --agent
feedbackbasket feedback search "crash" --category BUG --agent
```

## Filtering Options

### Categories
`BUG`, `FEATURE_REQUEST`, `IMPROVEMENT`, `QUESTION`

### Statuses
`OPEN`, `UNDER_REVIEW`, `PLANNED`, `IN_PROGRESS`, `COMPLETE`, `CLOSED`

### Sentiments
`POSITIVE`, `NEGATIVE`, `NEUTRAL`

### Bug Severity
`high`, `medium`, `low`

## Pagination

Use `--limit` and `--offset` for pagination:
```bash
feedbackbasket feedback list --limit 50 --offset 0
feedbackbasket feedback list --limit 50 --offset 50  # next page
```

## JSON Envelope Format

When using `--json`, responses follow this structure:
```json
{
  "ok": true,
  "data": [...],
  "summary": "Showing 20 of 156 feedback items",
  "breadcrumbs": [
    { "action": "Next page", "cmd": "feedbackbasket feedback list --offset 20" }
  ]
}
```

Errors:
```json
{
  "ok": false,
  "error": "Not authenticated",
  "code": "auth_error",
  "hint": "Run: feedbackbasket auth login"
}
```

## Invariants

- Always authenticate before data commands
- `--agent` flag suppresses all interactive prompts
- Write operations (update, note) require `--scope full` during auth
- Feedback IDs are stable — safe to reference across commands
- All timestamps are ISO 8601
