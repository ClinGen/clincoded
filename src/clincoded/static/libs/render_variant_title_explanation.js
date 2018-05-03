'use strict';
import React from 'react';
import { ContextualHelp } from './bootstrap/contextual_help';

/**
 * Method to render a mouseover explanation for the variant title
 */
export function renderVariantTitleExplanation() {
    const explanation = 'The transcript with the longest translation with no stop codons. If no translation, then the longest non-protein-coding transcript.';
    return (
        <span className="variant-title-explanation"><ContextualHelp content={explanation} /></span>
    );
}
