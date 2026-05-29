import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  Page,
  chromium,
  firefox,
  webkit,
  Request,
  Response
} from 'playwright';
import * as dotenv from 'dotenv';
import { Logger } from './logger';

dotenv.config();

export interface NetworkLog {
  url: string;
  method: string;
  status?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  timestamp: number;
}

export interface CapturedApiResponse {
  totalCount?: number;
  results?: unknown[];
  raw?: unknown;
}

export class MortgageWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  logger: Logger;

  // Network interception storage
  networkLogs: NetworkLog[] = [];
  capturedApiResponse: CapturedApiResponse = {};
  interceptedRequests: Map<string, Response> = new Map();

  // Shared test state
  searchResultsCount = 0;
  apiTotalCount = 0;
  currentSortOrder = '';
  activeFilters: Record<string, string> = {};

  constructor(options: IWorldOptions) {
    super(options);
    this.logger = new Logger('MortgageWorld');
  }

  async initBrowser(): Promise<void> {
    const browserType = process.env.BROWSER || 'chromium';
    const headed = process.env.HEADED === 'true';

    this.logger.info(`Launching ${browserType} browser (headed: ${headed})`);

    const launchOptions = {
      headless: !headed,
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    switch (browserType) {
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      default:
        this.browser = await chromium.launch(launchOptions);
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      recordVideo: process.env.VIDEO_ON_FAIL === 'true'
        ? { dir: 'reports/videos/', size: { width: 1440, height: 900 } }
        : undefined,
    });

    this.page = await this.context.newPage();

    // Set timeouts
    this.page.setDefaultTimeout(parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10));
    this.page.setDefaultNavigationTimeout(
      parseInt(process.env.NAVIGATION_TIMEOUT || '60000', 10)
    );

    // Attach network listener for API interception
    this.attachNetworkListeners();
  }

  private attachNetworkListeners(): void {
    // Intercept all network requests to capture API responses
    this.page.on('response', async (response: Response) => {
      const url = response.url();
      const request = response.request();

      // Store all requests for debugging
      const log: NetworkLog = {
        url,
        method: request.method(),
        status: response.status(),
        timestamp: Date.now(),
      };

      // Specifically intercept mortgage search API calls
      if (this.isMortgageApiCall(url)) {
        try {
          const body = await response.json().catch(() => null);
          log.responseBody = body;

          if (body) {
            // Extract totalCount from various possible response shapes
            this.capturedApiResponse = this.extractApiData(body);
            this.logger.info(
              `API captured: ${url} → totalCount: ${this.capturedApiResponse.totalCount}`
            );
          }

          this.interceptedRequests.set(url, response);
        } catch (e) {
          this.logger.warn(`Could not parse API response for ${url}: ${e}`);
        }
      }

      this.networkLogs.push(log);
    });
  }

  private isMortgageApiCall(url: string): boolean {
    const apiPatterns = [
      /\/api\/mortgage/i,
      /\/search\?/i,
      /\/products\?/i,
      /\/mortgages\?/i,
      /graphql/i,
      /\/find-a-mortgage.*\?/i,
      /quickquoteresults/i,
      /umbraco\/surface\//i,
    ];
    return apiPatterns.some((pattern) => pattern.test(url));
  }

  private extractApiData(body: unknown): CapturedApiResponse {
    if (typeof body !== 'object' || body === null) return { raw: body };

    const obj = body as Record<string, unknown>;
    const data = obj['data'] as Record<string, unknown> | undefined;
    const viewModel = (obj['resultsViewModel'] as Record<string, unknown>) ??
      (data?.['resultsViewModel'] as Record<string, unknown>) ??
      undefined;

    const resultsFromViewModel = viewModel?.['results'] as unknown[] | undefined;
    const resultsFromBody =
      (obj['results'] as unknown[]) ??
      (data?.['results'] as unknown[]) ??
      ((data as Record<string, unknown>)?.['items'] as unknown[]) ??
      resultsFromViewModel;

    const totalCount =
      (obj['totalCount'] as number) ??
      (obj['total'] as number) ??
      (obj['count'] as number) ??
      (viewModel?.['totalCount'] as number) ??
      (viewModel?.['totalResults'] as number) ??
      ((data as Record<string, unknown>)?.['totalCount'] as number) ??
      ((data as Record<string, unknown>)?.['total'] as number) ??
      (resultsFromViewModel ? resultsFromViewModel.length : undefined) ??
      (resultsFromBody ? resultsFromBody.length : undefined);

    return {
      totalCount,
      results: resultsFromBody,
      raw: body,
    };
  }

  async closeBrowser(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }

  async takeScreenshot(name: string): Promise<Buffer> {
    const screenshot = await this.page.screenshot({
      path: `reports/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
    this.logger.info(`Screenshot saved: ${name}`);
    return screenshot;
  }

  async captureTrace(name: string): Promise<void> {
    await this.context.tracing.stop({
      path: `reports/traces/${name}-${Date.now()}.zip`,
    });
  }
}

setWorldConstructor(MortgageWorld);
