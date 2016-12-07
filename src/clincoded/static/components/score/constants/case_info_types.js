'use strict';

const VARIANT_KIND_MAPS = {
    AUTOSOMAL_DOMINANT: [
        {
            KIND: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            KIND: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            KIND: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        }
    ],
    X_LINKED: [
        {
            KIND: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            KIND: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            KIND: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        }
    ],
    AUTOSOMAL_RECESSIVE: [
        {
            KIND: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        },
        {
            KIND: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        }
    ],
    OTHER: [
        {
            KIND: 'VARIANT_IS_DE_NOVO',
            DESCRIPTION: 'Variant is de novo'
        },
        {
            KIND: 'PREDICTED_OR_PROVEN_NULL_VARIANT',
            DESCRIPTION: 'Proband with predicted or proven null variant'
        },
        {
            KIND: 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT',
            DESCRIPTION: 'Proband with other variant type with some evidence of gene impact'
        },
        {
            KIND: 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO',
            DESCRIPTION: 'Two variants in trans and at least one de novo or a predicted/proven null variant'
        },
        {
            KIND: 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS',
            DESCRIPTION: 'Two variants (not predicted/proven null) with some evidence of gene impact in trans'
        }
    ]
};

export default VARIANT_KIND_MAPS;