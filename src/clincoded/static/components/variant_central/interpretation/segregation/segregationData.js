const typeMapping = {
    'PMID': {
        'name': 'Pubmed',
        'fields': [{
            'name': 'pmid',
            'description': 'PMID'
        }]
    },
    'clinical_lab': {
        'name': 'Clinical lab',
        'fields': [{
            'name': 'lab_directory',
            'description': 'Laboratory Director'
        }, {
            'name': 'clinvar_gtr_labid',
            'description': 'ClinVar/GTR LabID'
        }, {
            'name': 'contact',
            'description': 'Contact (Individual)'
        }]
    },
    'clinic': {
        'name': 'Clinic',
        'fields': [{
            'name': 'attending_physician',
            'description': 'Attending Physician'
        }, {
            'name': 'clinic_affiliation',
            'description': 'Clinic Affiliation'
        }, {
            'name': 'orcid_id',
            'description': 'ORCID ID'
        }]
    },
    'research_lab': {
        'name': 'Reearch lab',
        'fields': [{
            'name': 'pi_lab_director',
            'description': 'Principal Investigator/Lab Director'
        }, {
            'name': 'institution',
            'description': 'Institution'
        }, {
            'name': 'orcid_id',
            'description': 'ORCID ID'
        }]
    },
    'public_database': {
        'name': 'Public Database',
        'fields': [{
            'name': 'name',
            'description': 'Name of Database'
        }, {
            'name': 'url',
            'description': 'Database URL'
        }]
    },
    'registered_curator': {
        'name': 'Registered Curator',
        'fields': [{
            'name': 'no',
            'description': 'no fields'
        }, {
            'name': 'were',
            'description': 'were provided'
        }, {
            'name': 'mockup',
            'description': 'in the mockup'
        }]
    },
    'other': {
        'name': 'Other',
        'fields': [{
            'name': 'source',
            'description': 'Describe Source'
        }]
    }
};

const evidenceInputs = [{
        label: 'Label for case information',
        name: 'label',
        kind: 'text'
    },
    {
        label: 'Disease associated with proband(s) (HPO)',
        name: 'is_disease_associated_with_probands',
        kind: 'checkbox'
    },
    {
        label: 'Phenotypic feture(s) associated with proband(s) (HPO)',
        name: 'proband_hpo_ids',
        kind: 'text'
    },
    {
        label: 'Phenotypic feature(s) associated with proband(s) (free text)',
        name: 'proband_free_text',
        kind: 'text'
    },
    {
        label: 'Number of probands with relevant phenotype',
        name: 'num_probands_relevant_phenotype',
        kind: 'number'
    },
    {
        label: 'Number of unaffected family members with variant',
        name: 'num_unaffected_family_with_variant',
        kind: 'number'
    },

    {
        label: 'Number of control individuals with variant',
        name: 'num_control_with_variant',
        kind: 'number'
    },
    {
        label: 'Total control individuals tested',
        name: 'total_controls',
        kind: 'number'
    },
    {
        label: 'Number of segregations (genotype +, phenotype +)',
        name: 'num_segregations',
        kind: 'number'
    },
    {
        label: 'Number of non-segregations (phenotype +, genotype -)',
        name: 'num_non_segregations',
        kind: 'number'
    },
    {
        label: '# proband de novo occurrences (with unknown or no parental identity confirmation)',
        name: 'num_proband_de_novo',
        kind: 'number'
    },
    {
        label: '# de novo occurrences (with parental identity confirmation)',
        name: 'num_de_novo',
        kind: 'number'
    },
    {
        label: '# proband homozygous occurrences',
        name: 'num_proband_hom',
        kind: 'number'
    },
    {
        label: '# proband double het occurrences',
        name: 'num_proband_double_het',
        kind: 'number'
    },
    {
        label: '# probands with alternative genetic cause',
        name: 'num_probands_with_alt_genetic_cause',
        kind: 'number'
    },
    {
        label: 'Additional comments',
        name: 'comments',
        kind: 'textarea'
    },
    {
        label: 'Additional Population/Allele Frequency data',
        name: 'additional_pop_data',
        kind: 'textarea'
    }
];

// Table underneath 'Add Evidence' button
const tableCols = [{
    subcategory: 'observed-in-healthy',
    cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'num_unaffected_family_with_variant',
            title: '# Unaffected Variant Carriers'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'case-control',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'num_probands_relevant_phenotype',
            title: '# Probands with consistent phenotypes'
        },
        {
            key: 'num_control_with_variant',
            title: '# Controls with variants'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'segregation-data',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'de-novo',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'allele-data',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'alternate-mechanism',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    },
    {
        subcategory: 'specificity-of-phenotype',
        cols: [{
            key: '_kind',
            title: 'Source'
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        },
        {
            key: 'comments',
            title: 'Comments'
        },
        {
            key: '_submitted_by',
            title: 'Submitted By'
        },
        {
            key: '_last_edited',
            title: 'Last Edited'
        }]
    }
];

module.exports = {
    extraEvidence: {
        typeMapping: typeMapping,
        evidenceInputs: evidenceInputs,
        tableCols: tableCols
    }
};
