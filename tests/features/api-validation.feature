@api
Feature: UI vs API Result Count Validation
  As a QA engineer
  I want to verify that the UI result count matches the API totalCount
  So that I can confirm data integrity between the backend and frontend

  # ─────────────────────────────────────────────────────────────
  # VALIDATION STRATEGY:
  #
  # 1. Network Interception (Primary):
  #    - Playwright's page.on('response') intercepts all XHR/Fetch calls
  #    - The World class parses API responses and extracts totalCount
  #    - Handles: REST JSON APIs, GraphQL responses
  #
  # 2. Direct API Calls (Secondary):
  #    - MortgageApiClient tries known endpoint patterns
  #    - Used for cross-validation and when interception misses
  #
  # 3. Pagination Handling:
  #    - If pagination detected: UI card count ≤ API totalCount
  #    - If no pagination: UI count ≈ API totalCount (±2 tolerance)
  #
  # 4. Fallback:
  #    - If API count not capturable, validate UI count is valid ≥ 0
  # ─────────────────────────────────────────────────────────────

  Background:
    Given I am on the mortgage search page

  @api @smoke
  Scenario: UI results count matches API total count
    When I search with standard mortgage criteria
    And I wait for the API response to be intercepted
    Then the UI results count should match the API total count
    And the response status should indicate success

  @api
  Scenario: API total count is a positive number for valid search
    When I search with standard mortgage criteria
    And I capture the API response for the current search
    Then the API total count should be greater than 0

  @api
  Scenario: UI displays a result count to the user
    When I search with standard mortgage criteria
    Then the UI should display a result count

  @api
  Scenario: UI count text is consistent with rendered cards
    When I search with standard mortgage criteria
    And I wait for the API response to be intercepted
    Then the UI count should be consistent with page card count

  @api
  Scenario: No server errors occur during search
    When I search with standard mortgage criteria
    And I wait for the API response to be intercepted
    Then the response status should indicate success
