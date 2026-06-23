// Placeholder — overwritten by `pnpm --filter @workspace/api-server run build`
// Do not edit manually.
module.exports = (req, res) => {
  res.status(503).json({ error: "Build in progress" });
};
