#!/usr/bin/env node
// Validates the given JSON files against the renovate-schema.json that ships
// inside the installed `renovate` package, so the schema always matches the
// renovate version CI resolved (no network fetch, nothing to keep in sync).
//
// This complements `renovate-config-validator`: the validator catches unknown
// options and global-only options, the schema catches bad enum values.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import process from 'node:process';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const require = createRequire(import.meta.url);
const schemaPath = require.resolve('renovate/renovate-schema.json');
const schema = require(schemaPath);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: validate-schema.mjs <file.json...>');
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let failed = false;
for (const file of files) {
  const config = JSON.parse(await readFile(file, 'utf8'));
  if (validate(config)) {
    console.log(`ok       ${file}`);
    continue;
  }

  failed = true;
  console.log(`FAIL     ${file}`);
  for (const error of validate.errors) {
    const where = error.instancePath || '/';
    const allowed = error.params?.allowedValues;
    const hint = allowed ? ` (allowed: ${allowed.join(', ')})` : '';
    console.log(`  ${where}: ${error.message}${hint}`);
  }
}

console.log(`\nschema: ${schemaPath}`);
process.exit(failed ? 1 : 0);
