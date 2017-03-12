@generics @usefixtures(workbook)
Feature: Generics

    Scenario Outline: Generics
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I visit "/diseases/"
        Then I should see "Achondroplasia"
        When I visit "/genes/"
        Then I should see "DICER1"
        When I visit "/evidence/"
        Then I should see "8078586"
        When I visit "/groups/"
        Then I should see "CaseGroupRousseau"
        When I visit "/users/"
        Then I should see "Not available"
        When I visit "/search/"
        Then I should see "Showing"
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in the css element field "input.form-control" with "CD3E"
        Then I should see 1 elements with the css selector ".table-row-gdm"
        And I should see "Severe combined"
        When I visit "/interpretations/"
        Then I should see "NM_000111"
        When I fill in the css element field "input.form-control" with "79452"
        Then I should not see "May 10" within 10 seconds
        Then I should see "Milroy disease"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."

# couldn't get Collections loop to work properly...
