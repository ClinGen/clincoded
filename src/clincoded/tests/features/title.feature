@title
Feature: Title

    Scenario: Title updates
        When I visit "/"
        Then the title should contain the text "ClinGen"

    Scenario: Dashboard functional
        When I visit "/dashboard/"
        Then I should see "Welcome"
