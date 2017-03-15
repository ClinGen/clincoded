from snovault.attachment import ItemWithAttachment
from snovault import (
    calculated_property,
    collection,
    load_schema
)
from .base import (
    Item,
    paths_filtered_by_status,
)


def includeme(config):
    config.scan()


# new collections added for handling curation data, 06/19/2015
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
    unique_key='orphaphenotype:orphaNumber',
    properties={
        'title': 'Orphanet Diseases',
        'description': 'List of Orphanet diseases (phenotypes)',
    })
class OrphaPhenotype(Item):
    item_type = 'orphaphenotype'
    schema = load_schema('clincoded:schemas/orphaphenotype.json')
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
        'submitted_by',
        'associatedPathogenicities',
        'associatedPathogenicities.assessments',
        'associatedPathogenicities.assessments.submitted_by',
        'associatedPathogenicities.variant',
        'associatedPathogenicities.submitted_by',
        'associatedInterpretations',
        'associatedInterpretations.submitted_by',
        'associatedInterpretations.disease',
        'associatedInterpretations.transcripts',
        'associatedInterpretations.proteins',
        'associatedInterpretations.provisional_variant',
        'associatedInterpretations.extra_evidence_list',
        'associatedInterpretations.extra_evidence_list.submitted_by',
        'associatedInterpretations.extra_evidence_list.articles',
        'associatedInterpretations.extra_evidence_list.articles.submitted_by'
    ]
    rev = {
        'associatedPathogenicities': ('pathogenicity', 'variant'),
        'associatedInterpretations': ('interpretation', 'variant')
    }

    @calculated_property(schema={
        "title": "Associated pathogenicities",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "pathogenicity.variant",
        },
    })
    def associatedPathogenicities(self, request, associatedPathogenicities):
        return paths_filtered_by_status(request, associatedPathogenicities)

    @calculated_property(schema={
        "title": "Associated interpretation",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "interpretation.variant",
        },
    })
    def associatedInterpretations(self, request, associatedInterpretations):
        return paths_filtered_by_status(request, associatedInterpretations)

    @calculated_property(schema={
        "title": "Variant ID",
        "type": "string"
    })
    def variant_identifier(self, clinvarVariantId='', carId='', otherDescription=''):
        if clinvarVariantId != '':
            return clinvarVariantId
        elif carId != '':
            return carId
        elif otherDescription != '':
            return otherDescription
        else:
            return ''

    @calculated_property(schema={
        "title": "Variant Source",
        "type": "string"
    })
    def source(self, clinvarVariantId='', carId='', otherDescription=''):
        if clinvarVariantId != '':
            return 'ClinVar'
        elif carId != '':
            return 'ClinGen AR'
        elif otherDescription != '':
            return 'Internal'
        else:
            return ''

    @calculated_property(schema={
        "title": "Variant Type",
        "type": "string"
    })
    def variation_type(self, variationType=''):
        if variationType != '':
            return variationType
        return ''

    @calculated_property(schema={
        "title": "Molecular Consequence",
        "type": "string"
    })
    def molecular_consequence(self, molecularConsequenceList=[]):
        if len(molecularConsequenceList) > 0:
            return molecularConsequenceList[0]['term']
        return ''


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
        'variantPathogenicity',
        'variantPathogenicity.submitted_by',
        'variantPathogenicity.variant',
        'variantPathogenicity.variant.submitted_by',
        'variantPathogenicity.assessments',
        'variantPathogenicity.assessments.submitted_by',
        'provisionalClassifications',
        'provisionalClassifications.submitted_by',
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
        # 'annotations.groups.statistic',
        # 'annotations.groups.statistic.variants',
        'annotations.groups.familyIncluded',
        'annotations.groups.familyIncluded.associatedGroups',
        'annotations.groups.familyIncluded.commonDiagnosis',
        'annotations.groups.familyIncluded.submitted_by',
        'annotations.groups.familyIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.otherPMIDs.submitted_by',
        'annotations.groups.familyIncluded.segregation.variants',
        'annotations.groups.familyIncluded.segregation.variants.submitted_by',
        'annotations.groups.familyIncluded.segregation.variants.associatedPathogenicities',
        'annotations.groups.familyIncluded.segregation.variants.associatedPathogenicities.associatedGdm',
        'annotations.groups.familyIncluded.segregation.variants.associatedPathogenicities.submitted_by',
        'annotations.groups.familyIncluded.segregation.assessments',
        'annotations.groups.familyIncluded.segregation.assessments.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded',
        'annotations.groups.familyIncluded.individualIncluded.associatedGroups',
        'annotations.groups.familyIncluded.individualIncluded.associatedFamilies',
        'annotations.groups.familyIncluded.individualIncluded.associatedFamilies.associatedGroups',
        'annotations.groups.familyIncluded.individualIncluded.diagnosis',
        'annotations.groups.familyIncluded.individualIncluded.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.variants',
        'annotations.groups.familyIncluded.individualIncluded.variants.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.variants.associatedPathogenicities',
        'annotations.groups.familyIncluded.individualIncluded.variants.associatedPathogenicities.associatedGdm',
        'annotations.groups.familyIncluded.individualIncluded.variants.associatedPathogenicities.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.scores',
        'annotations.groups.familyIncluded.individualIncluded.scores.submitted_by',
        'annotations.groups.individualIncluded',
        'annotations.groups.individualIncluded.associatedGroups',
        'annotations.groups.individualIncluded.diagnosis',
        'annotations.groups.individualIncluded.submitted_by',
        'annotations.groups.individualIncluded.variants',
        'annotations.groups.individualIncluded.variants.submitted_by',
        'annotations.groups.individualIncluded.variants.associatedPathogenicities',
        'annotations.groups.individualIncluded.variants.associatedPathogenicities.associatedGdm',
        'annotations.groups.individualIncluded.variants.associatedPathogenicities.submitted_by',
        'annotations.groups.individualIncluded.otherPMIDs',
        'annotations.groups.individualIncluded.otherPMIDs.submitted_by',
        'annotations.groups.individualIncluded.scores',
        'annotations.groups.individualIncluded.scores.submitted_by',
        # 'annotations.groups.control',
        'annotations.families',
        'annotations.families.associatedGroups',
        'annotations.families.commonDiagnosis',
        'annotations.families.submitted_by',
        'annotations.families.otherPMIDs',
        'annotations.families.otherPMIDs.submitted_by',
        'annotations.families.segregation.variants',
        'annotations.families.segregation.variants.submitted_by',
        'annotations.families.segregation.variants.associatedPathogenicities',
        'annotations.families.segregation.variants.associatedPathogenicities.associatedGdm',
        'annotations.families.segregation.variants.associatedPathogenicities.submitted_by',
        'annotations.families.segregation.assessments',
        'annotations.families.segregation.assessments.submitted_by',
        'annotations.families.individualIncluded',
        'annotations.families.individualIncluded.associatedGroups',
        'annotations.families.individualIncluded.associatedFamilies',
        'annotations.families.individualIncluded.associatedFamilies.associatedGroups',
        'annotations.families.individualIncluded.diagnosis',
        'annotations.families.individualIncluded.submitted_by',
        'annotations.families.individualIncluded.variants',
        'annotations.families.individualIncluded.variants.submitted_by',
        'annotations.families.individualIncluded.variants.associatedPathogenicities',
        'annotations.families.individualIncluded.variants.associatedPathogenicities.associatedGdm',
        'annotations.families.individualIncluded.variants.associatedPathogenicities.submitted_by',
        'annotations.families.individualIncluded.otherPMIDs',
        'annotations.families.individualIncluded.otherPMIDs.submitted_by',
        'annotations.families.individualIncluded.scores',
        'annotations.families.individualIncluded.scores.submitted_by',
        'annotations.individuals',
        'annotations.individuals.associatedGroups',
        'annotations.individuals.associatedFamilies',
        'annotations.individuals.associatedFamilies.associatedGroups',
        'annotations.individuals.diagnosis',
        'annotations.individuals.submitted_by',
        'annotations.individuals.variants',
        'annotations.individuals.variants.submitted_by',
        'annotations.individuals.variants.associatedPathogenicities',
        'annotations.individuals.variants.associatedPathogenicities.associatedGdm',
        'annotations.individuals.variants.associatedPathogenicities.submitted_by',
        'annotations.individuals.otherPMIDs',
        'annotations.individuals.otherPMIDs.submitted_by',
        'annotations.individuals.scores',
        'annotations.individuals.scores.submitted_by',
        'annotations.experimentalData',
        'annotations.experimentalData.submitted_by',
        'annotations.experimentalData.variants',
        'annotations.experimentalData.variants.associatedPathogenicities',
        'annotations.experimentalData.variants.associatedPathogenicities.associatedGdm',
        'annotations.experimentalData.variants.submitted_by',
        'annotations.experimentalData.assessments',
        'annotations.experimentalData.assessments.submitted_by',
        'annotations.experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes',
        'annotations.experimentalData.proteinInteractions.interactingGenes',
        'annotations.experimentalData.assessments',
        'annotations.experimentalData.assessments.submitted_by',
        'annotations.experimentalData.scores',
        'annotations.experimentalData.scores.submitted_by',
        'annotations.caseControlStudies',
        'annotations.caseControlStudies.submitted_by',
        'annotations.caseControlStudies.caseCohort',
        'annotations.caseControlStudies.controlCohort',
        'annotations.caseControlStudies.scores',
        'annotations.caseControlStudies.scores.submitted_by'
    ]

    @calculated_property(schema={
        "title": "GDM Status",
        "type": "string",
    })
    def gdm_status(self, finalClassification, draftClassification, provisionalClassifications, annotations):
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

    @calculated_property(schema={
        "title": "Number of Articles",
        "type": "string",
    })
    def number_article(self, annotations):
        if len(annotations) > 0:
            return str(len(annotations))
        return ""

    @calculated_property(schema={
        "title": "Number of Pathogenicity",
        "type": "string",
    })
    def number_pathogenicity(self, variantPathogenicity):
        if len(variantPathogenicity) > 0:
            return str(len(variantPathogenicity))
        return ""

    @calculated_property(schema={
        "title": "Number of Provisional",
        "type": "string",
    })
    def number_provisional(self, provisionalClassifications):
        if len(provisionalClassifications) > 0:
            return str(len(provisionalClassifications))
        return ""

    @calculated_property(schema={
        "title": "GDM",
        "type": "string",
    })
    def gdm_title(self, gene, disease, modeCode):
        gene_symbol = gene.replace('/genes/', '').replace('/', '')
        orpha_id = disease.replace('/diseases/', '').replace('/', '')
        return gene_symbol + '-' + orpha_id + '-' + modeCode


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
        'groups.familyIncluded.segregation.assessments',
        'groups.familyIncluded.segregation.assessments.submitted_by',
        'groups.familyIncluded.individualIncluded',
        'groups.familyIncluded.individualIncluded.diagnosis',
        'groups.familyIncluded.individualIncluded.submitted_by',
        'groups.familyIncluded.individualIncluded.variants',
        'groups.familyIncluded.individualIncluded.variants.submitted_by',
        'groups.familyIncluded.individualIncluded.otherPMIDs',
        'groups.familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'groups.familyIncluded.individualIncluded.scores',
        'groups.familyIncluded.individualIncluded.scores.submitted_by',
        'groups.individualIncluded',
        'groups.individualIncluded.diagnosis',
        'groups.individualIncluded.submitted_by',
        'groups.individualIncluded.variants',
        'groups.individualIncluded.variants.submitted_by',
        'groups.individualIncluded.otherPMIDs',
        'groups.individualIncluded.otherPMIDs.submitted_by',
        'groups.individualIncluded.scores',
        'groups.individualIncluded.scores.submitted_by',
        'families',
        'families.associatedGroups',
        'families.commonDiagnosis',
        'families.submitted_by',
        'families.otherPMIDs',
        'families.otherPMIDs.submitted_by',
        'families.segregation.variants',
        'families.segregation.variants.submitted_by',
        'families.segregation.assessments',
        'families.segregation.assessments.submitted_by',
        'families.individualIncluded',
        'families.individualIncluded.diagnosis',
        'families.individualIncluded.submitted_by',
        'families.individualIncluded.variants',
        'families.individualIncluded.variants.submitted_by',
        'families.individualIncluded.otherPMIDs',
        'families.individualIncluded.otherPMIDs.submitted_by',
        'families.individualIncluded.scores',
        'families.individualIncluded.scores.submitted_by',
        'individuals',
        'individuals.associatedGroups',
        'individuals.associatedFamilies',
        'individuals.diagnosis',
        'individuals.submitted_by',
        'individuals.variants',
        'individuals.variants.submitted_by',
        'individuals.otherPMIDs',
        'individuals.otherPMIDs.submitted_by',
        'individuals.scores',
        'individuals.scores.submitted_by',
        'experimentalData',
        'experimentalData.submitted_by',
        'experimentalData.variants',
        'experimentalData.variants.submitted_by',
        'experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes',
        'experimentalData.proteinInteractions.interactingGenes',
        'associatedGdm',
        'experimentalData.assessments',
        'experimentalData.assessments.submitted_by',
        'experimentalData.scores',
        'experimentalData.scores.submitted_by',
        'caseControlStudies',
        'caseControlStudies.submitted_by',
        'caseControlStudies.caseCohort',
        'caseControlStudies.controlCohort',
        'caseControlStudies.scores',
        'caseControlStudies.scores.submitted_by'
    ]
    rev = {
        'associatedGdm': ('gdm', 'annotations')
    }

    @calculated_property(schema={
        "title": "Associated gdm",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "gdm.annotations",
        },
    })
    def associatedGdm(self, request, associatedGdm):
        return paths_filtered_by_status(request, associatedGdm)

    @calculated_property(schema={
        "title": "Number of Group",
        "type": "string",
    })
    def number_group(self, groups):
        if len(groups) > 0:
            return len(groups)
        return ""

    @calculated_property(schema={
        "title": "Number of Family",
        "type": "string",
    })
    def number_family(self, families):
        if len(families) > 0:
            return len(families)
        return ""

    @calculated_property(schema={
        "title": "Number of Provisioinal Individual",
        "type": "string",
    })
    def number_individual(self, individuals):
        if len(individuals) > 0:
            return len(individuals)
        return ""

    @calculated_property(schema={
        "title": "Number of Experimental",
        "type": "string",
    })
    def number_experimental(selft, experimentalData):
        if len(experimentalData) > 0:
            return len(experimentalData)
        return ""


@collection(
    name='casecontrol',
    unique_key='casecontrol:uuid',
    properties={
        'title': 'Case Control',
        'description': 'List of case-control objects in all GDM(s)',
    })
class CaseControl(Item):
    item_type = 'casecontrol'
    schema = load_schema('clincoded:schemas/caseControl.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'caseCohort',
        'caseCohort.commonDiagnosis',
        'caseCohort.submitted_by',
        'controlCohort',
        'controlCohort.submitted_by',
        'scores',
        'scores.submitted_by',
        'associatedAnnotations',
        'associatedAnnotations.article',
        'associatedAnnotations.groups',
        'associatedAnnotations.associatedGdm',
        'associatedAnnotations.associatedGdm.disease',
        'associatedAnnotations.associatedGdm.gene'
    ]
    rev = {
        'associatedAnnotations': ('annotation', 'caseControlStudies')
    }

    @calculated_property(schema={
        "title": "Associated annotation",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "annotation.caseControlStudies"
        }
    })
    def associatedAnnotations(self, request, associatedAnnotations):
        return paths_filtered_by_status(request, associatedAnnotations)


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
        'familyIncluded.segregation.assessments',
        'familyIncluded.segregation.assessments.submitted_by',
        'familyIncluded.individualIncluded',
        'familyIncluded.individualIncluded.diagnosis',
        'familyIncluded.individualIncluded.submitted_by',
        'familyIncluded.individualIncluded.variants',
        'familyIncluded.individualIncluded.variants.submitted_by',
        'familyIncluded.individualIncluded.otherPMIDs',
        'familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'familyIncluded.individualIncluded.scores',
        'familyIncluded.individualIncluded.scores.submitted_by',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.submitted_by',
        'individualIncluded.otherPMIDs',
        'individualIncluded.otherPMIDs.submitted_by',
        'individualIncluded.scores',
        'individualIncluded.scores.submitted_by',
        'individualIncluded.variants',
        'individualIncluded.variants.submitted_by',
        'associatedAnnotations',
        'associatedAnnotations.article',
        'associatedAnnotations.associatedGdm',
        'associatedAnnotations.associatedGdm.disease',
        'associatedAnnotations.associatedGdm.gene'
        #'control'
    ]
    rev = {
        'associatedAnnotations': ('annotation', 'groups')
    }

    @calculated_property(schema={
        "title": "Associated annotations",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "annotation.groups",
        },
    })
    def associatedAnnotations(self, request, associatedAnnotations):
        return paths_filtered_by_status(request, associatedAnnotations)


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
        'segregation.assessments',
        'segregation.assessments.submitted_by',
        'otherPMIDs',
        'otherPMIDs.submitted_by',
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.associatedFamilies',
        'individualIncluded.associatedGroups',
        'individualIncluded.otherPMIDs',
        'individualIncluded.submitted_by',
        'individualIncluded.variants',
        'individualIncluded.variants.submitted_by',
        'individualIncluded.scores',
        'individualIncluded.scores.submitted_by',
        'associatedGroups',
        'associatedGroups.commonDiagnosis',
        'associatedGroups.associatedAnnotations',
        'associatedGroups.associatedAnnotations.article',
        'associatedGroups.associatedAnnotations.associatedGdm',
        'associatedGroups.associatedAnnotations.associatedGdm.disease',
        'associatedGroups.associatedAnnotations.associatedGdm.gene',
        'associatedAnnotations',
        'associatedAnnotations.article',
        'associatedAnnotations.associatedGdm',
        'associatedAnnotations.associatedGdm.disease',
        'associatedAnnotations.associatedGdm.gene'
    ]
    rev = {
        'associatedGroups': ('group', 'familyIncluded'),
        'associatedAnnotations': ('annotation', 'families'),
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

    @calculated_property(schema={
        "title": "Associated annotations",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "annotation.families",
        },
    })
    def associatedAnnotations(self, request, associatedAnnotations):
        return paths_filtered_by_status(request, associatedAnnotations)


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
        'assessments',
        'assessments.submitted_by',
        'scores',
        'scores.submitted_by',
        'associatedGroups',
        'associatedGroups.commonDiagnosis',
        'associatedGroups.associatedAnnotations',
        'associatedGroups.associatedAnnotations.article',
        'associatedGroups.associatedAnnotations.associatedGdm',
        'associatedGroups.associatedAnnotations.associatedGdm.disease',
        'associatedGroups.associatedAnnotations.associatedGdm.gene',
        'associatedFamilies',
        'associatedFamilies.associatedGroups',
        'associatedFamilies.associatedGroups.associatedAnnotations',
        'associatedFamilies.associatedGroups.associatedAnnotations.article',
        'associatedFamilies.associatedGroups.associatedAnnotations.associatedGdm',
        'associatedFamilies.associatedGroups.associatedAnnotations.associatedGdm.disease',
        'associatedFamilies.associatedGroups.associatedAnnotations.associatedGdm.gene',
        'associatedFamilies.associatedAnnotations',
        'associatedFamilies.associatedAnnotations.article',
        'associatedFamilies.associatedAnnotations.associatedGdm',
        'associatedFamilies.associatedAnnotations.associatedGdm.disease',
        'associatedFamilies.associatedAnnotations.associatedGdm.gene',
        'associatedFamilies.commonDiagnosis',
        'associatedAnnotations',
        'associatedAnnotations.article',
        'associatedAnnotations.associatedGdm',
        'associatedAnnotations.associatedGdm.disease',
        'associatedAnnotations.associatedGdm.gene'
    ]
    rev = {
        'associatedGroups': ('group', 'individualIncluded'),
        'associatedFamilies': ('family', 'individualIncluded'),
        'associatedAnnotations': ('annotation', 'individuals')
    }

    @calculated_property(schema={
        "title": "Associated groups",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "group.individualIncluded",
        },
    })
    def associatedGroups(self, request, associatedGroups):
        return paths_filtered_by_status(request, associatedGroups)

    @calculated_property(schema={
        "title": "Associated families",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "family.individualIncluded",
        },
    })
    def associatedFamilies(self, request, associatedFamilies):
        return paths_filtered_by_status(request, associatedFamilies)

    @calculated_property(schema={
        "title": "Associated annotations",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "annotation.individuals",
        },
    })
    def associatedAnnotations(self, request, associatedAnnotations):
        return paths_filtered_by_status(request, associatedAnnotations)

    @calculated_property(schema={
        "title": "Proband String",
        "type": "string"
    })
    def is_proband(self, proband):
        if proband:
            return 'Yes'
        else:
            return 'No'

    @calculated_property(schema={
        "title": "# Assessment",
        "type": "number"
    })
    def assessment_count(self, assessments=[]):
        return len(assessments)


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
        'biochemicalFunction.geneWithSameFunctionSameDisease.genes',
        'proteinInteractions.interactingGenes',
        'associatedAnnotations',
        'associatedAnnotations.article',
        'associatedAnnotations.associatedGdm',
        'associatedAnnotations.associatedGdm.disease',
        'associatedAnnotations.associatedGdm.gene',
        'assessments',
        'assessments.submitted_by',
        'scores',
        'scores.submitted_by'
    ]
    rev = {
        'associatedAnnotations': ('annotation', 'experimentalData')
    }

    @calculated_property(schema={
        "title": "Associated annotations",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "annotation.experimentalData",
        },
    })
    def associatedAnnotations(self, request, associatedAnnotations):
        return paths_filtered_by_status(request, associatedAnnotations)


@collection(
    name='pathogenicity',
    unique_key='pathogenicity:uuid',
    properties={
        'title': 'Pathogenicity',
        'description': 'List of variant pathogenicity',
    })
class Pathogenicity(Item):
    item_type = 'pathogenicity'
    schema = load_schema('clincoded:schemas/pathogenicity.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'variant',
        'variant.submitted_by',
        'variant.associatedPathogenicities',
        'variant.associatedPathogenicities.assessments',
        'variant.associatedPathogenicities.assessments.submitted_by',
        'variant.associatedPathogenicities.submitted_by',
        'variant.associatedPathogenicities.variant',
        'assessments',
        'assessments.submitted_by',
        'associatedGdm',
    ]
    rev = {
        'associatedGdm': ('gdm', 'variantPathogenicity'),
    }

    @calculated_property(schema={
        "title": "Associated GDM",
        "type": "array",
        "items": {
            "type": ['string', 'object'],
            "linkFrom": "gdm.variantPathogenicity"
        }
    })
    def associatedGdm(self, request, associatedGdm):
        return paths_filtered_by_status(request, associatedGdm)

    @calculated_property(schema={
        "title": "Number of Assessment",
        "type": "integer"
    })
    def numberOfAssessment(self, assessments):
        if len(assessments) > 0:
            return len(assessments)
        return ''


@collection(
    name='assessments',
    unique_key='assessment:uuid',
    properties={
        'title': 'Assessments',
        'description': 'List of assessments',
    })
class Assessment(Item):
    item_type = 'assessment'
    schema = load_schema('clincoded:schemas/assessment.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'pathogenicity_assessed',
        'experimental_assessed',
    ]
    rev = {
        'pathogenicity_assessed': ('pathogenicity', 'assessments'),
        'experimental_assessed': ('experimental', 'assessments')
    }

    @calculated_property(schema={
        "title": "Pathogenicity Assessed",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "pathogenicity.assessments"
        }
    })
    def pathogenicity_assessed(self, request, pathogenicity_assessed):
        return paths_filtered_by_status(request, pathogenicity_assessed)

    @calculated_property(schema={
        "title": "Experimental Assessed",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "experimental.assessments"
        }
    })
    def experimental_assessed(self, request, experimental_assessed):
        return paths_filtered_by_status(request, experimental_assessed)


@collection(
    name='evidencescore',
    unique_key='evidencescore:uuid',
    properties={
        'title': 'Evidence Score',
        'description': 'List of score assigned to evidence',
    })
class EvidenceScore(Item):
    item_type = 'evidencescore'
    schema = load_schema('clincoded:schemas/evidenceScore.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'caseControl_scored',
        'caseControl_scored.associatedAnnotations',
        'caseControl_scored.associatedAnnotations.associatedGdm',
        'individual_scored',
        'individual_scored.associatedAnnotations',
        'individual_scored.associatedAnnotations.associatedGdm',
        'individual_scored.associatedFamilies',
        'individual_scored.associatedFamilies.associatedAnnotations',
        'individual_scored.associatedFamilies.associatedAnnotations.associatedGdm',
        'experimental_scored',
        'experimental_scored.associatedAnnotations',
        'experimental_scored.associatedAnnotations.associatedGdm'
    ]
    rev = {
        'caseControl_scored': ('casecontrol', 'scores'),
        'individual_scored': ('individual', 'scores'),
        'experimental_scored': ('experimental', 'scores')
    }

    @calculated_property(schema={
        "title": "Case Control Scored",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "casecontrol.scores"
        }
    })
    def caseControl_scored(self, request, caseControl_scored):
        return paths_filtered_by_status(request, caseControl_scored)

    @calculated_property(schema={
        "title": "Individual Scored",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "individual.scores"
        }
    })
    def individual_scored(self, request, individual_scored):
        return paths_filtered_by_status(request, individual_scored)

    @calculated_property(schema={
        "title": "Experimental Scored",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "experimental.scores"
        }
    })
    def experimental_scored(self, request, experimental_scored):
        return paths_filtered_by_status(request, experimental_scored)


@collection(
    name='provisional',
    unique_key='provisionalclassification:uuid',
    properties={
        'title': 'Provisional Classifications',
        'description': 'List of provisional classifications',
    })
class ProvisionalClassification(Item):
    item_type = 'provisionalclassification'
    schema = load_schema('clincoded:schemas/provisionalClassification.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'gdm_associated'
    ]
    rev = {
        'gdm_associated': ('gdm', 'provisionalClassifications'),
    }

    @calculated_property(schema={
        "title": "GDM Associated",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "gdm.provisionalClassifications"
        }
    })
    def gdm_associated(self, request, gdm_associated):
        return paths_filtered_by_status(request, gdm_associated)
### end of new collections for gene curation data


### Collections/Classes for variant curation ###
@collection(
    name='transcripts',
    unique_key='transcript:uuid',
    properties={
        'title': 'Transcript',
        'description': 'List of Transcripts',
    })
class Transcript(Item):
    item_type = 'transcript'
    schema = load_schema('clincoded:schemas/transcript.json')
    name_key = 'uuid'
    embedded = [
        'interpretation_associated',
        'interpretation_associated.variant',
    ]
    rev = {
        'interpretation_associated': ('interpretation', 'transcripts')
    }

    @calculated_property(schema={
        "title": "Interpretation Associated",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "interpretation.transcripts"
        }
    })
    def interpretation_associated(self, request, interpretation_associated):
        return paths_filtered_by_status(request, interpretation_associated)


@collection(
    name='proteins',
    unique_key='protein:uuid',
    properties={
        'title': 'Protein',
        'description': 'List of Proteins'
    })
class Protein(Item):
    item_type = 'protein'
    schema = load_schema('clincoded:schemas/protein.json')
    name_key = 'uuid'
    embedded = [
        'interpretation_associated',
        'interpretation_associated.variant',
    ]
    rev = {
        'interpretation_associated': ('interpretation', 'proteins')
    }

    @calculated_property(schema={
        "title": "Interpretation Associated",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "interpretation.proteins"
        }
    })
    def interpretation_associated(self, request, interpretation_associated):
        return paths_filtered_by_status(request, interpretation_associated)


@collection(
    name='interpretations',
    unique_key='interpretation:uuid',
    properties={
        'title': 'Interpretations',
        'description': 'List of Interpretations',
    })
class Interpretation(Item):
    item_type = 'interpretation'
    schema = load_schema('clincoded:schemas/interpretation.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'variant',
        'variant.associatedInterpretations',
        'variant.associatedInterpretations.submitted_by',
        'genes',
        'disease',
        'transcripts',
        'proteins',
        'evaluations',
        'evaluations.submitted_by',
        'evaluations.disease',
        'evaluations.population',
        'evaluations.population.submitted_by',
        'evaluations.computational',
        'evaluations.computational.submitted_by',
        'provisional_variant',
        'provisional_variant.submitted_by',
        'extra_evidence_list',
        'extra_evidence_list.submitted_by',
        'extra_evidence_list.articles',
        'extra_evidence_list.articles.submitted_by'
    ]

    @calculated_property(schema={
        "title": "Interpretation Status",
        "type": "string",
    })
    def interpretation_status(self, evaluations=[], provisional_variant=[]):
        if len(provisional_variant) > 0:
            return 'Provisional'
        return 'In Progress'

    @calculated_property(schema={
        "title": "Disease",
        "type": "string",
    })
    def interpretation_disease(self, disease=''):
        if disease != '':
            return 'ORPHA' + disease[10:-1]
        return ''

    @calculated_property(schema={
        "title": "Genes",
        "type": "string",
    })
    def interpretation_genes(self, genes=[]):
        if len(genes) > 1:
            symbol_list = []
            for gene in genes:
                symbol_list.append(gene[7:-1])
            return ", ".join(symbol_list)
        elif len(genes) == 1:
            return genes[0][7:-1]
        return ''

    @calculated_property(schema={
        "title": "Evaluations",
        "type": "number",
    })
    def evaluation_count(self, evaluations=[]):
        return len(evaluations)

    @calculated_property(schema={
        "title": "Provisionals",
        "type": "number",
    })
    def provisional_count(self, provisional_variant=[]):
        return len(provisional_variant)


@collection(
    name='extra-evidence',
    unique_key='extra_evidence:uuid',
    properties={
        'title': "Extra evidence for VCI",
        'description': 'Extra evidence for VCI',
    })
class Extra_evidence(Item):
    item_type = 'extra_evidence'
    schema = load_schema('clincoded:schemas/extra_evidence.json')
    name_key = 'uuid'
    embedded = [
        'variant',
        'articles',
        'submitted_by',
    ]


@collection(
    name='evaluations',
    unique_key='evaluation:uuid',
    properties={
        'title': 'Evaluations',
        'description': 'Listing of Evaluations',
    })
class Evaluation(Item):
    item_type = 'evaluation'
    schema = load_schema('clincoded:schemas/evaluation.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'variant',
        'variant.associatedInterpretations',
        'variant.associatedInterpretations.submitted_by',
        'disease',
        'population',
        'computational',
        'interpretation_associated'
    ]
    rev = {
        'interpretation_associated': ('interpretation', 'evaluations')
    }

    @calculated_property(schema={
        "title": "Interpretation Associated",
        "type": "array",
        "items": {
            "title": ["string", "object"],
            "linkFrom": "interpretation.evaluations"
        }
    })
    def interpretation_associated(self, request, interpretation_associated):
        return paths_filtered_by_status(request, interpretation_associated)

    @calculated_property(schema={
        "title": "Modified Value",
        "type": "string"
    })
    def modifier(self, criteriaModifier=''):
        if criteriaModifier == '':
            return ''
        else:
            return criteriaModifier

    @calculated_property(schema={
        "title": "Evidence Type",
        "type": "string"
    })
    def evidence_type(self, population='', computational='', functional='', segregation='', geneSpecific=''):
        if population != '':
            return 'Population'
        elif computational != '':
            return 'Computational'
        elif functional != '':
            return 'Functional'
        elif segregation != '':
            return 'Segregation'
        elif geneSpecific != '':
            return 'Gene-Specific'


@collection(
    name='populations',
    unique_key='population:uuid',
    properties={
        'title': 'Populations',
        'description': 'Listing of Populations',
    })
class Population(Item):
    item_type = 'population'
    schema = load_schema('clincoded:schemas/population.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'variant',
        'variant.associatedInterpretations',
        'variant.associatedInterpretations.submitted_by',
        'evaluation_associated',
        'evaluation_associated.interpretation_associated',
        'evaluation_associated.interpretation_associated.disease'
    ]
    rev = {
        'evaluation_associated': ('evaluation', 'population')
    }

    @calculated_property(schema={
        "title": "Evaluation Associated",
        "type": "array",
        "items": {
            "title": ["string", "object"],
            "linkFrom": "evaluation.population"
        }
    })
    def evaluation_associated(self, request, evaluation_associated):
        return paths_filtered_by_status(request, evaluation_associated)

    @calculated_property(schema={
        "title": "# Populations",
        "type": "number"
    })
    def maf_count(self, populationData={}):
        return len(populationData)


@collection(
    name='computational',
    unique_key='computational:uuid',
    properties={
        'title': 'Computational',
        'description': 'List of Computational Evidence',
    })
class Computational(Item):
    item_type = 'computational'
    schema = load_schema('clincoded:schemas/computational.json')
    name_key = 'uuid'
    embedded = [
        'variant',
        'disease',
        'variant.associatedInterpretations',
        'variant.associatedInterpretations.submitted_by',
        'evaluation_associated',
        'evaluation_associated.interpretation_associated',
        'evaluation_associated.interpretation_associated.disease'
    ]
    rev = {
        'evaluation_associated': ('evaluation', 'computational')
    }

    @calculated_property(schema={
        "title": "Evaluation Associated",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "evaluation.computational"
        }
    })
    def evaluation_associated(self, request, evaluation_associated):
        return paths_filtered_by_status(request, evaluation_associated)

    @calculated_property(schema={
        "title": "Disease",
        "type": "string"
    })
    def disease_present(self, request, disease=''):
        if disease != '':
            diseaseObj = request.embed(disease, '@@object')
            return diseaseObj['term']
        return ''


@collection(
    name='provisional-variant',
    unique_key='provisional_variant:uuid',
    properties={
        'title': 'Provisional Classification for Variant Curation',
        'description': 'Listing of Provisional Classifications',
    })
class Provisional_variant(Item):
    item_type = 'provisional_variant'
    schema = load_schema('clincoded:schemas/provisional_variant.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'interpretation_associated',
        'interpretation_associated.variant',
        'interpretation_associated.variant.associatedInterpretations',
        'interpretation_associated.variant.associatedInterpretations.submitted_by',
        'interpretation_associated.variant.associatedInterpretations.disease'
    ]
    rev = {
        'interpretation_associated': ('interpretation', 'provisional_variant')
    }

    @calculated_property(schema={
        "title": "Interpretation Associated",
        "type": "array",
        "items": {
            "type": ["string", "object"],
            "linkFrom": "interpretation.provisional_variant"
        }
    })
    def interpretation_associated(self, request, interpretation_associated):
        return paths_filtered_by_status(request, interpretation_associated)

    @calculated_property(schema={
        "title": "Altered Classification",
        "type": "string"
    })
    def alteredClassification_present(self, alteredClassification=''):
        return alteredClassification

    @calculated_property(schema={
        "title": "Reasons",
        "type": "string"
    })
    def reason_present(self, reason=''):
        return reason
### End of Collections/Classes for variant curation ###


@collection(
    name='labs',
    unique_key='lab:name',
    properties={
        'title': 'Groups',
        'description': 'Listing of ClinGen Curation Groups',
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
        'description': 'Listing of sources and vendors for ClinGen Curation',
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

@collection(
    name='histories',
    properties={
        'title': "Curation operation history",
        'description': 'History of curator operations',
    })
class History(Item):
    item_type = 'history'
    schema = load_schema('clincoded:schemas/curatorHistory.json')
    embedded = [
        'primary',
        'meta.gdm.gene',
        'meta.gdm.disease',
        'meta.article.gdm',
        'meta.article.gdm.gene',
        'meta.article.gdm.disease',
        'meta.caseControl.gdm',
        'meta.caseControl.gdm.gene',
        'meta.caseControl.gdm.disease',
        'meta.caseControl.article',
        'meta.group.gdm',
        'meta.group.gdm.gene',
        'meta.group.gdm.disease',
        'meta.group.article',
        'meta.family.gdm',
        'meta.family.gdm.gene',
        'meta.family.gdm.disease',
        'meta.family.group',
        'meta.family.article',
        'meta.individual.gdm',
        'meta.individual.gdm.gene',
        'meta.individual.gdm.disease',
        'meta.individual.group',
        'meta.individual.family',
        'meta.individual.article',
        'meta.experimental.gdm',
        'meta.experimental.gdm.gene',
        'meta.experimental.gdm.disease',
        'meta.experimental.article',
        'meta.provisionalClassification.gdm',
        'meta.provisionalClassification.gdm.gene',
        'meta.provisionalClassification.gdm.disease',
        'meta.pathogenicity.variant',
        'meta.pathogenicity.gdm',
        'meta.assessment.gdm',
        'meta.assessment.experimental',
        'meta.assessment.family',
        'meta.assessment.pathogenicity',
        'meta.assessment.variant',
        'meta.interpretation.variant',
        'meta.interpretation.disease',
        'submitted_by',
    ]
