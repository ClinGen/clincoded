from contentbase.upgrader import upgrade_step
import urllib.request
import json

@upgrade_step('variant', '1', '2')
def variant_1_2(value, system):
    # for adding optional field clinvarVariantTitle
    if 'clinvarVariantTitle' not in value:
        if 'clinvarVariantId' in value:
            response = urllib.request.urlopen('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=%s&retmode=json' % value['clinvarVariantId'])
            str_response = response.read().decode('utf-8')
            data = json.loads(str_response)
            value['clinvarVariantTitle'] = str(data['result'][value['clinvarVariantId']]['title'])
        else:
            value['clinvarVariantTitle'] = ''
