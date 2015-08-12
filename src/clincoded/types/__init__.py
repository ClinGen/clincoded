from contentbase.attachment import ItemWithAttachment
from contentbase.schema_utils import (
    load_schema,
)
from contentbase import (
    calculated_property,
    collection,
)
from pyramid.traversal import find_root
from .base import (
    Item,
    paths_filtered_by_status,
)


def includeme(config):
    config.scan()

### new collections added for handling curation data, 06/19/2015
@collection(
    name='genes',
    unique_key='gene:symbol',
    properties={
        'title': 'HGNC Genes',
        'description': 'List of genes',
    })
class Gene(Item):
    item_type = 'gene'
    schema = load_schema('clincoded:schemas/gene.json')
    name_key = 'symbol'

@collection(
    name='diseases',
    unique_key='orphaPhenotype:orphaNumber',
    properties={
        'title': 'Orphanet Diseases',
        'description': 'List of Orphanet diseases (phenotypes)',
    })
class OrphaPhenotype(Item):
    item_type = 'orphaPhenotype'
    schema = load_schema('clincoded:schemas/orphaPhenotype.json')
    name_key = 'orphaNumber'

'''
@collection(
    name='diseases',
    unique_key='orphaPhenotype:uuid',
    properties={
        'title': 'diseases',
        'description': 'List of all diseases',
    })
class Disease(Item):
    item_type = 'disease'
    schema = load_schema('clincoded:schemas/disease.json')
    name_key = 'uuid'

@collection(
    name='statistics',
    unique_key='statistic:uuid',
    properties={
        'title': 'Statistical Study',
        'description': 'List of statistical studies in all gdm pairs',
    })
class Statistic(Item):
    item_type = 'statistic'
    schema = load_schema('clincoded:schemas/statistic.json')
    name_key = 'uuid'
    embedded = [
        'variants',
        'assessments'
    ]

@collection(
    name='controlgroups',
    unique_key='controlGroup:uuid',
    properties={
        'title': 'Control Groups',
        'description': 'List of control groups in all gdm pairs',
    })
class ControlGroup(Item):
    item_type = 'controlGroup'
    schema = load_schema('clincoded:schemas/controlGroup.json')
    name_key = 'uuid'
'''

@collection(
    name='articles',
    unique_key='article:pmid',
    properties={
        'title': 'References',
        'description': 'List of PubMed references stored locally',
    })
class Article(Item):
    item_type = 'article'
    schema = load_schema('clincoded:schemas/article.json')
    name_key = 'pmid'

@collection(
    name='variants',
    unique_key='variant:uuid',
    properties={
        'title': 'Variants',
        'description': 'List of variants stored locally',
    })
class Variant(Item):
    item_type = 'variant'
    schema = load_schema('clincoded:schemas/variant.json')
    name_key = 'uuid'

@collection(
    name='gdm',
    unique_key='gdm:uuid',
    properties={
        'title': 'Gene:Disease:Mode',
        'description': 'List of Gene:Disease:Mode pairs',
    })
class Gdm(Item):
    item_type = 'gdm'
    schema = load_schema('clincoded:schemas/gdm.json')
    name_key = 'uuid'
    embedded = [
        'gene',
        'disease',
        'annotations',
        'annotations.article',
        'annotations.groups',
        'annotations.groups.commonDiagnosis',
        'annotations.groups.otherGenes',
        #'annotations.groups.statistic',
        #'annotations.groups.statistic.variants',
        'annotations.groups.familyIncluded',
        'annotations.groups.familyIncluded.commonDiagnosis',
        'annotations.groups.familyIncluded.segregation.variants',
        'annotations.groups.familyIncluded.individualIncluded',
        'annotations.groups.familyIncluded.individualIncluded.diagnosis',
        'annotations.groups.familyIncluded.individualIncluded.variants',
        'annotations.groups.individualIncluded',
        'annotations.groups.individualIncluded.diagnosis',
        'annotations.groups.individualIncluded.variants',
        #'annotations.groups.control',
        'annotations.families',
        'annotations.families.commonDiagnosis',
        'annotations.families.segregation.variants',
        'annotations.families.individualIncluded',
        'annotations.families.individualIncluded.diagnosis',
        'annotations.families.individualIncluded.variants',
        'annotations.individuals',
        'annotations.individuals.diagnosis',
        'annotations.individuals.variants',
        'annotations.experimentalData',
        'annotations.experimentalData.variants',
        'annotations.experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes'
    ]

    @calculated_property(schema={
        "title": "Status",
        "type": "string",
    })
    def status(self, finalClassification, draftClassification, provisionalClassifications, annotations):
        if finalClassification != '':
            return 'Final Classification'
        elif draftClassification != '':
            return 'Draft Classification'
        elif len(provisionalClassifications) > 0:
            return 'Summary/Provisional Classifications'
        elif len(annotations) > 0:
            return 'In Progress'
        else:
            return 'Created'

@collection(
    name='evidence',
    unique_key='annotation:uuid',
    properties={
        'title': 'Evidence',
        'description': 'List of evidence for all G:D:M pairs',
    })
class Annotation(Item):
    item_type = 'annotation'
    schema = load_schema('clincoded:schemas/annotation.json')
    name_key = 'uuid'
    embedded = [
        'article',
        'groups',
        'groups.commonDiagnosis',
        'groups.otherGenes',
        'groups.familyIncluded.commonDiagnosis',
        'groups.familyIncluded.segregation.variants',
        'groups.familyIncluded.individualIncluded',
        'groups.familyIncluded.individualIncluded.diagnosis',
        'groups.familyIncluded.individualIncluded.variants',
        'groups.individualIncluded',
        'groups.individualIncluded.diagnosis',
        'groups.individualIncluded.variants',
        #'groups.control',
        'families',
        'families.commonDiagnosis',
        'families.segregation.variants',
        'families.individualIncluded',
        'families.individualIncluded.diagnosis',
        'families.individualIncluded.variants',
        'individuals',
        'individuals.diagnosis',
        'individuals.variants',
        'experimentalData',
        'experimentalData.variants',
        'experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes'
    ]

@collection(
    name='groups',
    unique_key='group:uuid',
    properties={
        'title': 'Groups',
        'description': 'List of groups in all gdm pairs',
    })
class Group(Item):
    item_type = 'group'
    schema = load_schema('clincoded:schemas/group.json')
    name_key = 'uuid'
    embedded = [
        'commonDiagnosis',
        'otherGenes',
        #'statistic',
        'familyIncluded',
        'familyIncluded.commonDiagnosis',
        'familyIncluded.segregation.variants',
        'familyIncluded.individualIncluded',
        'familyIncluded.individualIncluded.diagnosis',
        'familyIncluded.individualIncluded.variants',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.variants',
        'otherPMIDs',
        #'control'
    ]

@collection(
    name='families',
    unique_key='family:uuid',
    properties={
        'title': 'Families',
        'description': 'List of families in all gdm pairs',
    })
class Family(Item):
    item_type = 'family'
    schema = load_schema('clincoded:schemas/family.json')
    name_key = 'uuid'
    embedded = [
        'commonDiagnosis',
        'segregation.variants',
        'segregation.assessments',
        'otherPMIDs',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.variants'
    ]

@collection(
    name='individuals',
    unique_key='individual:uuid',
    properties={
        'title': 'Individuals',
        'description': 'List of individuals in gdm pair',
    })
class Individual(Item):
    item_type = 'individual'
    schema = load_schema('clincoded:schemas/individual.json')
    name_key = 'uuid'
    embedded = [
        'diagnosis',
        'variants'
    ]

@collection(
    name='experimental',
    unique_key='experimental:uuid',
    properties={
        'title': 'Experimental Studies',
        'description': 'List of all experimental studies',
    })
class Experimental(Item):
    item_type = 'experimental'
    schema = load_schema('clincoded:schemas/experimental.json')
    name_key = 'uuid'
    embedded = [
        'variants',
        'biochemicalFunction.geneWithSameFunctionSameDisease.genes'
    ]
### end of new collections for curation data


@collection(
    name='labs',
    unique_key='lab:name',
    properties={
        'title': 'Labs',
        'description': 'Listing of ENCODE DCC labs',
    })
class Lab(Item):
    item_type = 'lab'
    schema = load_schema('clincoded:schemas/lab.json')
    name_key = 'name'
    embedded = ['awards']


@collection(
    name='awards',
    unique_key='award:name',
    properties={
        'title': 'Awards (Grants)',
        'description': 'Listing of awards (aka grants)',
    })
class Award(Item):
    item_type = 'award'
    schema = load_schema('clincoded:schemas/award.json')
    name_key = 'name'


@collection(
    name='organisms',
    unique_key='organism:name',
    properties={
        'title': 'Organisms',
        'description': 'Listing of all registered organisms',
    })
class Organism(Item):
    item_type = 'organism'
    schema = load_schema('clincoded:schemas/organism.json')
    name_key = 'name'


@collection(
    name='sources',
    unique_key='source:name',
    properties={
        'title': 'Sources',
        'description': 'Listing of sources and vendors for ENCODE material',
    })
class Source(Item):
    item_type = 'source'
    schema = load_schema('clincoded:schemas/source.json')
    name_key = 'name'


@collection(
    name='documents',
    properties={
        'title': 'Documents',
        'description': 'Listing of Biosample Documents',
    })
class Document(ItemWithAttachment, Item):
    item_type = 'document'
    schema = load_schema('clincoded:schemas/document.json')
    embedded = ['lab', 'award', 'submitted_by']
