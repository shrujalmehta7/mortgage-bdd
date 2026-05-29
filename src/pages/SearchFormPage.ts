import { Page, Locator } from 'playwright';
import { BasePage } from './BasePage';
import { MortgageSearchCriteria } from '../fixtures/mortgageData';

/**
 * Page Object for the mortgage search form
 */
export class SearchFormPage extends BasePage {
  // Locator strategy: data-testid first → aria label → semantic → CSS fallback
  private static readonly DEFAULT_INCOME = 50000;

  private readonly selectors = {
    propertyValue: [
      '[data-testid="property-value"]',
      'input[name="propertyValue"]:visible',
      '[name="propertyValue"]',
      '#property-value',
      'input[placeholder*="property value"]',
      'input[aria-label*="property value" i]',
      'input[aria-label*="Property Value" i]',
    ],
    depositAmount: [
      '[data-testid="deposit-amount"]',
      'input[name="deposit"]:visible',
      '[name="deposit"]',
      '[name="depositAmount"]',
      '#deposit',
      '[id^="deposit"]',
      'input[placeholder*="deposit"]',
      'input[aria-label*="deposit" i]',
    ],
    mortgageTerm: [
      '[data-testid="mortgage-term"]',
      'input[name="mortgageTerm"]:visible',
      '[name="mortgageTerm"]',
      '#mortgage-term',
      'select[aria-label*="term" i]',
      'input[aria-label*="term" i]',
    ],
    incomeAmount: [
      '[data-testid="income"]',
      'input[name="income"]:visible',
      '[name="income"]',
      '#income',
      'input[placeholder*="income"]',
      'input[aria-label*="income" i]',
    ],
    repaymentType: [
      '[data-testid="repayment-type"]',
      '[name="repaymentType"]',
      'select[aria-label*="repayment" i]',
      '[role="listbox"][aria-label*="repayment" i]',
    ],
    searchButton: [
      '[data-testid="search-button"]',
      'button[type="submit"]',
      'button:has-text("Search")',
      'button:has-text("Find mortgages")',
      'button:has-text("Get results")',
      '[aria-label*="search" i]',
    ],
    updateSearchButton: [
      '[data-testid="update-search"]',
      'button:has-text("Update search")',
      'button:has-text("Update results")',
      'button:has-text("Apply")',
    ],
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Fill in property value field
   */
  async setPropertyValue(value: number): Promise<void> {
    this.logger.step(`Setting property value: £${value.toLocaleString()}`);
    const field = await this.findElement(
      this.selectors.propertyValue,
      'Property Value input'
    );
    await field.clear();
    await field.fill(value.toString());
  }

  /**
   * Fill in deposit amount field
   */
  async setDepositAmount(value: number): Promise<void> {
    this.logger.step(`Setting deposit amount: £${value.toLocaleString()}`);
    const field = await this.findElement(
      this.selectors.depositAmount,
      'Deposit Amount input'
    );
    await field.clear();
    await field.fill(value.toString());
  }

  async setIncome(value: number): Promise<void> {
    this.logger.step(`Setting income: £${value.toLocaleString()}`);
    const field = await this.findElement(
      this.selectors.incomeAmount,
      'Income input'
    );
    await field.clear();
    await field.fill(value.toString());
  }

  private async ensureIncomeFilled(): Promise<void> {
    try {
      const field = await this.findElement(
        this.selectors.incomeAmount,
        'Income input'
      );
      const current = await field.inputValue();
      if (!current || current.trim() === '' || current.trim() === '0') {
        await this.setIncome(SearchFormPage.DEFAULT_INCOME);
      }
    } catch {
      // Income field may be absent on some mortgage forms.
    }
  }

  /**
   * Set mortgage term (years)
   */
  async setMortgageTerm(years: number): Promise<void> {
    this.logger.step(`Setting mortgage term: ${years} years`);
    const field = await this.findElement(
      this.selectors.mortgageTerm,
      'Mortgage Term'
    );
    const tagName = await field.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await field.selectOption({ label: `${years} years` });
    } else {
      await field.clear();
      await field.fill(years.toString());
    }
  }

  /**
   * Set repayment type via dropdown or radio buttons
   */
  async setRepaymentType(type: MortgageSearchCriteria['repaymentType']): Promise<void> {
    this.logger.step(`Setting repayment type: ${type}`);
    const labelMap: Record<string, string[]> = {
      repayment: ['Repayment', 'Capital and interest'],
      'interest-only': ['Interest only', 'Interest Only'],
      'part-and-part': ['Part and part', 'Part repayment'],
    };
    const labels = labelMap[type] || [type];

    // Try radio buttons first
    for (const label of labels) {
      const radio = this.page.locator(`input[type="radio"]`).filter({ hasText: label }).first();
      const radioCount = await radio.count();
      if (radioCount > 0) {
        await radio.click();
        return;
      }
      // Try label-adjacent pattern
      const labelEl = this.page.getByRole('radio', { name: new RegExp(label, 'i') }).first();
      if (await labelEl.count() > 0) {
        await labelEl.click();
        return;
      }
    }

    // Fallback: try select dropdown
    try {
      const select = await this.findElement(this.selectors.repaymentType, 'Repayment Type');
      await select.selectOption({ label: labels[0] });
    } catch {
      this.logger.warn(`Could not set repayment type "${type}" — may not be visible on current form`);
    }
  }

  /**
   * Fill in all search criteria at once
   */
  async fillSearchForm(criteria: MortgageSearchCriteria): Promise<void> {
    this.logger.info(`Filling search form with: ${JSON.stringify(criteria)}`);
    await this.setPropertyValue(criteria.propertyValue);
    await this.setDepositAmount(criteria.depositAmount);
    if (criteria.mortgageTerm) {
      await this.setMortgageTerm(criteria.mortgageTerm);
    }
    if (criteria.repaymentType) {
      await this.setRepaymentType(criteria.repaymentType);
    }
    if (criteria.income !== undefined) {
      await this.setIncome(criteria.income);
    }
  }

  /**
   * Submit the search form
   */
  async submitSearch(): Promise<void> {
    this.logger.step('Submitting search form');
    await this.ensureIncomeFilled();

    const btn = await this.findElement(this.selectors.searchButton, 'Search Button');
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/quickquoteresults/getresults') &&
        response.status() === 200,
      { timeout: 30000 }
    ).catch(() => null);

    await Promise.all([this.scrollAndClick(btn), responsePromise]);
  }

  /**
   * Update existing search (after initial search)
   */
  async updateSearch(criteria: Partial<MortgageSearchCriteria>): Promise<void> {
    this.logger.info('Updating search criteria');
    if (criteria.propertyValue) await this.setPropertyValue(criteria.propertyValue);
    if (criteria.depositAmount) await this.setDepositAmount(criteria.depositAmount);
    if (criteria.mortgageTerm) await this.setMortgageTerm(criteria.mortgageTerm);
    if (criteria.repaymentType) await this.setRepaymentType(criteria.repaymentType);

    // Click update/apply button
    try {
      const updateBtn = await this.findElement(
        this.selectors.updateSearchButton,
        'Update Search Button'
      );
      await this.scrollAndClick(updateBtn);
    } catch {
      // Fall back to the main search button
      await this.submitSearch();
    }
  }

  /**
   * Get currently displayed property value from the form
   */
  async getPropertyValueDisplayed(): Promise<string> {
    const field = await this.findElement(
      this.selectors.propertyValue,
      'Property Value input'
    );
    return field.inputValue();
  }

  /**
   * Verify the form is visible and interactive
   */
  async isFormVisible(): Promise<boolean> {
    try {
      await this.findElement(this.selectors.propertyValue, 'Property Value');
      return true;
    } catch {
      return false;
    }
  }
}
