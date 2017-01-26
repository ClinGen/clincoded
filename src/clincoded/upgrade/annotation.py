from snovault.upgrader import upgrade_step


@upgrade_step('annotation', '1', '2')
def annotation_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'
