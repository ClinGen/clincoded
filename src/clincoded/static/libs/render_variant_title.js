'use strict';
import React from 'react';

/**
 * Method to display the title of a variant.
 * 1st option is the ClinVar Preferred Title if it's present.
 * 2nd alternative is a string constructed with the canonical transcript, gene symbol and protein change.
 * The fallback is the GRCh38 NC_ HGVS name.
 * @param {object} variant - A variant object
 * @param {boolean} stringOnly - Whether the output should be just string
 */
export function renderVariantTitle(variant, stringOnly) {
    let variantTitle;
    if (variant) {
        if (variant.clinvarVariantId && variant.clinvarVariantTitle) {
            variantTitle = variant.clinvarVariantTitle;
        } else if (variant.carId && variant.canonicalTranscriptTitle) {
            variantTitle = variant.canonicalTranscriptTitle;
        } else if (variant.hgvsNames && Object.keys(variant.hgvsNames).length && !variantTitle) {
            if (variant.hgvsNames.GRCh38) {
                variantTitle = variant.hgvsNames.GRCh38 + ' (GRCh38)';
            } else if (variant.hgvsNames.GRCh37) {
                variantTitle = variant.hgvsNames.GRCh37 + ' (GRCh37)';
            } else {
                variantTitle = variant.carId ? variant.carId : 'A preferred title is not available';
            }
        }
    }
    if (stringOnly) {
        return variantTitle;
    } else {
        return <span className="variant-title">{variantTitle}</span>;
    }
}
