@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/gdm/"
        Then I should see "This is a demo version of the site"
        When I press "Click Me"
        And I wait for 1 seconds
        Then I should see "I am clicked."
