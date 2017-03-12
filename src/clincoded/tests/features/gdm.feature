@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in the css element field "input.form-control" with "x-linked"
        And I wait for 30 seconds
        Then I should see 1 elements with the css selector ".table-row-gdm"
