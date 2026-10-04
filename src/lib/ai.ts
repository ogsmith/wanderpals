import { createAnthropic } from "@ai-sdk/anthropic";

// Org-level keys (not scoped to a workspace) must name the workspace on every request.
const anthropic = createAnthropic({
  headers: process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : undefined,
});

// Prefer a direct Anthropic key; fall back to Vercel AI Gateway if that's what's configured.
export const MODEL = process.env.ANTHROPIC_API_KEY ? anthropic("claude-sonnet-5-5") : "anthropic/claude-sonnet-5.5";

/** True when an LLM is configured; otherwise routes fall back to rule-based logic. */
export const aiEnabled = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
