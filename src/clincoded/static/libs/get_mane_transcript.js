'use strict';

import { getPreferredTitleFromEnsemblTranscriptsNoMatch, getPreferredTitleFromEnsemblTranscriptsMatchByCar } from "./parse-resources";


/**
 * Retrieve MANE transcript from Ensembl API response data
 * @param {object} props The argument object of this method
 * @param {Array<object>} props.ensemblTranscripts The transcripts in Ensembl API response data
 * @param {string} props.geneSymbol The gene symbol of the variant. You can only pass in one gene symbol. If there's multiple genes associated with the variant, we currently don't query MANE for such case.
 * @param {'clinvar'|'car'} props.matchBySource Source of the variant data
 * @param {object} props.carRawJson The response object returned by CAR. Only used when matchBySource is 'car'
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

    console.log('maneTranscript', maneTranscriptInEnsembl);

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



/**
 * Method to return the MANE transcript id given the json fetched from Link Data Hub (LDH).
 * @param {object} ldhJson - LDH json response object.
 * @returns {(string|null)} MANE transcript id.
 */
// export const parseManeTranscriptIdFromLdh = (ldhJson) => {
//     // best effort to retrieve `preferredTranscripts`
//     const {
//         ld: {
//             AlleleMolecularConsequenceStatement: [
//                 {
//                     entContent: {
//                         preferredTranscripts = []
//                     } = {}
//                 } = {}
//             ] = []
//         } = {}
//     } = ldhJson;

//     // best effort to find a transcript marked as MANE
//     for (let transcript of preferredTranscripts) {
//         if (transcript.manePreferredRefSeq) {
//             return transcript.id;
//         }
//     }
    
//     return null;
// }


/**
 * Method to return the MANE transcript id given the json fetched from genomic CAR.
 * @param {object} genomicCarJson - Genomic CAR json response object.
 * @returns {(string|null)} MANE transcript id. If cannot parse MANE transcript id, returns null.
 */
// export const parseManeTranscriptIdFromGenomicCar = (genomicCarJson) => {
//     const {
//         externalRecords: {
//             MANEPrefRefSeq: {
//                 id = null
//             } = {}
//         } = {}
//     } = genomicCarJson;

//     return id;
// }
