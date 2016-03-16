from contentbase.upgrader import upgrade_step
import urllib
import json

@upgrade_step('variant', '1', '2')
def variant_1_2(value, system):
    # for adding optional field clinvarVariantTitle
    if 'clinvarVariantTitle' not in value:
        if 'clinvarVariantId' in value:
            response = urllib.urlopen('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=%s&retmode=json' % value['clinvarVariantId'])
            data = json.loads(response.read())
            value['clinvarVariantTitle'] = str(data['result'][value['clinvarVariantId']]['title'])
        else:
            value['clinvarVariantTitle'] = ''
