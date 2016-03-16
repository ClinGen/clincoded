from contentbase.upgrader import upgrade_step

@upgrade_step('variant', '1', '2')
def variant_1_2(value, system):
    # for adding optional field clinvarVariantTitle
    if 'clinvarVariantTitle' not in value:
        value['clinvarVariantTitle'] = ''
