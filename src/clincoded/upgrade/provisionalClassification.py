from contentbase.upgrader import upgrade_step


@upgrade_step('provisionalClassification', '1', '2')
def provisionalClassification_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1196
    if 'replicatedOverTime' not in value:
        value['replicatedOverTime'] = False

    if 'contradictingEvidence' not in value:
        value['contradictingEvidence'] = {}
        value['contradictingEvidence']['proband'] = False
        value['contradictingEvidence']['caseControl'] = False
        value['contradictingEvidence']['experimental'] = False
