# Issue tracker

Issues and specs live in GitHub Issues for `loucasty-cell/bookflow`. Supply `--repo loucasty-cell/bookflow` when using `gh` so fork defaults cannot redirect a write. Use `gh issue view <number>` to read, `gh issue list` to list, `gh issue create` to publish approved issues, and `gh issue edit` to update labels and assignments. Use `--body-file` for multiline text. A connected GitHub tool can perform equivalent operations when available.

Represent parent and blocker relationships with GitHub sub-issues and issue dependencies. Where unavailable, record `Part of #<number>` or `Blocked by: #<number>` in the ticket body. A blocker is resolved when its issue is closed.

**PRs as a request surface: no.**
