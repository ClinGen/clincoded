'use strict';

const CASE_INFO_TYPES = {
    AUTOSOMAL_DOMINANT: [
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
    ],
    X_LINKED: [
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        }
    ],
    AUTOSOMAL_RECESSIVE: [
        {
            TYPE: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        },
        {
            TYPE: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        }
    ],
    SEMIDOMINANT: [
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            TYPE: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        },
        {
            TYPE: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        }
    ],
    OTHER: [
        {
            TYPE: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            TYPE: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            TYPE: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            TYPE: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        },
        {
            TYPE: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        }
    ]
};

export default CASE_INFO_TYPES;