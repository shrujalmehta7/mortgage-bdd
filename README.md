# Mortgage BDD Test Framework

> Playwright + TypeScript + Cucumber BDD framework for [Mortgage Advice Bureau](https://www.mortgageadvicebureau.com/find-a-mortgage/)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.40%2B-orange)](https://playwright.dev/)
[![Cucumber](https://img.shields.io/badge/Cucumber-12.9-red)](https://cucumber.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Framework Structure](#framework-structure)
3. [Design Patterns](#design-patterns)
4. [Test Coverage](#test-coverage)
5. [Running Tests](#running-tests)
6. [API Validation Strategy](#api-validation-strategy)
7. [Reporting & Failure Analysis](#reporting--failure-analysis)
8. [Self-Healing & Flaky Test Management](#self-healing--flaky-test-management)
9. [GitHub Setup](#github-setup)
10. [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Run smoke tests (fastest subset)
npm run test:smoke

# 4. Run full suite
npm test

# 5. Generate HTML report
npm run test:report
```

### Run specific tag groups

```bash
npm run test:search     # @search tag
npm run test:sort       # @sorting tag
npm run test:filter     # @filtering tag
npm run test:api        # @api tag
```

### Run in headed mode (see browser)

```bash
HEADED=true npm test
```

---

## Framework Structure

```
mortgage-bdd/
├── src/
│   ├── pages/                   # Page Object Model
│   │   ├── BasePage.ts          # Base class: navigation, self-healing locators
│   │   ├── SearchFormPage.ts    # Search form interactions
│   │   └── SearchResultsPage.ts # Results, sorting, filtering
│   ├── steps/                   # Cucumber step definitions
│   │   ├── searchSteps.ts       # Search Given/When/Then
│   │   ├── sortFilterSteps.ts   # Sort/filter steps
│   │   └── apiValidationSteps.ts# API vs UI validation steps
│   ├── hooks/
│   │   └── hooks.ts             # Before/After hooks, failure artifacts
│   ├── api/
│   │   └── MortgageApiClient.ts # Direct API calls + response normalisation
│   ├── utils/
│   │   ├── world.ts             # Cucumber World: browser, network interception
│   │   ├── logger.ts            # Winston structured logger
│   │   └── generateReport.js    # HTML report generator
│   └── fixtures/
│       └── mortgageData.ts      # Realistic synthetic test data
├── tests/
│   └── features/
│       ├── search.feature       # Scenario: search automation
│       ├── sorting-filtering.feature
│       └── api-validation.feature
├── reports/                     # Generated at runtime
│   ├── screenshots/
│   ├── videos/
│   ├── traces/
│   └── logs/
├── .env                         # Configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Design Patterns

### 1. Page Object Model (POM)

Every page has a dedicated class extending `BasePage`. Pages expose **intent-based methods** (not raw selectors):

```typescript
// Avoid: in step definitions:
await page.locator('#prop-val').fill('350000');

// Correct:
await searchForm.setPropertyValue(350000);
```

### 2. Self-Healing Locators

`BasePage.findElement()` accepts an **ordered array of selectors** and tries each in priority:

```
data-testid → name attr → aria-label → CSS class → text content
```

If the DOM changes (class names renamed, IDs removed), the next selector in the chain resolves the element automatically.

```typescript
private readonly selectors = {
  propertyValue: [
    '[data-testid="property-value"]',   // Priority 1: stable test ID
    '[name="propertyValue"]',            // Priority 2: form name
    '#property-value',                   // Priority 3: ID
    'input[aria-label*="property" i]',  // Priority 4: accessibility
  ],
};
```

### 3. Cucumber World as Test Context

`MortgageWorld` extends `@cucumber/cucumber`'s `World` and holds:
- Browser/context/page instances
- Shared state between steps (counts, captured API data, filters)
- Network interception storage
- Logger instance

This avoids global state and enables parallel scenario execution.

### 4. Test Data Management

All test data lives in `src/fixtures/mortgageData.ts`:
- Realistic but synthetic (no real PII)
- Named constants (`DEFAULT_SEARCH`, `HIGH_VALUE_SEARCH`, etc.)
- TypeScript interfaces ensure structural safety
- Easy to swap for CSV/JSON data sources

---

## Test Coverage

| Feature                   | Tag          | Scenarios |
|---------------------------|--------------|-----------|
| Basic search              | `@search`    | 7         |
| Sort by rate/payment      | `@sorting`   | 4         |
| Product type filters      | `@filtering` | 5         |
| UI vs API count match     | `@api`       | 5         |
| **Total**                 |              | **21**    |

---

## Running Tests

```bash
# All tests (parallel=2)
npm test

# Specific feature
npm run test:search
npm run test:api

# Headed browser (debug)
HEADED=true npm run test:search

# With retries disabled
cucumber-js --retry 0
```

---

## API Validation Strategy

### How it works

```
Browser Request → Mortgage API
       ↓
Playwright network interception (page.on('response'))
       ↓
MortgageWorld.capturedApiResponse.totalCount
       ↓
Compare with UI count text ("Showing X results")
       ↓
Assert: match (±2 tolerance) OR paginated (uiCards ≤ totalCount)
```

### Two-layer capture

**Layer 1 — Network Interception** (primary)
- `page.on('response')` fires on every network response
- Filters URLs matching mortgage API patterns
- Parses JSON body and extracts `totalCount` / `total` / `count`

**Layer 2 — Direct API Call** (secondary)
- `MortgageApiClient` tries known endpoint patterns
- Used as cross-validation and when interception misses embedded/SSR responses

### Pagination handling

```typescript
if (hasPagination) {
  // UI shows page slice; API returns total
  expect(uiCardCount).toBeLessThanOrEqual(apiTotalCount);
} else {
  // UI and API counts should match ±2
  expect(Math.abs(uiCount - apiCount)).toBeLessThanOrEqual(2);
}
```

---

## Reporting & Failure Analysis

### Artifacts captured on failure

| Artifact     | Location                      | Trigger             |
|--------------|-------------------------------|---------------------|
| Screenshot   | `reports/screenshots/FAIL-*`  | Any failed scenario |
| Playwright trace | `reports/traces/FAIL-*.zip` | Any failed scenario |
| Video        | `reports/videos/`             | If `VIDEO_ON_FAIL=true` |
| Network log  | Attached to Cucumber report   | HTTP 4xx/5xx errors |
| Console log  | `reports/logs/test-run.log`   | All scenarios       |

### Reports generated

- **HTML**: `reports/cucumber-report.html` — browser-viewable
- **JSON**: `reports/cucumber-report.json` — CI/CD integration
- **Allure**: `allure-results/` — run `allure serve allure-results`

### View Playwright trace

```bash
npx playwright show-trace reports/traces/FAIL-*.zip
```

---

## Self-Healing & Flaky Test Management

### Self-Healing Locator Strategy

`BasePage.findElement()` implements a cascade:

1. Try `data-testid` (most stable)
2. Try `name` attribute
3. Try `aria-label` (accessible)
4. Try CSS class patterns
5. Try visible text
6. Throw descriptive error listing all attempted selectors

This means **renaming a CSS class won't break tests** as long as one other selector still works.

### Flaky Test Identification

- **Retry on failure**: `"retry": 1` in `package.json` cucumber config
- **Retry tag**: `@flaky` tag retries those tests automatically
- **Network tolerance**: `waitForNetworkIdle` with graceful fallback (no hard failures on timing)
- **Spinner wait**: Dynamic loading detection before assertions
- **Tolerance in assertions**: ±2 count tolerance for API/UI comparison

### AI-Assisted Self-Healing (Design Concept)

For full AI-powered self-healing, extend `BasePage.findElement()` to:

1. On selector failure, call Claude/GPT API with the page's accessibility tree
2. Request: "Find the best selector for an element described as: [description]"
3. Cache discovered selector for future runs
4. Log suggested selector for developer review

```typescript
// Pseudo-code concept:
async healSelector(description: string): Promise<string> {
  const axTree = await this.page.accessibility.snapshot();
  const response = await callAI(`Find selector for: ${description}\n${JSON.stringify(axTree)}`);
  return response.suggestedSelector;
}
```

---

## Assumptions & Trade-offs

### Assumptions

1. **Public access**: The mortgage search page is publicly accessible (no login required)
2. **API response**: The site makes XHR/Fetch API calls returning JSON with a `totalCount` field
3. **Dynamic rendering**: Results are rendered client-side (not server-side only)
4. **Filter UI**: Filters exist as checkboxes or dropdowns in the DOM
5. **Sort UI**: A sort dropdown/control is present in the results view

### Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Cucumber BDD over pure Playwright Test | Readable by non-technical stakeholders | More boilerplate than `test()` blocks |
| Self-healing locator cascade | Resilience to DOM changes | Slightly slower (tries multiple selectors) |
| Network interception over UI-only | Validates data layer, not just rendering | Depends on site making catchable API calls |
| TypeScript strict mode | Catches type errors early | More verbose type annotations |
| Parallel: 2 workers | 2x faster than serial | Needs independent test state (World solves this) |
| `±2` count tolerance | Handles loading race conditions | May miss off-by-one bugs |

### Known Limitations

- If the site uses SSR (server-side rendering), network interception may not capture API responses — direct DOM count validation is used as fallback
- Sort validation requires numeric rate values to be parseable from card text; heavily formatted text may require selector tuning
- Filter validation requires product type text to be present in result cards

---

## GitHub Setup

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/mortgage-bdd.git
cd mortgage-bdd

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### First Time Run

```bash
# Run smoke tests (fastest way to verify setup)
npm run test:smoke

# Generate a report
npm run test:report

# View the report
npm run show:report
```

### Push to Your GitHub Repo

```bash
# Create a new repository on GitHub (don't initialize with README)

# Initialize git and push
git init
git add .
git commit -m "Initial commit: Mortgage BDD test framework"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mortgage-bdd.git
git push -u origin main
```

### Recommended .gitignore

The `.gitignore` should exclude:
- `node_modules/` — dependencies
- `reports/` — generated at runtime
- `.env` — local configuration
- `.env.local` — secrets

---

## Configuration

All configuration via `.env`:

```env
BASE_URL=https://www.mortgageadvicebureau.com/find-a-mortgage/
BROWSER=chromium          # chromium | firefox | webkit
HEADED=false
DEFAULT_TIMEOUT=30000
SCREENSHOT_ON_FAIL=true
VIDEO_ON_FAIL=false
TRACE_ON_FAIL=true
```
