@gdm @usefixtures(workbook,admin_user)
Feature: All GDMs

    Scenario: Test All GDMs
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I visit "/gdm/"
        And I wait for 5 seconds
        Then I should not see "AGTR2"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "Access to these interfaces is currently restricted to ClinGen curators."
