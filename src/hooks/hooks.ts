import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  Status,
  ITestCaseHookParameter,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { MortgageWorld } from '../utils/world';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();
// Increase default step timeout to allow slower live-site navigation and
// network-dependent operations to complete reliably in CI/remote runs.
setDefaultTimeout(120 * 1000);

// Reports
const dirs = [
  'reports/screenshots',
  'reports/videos',
  'reports/traces',
  'reports/logs',
  'allure-results',
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

BeforeAll(async function () {
  console.log('\n Starting Mortgage BDD Test Suite\n');
});

AfterAll(async function () {
  console.log('\n Test Suite Complete\n');
});

Before(async function (this: MortgageWorld, scenario: ITestCaseHookParameter) {
  // Safety check - ensure world methods exist
  if (typeof this.initBrowser !== 'function') {
    throw new Error(
      'MortgageWorld not loaded correctly. Ensure world.ts is required first.'
    );
  }

  console.log(`\n Scenario: "${scenario.pickle.name}"`);

  await this.initBrowser();

  // Start tracing
  try {
    await this.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
  } catch (e) {
    console.warn('Tracing not available:', e);
  }
});

After(async function (this: MortgageWorld, scenario: ITestCaseHookParameter) {
  const { result } = scenario;
  const status = result?.status;
  const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '-');

  try {
    if (status === Status.FAILED) {
      console.log(` FAILED: "${scenario.pickle.name}"`);
      console.log(`   Error: ${result?.message?.substring(0, 200)}`);

      // Screenshot on failure
      if (this.page) {
        try {
          const screenshotBuffer = await this.page.screenshot({
            fullPage: true,
            path: `reports/screenshots/FAIL-${scenarioName}-${Date.now()}.png`,
          });
          await this.attach(screenshotBuffer, 'image/png');
          console.log('Screenshot saved');
        } catch (e) {
          console.warn('Screenshot failed:', e);
        }
      }

      // Trace on failure
      if (this.context) {
        try {
          await this.context.tracing.stop({
            path: `reports/traces/FAIL-${scenarioName}-${Date.now()}.zip`,
          });
          console.log('Trace saved');
        } catch (e) {
          // Tracing may not have started
        }
      }

    } else if (status === Status.PASSED) {
      console.log(`PASSED: "${scenario.pickle.name}"`);
      if (this.context) {
        await this.context.tracing.stop().catch(() => {});
      }
    }

  } finally {
    // Safe cleanup - check methods exist before calling
    if (typeof this.closeBrowser === 'function') {
      await this.closeBrowser();
    } else {
      // Fallback manual cleanup
      try { await this.page?.close(); } catch {}
      try { await this.context?.close(); } catch {}
      try { await this.browser?.close(); } catch {}
    }
  }
});
