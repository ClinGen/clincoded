// # Evidence Score Range Helper: Pure Function
// ########  For Individual evidence #########
// # Parameter: Mode of Inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: Case Information type (e.g. VARIANT_IS_DE_NOVO, TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO)
// ########  For Experimental evidence #########
// # Parameter: Experimental Evidence type (e.g. FUNCTION_BIOCHEMICAL_FUNCTION, MODELS_SYSTEMS_ANIMAL_MODEL)

'use strict';

import SCORE_MAPS from '../constants/score_maps';

export function scoreRange(modeInheritance, caseInfoType, experimentalEvidenceType, defaultScore) {
    let range = [], filterRange = [], matched = '';
    const scoreKeys = Object.keys(SCORE_MAPS);

    if (modeInheritance && caseInfoType) {
        matched = modeInheritance + '_' + caseInfoType;
        scoreKeys.forEach(key => {
            if (matched === key) {
                range = SCORE_MAPS[matched].SCORE_RANGE;
            }
        });
    } else if (experimentalEvidenceType) {
        scoreKeys.forEach(key => {
            if (experimentalEvidenceType === key) {
                range = SCORE_MAPS[experimentalEvidenceType].SCORE_RANGE;
            }
        });
    } else {
        range = [];
    }

    if (range.length && defaultScore) {
        filterRange = range.filter(score => {
            return score !== defaultScore;
        });
    }

    return filterRange;
}
