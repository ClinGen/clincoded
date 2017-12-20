from contentbase.upgrader import upgrade_step


@upgrade_step('annotation', '1', '2')
def annotation_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'


@upgrade_step('annotation', '2', '3')
def annotation_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return
