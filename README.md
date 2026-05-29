# Mortgage BDD Test Framework

A concise Playwright + TypeScript + Cucumber BDD test framework for Mortgage Advice Bureau.

## Prerequisites

- Node.js 18+
- npm 9+

## Install

```bash
npm install
npx playwright install chromium
```

## Run tests

```bash
# Full suite
npm test

# Smoke tests
npm run test:smoke

# Search tests only
npm run test:search

# API validation tests only
npm run test:api

# Headed browser mode
npm run test:headed
```

## Reports

```bash
# Generate HTML/JSON reports
npm run test:report

# Open the report
npm run show:report
```

Report output locations:

- `reports/cucumber-report.html`
- `reports/cucumber-report.json`
- `allure-results/`
- `reports/traces/` (Playwright traces)

## Project layout

- `src/pages/` — page objects and UI actions
- `src/steps/` — Cucumber step definitions
- `src/hooks/` — test hooks and failure artifacts
- `src/api/` — direct API validation logic
- `src/utils/` — world setup, logging, report generation
- `tests/features/` — feature files
- `reports/` — generated test output

## Notes

- Use `HEADED=true` when you want to watch the browser run tests.
- The report command builds the HTML report from the latest execution.
