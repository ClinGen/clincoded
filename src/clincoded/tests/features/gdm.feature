@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I fill in "q" with "FANCM"
        Then I should not see "DICER1" within 10 seconds
