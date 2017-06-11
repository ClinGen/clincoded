from contentbase.upgrader import upgrade_step


@upgrade_step('gdm', '1', '2')
def gdm_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'


@upgrade_step('gdm', '2', '3')
def gdm_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1103
    if value['modeInheritance'] == 'X-linked recessive inheritance (HP:0001419)':
        value['modeInheritance'] = 'X-linked inheritance (HP:0001417)'


@upgrade_step('gdm', '3', '4')
def gdm_3_4(value, system):
    # https://github.com/ClinGen/clincoded/issues/1328
    if value['disease'] == '15':
        value['disease'] = 'a9602dce-eb24-42cd-bf12-5f60b58a7a9b'
    if value['disease'] == '84':
        value['disease'] = 'a124185e-1179-475d-9475-65500c935391'
    if value['disease'] == '777':
        value['disease'] = '4dccc4ee-a3cb-475e-be78-3323463eebe8'
    if value['disease'] == '64742':
        value['disease'] = 'd64296e0-cb26-4ca4-aa69-8a8ed80f7850'
    if value['disease'] == '284984':
        value['disease'] = '3e1ceb88-9674-468b-a00f-905844aa918e'
    if value['disease'] == '183660':
        value['disease'] = 'd76c0ff2-390b-4b41-b937-c489f4c05bc1'
