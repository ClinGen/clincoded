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

# couldn't get Collections loop to work properly...
