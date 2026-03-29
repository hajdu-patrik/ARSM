---
name: autoservice-mcp-context-policy
description: AutoService MCP and Context Mode interaction policy. Use this when working with MCP servers, context-mode tools, hook routing, large command output, or deciding automatic vs explicit context-mode usage.
disable-model-invocation: true
---

Use this skill for MCP server interaction decisions in this repository.

Policy goals:
- Keep MCP setup minimal and project-focused.
- Use context-mode automatically for routine small tasks.
- Use explicit context-mode workflows for high-output and multi-step research.

Workspace MCP baseline:
- MCP registration file: .vscode/mcp.json
- Hook routing file: .github/hooks/context-mode.json
- Local tool manifest: .config/dotnet-tools.json
- Aspire MCP startup command: dotnet tool run aspire -- mcp start

Server policy:
- Primary servers: pencil-design-tool, context-mode
- Optional server: aspire (only when Aspire workflow support is needed)
- Do not add extra MCP servers unless there is clear repeated-work reduction value

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
- After MCP/hook config changes, restart VS Code once
- On fresh clone, run dotnet tool restore before starting Aspire MCP

Quick checks:
- context-mode --version
- context-mode doctor
- dotnet tool run aspire -- mcp --help