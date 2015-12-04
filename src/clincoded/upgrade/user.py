from contentbase.upgrader import upgrade_step

@upgrade_step('user', '', '3')
def user_0_3(value, system):
    pass

@upgrade_step('user', '3', '4')
def user_3_4(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    if value['uuid'] not in [
        '627eedbc-7cb3-4de3-9743-a86266e435a6', # Forest
        '870b7c6d-76f2-4c19-8393-e2f1398cfd99', # Karen
        'e49d01a5-51f7-4a32-ba0e-b2a71684e4aa', # Kang
        '04442cec-6ab7-40d0-af26-1e5fefd535eb', # Selina
        '3a70a47f-711a-473f-93cd-0996421eeaf2', # Minyoung
        '748c68cb-b59e-48dd-88e9-1bcd8be199d6', # Ben
        '5a97bb8e-8b87-4863-91c1-98080d46d4be', # Mike
        'c0a70214-08a8-48a0-ba8d-521bed321d4a', # Matt
        ]:
        value['groups'] = ['curator']
