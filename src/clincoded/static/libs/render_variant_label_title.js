'use strict';
import React from 'react';
import { external_url_map } from '../components/globals';
import { renderVariantTitle } from './render_variant_title';

/**
 * Wrapper function to render variant type label and appropriate title
 * @param {object} variant - The variant object
 * @param {boolean} linkout - Whether there is linkout in the label
 */
export function renderVariantLabelAndTitle(variant, linkout) {
    let variantLabel;
    if (variant.clinvarVariantTitle) {
        variantLabel = linkout ? <LabelClinVarVariantTitle /> : 'ClinVar Preferred Title';
    } else if (variant.canonicalTranscriptTitle) {
        variantLabel = 'Canonical Transcript HGVS Title';
    } else if (variant.hgvsNames && (variant.hgvsNames.GRCh38 || variant.hgvsNames.GRCh37)) {
        variantLabel = 'Genomic HGVS Title';
    }
    if (linkout) {
        return (
            <div className="row">
                <span className="col-sm-5 control-label"><label><strong>{variantLabel}</strong></label></span>
                <span className={variant.clinvarVariantTitle ? "col-sm-7 text-no-input" : "col-sm-7 text-no-input clinvar-preferred-title"}>{renderVariantTitle(variant)}</span>
            </div>
        );
    } else {
        return (
            <div>
                <dt className="variant-title-row">{variantLabel}</dt>
                <dd className="variant-title-row">{renderVariantTitle(variant)}</dd>
            </div>
        );
    }
}

const LabelClinVarVariantTitle = () => <span><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Preferred Title:</span>;
