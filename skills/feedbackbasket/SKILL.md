---
name: FeedbackBasket
description: Manage FeedbackBasket projects, feedback, bugs, widgets, and team from the command line
triggers:
  - feedbackbasket
  - feedback
  - bugs
  - bug reports
  - user feedback
  - widget
  - feedback widget
invocable: true
argument-hint: "<command> [options]"
---

# FeedbackBasket CLI

Full command-line interface for managing feedback, bug reports, projects, widgets, and team in FeedbackBasket. Works with any AI agent that can run shell commands.

## Authentication

```bash
feedbackbasket login                   # Opens browser — one click, full access
feedbackbasket login --manual          # No localhost browser callback (remote servers)
feedbackbasket login --token <TOKEN>   # Manual token (CI/headless)
feedbackbasket auth status             # Check auth state
feedbackbasket doctor                  # Full diagnostics
```

## Output Modes

| Flag | Output | When to Use |
|------|--------|-------------|
| (none) | Styled (TTY) or JSON (piped) | Auto-detect |
| `--json` | JSON envelope with breadcrumbs | Parse full response |
| `--agent` | Raw JSON data only | Agent automation |
| `--quiet` | Raw JSON data only | Scripting |
| `--md` | Markdown | Documentation |

**Agent rule**: Always use `--agent` for programmatic access. Parse the JSON output directly.

## Quick Reference

### Projects
```bash
feedbackbasket projects list
feedbackbasket projects show <name-or-id>
feedbackbasket projects create "My App" --url https://myapp.com --description "..."
feedbackbasket projects update <name-or-id> --name "New Name" --url <url> --description "..."
feedbackbasket projects update <name-or-id> --reply-to vlad@example.com  # default reply-to for feedback replies
feedbackbasket projects delete <name-or-id> --yes
```

All project commands accept **name or ID**. Names are matched case-insensitively with fuzzy suggestions on typos.

### Feedback
```bash
# Read
feedbackbasket feedback list --project <id> --category BUG --status OPEN --sentiment NEGATIVE
feedbackbasket feedback list --search "login" --limit 50 --offset 0 --notes
feedbackbasket feedback show <id>
feedbackbasket feedback search "crash on mobile" --project <id> --limit 10

# Write
feedbackbasket feedback create "Login button is broken" --content "Clicking Log in does nothing in Safari." --project <id> --type bug
feedbackbasket feedback create "Feature idea" --content "Let users export saved views." --project <id> --type feature --metadata source=agent
feedbackbasket feedback update <id> --status PLANNED --category BUG --sentiment NEGATIVE
feedbackbasket feedback note <id> "Investigating — appears related to auth flow"
feedbackbasket feedback delete <id> --yes
feedbackbasket feedback bulk-update --status CLOSED --ids id1,id2,id3

# Reply to submitter by email, widget thread, or both
feedbackbasket feedback reply <id> "Thanks for reporting — we pushed a fix!" --delivery email --reply-to support@example.com
feedbackbasket feedback reply <id> "<content>" --delivery widget
feedbackbasket feedback reply <id> "<content>" --delivery both --reply-to support@example.com
feedbackbasket feedback replies <id>                                          # list past replies

# Export
feedbackbasket feedback export <project> --format csv
feedbackbasket feedback export <project> --format md
feedbackbasket feedback export <project> --format json
```

### Bug Reports
```bash
feedbackbasket bugs list --severity high --status OPEN --project <id>
feedbackbasket bugs stats --project <id>
```

### Widget
```bash
# Get embed code (ready to paste into HTML)
feedbackbasket widget script <project>

# View settings
feedbackbasket widget settings <project>

# Customize
feedbackbasket widget settings <project> --color "#22c55e" --label "Send Feedback"
feedbackbasket widget settings <project> --position bottom-left --display modal
feedbackbasket widget settings <project> --email-required --intro "How can we improve?"
feedbackbasket widget settings <project> --show-email --allow-attachments --guided
feedbackbasket widget settings <project> --email-read-only --hide-email-when-prefilled

# Guided feedback types and follow-up questions
feedbackbasket widget flow <project>
feedbackbasket widget flow <project> --enable
feedbackbasket widget flow <project> --reset-default --enable
feedbackbasket widget flow <project> --config ./feedback-flow.json
```

For inline trigger mode, load the widget once and call the public API from the host app's custom button:

```html
<button onclick="window.FeedbackWidget.openFeedbackForm({ trigger: event.currentTarget })">
  Feedback
</button>
```

In React:

```tsx
<button onClick={(event) => window.FeedbackWidget.openFeedbackForm({ trigger: event.currentTarget })}>
  Feedback
</button>
```

Passing the trigger element lets popup mode open beside the custom button. Calling `window.FeedbackWidget.openFeedbackForm()` with no arguments still uses the configured widget position.

`email-read-only` and `hide-email-when-prefilled` control behavior only when the host app passes a runtime `userEmail` value. Do not store visitor emails in widget settings.

`widget flow --config` accepts either a `feedbackFlow` object or a JSON object with a `feedbackFlow` key. Use it when an agent needs to customize visitor choices such as Bug report, Feature request, and General feedback. Supported v1 question types are `text`, `textarea`, and `single_choice`.

### Team
```bash
feedbackbasket team list
feedbackbasket team role <memberId> --role admin
feedbackbasket team remove <memberId> --yes
```

### Utilities
```bash
feedbackbasket doctor                  # Health check (auth, connectivity, skill)
feedbackbasket setup claude            # Install this skill for Claude Code
```

## Common Agent Workflows

### Set up a new project end-to-end
```bash
feedbackbasket projects create "My App" --url https://myapp.com --agent
feedbackbasket widget script "My App" --agent
# Agent gets the embed code, adds it to the HTML
feedbackbasket widget settings "My App" --color "#22c55e" --label "Feedback" --agent
# Optional: enable the guided wizard with Bug, Feature, and General templates
feedbackbasket widget flow "My App" --reset-default --enable --agent
```

### Triage new feedback
```bash
feedbackbasket feedback list --status OPEN --agent
# Review items, then update:
feedbackbasket feedback update <id> --status UNDER_REVIEW --agent
feedbackbasket feedback note <id> "Reviewing — appears related to auth flow" --agent
```

### Capture new feedback without leaving the terminal
```bash
feedbackbasket feedback create "Login button is broken" \
  --content "Clicking Log in does nothing in Safari." \
  --project myapp \
  --type bug \
  --page-url https://example.com/login \
  --metadata source=agent \
  --agent
```
Agent mode returns the created feedback ID, dashboard URL, and feedback object. Created feedback is analyzed by AI and follows the project's notification settings.

### Investigate high-priority bugs
```bash
feedbackbasket bugs list --severity high --agent
feedbackbasket feedback show <id> --agent
# Response includes browser, OS, page URL, submitted feedback type, follow-up answers, attachment URLs, metadata, AI analysis, priority score
```

### Close the loop — reply to the submitter
```bash
# Agent reads context, asks which delivery method to use, then sends it
feedbackbasket feedback show <id> --agent                    # read email, hasWidgetAccess, project.replyToEmail
feedbackbasket feedback reply <id> "<drafted response>" --delivery widget --agent
feedbackbasket feedback reply <id> "<drafted response>" --delivery email --reply-to support@example.com --agent
feedbackbasket feedback reply <id> "<drafted response>" --delivery both --reply-to support@example.com --agent
feedbackbasket feedback update <id> --status COMPLETE --agent
feedbackbasket feedback note <id> "Replied via CLI" --agent
```
**Important reply safety rules:**
- Before replying, the agent MUST inspect `feedback show --agent`, then ask the human which delivery method to use: `email`, `widget`, or `both`, unless the human already specified it in the current conversation.
- If `feedback show` returns `email: null`, do not use `--delivery email` or `--delivery both`. If `hasWidgetAccess: true`, use `--delivery widget`; otherwise ask the human how they want to respond.
- If `hasWidgetAccess: false`, do not use `--delivery widget` or `--delivery both`.
- If the delivery includes email and `project.replyToEmail: null`, the agent MUST ask the human which reply-to email to use before sending. Do not use the account owner's email, token owner's email, or any remembered address without explicit confirmation in the current conversation.
- After the human confirms a reply-to address, pass it explicitly with `--reply-to <email>`, or set a project default first with `feedbackbasket projects update <project> --reply-to <email>`.

Never silently guess a reply-to address. It becomes the "From" address the customer sees.

### Export for analysis
```bash
feedbackbasket feedback export myapp --format json --agent
# Agent can parse the JSON and generate reports
```

### Search for patterns
```bash
feedbackbasket feedback search "login" --agent
feedbackbasket feedback search "crash" --category BUG --agent
```

## Filtering Options

| Type | Values |
|------|--------|
| Categories | `BUG`, `FEATURE_REQUEST`, `IMPROVEMENT`, `QUESTION` |
| Statuses | `OPEN`, `UNDER_REVIEW`, `PLANNED`, `IN_PROGRESS`, `COMPLETE`, `CLOSED` |
| Sentiments | `POSITIVE`, `NEGATIVE`, `NEUTRAL` |
| Bug Severity | `high`, `medium`, `low` |

## JSON Envelope

When using `--json`, responses include breadcrumbs:
```json
{
  "ok": true,
  "data": [...],
  "summary": "5 projects",
  "breadcrumbs": [
    { "action": "View feedback", "cmd": "feedbackbasket feedback list --project myapp" }
  ]
}
```

Errors include hints:
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
- `--agent` flag suppresses all interactive prompts and confirmations
- Default project (set during login) is used when `--project` is not specified
- Project names resolve case-insensitively with fuzzy matching
- Write operations use full scope (granted by default during login)
- Feedback IDs are stable CUIDs — safe to reference across commands
- All timestamps are ISO 8601
- `--yes` flag skips delete confirmations in interactive mode
