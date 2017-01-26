from snovault.upgrader import upgrade_step


@upgrade_step('individual', '1', '2')
def individual_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'


@upgrade_step('individual', '2', '3')
def individual_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/401
    if 'method' in value:
        if 'genotypingMethods' in value['method']:
            value['method']['genotypingMethods'] = [e.replace('Sanger', 'Sanger sequencing') for e in value['method']['genotypingMethods']]
            value['method']['genotypingMethods'] = [e.replace('HRM', 'High resolution melting') for e in value['method']['genotypingMethods']]
