import type { Page, Locator } from 'playwright';
import { Logger } from '../utils/logger';

export abstract class BasePage {
  protected page: Page;
  protected logger: Logger;
  protected baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger(this.constructor.name);
    this.baseUrl =
      process.env.BASE_URL ||
      'https://www.mortgageadvicebureau.com/find-a-mortgage/';
  }

  /**
   * Navigate to the page URL
   */
  async navigate(path = ''): Promise<void> {
    const url = path || this.baseUrl;
    this.logger.info(`Navigating to: ${url}`);

    try {
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.NAVIGATION_TIMEOUT || '30000', 10),
      });
    } catch (error) {
      this.logger.warn(
        `Navigation to ${url} timed out or failed: ${error}. ` +
          'Attempting to continue if the page is partially loaded.'
      );
      await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    }

    await this.handleCookieBanner();

    // Ensure the search form is present before continuing.
    await Promise.race([
      this.page.waitForSelector('button:has-text("Get results"), button[type="submit"], input[name="propertyValue"]', {
        timeout: 20000,
      }),
      this.page.waitForTimeout(20000),
    ]).catch(() => {
      this.logger.warn('Search form did not appear within expected time after navigation');
    });
  }

  /**
   * Handle cookie consent banner.
   *
   * The site uses a custom cookie modal (not standard OneTrust).
   * From the live page the "Accept All" button is the reliable target.
   * We try a prioritised list of selectors so the code stays resilient
   * if the vendor ever changes the underlying implementation.
   *
   * Strategy:
   * 1. Wait a short grace period for the banner to animate in.
   * 2. Try each selector in priority order.
   * 3. Force-click the first visible match to avoid overlay interception.
   * 4. Wait for the banner to disappear before continuing.
   */
  async handleCookieBanner(): Promise<void> {
    // Wait for page assets and scripts behind the banner to load.
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {
      // Network may never fully idle, but we still want the page to stabilize.
    });
    await this.page.waitForTimeout(1500);

    const candidateSelectors = [
      'button:has-text("Accept All")',
      'button:has-text("Accept all")',
      'button:has-text("Accept Cookies")',
      'button:has-text("Accept cookies")',
      'button:has-text("Allow All")',
      'button:has-text("Allow all")',
      '#onetrust-accept-btn-handler',
      '#accept-all-cookies',
      '.cookie-accept-all',
      '[aria-label="Accept All"]',
      '[aria-label="Accept all cookies"]',
      '[data-testid="cookie-accept"]',
    ];

    // Try the most reliable accessible button first.
    const roleButton = this.page
      .getByRole('button', {
        name: /accept all|accept cookies|allow all/i,
      })
      .first();

    if ((await roleButton.count()) > 0) {
      try {
        if (await roleButton.isVisible({ timeout: 5000 })) {
          this.logger.info('Cookie banner found via accessible button role');
          await roleButton.click({ force: true, timeout: 5000 });
          await roleButton.waitFor({ state: 'hidden', timeout: 7000 }).catch(() => {});
          this.logger.info('Cookie banner dismissed successfully');
          return;
        }
      } catch {
        // Continue to fallback selectors if accessible button can't be clicked.
      }
    }

    for (const selector of candidateSelectors) {
      try {
        const button = this.page.locator(selector).first();
        if ((await button.count()) === 0) {
          continue;
        }

        if (await button.isVisible({ timeout: 4000 })) {
          this.logger.info(`Cookie banner found via: "${selector}"`);
          await button.click({ force: true, timeout: 5000 });
          await button.waitFor({ state: 'hidden', timeout: 7000 }).catch(() => {});
          this.logger.info('Cookie banner dismissed successfully');
          return;
        }
      } catch {
        // Selector did not match or banner wasn't ready — try the next one.
      }
    }

    this.logger.warn(
      'No cookie banner detected or all selectors failed — continuing without dismissal'
    );
  }

  /**
   * Self-healing locator: tries multiple selectors in priority order.
   * Returns the first matching visible element.
   * If none match, throws a descriptive error listing every attempted selector.
   */
  async findElement(
    selectors: string[],
    description: string
  ): Promise<Locator> {
    for (const selector of selectors) {
      try {
        const locator = this.page.locator(selector);
        const count = await locator.count();
        for (let i = 0; i < count; i++) {
          const candidate = locator.nth(i);
          if (await candidate.isVisible({ timeout: 800 })) {
            this.logger.debug(`Found "${description}" via: ${selector}`);
            return candidate;
          }
        }
      } catch {
        // Selector did not resolve — try next
      }
    }

    throw new Error(
      `Self-healing failed: could not find element "${description}". ` +
        `Tried selectors: ${selectors.join(', ')}`
    );
  }

  /**
   * Wait for network activity to settle after form submissions or navigation.
   */
  async waitForNetworkIdle(timeout = 10000): Promise<void> {
    await this.page
      .waitForLoadState('networkidle', { timeout })
      .catch(() => {
        this.logger.warn(
          'Network did not reach idle state — continuing anyway'
        );
      });
  }

  /**
   * Scroll an element into view then click it.
   * Prevents failures caused by elements being just outside the viewport.
   */
  async scrollAndClick(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await locator.click();
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}