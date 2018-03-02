from contentbase.upgrader import upgrade_step


@upgrade_step('curatorHistory', '1', '2')
def curatorHistory_1_2(value, system):
    return


@upgrade_step('curatorHistory', '2', '3')
def curatorHistory_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1419
    return
