# OzWizard MCP — build your own, expose your system to Claude

OzWizard ships a tiny **local MCP server** (`mcp/server.ts`) so Claude can query the
service's data directly. It's self-contained: pure TypeScript, stdio transport, **no
external service and no accounts**. It's also the on-ramp for the "brain" — giving the
model a safe, read-only window into your system.

## What it exposes

One **read-only** tool, `query_ozwizard_store`, that reads the JSON store the API writes
to (`DATA_PATH`) and answers three actions:

| action           | args                            | returns                                                                                          |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `list_artifacts` | —                               | indexed artifacts (name, version, dep count)                                                     |
| `list_scans`     | `verdict?` (allow\|warn\|block) | scans, optionally filtered by verdict                                                            |
| `explain_scan`   | `scanId`                        | why a scan got its verdict — findings, severity, direct/transitive, advisory, and any escalation |

It reads the file with `fs` directly and **never writes** — it can't mutate or even lazily
create the store. That "safe read-only boundary" is the point of the exercise.

## Setup (project scope)

Already wired in [`.mcp.json`](../.mcp.json):

```json
{
  "mcpServers": {
    "ozwizard-store": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "env": { "DATA_PATH": "./data/ozwizard.json" }
    }
  }
}
```

1. `npm install` (installs `@modelcontextprotocol/sdk` + `tsx`).
2. Open the project in Claude Code. It will prompt to approve the project MCP server —
   approve it.
3. Run **`/mcp`** — you should see `ozwizard-store` **connected** with one tool.

> The server reads `DATA_PATH`, so generate some data first (submit + scan an artifact —
> see the README "Run & verify"). Point `DATA_PATH` at the same file the API uses.

## Example query

Ask Claude (once connected):

> "Use the ozwizard-store tool to list scans with verdict block, then explain the first one."

Claude calls `query_ozwizard_store` and gets, e.g.:

```json
{
  "scan": "payments-svc@2.3.0",
  "verdict": "block",
  "effectiveVerdict": "allow",
  "why": [
    {
      "package": "log4jira@2.10.0",
      "severity": "critical",
      "kind": "direct",
      "advisory": "OZW-2021-0001",
      "title": "Remote code execution via crafted lookup strings",
      "path": "log4jira@2.10.0"
    }
  ],
  "escalation": {
    "reason": "patched fork in use",
    "requestedBy": "chen",
    "overrodeVerdict": "block"
  }
}
```

### Verify it yourself without Claude (raw stdio)

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"query_ozwizard_store","arguments":{"action":"list_scans","verdict":"block"}}}' \
 | DATA_PATH=./data/ozwizard.json npx tsx mcp/server.ts
```

## Optional: connect real Jira + Grafana MCPs (team setting)

In a workshop you can point Claude at real systems too. Add them to `.mcp.json`
alongside `ozwizard-store` (use your org's endpoints/credentials — keep secrets in env,
never commit them):

```json
{
  "mcpServers": {
    "ozwizard-store": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "env": { "DATA_PATH": "./data/ozwizard.json" }
    },

    "jira": {
      "command": "npx",
      "args": ["-y", "@atlassian/mcp-server-jira"],
      "env": {
        "JIRA_BASE_URL": "https://your-org.atlassian.net",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_EMAIL": "${JIRA_EMAIL}"
      }
    },

    "grafana": {
      "command": "npx",
      "args": ["-y", "@grafana/mcp-server"],
      "env": { "GRAFANA_URL": "https://your-grafana", "GRAFANA_API_KEY": "${GRAFANA_API_KEY}" }
    }
  }
}
```

Package names/args vary by vendor release — check each project's README. The pattern is
the same: a `command` that speaks MCP over stdio, plus `env` for connection settings.
With Jira wired, `investigate-ozwizard-bug` can pull the real OZ-1xx ticket; with Grafana,
a reviewer can cite dashboards. Keep tokens in your shell env (`${VAR}` expansion), not in
the committed file.
