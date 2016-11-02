@select-variant @usefixtures(workbook,admin_user)
Feature: Select Variant

    Scenario: VCI select-variant modal ClinVar functionality
        When I visit "/select-variant/"
        Then I should see "Search and Select Variant"
        When I wait for 1 seconds
        And I select "ClinVar Variation ID" from dropdown "form-control"
        And I wait for 1 seconds
        And I press "Add ClinVar ID"
        And I wait for an element with the css selector ".modal-open" to load
        Then I should see "Enter ClinVar VariationID"
        When I fill in the css element field "input.form-control" with "123"
        When I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "p.Lys384Glu"
        When I clear field the css element field "input.form-control"
        When I fill in the css element field "input.form-control" with "139214"
        When I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NC_000015"

    Scenario: VCI select-variant modal CAR functionality
        When I visit "/select-variant/"
        Then I should see "Search and Select Variant"
        When I wait for 1 seconds
        And I select "ClinGen Allele Registry ID (CA ID)" from dropdown "form-control"
        And I wait for 1 seconds
        And I press "Add CA ID"
        And I wait for an element with the css selector ".modal-open" to load
        Then I should see "Enter CA ID"
        When I fill in the css element field "input.form-control" with "CA003323"
        When I press "Retrieve from ClinGen Allele Registry"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "BRCA1"
        Then I should see "37644"

