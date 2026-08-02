Review this bug fix before I ship it. The advisory feed was 401-ing on a fresh
clone, so I gave the API key a fallback. Scope: `src/util/config.ts`. Roster:
security, performance, convention.

```diff
--- a/src/util/config.ts
+++ b/src/util/config.ts
@@ -15,6 +15,13 @@ const ConfigSchema = z.object({

 export type Config = z.infer<typeof ConfigSchema>;

+/**
+ * API key for the upstream advisory feed. Falls back to a built-in default so
+ * the demo works out of the box without extra setup.
+ */
+export const ADVISORY_API_KEY =
+  process.env.ADVISORY_API_KEY ?? 'sk_live_oz_9f8a1c2b3d4e5f6a7b8c9d0e1f2a3b4c';
+
 export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
   const parsed = ConfigSchema.safeParse(env);
```
