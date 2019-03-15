import _ from 'underscore';

const typeMapping = {
    PMID: {
        name: 'Pubmed',
        fields: [{
            name: 'pmid',
            description: 'PMID',
            required: true,
            identifier: true
        }]
    },
    clinical_lab: {
        name: 'Clinical lab',
        fields: [{
            name: 'lab_name',
            description: 'Laboratory Name',
            required: true,
            identifier: false
        }, {
            name: 'clinvar_gtr_labid',
            description: 'ClinVar/GTR LabID',
            required: true,
            identifier: true
        }, {
            name: 'contact',
            description: 'Data Contact',
            required: false,
            identifier: false
        }]
    },
    clinic: {
        name: 'Clinic',
        fields: [{
            name: 'healthcare_provider',
            description: 'Healthcare Provider',
            required: true,
            identifier: true
        }, {
            name: 'institutional_affiliation',
            description: 'institutional Affiliation',
            required: true,
            identifier: false
        }, {
            name: 'department_affiliation',
            description: 'Department Affiliation',
            required: false,
            identifier: false
        }, {
            name: 'orcid_id',
            description: 'ORCID ID',
            required: false,
            identifier: false
        }]
    },
    research_lab: {
        name: 'Research lab',
        fields: [{
            name: 'pi_lab_director',
            description: 'Principal Investigator/Lab Director',
            required: true,
            identifier: true
        }, {
            name: 'institution',
            description: 'Institution',
            required: true,
            identifier: false
        }, {
            name: 'orcid_id',
            description: 'ORCID ID',
            required: false,
            identifier: false
        }]
    },
    public_database: {
        name: 'Public Database',
        fields: [{
            name: 'name',
            description: 'Name of Database',
            required: true,
            identifier: false
        }, {
            name: 'url',
            description: 'Database URL',
            required: true,
            identifier: true
        }]
    },
    other: {
        name: 'Other',
        fields: [{
            name: 'source',
            description: 'Describe Source',
            required: true,
            identifier: true
        }]
    }
};

/**
 * On adding an evidence source, the second modal will use this to render itself.
 * Each root object is a row, which itself contains one or more columns.  Each column
 * has a specified width, which is used to configure the css class within bootstrap's
 * 12-width grid system.
 * 
 * The 'name' field is formatted in such a way as to allow for programmatic access and
 * manipulation:
 * - Comments are always text, and the name field always has '_comment' appended to the
 *   corresponding field.
 * - Numbers always have the name field prepanded with 'num_'
 */
const evidenceInputs = [{
        cols: [{
            label: 'Label for case information',
            name: 'label',
            kind: 'text',
            width: 12
        }]
    },
    {
        cols: [{
            label: 'Disease associated with proband(s) (HPO) (Check here if unaffected)',
            name: 'is_disease_associated_with_probands',
            kind: 'checkbox',
            width: 12
        }]
    },
    {
        cols: [{
            label: 'Phenotypic feature(s) associated with proband(s) (HPO)',
            name: 'proband_hpo_ids',
            kind: 'text',
            lookup: 'HPOApi',
            width: 12
        }]
    },
    {
        cols: [{
            label: 'Phenotypic feature(s) associated with proband(s) (free text)',
            name: 'proband_free_text',
            kind: 'text',
            width: 12
        }]
    },
    {
        cols: [{
            label: 'Number of probands with relevant phenotype',
            name: 'num_probands_relevant_phenotype',
            kind: 'number',
            width: 4
        },
        {
            label: 'Comment',
            name: 'num_probands_relevant_phenotype_comment',
            kind: 'text',
            width: 8
        }]
    },
    {
        cols: [
            {
                label: 'Number of unaffected family members with variant',
                name: 'num_unaffected_family_with_variant',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_unaffected_family_with_variant_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: 'Number of control individuals with variant',
                name: 'num_control_with_variant',
                kind: 'number',
                width: 2
            },
            {
                label: 'Total control individuals tested',
                name: 'num_total_controls',
                kind: 'number',
                width: 2
            },
            {
                label: 'Comment',
                name: 'num_control_with_variant_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: 'Number of segregations (genotype +, phenotype +)',
                name: 'num_segregations',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_segregations_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: 'Number of non-segregations (phenotype +, genotype -)',
                name: 'num_non_segregations',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_non_segregations_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: '# proband de novo occurrences (with unknown or no parental identity confirmation)',
                name: 'num_de_novo_unconfirmed',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_de_novo_unconfirmed_comment',
                kind: 'text',
                width: 8
            },
        ]
    },
    {
        cols: [
            {
                label: '# proband de novo occurrences (with parental identity confirmation)',
                name: 'num_de_novo_confirmed',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_de_novo_confirmed_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: '# proband homozygous occurrences',
                name: 'num_proband_hom',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_proband_hom_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: '# proband double het occurrences',
                name: 'num_proband_double_het',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_proband_double_het_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: '# probands with alternative genetic cause',
                name: 'num_probands_with_alt_genetic_cause',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_probands_with_alt_genetic_cause_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [
            {
                label: '# proband compound het occurrences',
                name: 'num_probands_compound_het',
                kind: 'number',
                width: 4
            },
            {
                label: 'Comment',
                name: 'num_probands_compound_het_comment',
                kind: 'text',
                width: 8
            }
        ]
    },
    {
        cols: [{
            label: 'Additional comments',
            name: 'comments',
            kind: 'textarea',
            width: 12
        }]
    }
];

function masterTable() {
    let fields = [];
    evidenceInputs.forEach(input => {
        input.cols.forEach(col => {
            let obj = {
                key: col.name,
                label: col.label
            };
            let mapping = _.find(fieldToCriteriaCodeMapping, o => {
                return o.key === col.name
            });
            if (mapping != undefined) {
                obj['criteria_codes'] = mapping['codes'];
            }
            fields.push(obj);
        });
    });
    return fields;
}

/**
 * Fields that are shared across all subcategories.
 * As this is meant only to be a cross-reference, We store only their keys.
 */
const sharedEvidenceInputs = ['label',
    'is_disease_associated_with_probands',
    'proband_hpo_ids',
    'proband_free_text',
    'comments'
]


const subcategories = [
    'observed-in-healthy',
    'case-control',
    'segregation-data',
    'de-novo',
    'allele-data',
    'alternate-mechanism',
    'specificity-of-phenotype'
];

/**
 * Tuples of (criteria codes, field name)
 */
const fieldToCriteriaCodeMapping = [
    {
        key: 'num_unaffected_family_with_variant',
        codes: ['BS2']
    },
    {
        key: 'num_control_with_variant',
        codes: ['BS2']
    },
    {
        key: 'num_probands_relevant_phenotype',
        codes: ['PS4']
    },
    {
        key: 'num_segregations',
        codes: ['PP1']
    },
    {
        key: 'num_non_segregations',
        codes: ['BS4']
    },
    {
        key: 'num_de_novo_unconfirmed',
        codes: ['PS2']
    },
    {
        key: 'num_de_novo_confirmed',
        codes: ['PM6']
    },
    {
        key: 'num_probands_with_alt_genetic_cause',
        codes: ['BP5']
    },
    {
        key: 'proband_hpo_ids',
        codes: ['PP4']
    },
    {
        key: 'proband_free_text',
        codes: ['PP4']
    },
    {
        key: 'num_proband_hom',
        codes: ['PM3']
    },
    {
        key: 'num_proband_double_het',
        codes: ['BP2']
    },
    {
        key: 'num_probands_compound_het',
        codes: ['PM3']
    }
];

/**
 * For each subcategory, what columns from the sheet do we display?
 * 
 * The rest of the columns are the fields we do not highlight in the sheet.
 */
const sheetToTableMapping = [
    {
        // BS2
        'subcategory': 'observed-in-healthy',
        'cols': [{
            key: 'num_unaffected_family_with_variant',
            title: '# Unaffected Variant Carriers'
        },
        {
            key: 'num_control_with_variant',
            title: '# controls with variant'
        }]
    },
    {
        // PS4
        'subcategory': 'case-control',
        'cols': [{
                key: 'num_probands_relevant_phenotype',
                title: '# Probands with relevant phenotypes'
            }]
    },
    {
        // BS4, PP1
        'subcategory': 'segregation-data',
        'cols': [{
            key: 'num_segregations',
            title: 'Number of segregations (genotype +; phenotype +)'
        },
        {
            key: 'num_non_segregations',
            title: 'Number of non-segregations (phenotype +; genotype -)'
        }]
    },
    {
        // PM6, PS2
        'subcategory': 'de-novo',
        'cols': [{
            key: 'num_de_novo_unconfirmed',
            title: '# assumed de novo counts'
        },
        {
            key: 'num_de_novo_confirmed',
            title: '# confirmed de novo counts'
        }]
    },
    {
        // BP2, PM3
        'subcategory': 'allele-data',
        'cols': [{
                key: 'num_probands_compound_het',
                title: '# proband compound het occurrences'
            },
            {
                key: 'num_proband_hom',
                title: '# proband homozygous occurrences'
            },
            {
                key: 'num_proband_double_het',
                title: '# proband double het occurrences'
            }
        ]
    },
    {
        // BP5
        'subcategory': 'alternate-mechanism',
        'cols': [{
            key:'num_probands_with_alt_genetic_cause',
            title: '# probands with alternate genetic cause'
        }]
    },
    {
        // PP4
        'subcategory': 'specificity-of-phenotype',
        'cols': [{
                key: 'proband_free_text',
                title: 'Phenotype(s) associated with proband(s) (free text)'
            },
            {
                key: 'proband_hpo_ids',
                title: 'Phenotype(s) associated with proband(s) (HPO)'
            }
        ]
    },
]

/**
 * Example object within the `allCols` array:
 * 
 *   {subcategory: 'observed-in-healthy',
 *   cols: [{
 *           key: '_kind_title',
 *           title: 'Source'
 *       },
 *       {
 *           key: 'relevant_criteria',
 *           title: 'Relevant Criteria'
 *       },
 *       {
 *           key: 'num_unaffected_family_with_variant',
 *           title: '# Unaffected Variant Carriers'
 *       },
 *       {
 *           key: 'comments',
 *           title: 'Comments'
 *       },
 *       {
 *           key: '_submitted_by',
 *           title: 'Submitted By'
 *       },
 *       {
 *           key: 'last_modified',
 *           title: 'Last Edited'
 *       }]
 *   }
 * 
 * Note the first two objects in the `cols` array above are the start, shared amongst all subcategories.
 * Next we have a subcategory-specific object.
 * Then the last three objects are the end, shared amongst all subcategories.
 */
function tableCols() {
    let allCols = [];
    subcategories.forEach(cat => {
        // start of obj
        let obj = {
            'subcategory': cat
        }
        let cols = [{
            key: '_kind_title',
            title: 'Source'
        }
    ];

        // construct obj middle cols
        let mapping = _.find(sheetToTableMapping, o => o.subcategory === cat);
        let innerCols = [];
        mapping.cols.forEach(o => {
            innerCols.push(o);
        });
        cols = cols.concat(innerCols);

        // end of obj
        cols = cols.concat([{
                key: 'comments',
                title: 'Comments'
            },
            {
                key: '_submitted_by',
                title: 'Submitted By'
            },
            {
                key: 'last_modified',
                title: 'Last Edited'
            }]
        );

        obj['cols'] = cols
        allCols.push(obj)
    })
    return allCols;
}

module.exports = {
    extraEvidence: {
        typeMapping: typeMapping,
        evidenceInputs: evidenceInputs,
        tableCols: tableCols,
        sharedEvidenceInputs: sharedEvidenceInputs,
        fieldToCriteriaCodeMapping: fieldToCriteriaCodeMapping,
        sheetToTableMapping: sheetToTableMapping
    },
    masterTable: masterTable
};
