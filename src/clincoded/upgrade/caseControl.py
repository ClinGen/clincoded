from contentbase.upgrader import upgrade_step


@upgrade_step('caseControl', '1', '2')
def caseControl_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return
