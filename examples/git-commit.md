---
name: commit
namespace: git
description: Create a git commit with a message
author: opencommands
tags: [git, vcs, commit]
args:
  - name: message
    required: true
    description: Commit message
allowed-tools:
  - Bash
  - Git
model: claude-3-5-sonnet-20241022
---

Create a git commit with the provided message.

## Context
- Current branch: !`git branch --show-current`
- Repository status: !`git status --porcelain`

## Steps
1. Stage all changes
2. Create commit with message
3. Show commit details

```bash
git add .
git commit -m "$message"
git log --oneline -1
```

## Example
```bash
opencommands execute git:commit "Add new feature"
```