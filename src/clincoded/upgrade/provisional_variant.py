from contentbase.upgrader import upgrade_step


@upgrade_step('provisional_variant', '1', '2')
def provisional_variant_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return


@upgrade_step('provisional_variant', '2', '3')
def provisional_variant_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1422
    # Add new properties for approval process and update schema version
    return

