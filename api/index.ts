/**
 * Vercel serverless entry point.
 * Imports the pre-compiled Express app bundle.
 */
// @ts-ignore
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
