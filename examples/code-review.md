---
name: review
namespace: code
description: Review code for common issues and improvements
author: opencommands
tags: [code, review, quality]
args:
  - name: file
    required: true
    description: File path to review
allowed-tools:
  - Read
  - Bash
model: claude-3-5-sonnet-20241022
---

Review the provided code file for common issues, improvements, and best practices.

## Review Checklist
- Code readability and structure
- Error handling
- Performance considerations
- Security issues
- Documentation completeness

## File to Review
@$file

## Review Process
1. Read and understand the code
2. Identify potential issues
3. Suggest improvements
4. Provide specific recommendations

## Output Format
- Summary of findings
- List of issues with severity (High/Medium/Low)
- Specific improvement suggestions
- Code examples where applicable