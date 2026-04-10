---
name: autoservice-mcp-context-policy
description: AutoService MCP and Context Mode interaction policy. Use this when working with MCP servers, context-mode tools, MCP templates/runtime config, large command output, or deciding automatic vs explicit context-mode usage.
---

Use this skill for MCP server interaction decisions in this repository.

Policy goals:
- Keep MCP setup minimal and project-focused.
- Use context-mode automatically for routine small tasks.
- Use explicit context-mode workflows for high-output and multi-step research.

Workspace MCP baseline:
- Template files (tracked): .vscode/mcp.template.json and .claude/.mcp.template.json
- Runtime files (local/ignored): .vscode/mcp.json and .claude/.mcp.json
- Keep .vscode and .claude MCP server sets aligned
- Local tool manifest: dotnet-tools.json (repository root)
- Aspire MCP startup command: dotnet tool run aspire -- mcp start

Server policy:
- Shared server set: context-mode, aspire, postgres, docker
- Keep server additions intentional and project-focused

When automatic usage is enough:
- Small reads/edits/builds and short diagnostics
- Focused file-level tasks with small output

When explicit context-mode usage is preferred:
- Large output commands (long logs, broad search, large CLI/API output)
- Multi-step repository exploration
- Documentation/web content processing with indexing and targeted search
- Session health checks after long work sessions

Recommended patterns:
- Prefer ctx_batch_execute for grouped multi-step investigation
- Prefer indexing + targeted search for large documentation
- Prefer concise summaries over dumping large raw output

Operational reminders:
- After MCP template/runtime config changes, restart VS Code once
- On fresh clone, run dotnet tool restore before starting Aspire MCP

Quick checks:
- context-mode --version
- context-mode doctor
- dotnet tool run aspire -- mcp --help