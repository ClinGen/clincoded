from snovault.upgrader import upgrade_step


@upgrade_step('interpretation', '1', '2')
def interpretation_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1103
    if 'modeInheritance' in value:
        if value['modeInheritance'] == 'X-linked recessive inheritance (HP:0001419)':
            value['modeInheritance'] = 'X-linked inheritance (HP:0001417)'
