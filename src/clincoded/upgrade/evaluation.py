from contentbase.upgrader import upgrade_step


@upgrade_step('evaluation', '1', '2')
def evaluation_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1328
    # No diseases are found to be associated with computational records
    # Update schema version only
    return


@upgrade_step('evaluation', '2', '3')
def evaluation_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return

