@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "AGTR2"
        When I press "Click Me"
        Then I should see "I am clicked"
