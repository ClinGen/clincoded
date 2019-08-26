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
    # Import uuidpmid dictionary data file
    from clincoded.upgrade.uuidpmid import uuidList
    # Add source property
    if 'category' in value:
        if value['category'] == 'case-segregation':
            value['source'] = {}
            value['source']['data'] = {}
            value['source']['metadata'] = {}
            value['source']['relevant_criteria'] = []
            value['source']['metadata']['_kind_key'] = 'PMID'
            value['source']['metadata']['_kind_title'] = 'Pubmed'
            # Since articles[] contains article uuid, get its pmid from array
            # If uuid is not found, do not set pmid and ignore the error
            try:
                value['source']['metadata']['pmid'] = uuidList[value['articles'][0]]
            except Exception:
                pass
            value['source']['data']['relevant_criteria'] = ''
            value['source']['data']['comments'] = value['evidenceDescription']
            if value['evidenceCriteria'] != 'none':
                value['source']['data']['relevant_criteria'] = value['evidenceCriteria']
