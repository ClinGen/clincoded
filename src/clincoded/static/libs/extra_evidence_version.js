'use strict';

/**
 * Method to determine if the extra evidence object is new version that has source data object
 * @param {object} - Extra evidence object 
 */
export function extraEvidenceHasSource(extraEvidence) {
    if (extraEvidence.source && extraEvidence.source.data && extraEvidence.source.metadata && extraEvidence.source.metadata._kind_key) {
        return true;
    } else {
        return false;
    }
}
