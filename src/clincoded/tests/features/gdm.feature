@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in "q" with "FANCM"
        And I wait for 30 seconds
        Then I should not see "DICER1"
