import _ from 'underscore';

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
        'name': 'Research lab',
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

/**
 * On adding an evidence source, the second modal will use this to render itself.
 * Each root object is a row, which itself contains one or more columns.  Each column
 * has a specified width, which is used to configure the css class within bootstrap's
 * 12-width grid system.
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
            label: 'Phenotypic feture(s) associated with proband(s) (HPO)',
            name: 'proband_hpo_ids',
            kind: 'text',
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
                name: 'total_controls',
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
        cols: [{
            label: 'Additional comments',
            name: 'comments',
            kind: 'textarea',
            width: 12
        }]
    },
    {
        cols: [{
            label: 'Additional Population/Allele Frequency data',
            name: 'additional_pop_data',
            kind: 'textarea',
            width: 12
        }]
    }
];

/**
 * Fields that are shared across all subcategories.
 * As this is meant only to be a cross-reference, We store only their keys.
 */
const sharedEvidenceInputs = ['label',
    'is_disease_associated_with_probands',
    'proband_hpo_ids',
    'proband_free_text',
    'additional_pop_data',
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
 * For each subcategory, what columns from the sheet do we display?
 * 
 * The rest of the columns are the fields we grey out and disable in the sheet.
 */
const sheetToTableMapping = [
    {
        'subcategory': 'observed-in-healthy',
        'cols': [{
            key: 'num_unaffected_family_with_variant',
            title: '# Unaffected Variant Carriers'
        },
        {
            key: 'num_control_with_variant',
            title: '# controls with variant'
        },
        {
            key: 'total_controls',
            title: '# total controls'
        }]
    },
    {
        'subcategory': 'case-control',
        'cols': [{
                key: 'num_probands_relevant_phenotype',
                title: '# Probands with consistent phenotypes'
            }, {
                key: 'num_control_with_variant',
                title: '# controls with variants'
            }, 
            {
                key: 'total_controls',
                title: '# total controls'
            }]
    },
    {
        'subcategory': 'segregation-data',
        'cols': [{
            key: 'num_segregations',
            title: '# segregations'
        },
        {
            key: 'num_non_segregations',
            title: '# non-segregations'
        }]
    },
    {
        'subcategory': 'de-novo',
        'cols': [{
            key: 'num_de_novo_unconfirmed',
            title: '# de-novo, unconfirmed'
        },
        {
            key: 'num_de_novo_confirmed',
            title: '# de-novo, unconfirmed'
        }]
    },
    {
        'subcategory': 'allele-data',
        'cols': []
    },
    {
        'subcategory': 'alternate-mechanism',
        'cols': [{
            key:'num_probands_with_alt_genetic_cause',
            title: '# probands with alternate genetic cause'
        }]
    },
    {
        'subcategory': 'specificity-of-phenotype',
        'cols': [{
            key: 'num_probands_relevant_phenotype',
            title: '# probands with relevant phenotype'
        },
        {
            key: 'num_unaffected_family_with_variant',
            title: '# unaffected family members with variant'
        },
        {
            key: 'num_de_novo_unconfirmed',
            title: '# de-novo, unconfirmed'
        },
        {
            key: 'num_de_novo_confirmed',
            title: '# de-novo, unconfirmed'
        }]
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
        },
        {
            key: 'relevant_criteria',
            title: 'Relevant Criteria'
        }];

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
        sharedEvidenceInputs: sharedEvidenceInputs
    }
};
