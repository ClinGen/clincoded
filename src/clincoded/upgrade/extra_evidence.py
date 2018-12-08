from contentbase.upgrader import upgrade_step


@upgrade_step('extra_evidence', '1', '2')
def extra_evidence_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return


@upgrade_step('extra_evidence', '2', '3')
def extra_evidence_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1822
    # Add evidenceCriteria and affiliation properties
    return
