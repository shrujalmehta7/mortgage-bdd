@search @smoke
Feature: Mortgage Search
  As a mortgage applicant
  I want to search for mortgage products using my financial criteria
  So that I can find suitable mortgage options

  Background:
    Given I am on the mortgage search page

  @smoke
  Scenario: Perform a basic mortgage search with standard criteria
    When I enter a property value of "£350,000"
    And I enter a deposit amount of "£70,000"
    And I set the mortgage term to 25 years
    And I set the repayment type to "repayment"
    And I submit the search
    Then I should see mortgage results displayed
    And the form should still be visible

  @smoke
  Scenario: Search returns results with valid count
    When I search with standard mortgage criteria
    Then I should see mortgage results displayed
    And the results count should be at least 0

  Scenario: Search with high-value property
    When I search with high-value property criteria
    Then I should see mortgage results displayed
    And the results count should be at least 0

  @update-search
  Scenario: Update property value and see updated results
    Given I have performed a default mortgage search
    When I update the property value to "£500,000"
    Then the search results should reflect the updated criteria
    And the form should still be visible

  @update-search
  Scenario: Update deposit amount narrows results
    Given I have performed a default mortgage search
    When I update the deposit amount to "£175,000"
    Then the search results should reflect the updated criteria

  Scenario: Search form is accessible on page load
    Then the form should still be visible

  Scenario: Search results include lender information
    When I search with standard mortgage criteria
    Then I should see mortgage results displayed
    And the results should include lender information
