/**
 * Vercel serverless entry point.
 * Re-exports the Express app — Vercel's Node.js runtime calls it as a handler.
 */
import app from "../artifacts/api-server/src/app";

export default app;
