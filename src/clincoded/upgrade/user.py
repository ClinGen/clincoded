from snovault.upgrader import upgrade_step

@upgrade_step('user', '', '2')
def user_1_2(value, system):
    pass

@upgrade_step('user', '2', '3')
def user_2_3(value, system):
    pass

@upgrade_step('user', '3', '4')
def user_3_4(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    if value['email'] not in [
        'fytanaka@stanford.edu',  # Forest
        'kdalton@stanford.edu',  # Karen
        'kgliu@stanford.edu',  # Kang
        'selinad@stanford.edu',  # Selina
        'minchoi@stanford.edu',  # Minyoung
        'hitz@stanford.edu',  # Ben
        'cherry@stanford.edu',  # Mike
        'wrightmw@stanford.edu',  # Matt
    ]:
        value['groups'] = ['curator']
