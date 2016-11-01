@select-variant @usefixtures(workbook,admin_user)
Feature: Select Variant

    Scenario: VCI functional
        When I visit "/select-variant/"
        Then I should see "Search and Select Variant"
        When I wait for 1 seconds
        And I select "ClinVar Variation ID" from dropdown "form-control"
        And I wait for 1 seconds
        And I press "Add ClinVar ID"
        And I wait for an element with the css selector "body.demo-background.modal-open" to load
        Then I should see "Enter ClinVar VariationID"
        # When I fill in "form-control" with "123"
        # And I press "Retrieve from ClinVar"
        # And I wait for 10 seconds
        # Then I should see "p.Lys384Glu"
