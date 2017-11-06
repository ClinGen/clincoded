@create-gene-disease @usefixtures(workbook,admin_user)
Feature: Create Gene Disease

    Scenario: See Required-Fields errors
        When I visit "/create-gene-disease/"
        And I click the element with the css selector ".btn-default"
        Then I should see "Required"

    Scenario: Add GDM
        When I visit "/create-gene-disease/"
        And I press "Disease"
        And I wait for an element with the css selector ".modal-open" to load
        Then I should see an element with the css selector ".disease-id-input" within 2 seconds
        When I fill in the css element field "input.form-control.disease-id-input" with "MONDO:0011014"
        And I wait for 1 seconds
        And I press "Retrieve from OLS"
        Then I should see an element with the css selector ".resource-metadata" within 5 seconds
        Then I should see "pleuropulmonary blastoma"
        When I press the button "Save"
        And I wait for 2 seconds
        Then I should see "pleuropulmonary blastoma (MONDO:0011014)"
        When I fill in "hgncgene" with "DICER1"

        #
        # note: different mode of inheritance selections should have different mode adjectives/modifiers in the dropdown
        #
        And I select "Autosomal dominant inheritance (HP:0000006)" from dropdown "form-control modeOfInheritance"
        And I select "with maternal imprinting (HP:0012275)" from dropdown "form-control moiAdjective"

        And I select "Autosomal recessive inheritance (HP:0000007)" from dropdown "form-control modeOfInheritance"
        And I select "with genetic anticipation" from dropdown "form-control moiAdjective"

        And I select "Mitochondrial inheritance (HP:0001427)" from dropdown "form-control modeOfInheritance"
        And I select "primarily or exclusively homoplasmic" from dropdown "form-control moiAdjective"

        And I select "X-linked inheritance (HP:0001417)" from dropdown "form-control modeOfInheritance"
        And I select "dominant (HP:0001423)" from dropdown "form-control moiAdjective"

        And I select "Other" from dropdown "form-control modeOfInheritance"
        And I select "Y-linked inheritance (HP:0001450)" from dropdown "form-control moiAdjective"

        And I select "Unknown" from dropdown "form-control modeOfInheritance"

        And I click the element with the css selector ".btn-default"
        Then I should not see "Required"


    Scenario: Test GDM alert modal
        When I visit "/logout"
        Then I should see "Demo Login"
        When I press "Demo Login"
        And I wait for 10 seconds
        Then I should see "Logout ClinGen Test Curator"
        When I visit "/gdm/"
        Then I should see "DICER1"
        When I fill in "filterTerm" with "FANCM"
        Then I should not see "DICER1"
        When I visit "/create-gene-disease/"
        And I press "Disease"
        And I wait for an element with the css selector ".modal-open" to load
        Then I should see an element with the css selector ".disease-id-input" within 2 seconds
        When I fill in the css element field "input.form-control.disease-id-input" with "MONDO:0011014"
        And I wait for 1 seconds
        And I press "Retrieve from OLS"
        Then I should see an element with the css selector ".resource-metadata" within 5 seconds
        Then I should see "pleuropulmonary blastoma"
        When I press the button "Save"
        And I wait for 2 seconds
        Then I should see "pleuropulmonary blastoma (MONDO:0011014)"
        When I fill in "hgncgene" with "DICER1"
        And I select "Autosomal dominant inheritance (HP:0000006)" from dropdown "form-control modeOfInheritance"
        And I click the element with the css selector ".btn-default"
        Then I should see an element with the css selector ".modal-dialog" within 5 seconds
        Then I should see "A curation record already exists for "
        When I press the button "Curate"
        Then I should see an element with the css selector ".pmid-selection-add-btn" within 5 seconds
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"
