@generics @usefixtures(workbook)
Feature: Generics

    Scenario Outline: Generics
        When I visit "/diseases/"
        Then I should see "Achondroplasia"
        When I visit "/genes/"
        Then I should see "DICER1"
        When I visit "/evidence/"
        Then I should see "8078586"
        When I visit "/groups/"
        Then I should see "CaseGroupRousseau"
        When I visit "/users/"
        Then I should see "J. Michael Cherry"
        When I visit "/search/"
        Then I should see "Showing"
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in "q" with "CD3E"
        And I wait for 5 seconds
        Then I should not see "AGTR2"
        And I should see "Severe combined"
        When I visit "/interpretations/"
        Then I should see "NM_000111"
        When I fill in "q" with "79452"
        And I wait for 1 seconds
        Then I should not see "May 10"
        And I should see "Milroy disease"

# couldn't get Collections loop to work properly...
