@select-variant @usefixtures(workbook,admin_user)
Feature: Select Variant

    Scenario: VCI select-variant modal ClinVar functionality
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I visit "/select-variant/"
        And I wait for 1 seconds
        Then I should see "Search and Select Variant"
        When I select "ClinVar Variation ID" from dropdown "form-control"
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
        And I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NC_000015"
        When I press the button "Save and View Evidence"
        And I wait for 2 seconds
        Then I should see "NM_005902.3:c.-28C>T"
        When I press the button "Interpretation "
        And I wait for 1 seconds
        Then I should see "Variant Interpretation Record"
        When I press "Logout ClinGen Test Curator"
        And I wait for 10 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"


    Scenario: VCI select-variant modal CAR functionality
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I visit "/select-variant/"
        And I wait for 1 seconds
        Then I should see "Search and Select Variant"
        When I select "ClinGen Allele Registry ID (CA ID)" from dropdown "form-control"
        And I wait for 1 seconds
        And I press "Add CA ID"
        And I wait for an element with the css selector ".modal-open" to load
        Then I should see "Enter CA ID"
        When I fill in the css element field "input.form-control" with "CA2738256"
        When I press "Retrieve from ClinGen Allele Registry"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NC_000003.12:g.184957468G>A"
        When I press the button "Save and View Evidence"
        And I wait for 10 seconds
        Then I should see "Evidence View"
        Then I should see " rs566967979"
        When I press "Logout ClinGen Test Curator"
        And I wait for 10 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"


