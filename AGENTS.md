# Agent contribution rules

Any FeedbackBasket product operation added, removed, renamed, or changed must update `feedbackbasket-agent-contract` first. The CLI and both MCP transports must implement the same contract version in the same release. Transport-only features require an explicit parity exemption with a reason.

Keep the packaged FeedbackBasket skill byte-identical to the standalone skill in `E:\projects\feedbackbasket-skills\skills\feedbackbasket\SKILL.md`.
