from snovault import upgrade_step


@upgrade_step('variant', '1', '2')
def variant_1_2(value, system):
    # for adding optional field clinvarVariantTitle
    if 'clinvarVariantTitle' not in value:
        if 'clinvarVariantId' in value:
            if value['clinvarVariantId'] == '4662':
                value['clinvarVariantTitle'] = 'NM_015074.3(KIF1B):c.4442G>A (p.Ser1481Asn)'
            if value['clinvarVariantId'] == '466':
                value['clinvarVariantTitle'] = 'NM_000035.3(ALDOB):c.865_867delCTT (p.Leu289del)'
            if value['clinvarVariantId'] == '6822':
                value['clinvarVariantTitle'] = 'NM_058216.2(RAD51C):c.773G>A (p.Arg258His)'
            if value['clinvarVariantId'] == '50962':
                value['clinvarVariantTitle'] = 'NM_018297.3(NGLY1):c.1201A>T (p.Arg401Ter)'
            if value['clinvarVariantId'] == '50961':
                value['clinvarVariantTitle'] = 'NM_018297.3(NGLY1):c.1891delC (p.Gln631Serfs)'
            if value['clinvarVariantId'] == '126422':
                value['clinvarVariantTitle'] = 'NM_018297.3(NGLY1):c.1370dupG (p.Arg458Lysfs)'
            if value['clinvarVariantId'] == '126424':
                value['clinvarVariantTitle'] = 'NM_001145293.1(NGLY1):c.1570C>T (p.Arg524Ter)'
            if value['clinvarVariantId'] == '126423':
                value['clinvarVariantTitle'] = 'NM_001145294.1(NGLY1):c.1079_1081delGAA (p.Arg360del)'
            if value['clinvarVariantId'] == '11717':
                value['clinvarVariantTitle'] = 'NM_000686.4(AGTR2):c.402delT (p.Phe134Leufs)'
            if value['clinvarVariantId'] == '11720':
                value['clinvarVariantTitle'] = 'NM_000686.4(AGTR2):c.157A>T (p.Ile53Phe)'
            if value['clinvarVariantId'] == '11718':
                value['clinvarVariantTitle'] = 'NM_000686.4(AGTR2):c.971G>A (p.Arg324Gln)'
            if value['clinvarVariantId'] == '11719':
                value['clinvarVariantTitle'] = 'NM_000686.4(AGTR2):c.1009A>G (p.Ile337Val)'
            if value['clinvarVariantId'] == '11716':
                value['clinvarVariantTitle'] = 'NM_000686.4(AGTR2):c.62G>T (p.Gly21Val)'
            if value['clinvarVariantId'] == '12744':
                value['clinvarVariantTitle'] = 'NM_000733.3(CD3E):c.520+2T>C'
            if value['clinvarVariantId'] == '12745':
                value['clinvarVariantTitle'] = 'NM_000733.3(CD3E):c.176G>A (p.Trp59Ter)'
            if value['clinvarVariantId'] == '12746':
                value['clinvarVariantTitle'] = 'NM_000733.3(CD3E):c.128_129delCC (p.Thr43Asnfs)'
            if value['clinvarVariantId'] == '126649':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.2386G>T (p.Gly796Ter)'
            if value['clinvarVariantId'] == '126697':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.2982dupT (p.Ala995Cysfs)'
            if value['clinvarVariantId'] == '126711':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.3113G>A (p.Trp1038Ter)'
            if value['clinvarVariantId'] == '126715':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.3116delA (p.Asn1039Ilefs)'
            if value['clinvarVariantId'] == '128144':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.3549C>A (p.Tyr1183Ter)'
            if value['clinvarVariantId'] == '41251':
                value['clinvarVariantTitle'] = 'NM_018081.2(WRAP53):c.1303G>A (p.Gly435Arg)'
            if value['clinvarVariantId'] == '41252':
                value['clinvarVariantTitle'] = 'NM_018081.2(WRAP53):c.492C>A (p.Phe164Leu)'
            if value['clinvarVariantId'] == '30975':
                value['clinvarVariantTitle'] = 'NM_018081.2(WRAP53):c.1192C>T (p.Arg398Trp)'
            if value['clinvarVariantId'] == '30976':
                value['clinvarVariantTitle'] = 'NM_018081.2(WRAP53):c.1126C>T (p.His376Tyr)'
            if value['clinvarVariantId'] == '17072':
                value['clinvarVariantTitle'] = 'C1QB, 150G-A'
            if value['clinvarVariantId'] == '12707':
                value['clinvarVariantTitle'] = 'NM_003276.2(TMPO):c.2068C>T (p.Arg690Cys)'
            if value['clinvarVariantId'] == '126609':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.1592delT (p.Leu531Cysfs)'
            if value['clinvarVariantId'] == '126644':
                value['clinvarVariantTitle'] = 'NM_024675.3(PALB2):c.229delT (p.Cys77Valfs)'
            if value['clinvarVariantId'] == '4280':
                value['clinvarVariantTitle'] = 'NM_017838.3(NHP2):c.415T>C (p.Tyr139His)'
            if value['clinvarVariantId'] == '4282':
                value['clinvarVariantTitle'] = 'NM_017838.3(NHP2):c.460T>A (p.Ter154Arg)'
            if value['clinvarVariantId'] == '4281':
                value['clinvarVariantTitle'] = 'NM_017838.3(NHP2):c.376G>A (p.Val126Met)'
            if value['clinvarVariantId'] == '1000':
                value['clinvarVariantTitle'] = 'NM_001172813.1(SLC30A8):c.826C>T (p.Arg276Trp)'
            if value['clinvarVariantId'] == '5883':
                value['clinvarVariantTitle'] = 'NM_005751.4(AKAP9):c.4709C>T (p.Ser1570Leu)'

        else:
            value['clinvarVariantTitle'] = ''


@upgrade_step('variant', '2', '3')
def variant_2_3(value, system):
    # Related to ticket #676 (https://github.com/ClinGen/clincoded/issues/676#issuecomment-218564765)
    if 'carId' not in value:
        value['carId'] = ''

    if 'dbSNPId' in value:
        if value['dbSNPId'] != '':
            value['dbSNPIds'] = [value['dbSNPId']]
        else:
            value['dbSNPIds'] = []
        value.pop('dbSNPId', None)
    if 'dbSNPIds' not in value and 'dbSNPId' not in value:
        value['dbSNPIds'] = []

    if 'clinVarRCV' in value:
        if value['clinVarRCV'] != '':
            value['clinVarRCVs'] = [value['clinVarRCV']]
        else:
            value['clinVarRCVs'] = []
        value.pop('clinVarRCV', None)
    if 'clinVarRCVs' not in value and 'clinVarRCV' not in value:
        value['clinVarRCVs'] = []

    if 'clinVarSCVs' not in value:
        value['clinVarSCVs'] = []

    if 'hgvsNames' in value and value['hgvsNames'] == []:
        value['hgvsNames'] = {}

