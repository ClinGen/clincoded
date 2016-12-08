'use strict';

const CASE_INFO_TYPES = {
    AUTOSOMAL_DOMINANT: [
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        }
    ],
    X_LINKED: [
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        }
    ],
    AUTOSOMAL_RECESSIVE: [
        {
            TYPE: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        },
        {
            TYPE: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        }
    ],
    OTHER: [
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            TYPE: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        },
        {
            TYPE: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        }
    ]
};

export default CASE_INFO_TYPES;