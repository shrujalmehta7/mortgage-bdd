# Contributing to Mortgage BDD Framework

Thank you for your interest in contributing! This document provides guidelines for submitting changes.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/mortgage-bdd.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development Workflow

### Before Starting

```bash
# Ensure all dependencies are installed
npm install

# Install Playwright browsers if needed
npx playwright install chromium
```

### Writing Tests

1. Add feature files in `tests/features/` following Gherkin syntax
2. Implement step definitions in `src/steps/`
3. Create Page Objects in `src/pages/` if adding new pages
4. Add test data to `src/fixtures/mortgageData.ts`

### Running Tests Locally

```bash
# Run all tests
npm run test

# Run specific feature tag
npm run test:search
npm run test:filter
npm run test:api

# Run in headed mode for debugging
HEADED=true npm run test:search

# Type check before committing
npm run typecheck
```

### Code Quality

- **TypeScript**: Use strict mode, avoid `any` types
- **Naming**: Use descriptive names for steps and methods
- **DRY**: Reuse existing steps and page methods
- **Formatting**: The codebase follows standard formatting conventions

### Before Submitting a Pull Request

1. **Run tests locally**: Ensure all tests pass
```bash
npm run test:report
```

2. **Type check**: No TypeScript errors
```bash
npm run typecheck
```

3. **Create a descriptive commit message**:
```
Add search filter by mortgage term

- Added scenarios for filtering by 2/5/10 year terms
- Extended FilterPage with filterByTerm() method
- Updated test data fixtures with term-specific mortgages
```

4. **Create a detailed PR description** including:
   - What feature or bug fix you're adding
   - Why the change is needed
   - How to verify the changes work
   - Any breaking changes or dependencies

## PR Review Process

1. All PRs require passing tests and type checking
2. At least one maintainer review before merge
3. Address review feedback promptly
4. Once approved, PR will be merged to `main`

## Commit Message Guidelines

Follow conventional commit format:

```
type(scope): subject

body

footer
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
**Scope**: e.g., `search`, `filter`, `api-validation`
**Subject**: Clear, concise summary

Example:
```
feat(filtering): add product type filter scenarios

Add comprehensive test scenarios for filtering mortgage results by product type.
Includes validation of filter UI and API response filtering.

Closes #42
```

## Reporting Issues

When reporting bugs, include:

1. **Description**: Clear explanation of the issue
2. **Steps to Reproduce**: How to replicate the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happened
5. **Environment**: Node version, browser, OS
6. **Artifacts**: Screenshots, traces, or error logs

## Feature Requests

When suggesting new features:

1. Describe the use case
2. Explain the expected behavior
3. Provide example scenarios in Gherkin format
4. Consider impact on existing tests

## Code Style

### TypeScript

```typescript
// Good:
const searchTerm: string = 'Fixed Rate Mortgage';
async function validateSearchResults(count: number): Promise<void> {
  const isVisible = await this.resultsList.isVisible();
  expect(isVisible).toBeTruthy();
}

// Avoid:
const searchTerm = 'Fixed Rate Mortgage';
async function validateSearchResults(count) {
  // ...
}
```

### Step Definitions

```typescript
// Good: - Clear intent
Given('I navigate to the mortgage search page', async function (this: World) {
  await this.searchForm.navigateTo();
});

// Avoid: - Too specific implementation
Given('I go to the URL', async function (this: World) {
  await this.page.goto('https://...');
});
```

### Page Objects

```typescript
// Good: - Intent-based methods
async filterByProductType(type: string): Promise<void> {
  await this.productTypeFilter.selectOption(type);
  await this.page.waitForLoadState('networkidle');
}

// Avoid: - Raw selectors in steps
await page.click('[data-testid="product-filter"]');
```

## Questions or Need Help?

- Check existing issues for similar questions
- Review the README for common issues
- Create a discussion or issue with your question

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! **
