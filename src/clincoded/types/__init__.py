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
    embedded = [
        'submitted_by'
    ]

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
    embedded = [
        'submitted_by'
    ]

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
        'submitted_by',
        'variantPathogenic.variant',
        'annotations',
        'annotations.article',
        'annotations.article.submitted_by',
        'annotations.submitted_by',
        'annotations.groups',
        'annotations.groups.commonDiagnosis',
        'annotations.groups.submitted_by',
        'annotations.groups.otherGenes',
        'annotations.groups.otherPMIDs',
        'annotations.groups.otherPMIDs.submitted_by',
        #'annotations.groups.statistic',
        #'annotations.groups.statistic.variants',
        'annotations.groups.familyIncluded',
        'annotations.groups.familyIncluded.commonDiagnosis',
        'annotations.groups.familyIncluded.submitted_by',
        'annotations.groups.familyIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.otherPMIDs.submitted_by',
        'annotations.groups.familyIncluded.segregation.variants',
        'annotations.groups.familyIncluded.segregation.variants.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded',
        'annotations.groups.familyIncluded.individualIncluded.diagnosis',
        'annotations.groups.familyIncluded.individualIncluded.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.variants',
        'annotations.groups.familyIncluded.individualIncluded.variants.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'annotations.groups.individualIncluded',
        'annotations.groups.individualIncluded.diagnosis',
        'annotations.groups.individualIncluded.submitted_by',
        'annotations.groups.individualIncluded.variants',
        'annotations.groups.individualIncluded.variants.submitted_by',
        'annotations.groups.individualIncluded.otherPMIDs',
        'annotations.groups.individualIncluded.otherPMIDs.submitted_by',
        #'annotations.groups.control',
        'annotations.families',
        'annotations.families.associatedGroups',
        'annotations.families.commonDiagnosis',
        'annotations.families.submitted_by',
        'annotations.families.otherPMIDs',
        'annotations.families.otherPMIDs.submitted_by',
        'annotations.families.segregation.variants',
        'annotations.families.segregation.variants.submitted_by',
        'annotations.families.individualIncluded',
        'annotations.families.individualIncluded.diagnosis',
        'annotations.families.individualIncluded.submitted_by',
        'annotations.families.individualIncluded.variants',
        'annotations.families.individualIncluded.variants.submitted_by',
        'annotations.families.individualIncluded.otherPMIDs',
        'annotations.families.individualIncluded.otherPMIDs.submitted_by',
        'annotations.individuals',
        'annotations.individuals.diagnosis',
        'annotations.individuals.submitted_by',
        'annotations.individuals.variants',
        'annotations.individuals.variants.submitted_by',
        'annotations.individuals.otherPMIDs',
        'annotations.individuals.otherPMIDs.submitted_by',
        'annotations.experimentalData',
        'annotations.experimentalData.submitted_by',
        'annotations.experimentalData.variants',
        'annotations.experimentalData.variants.submitted_by',
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
        'article.submitted_by',
        'submitted_by',
        'groups',
        'groups.commonDiagnosis',
        'groups.submitted_by',
        'groups.otherGenes',
        'groups.otherPMIDs',
        'groups.otherPMIDs.submitted_by',
        'groups.familyIncluded.commonDiagnosis',
        'groups.familyIncluded.submitted_by',
        'groups.familyIncluded.otherPMIDs',
        'groups.familyIncluded.otherPMIDs.submitted_by',
        'groups.familyIncluded.segregation.variants',
        'groups.familyIncluded.segregation.variants.submitted_by',
        'groups.familyIncluded.individualIncluded',
        'groups.familyIncluded.individualIncluded.diagnosis',
        'groups.familyIncluded.individualIncluded.submitted_by',
        'groups.familyIncluded.individualIncluded.variants',
        'groups.familyIncluded.individualIncluded.variants.submitted_by',
        'groups.familyIncluded.individualIncluded.otherPMIDs',
        'groups.familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'groups.individualIncluded',
        'groups.individualIncluded.diagnosis',
        'groups.individualIncluded.submitted_by',
        'groups.individualIncluded.variants',
        'groups.individualIncluded.variants.submitted_by',
        'groups.individualIncluded.otherPMIDs',
        'groups.individualIncluded.otherPMIDs.submitted_by',
        #'groups.control',
        'families',
        'families.associatedGroups',
        'families.commonDiagnosis',
        'families.submitted_by',
        'families.otherPMIDs',
        'families.otherPMIDs.submitted_by',
        'families.segregation.variants',
        'families.segregation.variants.submitted_by',
        'families.individualIncluded',
        'families.individualIncluded.diagnosis',
        'families.individualIncluded.submitted_by',
        'families.individualIncluded.variants',
        'families.individualIncluded.variants.submitted_by',
        'families.individualIncluded.otherPMIDs',
        'families.individualIncluded.otherPMIDs.submitted_by',
        'individuals',
        'individuals.diagnosis',
        'individuals.submitted_by',
        'individuals.variants',
        'individuals.variants.submitted_by',
        'individuals.otherPMIDs',
        'individuals.otherPMIDs.submitted_by',
        'experimentalData',
        'experimentalData.submitted_by',
        'experimentalData.variants',
        'experimentalData.variants.submitted_by',
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
        'submitted_by',
        'otherGenes',
        'otherPMIDs',
        'otherPMIDs.submitted_by',
        #'statistic',
        'familyIncluded',
        'familyIncluded.commonDiagnosis',
        'familyIncluded.submitted_by',
        'familyIncluded.otherPMIDs',
        'familyIncluded.otherPMIDs.submitted_by',
        'familyIncluded.segregation.variants',
        'familyIncluded.segregation.variants.submitted_by',
        'familyIncluded.individualIncluded',
        'familyIncluded.individualIncluded.diagnosis',
        'familyIncluded.individualIncluded.submitted_by',
        'familyIncluded.individualIncluded.variants',
        'familyIncluded.individualIncluded.variants.submitted_by',
        'familyIncluded.individualIncluded.otherPMIDs',
        'familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.submitted_by',
        'individualIncluded.otherPMIDs',
        'individualIncluded.otherPMIDs.submitted_by',
        'individualIncluded.variants',
        'individualIncluded.variants.submitted_by',
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
        'submitted_by',
        'segregation.variants',
        'segregation.variants.submitted_by',
        'otherPMIDs',
        'otherPMIDs.submitted_by',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.submitted_by',
        'individualIncluded.variants',
        'associatedGroups',
        'individualIncluded.variants.submitted_by',
    ]
    rev = {
        'associatedGroups': ('group', 'familyIncluded'),
    }

    @calculated_property(schema={
        "title": "Associated groups",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "group.familyIncluded",
        },
    })
    def associatedGroups(self, request, associatedGroups):
        return paths_filtered_by_status(request, associatedGroups)

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
        'submitted_by',
        'variants',
        'variants.submitted_by',
        'otherPMIDs',
        'otherPMIDs.submitted_by',
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
        'submitted_by',
        'variants',
        'variants.submitted_by',
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
