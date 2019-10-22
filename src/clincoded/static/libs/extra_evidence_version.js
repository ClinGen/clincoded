'use strict';

/**
 * Method to determine if the extra evidence object is new version that has source data object
 * @param {object} extraEvidence - Extra evidence object 
 */
export function extraEvidenceHasSource(extraEvidence) {
    if (extraEvidence && extraEvidence.source && extraEvidence.source.data && extraEvidence.source.metadata) {
        return true;
    } else {
        return false;
    }
}
