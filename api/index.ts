/**
 * Vercel serverless entry point.
 * Imports the pre-compiled Express app bundle — avoids TypeScript workspace
 * resolution issues in Vercel's serverless function compiler.
 */
// @ts-ignore — compiled at build time by pnpm --filter @workspace/api-server run build
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
