'use strict';

import { getPreferredTitleFromEnsemblTranscriptsNoMatch, getPreferredTitleFromEnsemblTranscriptsMatchByCar } from "./parse-resources";


/**
 * Retrieve MANE transcript from Ensembl API response data
 * @param {Object} props The argument object of this method
 * @param {Array<Object>} props.ensemblTranscripts The transcripts in Ensembl API response data
 * @param {string} props.geneSymbol The gene symbol of the variant. You can only pass in one gene symbol. If there's multiple genes associated with the variant, we currently don't query MANE for such case.
 * @param {'clinvar'|'car'} props.matchBySource Source of the variant data
 * @param {Object} props.carRawJson The response object returned by CAR. Only used when matchBySource is 'car'
 * 
 * @returns {?string} The MANE transcript title
 */
export const getManeTranscriptTitleFromEnsemblTranscripts = ({
    ensemblTranscripts, geneSymbol, matchBySource, carRawJson
}) => {
    
    // Match a MANE transcript in Ensembl transcripts

    let maneTranscriptInEnsembl;

    const maneTranscriptCandidate = ensemblTranscripts.filter(({
        mane, gene_symbol
    }) => (
        mane && gene_symbol === geneSymbol
    ));
    
    // should only have one transcript matching
    // otherwise there's something wrong in ensembl data and we'll handle that
    if (maneTranscriptCandidate.length === 0) {
        // no MANE transcrpit found for the variant
        console.warn('no mane found in emsembl', ensemblTranscripts);
        return null;
    } else {
        maneTranscriptInEnsembl = maneTranscriptCandidate[0];
    }

    // Assemble variant title by gathering hgvs, gene and amino acid change info

    if (matchBySource === 'car') {
        return getPreferredTitleFromEnsemblTranscriptsMatchByCar(maneTranscriptInEnsembl.mane, carRawJson);
    } else if (matchBySource === 'clinvar') {
        // in case the `maneTranscriptInEnsembl` (Ensembl data) does not provide sufficient data
        // to gereate a preferred title, we will not generate MANE transcript title
        // after all since variant comes from clinvar, we will have clinvarVariantTitle available
        // and it will be always favored for variant title use
        return getPreferredTitleFromEnsemblTranscriptsNoMatch(maneTranscriptInEnsembl.mane, maneTranscriptInEnsembl);
    }

    return null;
}
