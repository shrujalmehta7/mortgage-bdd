import { APIRequestContext, request as playwrightRequest } from 'playwright';
import { Logger } from '../utils/logger';
import { MortgageSearchCriteria } from '../fixtures/mortgageData';

export interface ApiSearchResponse {
  totalCount: number;
  results: unknown[];
  pageSize?: number;
  pageNumber?: number;
  hasMore?: boolean;
}


export class MortgageApiClient {
  private apiContext!: APIRequestContext;
  private logger: Logger;
  private baseUrl: string;

  
  private readonly apiEndpoints = [
    '/api/v1/mortgages/search',
    '/api/mortgages',
    '/api/search',
    '/find-a-mortgage/api',
    '/mortgages/search',
  ];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_BASE_URL || 'https://www.mortgageadvicebureau.com';
    this.logger = new Logger('MortgageApiClient');
  }

  async init(): Promise<void> {
    this.apiContext = await playwrightRequest.newContext({
      baseURL: this.baseUrl,
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (QA Automation)',
      },
      timeout: parseInt(process.env.API_TIMEOUT || '15000', 10),
    });
  }


  private buildQueryParams(criteria: MortgageSearchCriteria): Record<string, string> {
    const ltv = criteria.ltvPercentage
      ?? Math.round(((criteria.propertyValue - criteria.depositAmount) / criteria.propertyValue) * 100);

    return {
      propertyValue: criteria.propertyValue.toString(),
      depositAmount: criteria.depositAmount.toString(),
      loanAmount: (criteria.propertyValue - criteria.depositAmount).toString(),
      ltv: ltv.toString(),
      term: criteria.mortgageTerm.toString(),
      repaymentType: criteria.repaymentType,
    };
  }

 
  async searchMortgages(criteria: MortgageSearchCriteria): Promise<ApiSearchResponse | null> {
    if (!this.apiContext) await this.init();

    const params = this.buildQueryParams(criteria);
    const queryString = new URLSearchParams(params).toString();

    for (const endpoint of this.apiEndpoints) {
      try {
        this.logger.info(`Trying API endpoint: ${endpoint}`);
        const response = await this.apiContext.get(`${endpoint}?${queryString}`);

        if (response.ok()) {
          const body = await response.json();
          this.logger.info(`API success: ${endpoint} → status ${response.status()}`);
          return this.normalizeResponse(body);
        }
        this.logger.debug(`Endpoint ${endpoint} returned ${response.status()}`);
      } catch (e) {
        this.logger.debug(`Endpoint ${endpoint} failed: ${e}`);
      }
    }

    this.logger.warn('All direct API endpoints failed — will rely on network interception');
    return null;
  }

 
  normalizeResponse(body: unknown): ApiSearchResponse {
    if (typeof body !== 'object' || body === null) {
      return { totalCount: 0, results: [] };
    }

    const obj = body as Record<string, unknown>;

    const totalCount =
      (obj['totalCount'] as number) ??
      (obj['total'] as number) ??
      (obj['count'] as number) ??
      (obj['TotalCount'] as number) ??
      ((obj['data'] as Record<string, unknown>)?.['totalCount'] as number) ??
      0;

    const results =
      (obj['results'] as unknown[]) ??
      (obj['data'] as unknown[]) ??
      (obj['items'] as unknown[]) ??
      ((obj['data'] as Record<string, unknown>)?.['items'] as unknown[]) ??
      [];

    return {
      totalCount,
      results: Array.isArray(results) ? results : [],
      pageSize: (obj['pageSize'] as number) ?? undefined,
      pageNumber: (obj['page'] as number) ?? undefined,
      hasMore: (obj['hasMore'] as boolean) ?? undefined,
    };
  }

 
  extractTotalCount(responseBody: unknown): number | null {
    const normalised = this.normalizeResponse(responseBody);
    return normalised.totalCount > 0 ? normalised.totalCount : null;
  }

  async dispose(): Promise<void> {
    await this.apiContext?.dispose();
  }
}
