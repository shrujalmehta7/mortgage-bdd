

export interface MortgageSearchCriteria {
  propertyValue: number;
  depositAmount: number;
  repaymentType: 'repayment' | 'interest-only' | 'part-and-part';
  mortgageTerm: number; // years
  income?: number;
  ltvPercentage?: number;
}

export interface MortgageProduct {
  initialRate: number;
  productType: string;
  lender: string;
  monthlyPayment: number;
  totalCost: number;
  fees: number;
}

export const DEFAULT_SEARCH: MortgageSearchCriteria = {
  propertyValue: 350000,
  depositAmount: 70000,
  repaymentType: 'repayment',
  mortgageTerm: 25,
  income: 50000,
  ltvPercentage: 80,
};

export const HIGH_VALUE_SEARCH: MortgageSearchCriteria = {
  propertyValue: 800000,
  depositAmount: 200000,
  repaymentType: 'repayment',
  mortgageTerm: 20,
  income: 120000,
  ltvPercentage: 75,
};

export const INTEREST_ONLY_SEARCH: MortgageSearchCriteria = {
  propertyValue: 450000,
  depositAmount: 90000,
  repaymentType: 'interest-only',
  mortgageTerm: 25,
  income: 75000,
  ltvPercentage: 80,
};

export const LOW_DEPOSIT_SEARCH: MortgageSearchCriteria = {
  propertyValue: 250000,
  depositAmount: 12500,
  repaymentType: 'repayment',
  mortgageTerm: 30,
  income: 45000,
  ltvPercentage: 95,
};

export const SORT_OPTIONS = {
  INITIAL_RATE_LOW: 'initial-rate-asc',
  INITIAL_RATE_HIGH: 'initial-rate-desc',
  MONTHLY_PAYMENT_LOW: 'monthly-payment-asc',
  MONTHLY_PAYMENT_HIGH: 'monthly-payment-desc',
  TOTAL_COST_LOW: 'total-cost-asc',
} as const;

export const FILTER_OPTIONS = {
  PRODUCT_TYPES: {
    FIXED_2_YEAR: '2 Year Fixed',
    FIXED_5_YEAR: '5 Year Fixed',
    TRACKER: 'Tracker',
    VARIABLE: 'Variable',
  },
  LTV_BANDS: {
    LTV_60: '60%',
    LTV_75: '75%',
    LTV_80: '80%',
    LTV_85: '85%',
    LTV_90: '90%',
  },
} as const;

export const TEST_SCENARIOS = {
  standard: {
    description: 'Standard first-time buyer search',
    criteria: DEFAULT_SEARCH,
    expectedMinResults: 1,
  },
  highValue: {
    description: 'High-value property search',
    criteria: HIGH_VALUE_SEARCH,
    expectedMinResults: 1,
  },
  interestOnly: {
    description: 'Interest-only mortgage search',
    criteria: INTEREST_ONLY_SEARCH,
    expectedMinResults: 0, // may return no results
  },
} as const;
