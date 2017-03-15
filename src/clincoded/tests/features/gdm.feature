@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in the css element field "input.form-control" with "FANCM"
        Then I should not see "DICER1"
