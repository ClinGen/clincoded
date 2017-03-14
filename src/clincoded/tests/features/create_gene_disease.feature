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

        #
        # note: different mode of inheritance selections should have different mode adjectives/modifiers in the dropdown
        #
        And I select "Autosomal dominant inheritance (HP:0000006)" from dropdown "form-control hpo"
        And I select "with maternal imprinting (HP:0012275)" from dropdown "form-control moiAdjective"

        And I select "Autosomal recessive inheritance (HP:0000007)" from dropdown "form-control hpo"
        And I select "with genetic anticipation" from dropdown "form-control moiAdjective"

        And I select "Mitochondrial inheritance (HP:0001427)" from dropdown "form-control hpo"
        And I select "primarily or exclusively homoplasmic" from dropdown "form-control moiAdjective"

        And I select "X-linked inheritance (HP:0001417)" from dropdown "form-control hpo"
        And I select "dominant (HP:0001423)" from dropdown "form-control moiAdjective"

        And I select "Other" from dropdown "form-control hpo"
        And I select "Y-linked inheritance (HP:0001450)" from dropdown "form-control moiAdjective"

        And I select "Unknown" from dropdown "form-control hpo"

        And I click the element with the css selector ".btn-default"
        Then I should not see "Required"


    Scenario: Test GDM alert modal
        When I visit "/gdm/"
        Then I should see "DICER1"
        When I fill in "q" with "FANCM"
        Then I should not see "DICER1"
        When I visit "/create-gene-disease/"
        And I fill in "hgncgene" with "DICER1"
        And I fill in "orphanetid" with "ORPHA64742"
        And I select "Autosomal dominant inheritance (HP:0000006)" from dropdown "form-control hpo"
        And I click the element with the css selector ".btn-default"
        Then I should see an element with the css selector ".modal-dialog" within 5 seconds
        Then I should see "A curation record already exists for "
        When I press the button "Curate"
        Then I should see an element with the css selector ".pmid-selection-add-btn" within 5 seconds
