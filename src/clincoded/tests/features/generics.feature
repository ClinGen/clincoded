@generics @usefixtures(workbook)
Feature: Generics

    Scenario Outline: Generics
        When I visit "/diseases/"
        Then I should see "Orphanet"

# must log in for users
