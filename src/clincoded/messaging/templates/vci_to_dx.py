
message_template = {
    'interpretation': ['$PATH_TO_DATA', 'resourceParent', 'interpretation'],
    'statusPublishFlag': ['$CONVERT_DATA', ['resource', 'publishClassification'],
        {
            False: 'Publish',
            True: 'Unpublish'
        }
    ]
}

data_to_remove = [
    ['actions'],
    ['audit'],
    ['interpretation_disease'],
    ['interpretation_genes'],
    ['interpretation_status'],
    ['modified_by'],
    ['schema_version'],
    ['disease', 'associatedGdm'],
    ['disease', 'associatedGroups'],
    ['disease', 'associatedFamilies'],
    ['disease', 'associatedIndividuals'],
    ['disease', 'associatedInterpretations'],
    ['disease', 'modified_by'],
    ['disease', 'schema_version'],
    ['evaluations', [
        ['disease'],
        ['interpretation_associated'],
        ['modified_by'],
        ['schema_version'],
        ['computational', 'evaluation_associated'],
        ['computational', 'modified_by'],
        ['computational', 'schema_version'],
        ['computational', 'variant'],
        ['population', 'evaluation_associated'],
        ['population', 'modified_by'],
        ['population', 'schema_version'],
        ['population', 'variant']
    ]],
    ['provisional_variant', [
        ['associatedInterpretationSnapshots'],
        ['interpretation_associated'],
        ['modified_by'],
        ['schema_version']
    ]],
    ['variant', 'associatedInterpretations'],
    ['variant', 'associatedPathogenicities'],
    ['variant', 'modified_by'],
    ['variant', 'schema_version']
]
