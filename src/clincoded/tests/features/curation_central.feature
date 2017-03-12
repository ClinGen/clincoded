@create-gene-disease @usefixtures(workbook,admin_user)
Feature: Curation Central

    Scenario: Test Curation-central
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I go to "/curation-central/?gdm=9ffd7c1e-16d9-11e5-b283-60f81dc5b05a/"
        And I wait for an element with the css selector ".pmid-selection-list" to load
        Then I should see an element with the css selector ".curr-pmid" within 30 seconds
        When I click the element with the css selector ".pmid-selection-list-item:first-child"
        Then I should see an element with the css selector ".pmid-overview-abstract" within 10 seconds
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."


    Scenario: Test OMIM modal in Curation-central
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I go to "/curation-central/?gdm=9ffd7c1e-16d9-11e5-b283-60f81dc5b05a/"
        And I wait for an element with the css selector ".curation-data" to load
        Then I should see an element with the css selector ".omimid-add-edit-btn" within 30 seconds
        When I click the element with the css selector ".omimid-add-edit-btn"
        Then I should see an element with the css selector ".modal-dialog" within 5 seconds
        Then I should see "Enter an OMIM ID"
        When I fill in "omimid" with "123456"
        When I press "Add/Change OMIM ID"
        Then I should see "123456" within 5 seconds
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."


    Scenario: Test PMID modal in Curation-central
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I go to "/curation-central/?gdm=9ffd7c1e-16d9-11e5-b283-60f81dc5b05a/"
        Then I should see an element with the css selector ".pmid-selection-add-btn" within 5 seconds
        When I press "Add New PMID"
        Then I should see an element with the css selector ".modal-dialog" within 5 seconds
        Then I should see "Enter a PMID"
        When I fill in the css element field "input.form-control" with "123456"
        When I press the button "Retrieve PubMed Article"
        Then I should see "Grados OB. " within 10 seconds
        When I press the button "Add Article"
        Then I should not see an element with the css selector ".modal-open"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."