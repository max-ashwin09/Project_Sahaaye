# SAHAAYE Developer & AI Agent Guidelines

## 🚨 MANDATORY RULE: Git Push Permission Required
**CRITICAL & STRICTLY ENFORCED**:
Under NO circumstances should the AI agent execute `git push` or push any changes, commits, or branches to GitHub (or any remote repository) without first asking the user for explicit confirmation and waiting for their approval in the chat.

### Standard Operating Procedure for Git Push:
1. Complete all local implementation, builds, and commits.
2. Present a clear, concise summary of the changes made.
3. Explicitly ask the user:
   > *"Changes locally commit ho chuki hain. Kya main inhe GitHub par push kar doon? (Do you grant permission to push to GitHub?)"*
4. **WAIT for the user's explicit approval** (e.g. "push karo", "yes", "proceed").
5. Only execute `git push` **AFTER** the user has given clear affirmative consent.
6. If the user denies or does not confirm, DO NOT push. Keep changes stored safely in local git.
