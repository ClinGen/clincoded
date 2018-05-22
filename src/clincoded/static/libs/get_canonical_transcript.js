'use strict';

/**
 * Method to return the canonical transcript given an array of Ensembl transcripts
 * @param {array} transcripts - Ensembl transcripts
 */
export function getCanonicalTranscript(transcripts) {
    let transcript;
    for (let item of transcripts) {
        // Only if nucleotide transcripts exist
        if (item.hgvsc && item.source === 'RefSeq' && item.canonical && item.canonical === 1) {
            transcript = item.hgvsc;
        }
    }
    return transcript;
}