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
        When I fill in "filterTerm" with "CD3E"
        Then I should not see "AGTR2"
        And I should see "severe combined"
        When I visit "/interpretations/"
        Then I should see "NM_000111"
        When I fill in "filterTerm" with "0018954"
        Then I should not see "May 10"
        Then I should see "Loeys-Dietz syndrome"

# couldn't get Collections loop to work properly...
