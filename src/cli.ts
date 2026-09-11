#!/usr/bin/env node

import { run } from "./run.js";

const result = await run({
  argv: process.argv.slice(2),
  env: process.env,
});

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.code);
