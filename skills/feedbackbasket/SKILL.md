---
name: feedbackbasket
description: Manage FeedbackBasket projects, feedback, bugs, website widgets, mobile app feedback, waitlist capture, and teams from the command line. Use whenever an agent needs to configure FeedbackBasket in a web or mobile app, install its Swift SDK or hosted mobile form, collect feedback or waitlist signups, query feedback, or manage a FeedbackBasket project.
---

# FeedbackBasket CLI

Full command-line interface for managing feedback, waitlist signups, bug reports, projects, widgets, and teams in FeedbackBasket. Works with any AI agent that can run shell commands.

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

**Project selection rule for widget installs:** when the user asks to add a FeedbackBasket widget, bubble, popup, modal, or feedback button to the current app, first resolve the FeedbackBasket project for this app. Do not use the CLI default project just because one is configured.

1. Identify the current app's real website URL or intended public URL from the user, app config, docs, or existing FeedbackBasket embed code.
2. Run `feedbackbasket projects list --agent` and look for an existing project whose `url` matches that site or whose name clearly matches the current app.
3. If exactly one project matches, use that project ID/name for `widget settings`, `widget script`, and feedback commands.
4. If multiple projects could match, ask the user which one to use.
5. If no project matches, ask whether to create a new project for this app, then create it with the confirmed real URL. Do not create a project from a localhost URL unless the user explicitly wants a local-only test project.

**Project URL rule for agents:** confirm the real website URL before creating or updating a project. Never use `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, or a local dev server URL unless the user explicitly says the project is only for local testing. If the repo only exposes a local URL, ask for the production, staging, preview, or intended public URL. Do not guess a public domain from package names, git remotes, or environment variables. For an explicitly local-only test project, pass `--allow-local-url`.

**Capture-mode decision:** if the user asks for feedback, a feedback bubble, bug reports, or feature requests, use `--capture-mode feedback`. If they ask for a waitlist, launch list, early access, or email capture, use `--capture-mode waitlist`. If they ask to set up FeedbackBasket without choosing, explain both options and ask which they want. Do not switch an existing project without confirmation because only one capture mode is active at a time.

**Mobile project selection rule:** resolve the FeedbackBasket project for the current app before running mobile commands. Prefer a clearly matching existing project name or product URL. If multiple projects are plausible, ask the user. If none exists, confirm a real product, support, marketing, or App Store URL before creating one; do not invent a URL or use a local development address.

### Mobile App Feedback

```bash
feedbackbasket mobile status <project> --agent
feedbackbasket mobile setup <project> --bundle-id com.example.app --agent
feedbackbasket mobile setup <project> --bundle-id com.example.app --include-publishable-key --agent
feedbackbasket mobile bundle-ids <project> --add com.example.app.beta --agent
feedbackbasket mobile bundle-ids <project> --remove com.example.app.beta --agent
feedbackbasket mobile conversations <project> --enable --agent
feedbackbasket mobile conversations <project> --disable --agent
feedbackbasket mobile verify <project> --bundle-id com.example.app --wait 120 --agent
feedbackbasket mobile disable <project> --yes --agent
feedbackbasket mobile rotate-key <project> --yes --include-publishable-key --agent
```

The `fb_mobile_` project key is a publishable, write-only identifier designed to ship in the app. It cannot read feedback or administer the project. It is still masked by default to reduce accidental disclosure in logs and transcripts. Use `--include-publishable-key` only while performing a mobile setup the user authorized, and never repeat the full value in the final response.

Never put an `fb_cli_` CLI token or `fb_key_` MCP/API key in application source, build settings, prompts, logs, or generated configuration. Those are private credentials and are not interchangeable with the publishable mobile key.

For SwiftUI apps targeting iOS 16 or later, use the Swift package returned by `mobile setup` and its native feedback sheet. For UIKit, use the package API or host the SwiftUI sheet. For React Native, Flutter, or unsupported stacks, use the returned hosted form URL in the app's existing in-app browser when available.

Configure the Swift package once at app startup with the returned publishable key:

```swift
import FeedbackBasket

FeedbackBasket.configure(
    projectKey: "fb_mobile_returned_by_mobile_setup"
)
```

Present its standard SwiftUI sheet from the selected Settings, Help, or Support view:

```swift
@State private var showingFeedback = false

Button("Send feedback") {
    showingFeedback = true
}
.feedbackBasketSheet(
    isPresented: $showingFeedback,
    context: ["screen": "Settings"]
)
```

Use FeedbackBasket Swift SDK 0.3.0 or later. The SDK stores each submission's conversation credential in the app Keychain, shows an unread badge when the team replies, and keeps team and user messages in one thread. When mobile conversations are enabled, users answer inside that thread; never create a new feedback submission for a follow-up. Reply state refreshes when the SDK is configured, when the app enters the foreground, and when the sheet opens. This is not an APNs push notification while the app is closed. Do not build a separate inbox, polling client, or token store in the host app. Hosted-form integrations remain email-only.

Add an accessible Send feedback action to an appropriate existing Settings, Help, or Support screen. Attach only useful non-sensitive context. Do not send passwords, authentication tokens, payment information, private form contents, crash reports, analytics, session recordings, or automatic logs.

Treat a supplied project key as production unless the user explicitly confirms a staging key and base URL. Build and launch the app so the SDK can send its heartbeat, then use `mobile verify`; do not submit test feedback to production. A prior matching heartbeat is a valid connection result because the SDK throttles successful heartbeat attempts.

`mobile setup` is idempotent and adds bundle IDs without replacing existing entries. Do not rotate a key or disable mobile feedback unless the user explicitly requested that disruptive action. Rotation stops every released app using the previous key.

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

# Reply to submitter by email, widget/in-app thread, or both
feedbackbasket feedback reply <id> "Thanks for reporting — we pushed a fix!" --delivery email --reply-to support@example.com
feedbackbasket feedback reply <id> "<content>" --delivery widget
feedbackbasket feedback reply <id> "<content>" --delivery in-app
feedbackbasket feedback reply <id> "<content>" --delivery both --reply-to support@example.com
feedbackbasket feedback replies <id>                                          # show the complete conversation

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
feedbackbasket widget settings <project> --capture-mode waitlist
feedbackbasket widget settings <project> --capture-mode feedback

# Customize
feedbackbasket widget settings <project> --color "#22c55e" --label "Send Feedback"
feedbackbasket widget settings <project> --position bottom-left --display modal
feedbackbasket widget settings <project> --email-required --intro "How can we improve?"
feedbackbasket widget settings <project> --show-email --allow-attachments
feedbackbasket widget settings <project> --allow-visitor-replies
feedbackbasket widget settings <project> --no-allow-visitor-replies
feedbackbasket widget settings <project> --email-read-only --hide-email-when-prefilled
feedbackbasket widget settings <project> --error-tracking --allow-console-errors

# Guided feedback types and follow-up questions
feedbackbasket widget flow <project>
feedbackbasket widget flow <project> --enable  # only when the user chooses guided feedback
feedbackbasket widget flow <project> --reset-default --enable  # only when the user chooses guided feedback
feedbackbasket widget flow <project> --config ./feedback-flow.json
```

Waitlist mode keeps the same project script and binds to the host app's own annotated form:

```html
<form data-feedbackbasket-waitlist>
  <input name="name" autocomplete="name">
  <input name="email" type="email" autocomplete="email" required>
  <button type="submit">Join the waitlist</button>
</form>
```

Email is required and name is optional. Use `data-feedbackbasket-state="loading|success|error"` for custom UI, or listen for the bubbling `feedbackbasket:waitlist:success` and `feedbackbasket:waitlist:error` events. Do not add a competing submit handler.

### Waitlist Signups

```bash
feedbackbasket waitlist list <project>
feedbackbasket waitlist list <project> --search "@example.com" --limit 50 --offset 0
feedbackbasket waitlist list <project> --agent
feedbackbasket waitlist export <project>
```

Agent output includes signup emails, optional names, captured/referrer pages, total counts, active capture mode, and pagination. Use `waitlist export` for the same CSV export available in the dashboard.

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

Use only the public `openFeedbackForm()` API from the snippet. Do not call internal or undocumented methods such as `open()`, `openModal()`, or direct modal element manipulation; those can exist in the widget bundle but are not stable integration points.

`email-read-only` and `hide-email-when-prefilled` control behavior only when the host app passes a runtime `userEmail` value. Do not store visitor emails in widget settings.

Use the basic widget experience by default: `displayMode` stays `modal`, and guided feedback stays disabled. Ask the user before switching to `popup` or enabling guided feedback. If the user does not care, keep modal + basic feedback.

`widget flow --config` accepts either a `feedbackFlow` object or a JSON object with a `feedbackFlow` key. Use it only when the user wants to customize visitor choices such as Bug report, Feature request, and General feedback. Supported v1 question types are `text`, `textarea`, and `single_choice`.

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

### Add a widget to the current app
```bash
# First resolve the project for this app. Do not rely on the CLI default project.
feedbackbasket projects list --agent

# If no existing project matches the current app's real URL/name, create one after confirming the URL.
feedbackbasket projects create "My App" --url https://myapp.com --agent
feedbackbasket widget script "My App" --agent
# Agent gets the embed code, adds it to the HTML
feedbackbasket widget settings "My App" --color "#22c55e" --label "Feedback" --agent
# Optional, when the user wants a waitlist instead of feedback capture
# feedbackbasket widget settings "My App" --capture-mode waitlist --agent
# Optional, only when requested: enable the guided wizard with Bug, Feature, and General templates
# feedbackbasket widget flow "My App" --reset-default --enable --agent
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

### File agent-found issues in FeedbackBasket

When the user says "file this in FeedbackBasket", "log this bug", "create feedback for this issue", "add this to FeedbackBasket", or similar, create a concise feedback item for the issue the agent found.

Before creating the item, resolve the target project:

1. If the user explicitly names a FeedbackBasket project, use that project.
2. If the current repo/app clearly matches exactly one FeedbackBasket project name or project URL from `feedbackbasket projects list --agent`, use that project.
3. If the CLI default project clearly matches the current repo/app, use it.
4. If multiple projects are plausible, ask the user which FeedbackBasket project to file it under.
5. Do not silently guess the project when it is ambiguous.

Keep agent-filed feedback short and dashboard-friendly:

- Title: under 80 characters, action-oriented, no stack traces.
- Content: 1 to 3 short paragraphs, ideally under 600 characters, focused on the user-visible problem, expected behavior, and actual behavior.
- Do not paste long logs, full reasoning chains, or broad investigation notes into the body.
- Put structured context in metadata: `source=agent`, `found_by=<agent>`, `repo=<name>`, `branch=<branch>`, `route=<path>`, `file=<path>`, `severity=<low|medium|high>`, `test=<command>`.

Use:

```bash
feedbackbasket feedback create "<short title>" \
  --content "<brief user-visible issue description>" \
  --project <project-name-or-id> \
  --type bug \
  --metadata source=agent \
  --metadata found_by=codex \
  --agent
```

After creation, report the feedback ID and dashboard URL to the user.

### Investigate high-priority bugs
```bash
feedbackbasket bugs list --severity high --agent
feedbackbasket feedback show <id> --agent
# Response includes browser, OS, page URL, submitted feedback type, follow-up answers, attachment URLs, metadata, AI analysis, priority score
```

### Close the loop — reply to the submitter
```bash
# Agent reads context, asks which delivery method to use, then sends it
feedbackbasket feedback show <id> --agent                    # read email, replyChannel, project.replyToEmail
feedbackbasket feedback reply <id> "<drafted response>" --delivery widget --agent
feedbackbasket feedback reply <id> "<drafted response>" --delivery in-app --agent
feedbackbasket feedback reply <id> "<drafted response>" --delivery email --reply-to support@example.com --agent
feedbackbasket feedback reply <id> "<drafted response>" --delivery both --reply-to support@example.com --agent
feedbackbasket feedback update <id> --status COMPLETE --agent
feedbackbasket feedback note <id> "Replied via CLI" --agent
```
**Important reply safety rules:**
- Before replying, the agent MUST inspect `feedback show --agent`, including `replyChannel` and `awaitingOwnerReply`, then ask the human which available delivery method to use unless the human already specified it in the current conversation.
- If `replyChannel: "in_app"`, use `--delivery in-app`. If `replyChannel: "widget"`, use `--delivery widget`. Use `--delivery both` only when an email address and a reply channel are both available.
- If `feedback show` returns `email: null`, do not use `--delivery email` or `--delivery both`. If `replyChannel: null`, do not use thread delivery.
- If the delivery includes email and `project.replyToEmail: null`, the agent MUST ask the human which reply-to email to use before sending. Do not use the account owner's email, token owner's email, or any remembered address without explicit confirmation in the current conversation.
- After the human confirms a reply-to address, pass it explicitly with `--reply-to <email>`, or set a project default first with `feedbackbasket projects update <project> --reply-to <email>`.
- Treat `feedback replies <id>` as one chronological conversation containing both team and visitor messages. A visitor follow-up belongs to the original feedback item; never create a replacement feedback item for it.

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
