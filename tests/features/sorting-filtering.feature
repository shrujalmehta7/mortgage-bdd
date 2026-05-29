@sorting @filtering
Feature: Mortgage Results Sorting and Filtering
  As a mortgage applicant
  I want to sort and filter mortgage results
  So that I can find the most relevant products for my needs

  Background:
    Given I am on the mortgage search page
    And I have performed a default mortgage search

  # ─────────────────────────────────
  # SORTING
  # ─────────────────────────────────

  @sorting @smoke
  Scenario: Sort results by lowest initial rate
    When I sort results by "Initial rate (low to high)"
    Then the results should be sorted by initial rate ascending

  @sorting
  Scenario: Sort results by highest initial rate
    When I sort results by "Initial rate (high to low)"
    Then the results should be sorted by initial rate descending

  @sorting
  Scenario: Sort results by lowest monthly payment
    When I sort results by "Monthly cost (low to high)"
    Then the results should be sorted by monthly payment ascending

  @sorting
  Scenario: Sort order persists after applying a filter
    When I sort results by "Initial rate (low to high)"
    And I apply a "2 Year Fixed" product type filter
    Then the sort order should be maintained after applying filters

  # ─────────────────────────────────
  # FILTERING
  # ─────────────────────────────────

  @filtering @smoke
  Scenario: Filter by 2 Year Fixed product type
    When I apply a "2 Year Fixed" product type filter
    Then the results should be filtered to show only "2 Year Fixed" products
    And the filtered count should be less than or equal to the unfiltered count

  @filtering
  Scenario: Filter by 5 Year Fixed product type
    When I apply a "5 Year Fixed" product type filter
    Then the results should be filtered to show only "5 Year Fixed" products
    And the filtered count should be less than or equal to the unfiltered count

  @filtering
  Scenario: Apply multiple filters together
    When I apply a "2 Year Fixed" product type filter
    And I apply an additional "Tracker" filter
    Then the combined filter should narrow down results

  @filtering
  Scenario: Clearing filters restores results
    When I apply a "2 Year Fixed" product type filter
    Then clearing filters should restore the original count

  @filtering
  Scenario: Filter using table of options
    When I apply the filter "product-type" with value "2 Year Fixed"
    Then I should see mortgage results displayed
    And I should see the active filter indicators
