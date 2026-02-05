#!/usr/bin/env node
// scripts/lighthouse-auth.js
// Run Lighthouse on authenticated pages using Puppeteer
// Usage: node scripts/lighthouse-auth.js [url]

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const TEST_PIN = process.env.LIGHTHOUSE_TEST_PIN || '1234';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Authenticated pages from CONTEXT.md (user decisions - locked)
// Note: Dynamic routes use example IDs - update with actual test data IDs
const AUTHENTICATED_PAGES = [
  '/dashboard',
  '/projects',
  '/projects/1',  // Example project ID - use actual ID from test data
  '/projects/1/units/1/inspections',  // Example IDs - use actual from test data
];

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="password"]', TEST_PIN);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);
  console.log('Login successful');
}

async function runLighthouse(url, outputPath) {
  const cmd = `npx @lhci/cli collect --url="${url}" --numberOfRuns=3 --settings.chromeFlags="--disable-gpu --no-sandbox" --settings.disableStorageReset=true`;
  console.log(`Running Lighthouse on ${url}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Lighthouse failed for ${url}:`, error.message);
  }
}

async function main() {
  const targetUrl = process.argv[2];

  // Launch browser and login
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--remote-debugging-port=9222', '--no-sandbox'],
  });

  const page = await browser.newPage();
  await login(page);

  // Get cookies for session
  const cookies = await page.cookies();
  console.log('Session cookies captured');

  // Keep browser open for Lighthouse to use session
  if (targetUrl) {
    await runLighthouse(`${BASE_URL}${targetUrl}`, 'lighthouse-report');
  } else {
    for (const pagePath of AUTHENTICATED_PAGES) {
      await runLighthouse(`${BASE_URL}${pagePath}`, `lighthouse-${pagePath.replace(/\//g, '-')}`);
    }
  }

  await browser.close();
  console.log('Done. Check .lighthouseci/ for reports.');
}

main().catch(console.error);
