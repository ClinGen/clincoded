@variant-curation-tabs @usefixtures(workbook,admin_user)
Feature: Variant Curation Tabs

    Scenario: Testing VCI tab functionality on non-SNV variant (Type: Duplication)
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
        When I fill in the css element field "input.form-control" with "17677"
        And I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NM_007294.3(BRCA1):c.5266dupC (p.Gln1756Profs)"
        When I press the button "Save and View Evidence"
        And I wait for 5 seconds
        Then I should see "reviewed by expert panel"
        When I press the tab "Population "
        And I wait for 1 seconds
        Then I should see "Highest Minor Allele Frequency"
        When I press the tab "Predictors "
        And I wait for 1 seconds
        Then I should see "ClinGen Predictors"
        When I press the tab "Experimental "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Hotspot or functional domain)"
        When I press the tab "Case/Segregation "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Observed in healthy adult(s))"
        When I press the tab "Gene-centric"
        And I wait for 2 seconds
        Then I should see "BRCA1"
        When I press the tab "Basic Information"
        And I wait for 2 seconds
        Then I should see "reviewed by expert panel"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"


    Scenario: Testing VCI tab functionality on non-SNV variant (Type: Deletion)
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
        When I fill in the css element field "input.form-control" with "53237"
        And I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NC_000007"
        When I press the button "Save and View Evidence"
        And I wait for 5 seconds
        Then I should see "criteria provided, single submitter"
        When I press the tab "Population "
        And I wait for 1 seconds
        Then I should see "Highest Minor Allele Frequency"
        When I press the tab "Predictors "
        And I wait for 1 seconds
        Then I should see "ClinGen Predictors"
        When I press the tab "Experimental "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Hotspot or functional domain)"
        When I press the tab "Case/Segregation "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Observed in healthy adult(s))"
        When I press the tab "Gene-centric"
        And I wait for 2 seconds
        Then I should see "CFTR"
        When I press the tab "Basic Information"
        And I wait for 2 seconds
        Then I should see "criteria provided, single submitter"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"


    Scenario: Testing VCI tab functionality on non-SNV variant (Type: Insertion)
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
        When I fill in the css element field "input.form-control" with "224885"
        And I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "LRG_121t1"
        When I press the button "Save and View Evidence"
        And I wait for 5 seconds
        Then I should see "no assertion criteria provided"
        When I press the tab "Population "
        And I wait for 1 seconds
        Then I should see "Highest Minor Allele Frequency"
        When I press the tab "Predictors "
        And I wait for 1 seconds
        Then I should see "ClinGen Predictors"
        When I press the tab "Experimental "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Hotspot or functional domain)"
        When I press the tab "Case/Segregation "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Observed in healthy adult(s))"
        When I press the tab "Gene-centric"
        And I wait for 2 seconds
        Then I should see "TYK2"
        When I press the tab "Basic Information"
        And I wait for 2 seconds
        Then I should see "no assertion criteria provided"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"


    Scenario: Testing VCI tab functionality on non-SNV variant (Type: Indel)
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
        When I fill in the css element field "input.form-control" with "213703"
        And I press "Retrieve from ClinVar"
        Then I should see an element with the css selector ".resource-metadata" within 30 seconds
        Then I should see "NC_000001"
        When I press the button "Save and View Evidence"
        And I wait for 5 seconds
        Then I should see "criteria provided, single submitter"
        When I press the tab "Population "
        And I wait for 1 seconds
        Then I should see "Highest Minor Allele Frequency"
        When I press the tab "Predictors "
        And I wait for 1 seconds
        Then I should see "ClinGen Predictors"
        When I press the tab "Experimental "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Hotspot or functional domain)"
        When I press the tab "Case/Segregation "
        And I wait for 1 seconds
        Then I should see "Curated Literature Evidence (Observed in healthy adult(s))"
        When I press the tab "Gene-centric"
        And I wait for 2 seconds
        Then I should see "SKI"
        When I press the tab "Basic Information"
        And I wait for 2 seconds
        Then I should see "criteria provided, single submitter"
        When I press "Logout ClinGen Test Curator"
        And I wait for 5 seconds
        Then I should see "All users may register for our demo version of the ClinGen interfaces"
