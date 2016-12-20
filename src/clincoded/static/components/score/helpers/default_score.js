// # Evidence Default Score Helper: Pure Function
// # Parameter: previously saved score
// ########  For Individual evidence #########
// # Parameter: Mode of Inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: Case Information type (e.g. VARIANT_IS_DE_NOVO, TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO)
// ########  For Experimental evidence #########
// # Parameter: Experimental Evidence type (e.g. FUNCTION_BIOCHEMICAL_FUNCTION, MODELS_SYSTEMS_ANIMAL_MODEL)

'use strict';

import SCORE_MAPS from '../constants/score_maps';

export function defaultScore(modeInheritance, caseInfoType, experimentalEvidenceType, savedScore) {
    let score, matched = '';
    const scoreKeys = Object.keys(SCORE_MAPS);

    if (savedScore) {
        score = savedScore;
    } else {
        if (modeInheritance && caseInfoType) {
            matched = modeInheritance + '_' + caseInfoType;
            scoreKeys.forEach(key => {
                if (matched === key) {
                    score = SCORE_MAPS[matched].DEFAULT_SCORE;
                }
            });
        } else if (experimentalEvidenceType) {
            scoreKeys.forEach(key => {
                if (experimentalEvidenceType === key) {
                    score = SCORE_MAPS[experimentalEvidenceType].DEFAULT_SCORE;
                }
            });
        } else {
            score = null;
        }
    }

    return score;
}