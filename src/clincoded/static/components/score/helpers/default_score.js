// # Evidence Default Score Helper: Pure Function
// # Parameter: mode of inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: kind of variant (e.g. VARIANT_IS_DE_NOVO, TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO)
// # Parameter: previously saved score

'use strict';

import SCORE_MAPS from '../constants/score_maps';

export function defaultScore(modeInheritance, caseInfoType, savedScore) {
    let score;
    const scoreKeys = Object.keys(SCORE_MAPS);

    if (savedScore) {
        score = savedScore;
    } else {
        if (modeInheritance && caseInfoType) {
            let matched = modeInheritance + '_' + caseInfoType;
            scoreKeys.forEach(key => {
                if (matched === key) {
                    score = SCORE_MAPS[matched].DEFAULT_SCORE;
                }
            });
        } else {
            score = null;
        }
    }

    return score;
}