from contentbase.upgrader import upgrade_step


@upgrade_step('provisionalClassification', '1', '2')
def provisionalClassification_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1196
    if 'alteredClassification' in value:
        if value['alteredClassification'] == 'No Evidence':
            value['alteredClassification'] = 'No selection'


@upgrade_step('provisionalClassification', '2', '3')
def provisionalClassification_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1196
    if 'replicatedOverTime' not in value:
        value['replicatedOverTime'] = False

    if 'contradictingEvidence' not in value:
    	value['contradictingEvidence'] = {}
