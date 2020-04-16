import requests
from contentbase.upgrader import upgrade_step

@upgrade_step('extra_evidence', '1', '2')
def extra_evidence_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return


@upgrade_step('extra_evidence', '2', '3')
def extra_evidence_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1822
    # Add evidenceCriteria and affiliation properties
    return

@upgrade_step('extra_evidence', '3', '4')
def extra_evidence_3_4(value, system):
    # https://github.com/ClinGen/clincoded/issues/1755
    # Add source property
    if 'category' in value:
        if value['category'] == 'case-segregation':
            value['source'] = {}

@upgrade_step('extra_evidence', '4', '5')
def extra_evidence_4_5(value, system):
    # https://github.com/ClinGen/clincoded/issues/2068
    # Rename source property to sourceInfo
    if 'category' in value:
        if value['category'] == 'case-segregation':
            if 'source' in value:
                value['sourceInfo'] = value['source']
                value.pop('source', None)

@upgrade_step('extra_evidence', '5', '6')
def extra_evidence_5_6(value, system):
    if 'category' in value:
        if value['category'] == 'case-segregation':
            if 'sourceInfo' in value:
                if value['sourceInfo']['data']['proband_hpo_ids']:
                    proband_hpo_ids = value['sourceInfo']['data']['proband_hpo_ids']
                    ids = proband_hpo_ids.split(', ')
                    hpoData = []
                    for id in ids:
                        try:
                            response = requests.get('https://hpo.jax.org/api/hpo/term/'+ id)
                            json_response = response.json()
                            hpo_term = json_response['details']['name']
                            hpoData.append({'hpoId': id, 'hpoTerm': hpo_term})
                        except:
                            hpoData.append({'hpoId': id, 'hpoTerm': 'Term not found'})
                        finally:
                            value['sourceInfo']['data']['hpoData'] = hpoData