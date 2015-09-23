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
import json


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
        'submitted_by',
        'associatedPathogenicities',
        'associatedPathogenicities.assessments',
        'associatedPathogenicities.assessments.submitted_by',
        'associatedPathogenicities.variant',
        'associatedPathogenicities.submitted_by'
    ]
    rev = {
        'associatedPathogenicities': ('pathogenicity', 'variant')
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
        #'annotations.groups.statistic',
        #'annotations.groups.statistic.variants',
        'annotations.groups.familyIncluded',
        'annotations.groups.familyIncluded.associatedGroups',
        'annotations.groups.familyIncluded.commonDiagnosis',
        'annotations.groups.familyIncluded.submitted_by',
        'annotations.groups.familyIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.otherPMIDs.submitted_by',
        'annotations.groups.familyIncluded.segregation.variants',
        'annotations.groups.familyIncluded.segregation.variants.submitted_by',
        'annotations.groups.familyIncluded.segregation.variants.associatedPathogenicities',
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
        'annotations.groups.familyIncluded.individualIncluded.variants.associatedPathogenicities.submitted_by',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs',
        'annotations.groups.familyIncluded.individualIncluded.otherPMIDs.submitted_by',
        'annotations.groups.individualIncluded',
        'annotations.groups.individualIncluded.associatedGroups',
        'annotations.groups.individualIncluded.diagnosis',
        'annotations.groups.individualIncluded.submitted_by',
        'annotations.groups.individualIncluded.variants',
        'annotations.groups.individualIncluded.variants.submitted_by',
        'annotations.groups.individualIncluded.variants.associatedPathogenicities',
        'annotations.groups.individualIncluded.variants.associatedPathogenicities.submitted_by',
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
        'annotations.families.segregation.variants.associatedPathogenicities',
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
        'annotations.families.individualIncluded.variants.associatedPathogenicities.submitted_by',
        'annotations.families.individualIncluded.otherPMIDs',
        'annotations.families.individualIncluded.otherPMIDs.submitted_by',
        'annotations.individuals',
        'annotations.individuals.associatedGroups',
        'annotations.individuals.associatedFamilies',
        'annotations.individuals.associatedFamilies.associatedGroups',
        'annotations.individuals.diagnosis',
        'annotations.individuals.submitted_by',
        'annotations.individuals.variants',
        'annotations.individuals.variants.submitted_by',
        'annotations.individuals.variants.associatedPathogenicities',
        'annotations.individuals.variants.associatedPathogenicities.submitted_by',
        'annotations.individuals.otherPMIDs',
        'annotations.individuals.otherPMIDs.submitted_by',
        'annotations.experimentalData',
        'annotations.experimentalData.submitted_by',
        'annotations.experimentalData.variants',
        'annotations.experimentalData.variants.submitted_by',
        'annotations.experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes',
        'annotations.experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.assessments',
        'annotations.experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.assessments.submitted_by',
        'annotations.experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments',
        'annotations.experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments.submitted_by',
        'annotations.experimentalData.proteinIneractions.assessments',
        'annotations.experimentalData.proteinIneractions.assessments.submitted_by',
        'annotations.experimentalData.expression.normalExpression.assessments',
        'annotations.experimentalData.expression.normalExpression.assessments.submitted_by',
        'annotations.experimentalData.expression.alteredExpression.assessments',
        'annotations.experimentalData.expression.alteredExpression.assessments.submitted_by',
        'annotations.experimentalData.functionalAleration.assessments',
        'annotations.experimentalData.functionalAleration.assessments.submitted_by',
        'annotations.experimentalData.modelSystems.assessments',
        'annotations.experimentalData.modelSystems.assessments.submitted_by',
        'annotations.experimentalData.rescue.assessments',
        'annotations.experimentalData.rescue.assessments.submitted_by'
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

    @calculated_property(schema={
        "title": "Number of Articles",
        "type": "string",
    })
    def number_article(seft, annotations):
        if len(annotations) > 0:
            return str(len(annotations))
        return ""

    @calculated_property(schema={
        "title": "Number of Pathogenicity",
        "type": "string",
    })
    def number_pathogenicity(seft, variantPathogenicity):
        if len(variantPathogenicity) > 0:
            return str(len(variantPathogenicity))
        return ""

    @calculated_property(schema={
        "title": "Number of Provisional",
        "type": "string",
    })
    def number_provisional(seft, provisionalClassifications):
        if len(provisionalClassifications) > 0:
            return str(len(provisionalClassifications))
        return ""

    @calculated_property(schema={
        "title": "GDM",
        "type": "string",
    })
    def gdm_title(seft, gene, disease, modeCode):
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
        'families.segregation.assessments',
        'families.segregation.assessments.submitted_by',
        'families.individualIncluded',
        'families.individualIncluded.diagnosis',
        'families.individualIncluded.submitted_by',
        'families.individualIncluded.variants',
        'families.individualIncluded.variants.submitted_by',
        'families.individualIncluded.otherPMIDs',
        'families.individualIncluded.otherPMIDs.submitted_by',
        'individuals',
        'individuals.associatedGroups',
        'individuals.associatedFamilies',
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
        'experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.genes',
        'experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.assessments',
        'experimentalData.biochemicalFunction.geneWithSameFunctionSameDisease.assessments.submitted_by',
        'experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments',
        'experimentalData.biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments.submitted_by',
        'experimentalData.proteinIneractions.assessments',
        'experimentalData.proteinIneractions.assessments.submitted_by',
        'experimentalData.expression.normalExpression.assessments',
        'experimentalData.expression.normalExpression.assessments.submitted_by',
        'experimentalData.expression.alteredExpression.assessments',
        'experimentalData.expression.alteredExpression.assessments.submitted_by',
        'experimentalData.functionalAleration.assessments',
        'experimentalData.functionalAleration.assessments.submitted_by',
        'experimentalData.modelSystems.assessments',
        'experimentalData.modelSystems.assessments.submitted_by',
        'experimentalData.rescue.assessments',
        'experimentalData.rescue.assessments.submitted_by'
    ]

    @calculated_property(schema={
        "title": "Number of Group",
        "type": "string",
    })
    def number_group(selft, groups):
        if len(groups) > 0:
            return len(groups)
        return ""

    @calculated_property(schema={
        "title": "Number of Family",
        "type": "string",
    })
    def number_family(selft, families):
        if len(families) > 0:
            return len(families)
        return ""

    @calculated_property(schema={
        "title": "Number of Provisioinal Individual",
        "type": "string",
    })
    def number_individual(selft, individuals):
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
        'individualIncluded',
        'individualIncluded.diagnosis',
        'individualIncluded.submitted_by',
        'individualIncluded.otherPMIDs',
        'individualIncluded.otherPMIDs.submitted_by',
        'individualIncluded.variants',
        'individualIncluded.variants.submitted_by',
        'associatedAnnotations',
        'associatedAnnotations.article'
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
        'associatedGroups',
        'associatedGroups.commonDiagnosis',
        'associatedGroups.associatedAnnotations',
        'associatedGroups.associatedAnnotations.article',
        'associatedAnnotations',
        'associatedAnnotations.article',
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
        'associatedGroups',
        'associatedGroups.commonDiagnosis',
        'associatedGroups.associatedAnnotations',
        'associatedGroups.associatedAnnotations.article',
        'associatedFamilies',
        'associatedFamilies.associatedGroups',
        'associatedFamilies.associatedGroups.associatedAnnotations',
        'associatedFamilies.associatedGroups.associatedAnnotations.article',
        'associatedFamilies.associatedAnnotations',
        'associatedFamilies.associatedAnnotations.article',
        'associatedFamilies.commonDiagnosis',
        'associatedAnnotations',
        'associatedAnnotations.article'
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
        'biochemicalFunction.geneWithSameFunctionSameDisease.assessments',
        'biochemicalFunction.geneWithSameFunctionSameDisease.assessments.submitted_by',
        'biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments',
        'biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments.submitted_by',
        'proteinIneractions.assessments',
        'proteinIneractions.assessments.submitted_by',
        'expression.normalExpression.assessments',
        'expression.normalExpression.assessments.submitted_by',
        'expression.alteredExpression.assessments',
        'expression.alteredExpression.assessments.submitted_by',
        'functionalAleration.assessments',
        'functionalAleration.assessments.submitted_by',
        'modelSystems.assessments',
        'modelSystems.assessments.submitted_by',
        'rescue.assessments',
        'rescue.assessments.submitted_by'
    ]


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
        "type": "object",
        "linkFrom": "gdm.variantPathogenicity"
    })
    def associatedGdm(self, request, associatedGdm):
        return paths_filtered_by_status(request, associatedGdm)

    @calculated_property(schema={
        "title": "Number of Assessment",
        "type": "integer"
    })
    def numberOfAssessment(self, assessments):
        return len(assessments)


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
    ]
    rev = {
        'pathogenicity_assessed': ('pathogenicity', 'assessments'),
    }

    @calculated_property(schema={
        "title": "Pathogenicity Assessed",
        "type": ["string", "object"],
        "linkFrom": "pathogenicity.assessments"
    })
    def pathogenicity_assessed(self, request, pathogenicity_assessed):
        return paths_filtered_by_status(request, pathogenicity_assessed)


@collection(
    name='provisional',
    unique_key='provisionalClassification:uuid',
    properties={
        'title': 'Provisional Classifications',
        'description': 'List of provisional classifications',
    })
class Provisional(Item):
    item_type = 'provisionalClassification'
    schema = load_schema('clincoded:schemas/provisionalClassification.json')
    name_key = 'uuid'
    embedded = [
        'submitted_by',
        'gdm_associated',
    ]
    rev = {
        'gdm_associated': ('gdm', 'provisionalClassifications'),
    }

    @calculated_property(schema={
        "title": "GDM Associated",
        "type": ["string", "object"],
        "linkFrom": "gdm.provisionalClassifications"
    })
    def gdm_associated(self, request, gdm_associated):
        return paths_filtered_by_status(request, gdm_associated)
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
