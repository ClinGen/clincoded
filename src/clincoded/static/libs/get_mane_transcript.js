'use strict';


/**
 * Method to return the MANE transcript id given the json fetched from Link Data Hub (LDH).
 * @param {object} ldhJson - LDH json response object.
 * @returns {(string|null)} MANE transcript id.
 */
export const parseManeTranscriptIdFromLdh = (ldhJson) => {
    // best effort to retrieve `preferredTranscripts`
    const {
        ld: {
            AlleleMolecularConsequenceStatement: [
                {
                    entContent: {
                        preferredTranscripts = []
                    } = {}
                } = {}
            ] = []
        } = {}
    } = ldhJson;

    // best effort to find a transcript marked as MANE
    for (let transcript of preferredTranscripts) {
        if (transcript.manePreferredRefSeq) {
            return transcript.id;
        }
    }
    
    return null;
}


/**
 * Method to return the MANE transcript id given the json fetched from genomic CAR.
 * @param {object} genomicCarJson - Genomic CAR json response object.
 * @returns {(string|null)} MANE transcript id.
 */
export const parseManeTranscriptIdFromGenomicCar = (genomicCarJson) => {
    const {
        externalRecords: {
            MANEPrefRefSeq: {
                id = null
            } = {}
        }
    } = genomicCarJson;

    return id;
}


/**
 * Method to return the MANE transcript object given the MANE trnascript id and the json fetched from variant CAR.
 * @param {string} maneTranscriptId - MANE transcript id.
 * @param {object} carJson - Variant CAR json response object.
 * @returns {(object|null)} MANE transcript.
 */
export const getManeTranscriptFromCar = (maneTranscriptId, carJson) => {
    // given the id of MANE transcript, reverse lookup in CAR to obtain complete transcript info
    const {
        transcriptAlleles = []
    } = carJson;
    for (let transcript of transcriptAlleles) {
        const { hgvs: [ hgvsValue = '' ] = [] } = transcript;
        if (!hgvsValue) {
            continue;
        }
        
        const transcriptId = hgvsValue.split(':')[0]
        if (transcriptId === maneTranscriptId) {
            return {
                geneSymbol: transcript.geneSymbol,
                proteinEffect: transcript.proteinEffect,
                hgvs: hgvsValue,
                preferredTitle: generateVariantPreferredTitle(transcript.geneSymbol, hgvsValue, transcript.proteinEffect)
            };
        }
    }

    // in case there's a inconsistency between LDH and CAR (MANE transcript found in LDH, but no such transcript in CAR, which shouldn't happen), just fall back to no MANE transcript result in CAR
    return null;
}
