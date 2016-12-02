// # Evidence Score Range Helper: Pure Function
// # Parameter: mode of inheritance (e.g. AUTOSOMAL_DOMINANT, X_LINKED)
// # Parameter: kind of variant (e.g. VARIANT_IS_DE_NOVO, TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO)

'use strict';

import SCORE_MAPS from '../constants/score_maps';

export function scoreRange(modeInheritance, variantKind) {
    let range = [];
    const scoreKeys = Object.keys(SCORE_MAPS);

    if (modeInheritance && variantKind) {
        let matched = modeInheritance + '_' + variantKind;
        scoreKeys.forEach(key => {
            if (matched === key) {
                range = SCORE_MAPS[matched].SCORE_RANGE;
            }
        });
    } else {
        range = [];
    }

    return range;
}
