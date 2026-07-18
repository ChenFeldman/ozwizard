#!/usr/bin/env node
/**
 * OzWizard MCP server (stdio, self-contained, read-only).
 *
 * Teaching goal: "build your own MCP and expose your system to Claude." This is
 * the smallest useful shape — ONE read-only tool that queries the JSON store the
 * API writes to. It never writes: it reads DATA_PATH directly with fs, so it
 * cannot mutate or even lazily create the store.
 *
 * The same DATA_PATH the API uses must be visible here (set via .mcp.json env).
 */
import { readFile } from 'node:fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Artifact, Escalation, Scan } from '../src/core/types.js';

const DATA_PATH = process.env.DATA_PATH ?? './data/ozwizard.json';

interface Db {
  artifacts: Artifact[];
  scans: Scan[];
  escalations: Escalation[];
}

/** Read the store read-only. Missing file → empty db (never created). */
async function loadDb(): Promise<Db> {
  try {
    const raw = await readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      artifacts: parsed.artifacts ?? [],
      scans: parsed.scans ?? [],
      escalations: parsed.escalations ?? [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { artifacts: [], scans: [], escalations: [] };
    }
    throw err;
  }
}

const TOOL_NAME = 'query_ozwizard_store';

const inputSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['list_artifacts', 'list_scans', 'explain_scan'],
      description:
        'list_artifacts: indexed artifacts; list_scans: scans (optionally filtered by verdict); explain_scan: why a scan got its verdict (findings + reasoning).',
    },
    verdict: {
      type: 'string',
      enum: ['allow', 'warn', 'block'],
      description: 'Optional filter for list_scans.',
    },
    scanId: {
      type: 'string',
      description: 'Required for explain_scan: the scan id to explain.',
    },
  },
  required: ['action'],
  additionalProperties: false,
} as const;

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}
function fail(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

async function runTool(args: Record<string, unknown>) {
  const db = await loadDb();
  const action = args.action as string;

  if (action === 'list_artifacts') {
    return ok(
      db.artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        version: a.version,
        ecosystem: a.ecosystem,
        dependencies: a.dependencies.length,
      }))
    );
  }

  if (action === 'list_scans') {
    const verdict = args.verdict as string | undefined;
    const scans = verdict ? db.scans.filter((s) => s.verdict === verdict) : db.scans;
    return ok(
      scans.map((s) => ({
        id: s.id,
        artifact: `${s.artifactName}@${s.artifactVersion}`,
        verdict: s.verdict,
        effectiveVerdict: s.effectiveVerdict ?? s.verdict,
        findings: s.findings.length,
        escalated: Boolean(s.escalationId),
      }))
    );
  }

  if (action === 'explain_scan') {
    const scanId = args.scanId as string | undefined;
    if (!scanId) return fail('explain_scan requires "scanId".');
    const scan = db.scans.find((s) => s.id === scanId);
    if (!scan) return fail(`No scan found with id "${scanId}".`);
    const escalation = scan.escalationId
      ? db.escalations.find((e) => e.id === scan.escalationId)
      : undefined;
    return ok({
      scan: `${scan.artifactName}@${scan.artifactVersion}`,
      verdict: scan.verdict,
      effectiveVerdict: scan.effectiveVerdict ?? scan.verdict,
      why: scan.findings.map((f) => ({
        package: `${f.package}@${f.version}`,
        severity: f.severity,
        kind: f.direct ? 'direct' : 'transitive',
        advisory: f.advisoryId,
        title: f.title,
        path: f.path.join(' → '),
      })),
      escalation: escalation
        ? {
            reason: escalation.reason,
            requestedBy: escalation.requestedBy,
            overrodeVerdict: escalation.originalVerdict,
          }
        : null,
    });
  }

  return fail(`Unknown action "${action}".`);
}

async function main() {
  const server = new Server(
    { name: 'ozwizard-store', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
      {
        name: TOOL_NAME,
        description:
          'Read-only query over the OzWizard JSON store: list artifacts, list scans by verdict, or explain why a scan got its verdict.',
        inputSchema,
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== TOOL_NAME) {
      return fail(`Unknown tool "${request.params.name}".`);
    }
    return runTool(request.params.arguments ?? {});
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is fine for logs; stdout is the MCP channel.
  console.error(`[ozwizard-mcp] connected (DATA_PATH=${DATA_PATH})`);
}

main().catch((err) => {
  console.error('[ozwizard-mcp] fatal:', err);
  process.exit(1);
});
