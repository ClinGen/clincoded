@create-gene-disease @usefixtures(workbook,admin_user)
Feature: Curation Central

    Scenario: Test Curation-central
        When I visit "/curation-central/?gdm=9ffd7c1e-16d9-11e5-b283-60f81dc5b05a/"
        And I wait for 1 seconds
        Then I should see "FGFR3"
        When I press "Demo Login"
        And I wait for 5 seconds
        Then I should see "Shiang R"
        When I click the element with the css selector ".pmid-selection-list-item:first-child"
        Then I should see "Abstract"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."
