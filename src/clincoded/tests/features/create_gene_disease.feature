@create-gene-disease @usefixtures(workbook,admin_user)
Feature: Create Gene Disease

    Scenario: See Required-Fields errors
        When I visit "/create-gene-disease/"
        And I click the element with the css selector ".btn-default"
        Then I should see "Required"

    Scenario: Add GDM
        When I visit "/create-gene-disease/"
        And I fill in "hgncgene" with "DICER1"
        And I fill in "orphanetid" with "ORPHA15"
        And I select "Other" from dropdown "form-control hpo"
        And I click the element with the css selector ".btn-default"
        Then I should not see "Required"
