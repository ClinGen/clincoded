'use strict';

import { getPreferredTitleFromEnsemblTranscriptsNoMatch, generateVariantPreferredTitle } from "./parse-resources";

/**
 * Method to return the canonical transcript given the Ensembl transcripts.
 * Note that there are possibly multiple canonical transcript(s) in Ensembl
 * transcripts, this method only picks the representative one, since this method
 * is intended to be used for getting a single canonical transcript title for a variant.
 * 
 * Among the canonical transcripts, whether or not one qualifies as the representative 
 * canonical transcript, is determined by algorithm below:
 * 
 * 1. [**General Singularity Test**] - If only one canonical transcript exists in Ensembl transcripts, return it
 * 2. [**NM Singularity Test**] - If there're multiple canonical transcripts, and only one of them whose 
 *      c. nomenclature (i.e. `hgvsc`) starts with NM, return it
 * 3. [**NM Singularity Test**] - If there're multiple canonical transcripts whose `hgvsc` starts with NM, 
 *      return null, which also means we don't use canonical transcripts for variant title
 * 4. [**NR Singularity Test**] - If there're no canonical transcript with `NM` prefix, look for canonical transcripts 
 *      with `NR` prefix; if there's exactly one with `NR` prefix, return it
 * 5. Otherwise return null; this includes cases of multiple caonical transcripts with NR prefix
 * 
 * 
 * Examples:
 * 
 * e.g. 1: `NR_1, XR_1, XR_2, XM_1, XM_2 ...`: in this case there is no NM but there is one NR_1 so use that
 * 
 * e.g. 2: `NR_1, NR_2, XR_1, XR_2, XM_1, XM_2 ...`: in this case skip because there is no NM and there is more than one NR
 * 
 * e.g. 3: `NM_1, NR_1, NR_2, XR_1, XR_2, XM_1, XM_2 ...`: in this case use NM_1
 * 
 * e.g. 4: `NM_1, NM_2_ NR_1, XR_1, XR_2, XM_1, XM_2 ...`: in this case skip because there is more than one NM
 * 
 * @see {@link https://github.com/ClinGen/clincoded/issues/2176|Issue 2176}
 * @see getCanonicalTranscriptTitleFromEnsemblTranscripts
 * 
 * @param {Array<Object>} transcripts - Ensembl transcripts
 * @param {boolean} extended - If `true`, will return an transcript object; otherwise, will just return the hgvsc string of the transcript
 * 
 * @returns {(string|Object|null|undefined)} Returns the hgvs string of canonical transcript, or the entire transcript object from Ensembl API, depending on argument `extended`.
 *      Will return `null|undefined` if no canonical transcript found, or found but no `hgvsc` field on it.
 */
export function getCanonicalTranscript(transcripts, extended = false) {

    // Filter all ensembl transcripts marked as canonical

    const canonicalTranscriptsFromEnsembl = transcripts.filter((transcript) => (
        transcript.hgvsc && 
        transcript.canonical
    ));

    if (canonicalTranscriptsFromEnsembl.length === 0) {
        console.warn('no canonical transcript found in ensemb transcripts', transcripts);
        return null;
    }

    // General Singularity Test

    if (canonicalTranscriptsFromEnsembl.length === 1) {
        return extended ? canonicalTranscriptsFromEnsembl[0] : canonicalTranscriptsFromEnsembl[0].hgvsc;
    }

    // NM Singularity Test

    const canonicalTranscriptsStartByNM = canonicalTranscriptsFromEnsembl.filter(({ hgvsc }) => (typeof hgvsc === 'string' && hgvsc.trim().startsWith('NM')))

    if (canonicalTranscriptsStartByNM.length === 1) {
        return extended ? canonicalTranscriptsStartByNM[0] : canonicalTranscriptsStartByNM[0].hgvsc;
    } else if (canonicalTranscriptsStartByNM.length > 1) {
        return null;
    }

    // NR Singularity Test

    const canonicalTranscriptsStartByNR = canonicalTranscriptsFromEnsembl.filter(({ hgvsc }) => (typeof hgvsc === 'string' && hgvsc.trim().startsWith('NR')))

    if (canonicalTranscriptsStartByNR.length === 1) {
        return extended ? canonicalTranscriptsStartByNR[0] : canonicalTranscriptsStartByNR[0].hgvsc;
    }

    console.warn('Did not find qualifying canonical transcript title', canonicalTranscriptsFromEnsembl);

    return null;
}

/**
 * This method generates the canonical title, which can be used as a candidate for variant preferred title.
 * For how a preferred title is contructed, @see generateVariantPreferredTitle
 * @param {Object} props The argument object of this method
 * @param {Array<Object>} props.ensemblTranscripts The transcripts in Ensembl API response data
 * @param {'clinvar'|'car'} props.matchBySource Either 'clinvar' or 'car'
 * @param {Object} props.parsedData The parsed data originated from either Clinvar or CAR.
 * 
 * @returns {string?} The Canonical transcript title. Returns `null` or `undefined` if not avialable.
 */
export const getCanonicalTranscriptTitleFromEnsemblTranscripts = ({
    matchBySource,
    ensemblTranscripts,
    parsedData
}) => {
    if (matchBySource === 'car') {
        const canonicalTranscript = getCanonicalTranscript(ensemblTranscripts);
        if (canonicalTranscript && canonicalTranscript.length && parsedData.tempAlleles && parsedData.tempAlleles.length) {
            for (const item of parsedData.tempAlleles) {
                /** shape of `item` example:
                 * {
                        "geneSymbol": "RAD51",
                        "hgvs": [
                            "NM_001164269.1:c.140A>T" <-
                        ],
                        "proteinEffect": {
                            "hgvs": "NP_001157741.1:p.His47Leu", <-
                            "hgvsWellDefined": "NP_001157741.1:p.His47Leu"
                        }
                    }
                */
                if (item.hgvs && item.hgvs.length) {
                    for (const transcript of item.hgvs) {
                        if (transcript === canonicalTranscript) {
                            let proteinChange;
                            const [transcriptStart, transcriptEnd] = transcript.split(':');
                            if (!(transcriptStart && transcriptEnd)) {
                                continue;
                            }

                            if (item.proteinEffect && item.proteinEffect.hgvs) {
                                [, proteinChange] = item.proteinEffect.hgvs.split(':');
                            }
                            return generateVariantPreferredTitle({
                                transcriptId: transcriptStart,
                                geneName: item.geneSymbol,
                                nucleotideChange: transcriptEnd,
                                aminoAcidChangeName: proteinChange
                            })
                        }
                    }
                }
            };
        }
    } else if (matchBySource === 'clinvar') {
        const canonicalTranscriptInEnsembl = getCanonicalTranscript(ensemblTranscripts, true);

        if (!canonicalTranscriptInEnsembl) {
            console.warn(`No qualified canonical transcript found for assgining a canonical transcript title`);
            return null;
        }

        if (!canonicalTranscriptInEnsembl.hgvsc) {
            console.warn(`Cannot gather sufficient information to generate canonical transcript title, even if we found a canonical transcript in ensembl`, canonicalTranscriptInEnsembl);
            return null;
        }

        const {
            hgvsc
        } = canonicalTranscriptInEnsembl;

        const [canonicalTranscriptId, ] = hgvsc.split(':');

        return getPreferredTitleFromEnsemblTranscriptsNoMatch(canonicalTranscriptId, canonicalTranscriptInEnsembl) || null;
    }

    return null;
}
