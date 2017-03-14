@create-gene-disease @usefixtures(workbook,admin_user)
Feature: Curation Central

    Scenario: Test Curation-central
        When I visit "/curation-central/?gdm=9ffd7c1e-16d9-11e5-b283-60f81dc5b05a/"
        And I wait for 2 seconds
        Then I should see "Shiang R"
        When I click the element with the css selector ".pmid-selection-list-item:first-child"
        Then I should see "Abstract"
