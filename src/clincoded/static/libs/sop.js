'use strict';
import _ from 'underscore';

/**
 * Method to determine the ClinGen SOP version of the provided evidence scoring (from a classification)
 * @param {object} classificationPoints - Object containing a classification's evidence scoring
 */
export function sopVersionByScoring(classificationPoints) {
    if (classificationPoints && classificationPoints.segregation && 'evidenceCountExome' in classificationPoints.segregation) {
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

/**
 * Method to determine the ClinGen SOP version from the provisional object
 * @param {object} provisional - Object containing classification info
*/
export function determineSOPVersion(provisional) {
    const sopCurrentVersion = '7';
    if (!_.isEmpty(provisional)) {
        if (provisional.hasOwnProperty('sopVersion')) {
            if (provisional.sopVersion) {
                return provisional.sopVersion;
            } else {
                // Until "current" classification is approved (where SOP is selected), assume curation is taking place under current SOP
                return sopCurrentVersion;
            }
        } else {
            // For classifications saved before users could select an SOP version, use existing determination logic
            return sopVersionByScoring(provisional.classificationPoints);
        }
    }
}

export const sopVersions = ['7', '6', '5', '4', '3', '2', '1'];