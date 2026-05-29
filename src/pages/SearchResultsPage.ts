import { ElementHandle, Page, Locator } from 'playwright';
import { BasePage } from './BasePage';

export interface MortgageResultCard {
  lender: string;
  productType: string;
  initialRate: number | null;
  monthlyPayment: number | null;
  fees: number | null;
  totalCost: number | null;
  index: number;
}

/**
 * Page Object for the mortgage search results page
 * Handles result cards, sorting, filtering, and count validation
 */
export class SearchResultsPage extends BasePage {
  private readonly selectors = {
    // Results container
    resultsContainer: [
      '.quick-quote-results',
      '.js-quick-quote-results',
      '.js-results-wrapper',
      '[data-testid="results-container"]',
      '[data-testid="mortgage-results"]',
      '.results-container',
      '.mortgage-results',
      '[class*="results"]',
      'main [class*="result"]',
    ],

    // Individual result cards
    resultCards: [
      '.product-list.js-product-list .product-wrapper.js-product-wrapper',
      '.product-list.js-product-list .product-wrapper',
      '.product-wrapper.js-product-wrapper',
      '.product-wrapper',
      '.product-list.js-product-list .product-list__item',
      '.product-list.js-product-list .js-product-result',
      '.product-list__item',
      '.product-result',
      '[data-testid="mortgage-card"]',
      '[data-testid="product-card"]',
      '.mortgage-card',
      '.product-card',
      '[class*="mortgage-card"]',
      '[class*="product-card"]',
      '[class*="result-card"]',
      'article[class*="result"]',
    ],

    // Results count text
    resultsCount: [
      '[data-testid="results-count"]',
      '[data-testid="total-count"]',
      '.results-count',
      '[class*="results-count"]',
      '[aria-live="polite"]',
      'p:has-text("result")',
      'span:has-text("result")',
      'h2:has-text("result")',
    ],

    // Loading indicator
    loadingSpinner: [
      '.product-list.js-product-list.loading',
      '.product-list .js-product-list-spinner',
      '.loading-spinner',
      '[class*="loading"]',
      '[aria-busy="true"]',
      '[role="progressbar"]',
    ],

    // Sort controls
    sortDropdown: [
      '#sortBy',
      '[name="sortBy"]',
      '[data-testid="sort-by"]',
      'select[name="sort"]',
      '[aria-label*="sort" i]',
      '.sort-select',
      '[class*="sort"]',
    ],

    // Filter controls
    filterPanel: [
      '[data-testid="filter-panel"]',
      '.filter-panel',
      '[class*="filter"]',
      'aside[class*="filter"]',
    ],

    // Individual rate display within cards
    rateDisplay: '[class*="rate"], [data-testid*="rate"]',
    monthlyPaymentDisplay: '[class*="monthly"], [data-testid*="monthly"]',
    feesDisplay: '[class*="fee"], [data-testid*="fee"]',
    lenderDisplay: '[class*="lender"], [data-testid*="lender"]',
    productTypeDisplay: '[class*="product-type"], [class*="type"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for results to load (waits for spinner to disappear)
   */
  async waitForResultsToLoad(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for search results to load...');

    const resultsLoaded = await this.page.waitForFunction(
      () => {
        const cards = document.querySelectorAll(
          '.product-list.js-product-list > .product-wrapper.js-product-wrapper, .product-list.js-product-list > .product-wrapper'
        );
        const noResults = document.querySelector(
          '[data-testid="no-results"], .no-results, .quick-quote-results__no-results, .no-results-message'
        );
        return cards.length > 0 || noResults !== null;
      },
      { timeout }
    ).catch(() => false);

    if (!resultsLoaded) {
      this.logger.warn('Search results did not reach a known loaded state within timeout');
    }

    // Allow the page to settle after results appear.
    await this.waitForNetworkIdle(5000);
  }

  /**
   * Get total count from UI text (e.g. "Showing 45 results")
   * Returns the numeric value extracted from the text
   */
  async getUIResultsCount(): Promise<number> {
    this.logger.step('Reading results count from UI');

    try {
      const countEl = await this.findElement(this.selectors.resultsCount, 'Results Count');
      const text = await countEl.textContent() || '';
      this.logger.info(`Results count text: "${text}"`);

      const match = text.match(/(\d[\d,]*)/);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''), 10);
        this.logger.info(`Extracted count: ${count}`);
        return count;
      }
    } catch (e) {
      this.logger.warn(`Count element not found, counting cards instead: ${e}`);
    }

    const fallbackCount = await this.countResultCards();
    this.logger.info(`Using fallback card count: ${fallbackCount}`);
    return fallbackCount;
  }

  /**
   * Count the number of result cards currently rendered on page
   */
  async countResultCards(): Promise<number> {
    const selectors = [
      '.product-list.js-product-list > .product-wrapper.js-product-wrapper',
      '.product-list.js-product-list > .product-wrapper',
      '.product-list.js-product-list .product-wrapper.js-product-wrapper',
      '.product-list.js-product-list .product-wrapper',
      '.product-wrapper.js-product-wrapper',
      '.product-wrapper',
      ...this.selectors.resultCards,
    ];

    for (const selector of selectors) {
      try {
        const count = await this.page.locator(selector).count();
        if (count > 0) {
          this.logger.info(`Found ${count} result cards via: ${selector}`);
          return count;
        }
      } catch {
        continue;
      }
    }
    return 0;
  }

  /**
   * Extract all result card data for validation
   */
  async getAllResultCards(): Promise<MortgageResultCard[]> {
    this.logger.step('Extracting all result card data');
    const cards: MortgageResultCard[] = [];
    const selectors = [
      '.product-list.js-product-list > .product-wrapper.js-product-wrapper',
      '.product-list.js-product-list .product-wrapper.js-product-wrapper',
      '.product-wrapper.js-product-wrapper',
      '.product-wrapper',
    ];

    for (const selector of selectors) {
      const handles = await this.page.$$(selector);
      if (handles.length === 0) continue;

      for (let i = 0; i < handles.length; i++) {
        const cardData = await this.extractCardData(handles[i], i);
        cards.push(cardData);
      }
      break; // Use first working selector
    }

    this.logger.info(`Extracted ${cards.length} result cards`);
    return cards;
  }

  /**
   * Extract data from a single result card
   */
  private async extractCardData(
    card: ElementHandle<Element>,
    index: number
  ): Promise<MortgageResultCard> {
    const parseNumber = (text: string | null | undefined): number | null => {
      if (!text) return null;
      const clean = text.replace(/[£,%\s]/g, '');
      const num = parseFloat(clean);
      return Number.isFinite(num) ? num : null;
    };

    const getText = async (selectors: string[]): Promise<string> => {
      return await card.evaluate((node, sels) => {
        for (const selector of sels) {
          const el = node.querySelector(selector);
          if (el?.textContent?.trim()) {
            return el.textContent.trim();
          }
        }
        return '';
      }, selectors);
    };

    const getAttrNumber = async (attr: string): Promise<number | null> => {
      const value = await card.getAttribute(attr);
      return parseNumber(value);
    };

    const lenderText = await getText([
      '.js-product-result-lenderName',
      '.product-lender',
      '.product-data__lender',
      '.product-lender__name',
    ]);
    const productText = await getText([
      '.js-product-result-title',
      '.product-title',
      '.product-name',
      'h2',
      'h3',
    ]);
    const rateText = await getText([
      '.js-product-result-initialRate',
      '.initial-rate',
      '.rate',
    ]);
    const monthlyText = await getText([
      '.js-product-result-initialMonthlyPayment',
      '.initial-monthly-payment',
      '.monthly-payment',
      '.monthly',
    ]);
    const feesText = await getText([
      '.js-product-result-productFee',
      '.product-fee',
      '.fees',
      '.fee',
    ]);

    return {
      lender: lenderText.trim(),
      productType: productText.trim(),
      initialRate:
        (await getAttrNumber('data-initialrate')) ?? parseNumber(rateText),
      monthlyPayment:
        (await getAttrNumber('data-initialmonthlypayment')) ?? parseNumber(monthlyText),
      fees: (await getAttrNumber('data-productfee')) ?? parseNumber(feesText),
      totalCost: await getAttrNumber('data-totalpayable'),
      index,
    };
  }

  /**
   * Apply a sort option and wait for results to update
   */
  async sortResultsBy(sortOption: string): Promise<void> {
    this.logger.step(`Sorting results by: ${sortOption}`);
    const dropdown = await this.findElement(this.selectors.sortDropdown, 'Sort Dropdown');
    const actualLabel = this.resolveSortOptionLabel(sortOption);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/quickquoteresults/getresults') &&
        response.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    const tagName = await dropdown.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      const option = dropdown.locator('option', { hasText: new RegExp(actualLabel, 'i') });
      if ((await option.count()) > 0) {
        await dropdown.selectOption({ label: actualLabel });
      } else {
        await dropdown.selectOption({ label: sortOption }).catch(() => {
          throw new Error(`Sort option not found: ${sortOption}`);
        });
      }
    } else {
      await dropdown.click();
      await this.page.getByRole('option', { name: new RegExp(actualLabel, 'i') }).first().click();
    }

    await Promise.all([this.waitForResultsToLoad(), responsePromise]);
  }

  private resolveSortOptionLabel(sortOption: string): string {
    const map: Record<string, string> = {
      'initial rate (low to high)': 'Initial Interest Rate',
      'initial rate (high to low)': 'Initial Interest Rate',
      'monthly cost (low to high)': 'Initial Monthly Cost',
      'total cost': 'Total Cost',
      'product fees': 'Product Fees',
    };

    const normalized = sortOption.trim().toLowerCase();
    return map[normalized] || sortOption;
  }

  /**
   * Get available sort options
   */
  async getSortOptions(): Promise<string[]> {
    const dropdown = await this.findElement(this.selectors.sortDropdown, 'Sort Dropdown');
    const options = await dropdown.locator('option').allTextContents();
    return options.filter((o) => o.trim() !== '');
  }

  /**
   * Apply a filter and wait for results to update
   */
  async applyFilter(filterName: string, filterValue: string): Promise<void> {
    this.logger.step(`Applying filter: ${filterName} = ${filterValue}`);

    const normalizedFilterName = filterName.toLowerCase();
    if (normalizedFilterName === 'product-type') {
      const fixedTermMatch = filterValue.match(/(\d+)\s*year/i);
      if (fixedTermMatch) {
        const optionLabel = `${fixedTermMatch[1]} years`;
        try {
          const fixedTermSelect = await this.findElement(
            ['select#fixedTerm', 'select[name="fixedTerm"]'],
            'Fixed Term filter'
          );
          const responsePromise = this.page.waitForResponse(
            (response) =>
              response.url().includes('/quickquoteresults/getresults') &&
              response.status() === 200,
            { timeout: 15000 }
          ).catch(() => null);
          await fixedTermSelect.selectOption({ label: optionLabel });
          await Promise.all([this.waitForResultsToLoad(), responsePromise]);
          return;
        } catch {
          // Fall through to broader lookup
        }
      }

      if (/tracker/i.test(filterValue)) {
        try {
          const paymentMethodSelect = await this.findElement(
            ['select#paymentMethod', 'select[name="paymentMethod"]'],
            'Payment Method filter'
          );
          if ((await paymentMethodSelect.locator('option', { hasText: /Interest Only/i }).count()) > 0) {
            const responsePromise = this.page.waitForResponse(
              (response) =>
                response.url().includes('/quickquoteresults/getresults') &&
                response.status() === 200,
              { timeout: 15000 }
            ).catch(() => null);
            await paymentMethodSelect.selectOption({ label: 'Interest Only' });
            await Promise.all([this.waitForResultsToLoad(), responsePromise]);
            return;
          }
        } catch {
          // Fall through to broader lookup
        }
      }
    }

    if (normalizedFilterName === 'additional') {
      try {
        const paymentMethodSelect = await this.findElement(
          ['select#paymentMethod', 'select[name="paymentMethod"]'],
          'Payment Method filter'
        );
        if ((await paymentMethodSelect.locator('option', { hasText: new RegExp(filterValue, 'i') }).count()) > 0) {
          const responsePromise = this.page.waitForResponse(
            (response) =>
              response.url().includes('/quickquoteresults/getresults') &&
              response.status() === 200,
            { timeout: 15000 }
          ).catch(() => null);
          await paymentMethodSelect.selectOption({ label: filterValue });
          await Promise.all([this.waitForResultsToLoad(), responsePromise]);
          return;
        }
      } catch {
        // Fall through to broader lookup
      }
    }

    // Try checkbox filter
    const checkboxSelectors = [
      `input[type="checkbox"][value="${filterValue}"]`,
      `input[type="checkbox"][name*="${filterName}" i]`,
      `[data-testid="filter-${filterName.toLowerCase().replace(/ /g, '-')}"]`,
    ];

    for (const sel of checkboxSelectors) {
      const checkbox = this.page.locator(sel).first();
      if (await checkbox.count() > 0) {
        await checkbox.check();
        await this.waitForResultsToLoad();
        return;
      }
    }

    // Try label-based filter (clicking label text)
    const labelFilter = this.page
      .locator('[class*="filter"]')
      .getByText(filterValue, { exact: false })
      .first();

    if (await labelFilter.count() > 0) {
      const responsePromise = this.page.waitForResponse(
        (response) =>
          response.url().includes('/quickquoteresults/getresults') &&
          response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null);
      await this.scrollAndClick(labelFilter);
      await Promise.all([this.waitForResultsToLoad(), responsePromise]);
      return;
    }

    this.logger.warn(`Filter "${filterName}=${filterValue}" not found — may not exist on current page`);
  }

  /**
   * Clear all active filters
   */
  async clearAllFilters(): Promise<void> {
    const clearBtns = [
      'button:has-text("Clear all")',
      'button:has-text("Reset filters")',
      '[data-testid="clear-filters"]',
    ];
    for (const sel of clearBtns) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await this.waitForResultsToLoad();
        return;
      }
    }

    const resetSelects = [
      { selector: 'select#fixedTerm, select[name="fixedTerm"]', defaultLabel: 'All' },
      { selector: 'select#paymentMethod, select[name="paymentMethod"]', defaultLabel: 'Repayment' },
    ];
    for (const reset of resetSelects) {
      const select = this.page.locator(reset.selector).first();
      if (await select.count() > 0) {
        await select.selectOption({ label: reset.defaultLabel }).catch(() => {});
      }
    }

    await this.waitForResultsToLoad();
  }

  /**
   * Check if results are currently displayed
   */
  async hasResults(): Promise<boolean> {
    const count = await this.countResultCards();
    return count > 0;
  }

  /**
   * Check if "no results" message is displayed
   */
  async hasNoResultsMessage(): Promise<boolean> {
    const selectors = [
      '[data-testid="no-results"]',
      '.no-results',
      'p:has-text("no results")',
      'p:has-text("no mortgages")',
    ];
    for (const sel of selectors) {
      if (await this.page.locator(sel).isVisible({ timeout: 2000 })) return true;
    }
    return false;
  }

  /**
   * Get the initial rates of all visible result cards (for sort validation)
   */
  async getInitialRates(): Promise<number[]> {
    const cards = await this.getAllResultCards();
    return cards
      .map((c) => c.initialRate)
      .filter((r): r is number => r !== null);
  }

  /**
   * Get monthly payments of all visible result cards (for sort validation)
   */
  async getMonthlyPayments(): Promise<number[]> {
    const cards = await this.getAllResultCards();
    return cards
      .map((c) => c.monthlyPayment)
      .filter((p): p is number => p !== null);
  }

  /**
   * Check if page has pagination
   */
  async hasPagination(): Promise<boolean> {
    const paginationSelectors = [
      '[data-testid="pagination"]',
      '.pagination',
      '[aria-label="pagination"]',
      'nav[aria-label*="page" i]',
    ];

    for (const sel of paginationSelectors) {
      const locator = this.page.locator(`.quick-quote-results ${sel}, .product-list ${sel}, main ${sel}`);
      if (await locator.count() > 0 && await locator.first().isVisible({ timeout: 2000 })) {
        return true;
      }
    }
    return false;
  }

  async isFilterActive(filterValue: string): Promise<boolean> {
    const fixedTermMatch = filterValue.match(/(\d+)\s*year/i);
    if (fixedTermMatch) {
      const fixedTermSelect = this.page.locator('select#fixedTerm, select[name="fixedTerm"]').first();
      if (await fixedTermSelect.count() > 0) {
        const selectedLabel = await fixedTermSelect.locator('option:checked').textContent();
        if (selectedLabel?.toLowerCase().includes(`${fixedTermMatch[1]} years`)) {
          return true;
        }
      }
    }

    if (/tracker/i.test(filterValue)) {
      const paymentMethodSelect = this.page.locator('select#paymentMethod, select[name="paymentMethod"]').first();
      if (await paymentMethodSelect.count() > 0) {
        const selectedLabel = await paymentMethodSelect.locator('option:checked').textContent();
        return selectedLabel?.toLowerCase().includes('interest only') ?? false;
      }
    }

    return false;
  }

  /**
   * Navigate to next page (if pagination exists)
   */
  async goToNextPage(): Promise<void> {
    const nextBtns = [
      '[data-testid="next-page"]',
      'button:has-text("Next")',
      '[aria-label="Next page"]',
      '.pagination__next',
    ];
    for (const sel of nextBtns) {
      const btn = this.page.locator(sel).first();
      if (await btn.isEnabled({ timeout: 2000 })) {
        await btn.click();
        await this.waitForResultsToLoad();
        return;
      }
    }
  }
}
