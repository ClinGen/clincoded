from contentbase.upgrader import upgrade_step


@upgrade_step('experimental', '1', '2')
def experimental_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'

    # https://github.com/ClinGen/clincoded/issues/419
    if value['proteinInteractions']:
        if value['proteinInteractions']['experimentalInteractionDetection']:
            if value['proteinInteractions']['experimentalInteractionDetection'] == 'coimmunoprecipitation (M:0019)':
                value['proteinInteractions']['experimentalInteractionDetection'] = 'coimmunoprecipitation (MI:0019)'
            if value['proteinInteractions']['experimentalInteractionDetection'] == 'pull down (M:0096)':
                value['proteinInteractions']['experimentalInteractionDetection'] = 'pull down (MI:0096)'
            if value['proteinInteractions']['experimentalInteractionDetection'] == 'affinity chromatography technology (M:0004)':
                value['proteinInteractions']['experimentalInteractionDetection'] = 'affinity chromatography technology (MI:0004)'
            if value['proteinInteractions']['experimentalInteractionDetection'] == 'protein cross-linking with a bifunctional reagent (M0031)':
                value['proteinInteractions']['experimentalInteractionDetection'] = 'protein cross-linking with a bifunctional reagent (MI:0031)'
            if value['proteinInteractions']['experimentalInteractionDetection'] == 'comigration in gel electrophoresis (M:0807)':
                value['proteinInteractions']['experimentalInteractionDetection'] = 'comigration in gel electrophoresis (MI:0807)'


@upgrade_step('experimental', '2', '3')
def experimental_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1446
    # https://github.com/ClinGen/clincoded/issues/1444
    # https://github.com/ClinGen/clincoded/issues/1335
    if 'functionalAlteration' in value:
        if 'cellMutationOrEngineeredEquivalent' in value['functionalAlteration']:
            if value['functionalAlteration']['cellMutationOrEngineeredEquivalent'] == 'Engineered equivalent':
                value['functionalAlteration']['functionalAlterationType'] = 'Non-patient cells'
            else:
                value['functionalAlteration']['functionalAlterationType'] = value['functionalAlteration']['cellMutationOrEngineeredEquivalent']
            value['functionalAlteration'].pop('cellMutationOrEngineeredEquivalent', None)
        if 'patientCellType' in value['functionalAlteration']:
            if value['functionalAlteration']['patientCellType'] != '':
                value['functionalAlteration']['patientCells'] = value['functionalAlteration']['patientCellType']
            else:
                value['functionalAlteration']['patientCells'] = ''
            value['functionalAlteration'].pop('patientCellType', None)
        if 'patientCellTypeFreeText' in value['functionalAlteration']:
            if value['functionalAlteration']['patientCellTypeFreeText'] != '':
                value['functionalAlteration']['patientCellsFreeText'] = value['functionalAlteration']['patientCellTypeFreeText']
            else:
                value['functionalAlteration']['patientCellsFreeText'] = ''
            value['functionalAlteration'].pop('patientCellTypeFreeText', None)
        if 'engineeredEquivalentCellType' in value['functionalAlteration']:
            if value['functionalAlteration']['engineeredEquivalentCellType'] != '':
                value['functionalAlteration']['nonPatientCells'] = value['functionalAlteration']['engineeredEquivalentCellType']
            else:
                value['functionalAlteration']['nonPatientCells'] = ''
            value['functionalAlteration'].pop('engineeredEquivalentCellType', None)
        if 'engineeredEquivalentCellTypeFreeText' in value['functionalAlteration']:
            if value['functionalAlteration']['engineeredEquivalentCellTypeFreeText'] != '':
                value['functionalAlteration']['nonPatientCellsFreeText'] = value['functionalAlteration']['engineeredEquivalentCellTypeFreeText']
            else:
                value['functionalAlteration']['nonPatientCellsFreeText'] = ''
            value['functionalAlteration'].pop('engineeredEquivalentCellTypeFreeText', None)
        
    if 'modelSystems' in value:
        if 'animalOrCellCulture' in value['modelSystems']:
            if value['modelSystems']['animalOrCellCulture'] == 'Animal model':
                value['modelSystems']['modelSystemsType'] = 'Non-human model organism'
            else:
                value['modelSystems']['modelSystemsType'] = 'Cell culture model'
            value['modelSystems'].pop('animalOrCellCulture', None)
        if 'animalModel' in value['modelSystems']:
            if value['modelSystems']['animalModel'] != '':
                value['modelSystems']['nonHumanModel'] = value['modelSystems']['animalModel']
            else:
                value['modelSystems']['nonHumanModel'] = ''
            value['modelSystems'].pop('animalModel', None)

    if 'rescue' in value:
        if 'patientCellOrEngineeredEquivalent' in value['rescue']:
            if value['rescue']['patientCellOrEngineeredEquivalent'] == 'Engineered equivalent':
                value['rescue']['rescueType'] = 'Cell culture model'
            else:
                value['rescue']['rescueType'] = value['rescue']['patientCellOrEngineeredEquivalent']
            value['rescue'].pop('patientCellOrEngineeredEquivalent', None)
        if 'patientCellType' in value['rescue']:
            if value['rescue']['patientCellType'] != '':
                value['rescue']['patientCells'] = value['rescue']['patientCellType']
            else:
                value['rescue']['patientCells'] = ''
            value['rescue'].pop('patientCellType', None)
        if 'patientCellTypeFreeText' in value['rescue']:
            if value['rescue']['patientCellTypeFreeText'] != '':
                value['rescue']['patientCellsFreeText'] = value['rescue']['patientCellTypeFreeText']
            else:
                value['rescue']['patientCellsFreeText'] = ''
            value['rescue'].pop('patientCellTypeFreeText', None)
        if 'engineeredEquivalentCellType' in value['rescue']:
            if value['rescue']['engineeredEquivalentCellType'] != '':
                value['rescue']['cellCulture'] = value['rescue']['engineeredEquivalentCellType']
            else:
                value['rescue']['cellCulture'] = ''
            value['rescue'].pop('engineeredEquivalentCellType', None)
        if 'engineeredEquivalentCellTypeFreeText' in value['rescue']:
            if value['rescue']['engineeredEquivalentCellTypeFreeText'] != '':
                value['rescue']['cellCultureFreeText'] = value['rescue']['engineeredEquivalentCellTypeFreeText']
            else:
                value['rescue']['cellCultureFreeText'] = ''
            value['rescue'].pop('engineeredEquivalentCellTypeFreeText', None)


@upgrade_step('experimental', '3', '4')
def experimental_3_4(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return


@upgrade_step('experimental', '4', '5')
def experimental_4_5(value, system):
    # https://github.com/ClinGen/clincoded/issues/1482
    if 'modelSystems' in value:
        if 'nonHumanModel' in value['modelSystems']:
            if value['modelSystems']['nonHumanModel'] == 'Dog (Canis lupus familaris) 9615':
                value['modelSystems']['nonHumanModel'] = 'Dog (Canis lupus familiaris) 9615'
            if value['modelSystems']['nonHumanModel'] == 'Gerbil (Gerbilinae) 10045':
                value['modelSystems']['nonHumanModel'] = 'Gerbil (Gerbillinae) 10045'
            if value['modelSystems']['nonHumanModel'] == 'Rabbit (Oryctolagus crunicu) 9986':
                value['modelSystems']['nonHumanModel'] = 'Rabbit (Oryctolagus cuniculus) 9986'
            if value['modelSystems']['nonHumanModel'] == 'Round worm (Carnorhabditis elegans) 6239':
                value['modelSystems']['nonHumanModel'] = 'Round worm (Caenorhabditis elegans) 6239'
            if value['rescue']['nonHumanModel'] == 'Zebra finch (Taeniopygia guttata) 59729':
                value['rescue']['nonHumanModel'] = 'Zebra finch (Taeniopygia guttata) 59729'
            if value['modelSystems']['nonHumanModel'] == 'Zebrafish (Daanio rerio) 7955':
                value['modelSystems']['nonHumanModel'] = 'Zebrafish (Danio rerio) 7955'

    if 'rescue' in value:
        if 'nonHumanModel' in value['rescue']:
            if value['rescue']['nonHumanModel'] == 'Dog (Canis lupus familaris) 9615':
                value['rescue']['nonHumanModel'] = 'Dog (Canis lupus familiaris) 9615'
            if value['rescue']['nonHumanModel'] == 'Gerbil (Gerbilinae) 10045':
                value['rescue']['nonHumanModel'] = 'Gerbil (Gerbillinae) 10045'
            if value['rescue']['nonHumanModel'] == 'Rabbit (Oryctolagus crunicu) 9986':
                value['rescue']['nonHumanModel'] = 'Rabbit (Oryctolagus cuniculus) 9986'
            if value['rescue']['nonHumanModel'] == 'Round worm (Carnorhabditis elegans) 6239':
                value['rescue']['nonHumanModel'] = 'Round worm (Caenorhabditis elegans) 6239'
            if value['rescue']['nonHumanModel'] == 'Zebra finch (Taeniopygia guttata) 59729':
                value['rescue']['nonHumanModel'] = 'Zebra finch (Taeniopygia guttata) 59729'
            if value['rescue']['nonHumanModel'] == 'Zebrafish (Daanio rerio) 7955':
                value['rescue']['nonHumanModel'] = 'Zebrafish (Danio rerio) 7955'

@upgrade_step('experimental', '5', '6')
def experimental_5_6(value, system):
    # https://github.com/ClinGen/clincoded/issues/1476
    # Add Mammalian Phenotype Ontology (MP) IDs as additional option in Model Systems
    return