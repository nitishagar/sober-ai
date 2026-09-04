// Shared in-memory batch job store (single-process).
//
// Restart loss is accepted: jobs live only in this process's memory and are
// dropped on restart/redeploy. When no owner token is present (null owner —
// local/desktop mode with isolation inactive), jobs live in a single global
// namespace visible to all callers.
const batchJobs = new Map();

module.exports = { batchJobs };
