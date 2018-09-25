'use strict';

/**
 * Method to determine the ClinGen SOP version of the provided evidence scoring (from a classification)
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function sopVersionByScoring(classificationPoints) {
    if (classificationPoints && classificationPoints.segregation && 'evidenceCountCandidate' in classificationPoints.segregation) {
        return '6';
    } else {
        return '5';
    }
}

/**
 * Method to determine if a classification's evidence scoring is based on the data model for ClinGen's current SOP
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function isScoringForCurrentSOP(classificationPoints) {
    if (sopVersionByScoring(classificationPoints) === '6') {
        return true;
    } else {
        return false;
    }
}