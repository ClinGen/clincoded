from snovault.upgrader import upgrade_step


@upgrade_step('gdm', '1', '2')
def gdm_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'


@upgrade_step('gdm', '2', '3')
def gdm_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1103
    if value['modeInheritance'] == 'X-linked recessive inheritance (HP:0001419)':
        value['modeInheritance'] = 'X-linked inheritance (HP:0001417)'
