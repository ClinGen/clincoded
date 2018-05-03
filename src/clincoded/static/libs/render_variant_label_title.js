'use strict';
import React from 'react';
import { external_url_map } from '../components/globals';
import { renderVariantTitle } from './render_variant_title';
import { renderVariantTitleExplanation } from './render_variant_title_explanation';

/**
 * Wrapper function to render variant type label and appropriate title
 * @param {object} variant - The variant object
 * @param {boolean} linkout - Whether there is linkout in the label
  * @param {boolean} showInHeader - Whether it is rendered in GDM's variant curation header
 */
export function renderVariantLabelAndTitle(variant, linkout, showInHeader) {
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
                <span className={variant.clinvarVariantTitle ? "col-sm-7 text-no-input clinvar-preferred-title" : "col-sm-7 text-no-input"}>{renderVariantTitle(variant)}{renderVariantTitleExplanation()}</span>
            </div>
        );
    } else if (showInHeader) {
        return (
            <span>
                <span className="term-name">{variantLabel}: </span>
                <span className="term-value">{renderVariantTitle(variant)}</span>
            </span>
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
