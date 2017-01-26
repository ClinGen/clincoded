from snovault.upgrader import upgrade_step


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
