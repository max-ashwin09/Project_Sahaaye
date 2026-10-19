---
trigger: always_on
description: Strictly require user permission before pushing to GitHub
---

# Git Push Permission Rule

1. NEVER execute `git push` autonomously.
2. Whenever changes are ready to be pushed to GitHub:
   - Provide a clear summary of what was changed and committed.
   - Ask the user: "Kya main inhe GitHub par push kar doon?"
   - Do NOT run `git push` until the user explicitly approves.
