#!/usr/bin/env node

/**
 * Publishing script for HyperLiquid MCP Server
 *
 * This script prepares and publishes the package to NPM
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');

function run(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      cwd: join(__dirname, '..'),
    });
    console.log(`✅ ${description} completed\n`);
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Publishing HyperLiquid MCP Server\n');

  // Read package.json
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  console.log(`📦 Package: ${packageJson.name}@${packageJson.version}`);
  console.log(`📝 Description: ${packageJson.description}\n`);

  // Pre-publication checks
  run('npm run lint', 'Running linter');
  run('npm run typecheck', 'Type checking');
  run('npm test', 'Running tests');
  run('npm run build', 'Building project');

  // Verify bin file exists and is executable
  run('ls -la dist/bin/hyperliquid-mcp.js', 'Checking binary file');

  // Check if we're logged in to NPM
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    console.log('✅ NPM authentication verified\n');
  } catch (error) {
    console.log('⚠️  Not logged in to NPM. Run: npm login\n');
    process.exit(1);
  }

  // Publish (dry run first)
  console.log('🔍 Running publish dry-run...');
  run('npm publish --dry-run', 'Dry-run publish');

  console.log('🎯 Ready to publish! Run one of:');
  console.log('  npm publish --tag alpha    # For alpha releases');
  console.log('  npm publish --tag beta     # For beta releases');
  console.log('  npm publish                # For stable releases');
  console.log('');
  console.log('📚 After publishing, users can install with:');
  console.log(`  npm install -g ${packageJson.name}`);
  console.log('  hl-eco-mcp');
}

main();
