from contentbase.upgrader import upgrade_step


@upgrade_step('history', '1', '2')
def history_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/494
    if ('hidden' not in value):
        value['hidden'] = 0
