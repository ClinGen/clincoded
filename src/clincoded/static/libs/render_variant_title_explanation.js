'use strict';
import React from 'react';
import { ContextualHelp } from './bootstrap/contextual_help';

/**
 * Method to render a mouseover explanation for the variant title
 */
export function renderVariantTitleExplanation() {
    const explanation = 'For ClinVar alleles, this represents the ClinVar Preferred Title. For alleles not in ClinVar, this HGVS is based on the transcript with the longest translation with no stop codons or, if no translation, the longest non-protein-coding transcript. If a single canonical transcript is not discernible the HGVS is based on the GRCh38 genomic coordinates.';
    return (
        <span className="variant-title-explanation"><ContextualHelp content={explanation} /></span>
    );
}
