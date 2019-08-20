import * as evidenceCodes from '../components/variant_central/interpretation/mapping/evidence_code.json';

/**
 * Function to sort evaluations by criteria strength level
 * Sort Order: very strong or stand alone >> strong >> moderate >> supporting
 * 
 * Ooutput: object as
 * {
 *   met: array of sorted met evaluations,
 *   not_met: array of sorted not-met evaluations,
 *   not_evaluated: array of sorted not-evaluated and untouched objects;
 *   untouched obj has only one key:value element (criteria: code)
 * }
 * 
 * @param {array} evaluations interpretation.evaluations
 */
export function sortByStrength(evaluations = []) {
    // Get all criteria codes
    let criteriaCodes = Object.keys(evidenceCodes);

    let evaluationMet = [];
    let evaluationNotMet = [];
    let evaluationNotEvaluated = [];

    for (let evaluation of evaluations) {
        if (evaluation.criteriaStatus === 'met') {
            evaluationMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else if (evaluation.criteriaStatus === 'not-met') {
            evaluationNotMet.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        } else {
            evaluationNotEvaluated.push(evaluation);
            criteriaCodes.splice(criteriaCodes.indexOf(evaluation.criteria), 1);
        }
    }

    // Generate object for earch untouched criteria
    let untouchedCriteriaObjList = [];
    if (criteriaCodes.length) {
        for (let criterion of criteriaCodes) {
            untouchedCriteriaObjList.push({
                criteria: criterion
            });
        }
    }
    // merge not-evaluated and untouched together
    evaluationNotEvaluated = evaluationNotEvaluated.concat(untouchedCriteriaObjList);

    let sortedMetList = [];
    let sortedNotMetList = [];
    let sortedNotEvaluatedList = [];

    // sort Met
    if (evaluationMet.length) {
        // setup count strength values
        const MODIFIER_VS = 'very-strong';
        const MODIFIER_SA = 'stand-alone';
        const MODIFIER_S = 'strong';
        const MODIFIER_M = 'moderate';
        const MODIFIER_P = 'supporting';

        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationMet) {
            let modified = evaluation.criteriaModifier ? evaluation.criteriaModifier : null;
            if (modified) {
                if (modified === MODIFIER_VS || modified === MODIFIER_SA) {
                    vs_sa_level.push(evaluation);
                } else if (modified === MODIFIER_S) {
                    strong_level.push(evaluation);
                } else if (modified === MODIFIER_M) {
                    moderate_level.push(evaluation);
                } else if (modified === MODIFIER_P) {
                    supporting_level.push(evaluation);
                }
            } else {
                if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                    vs_sa_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'S') {
                    strong_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'M') {
                    moderate_level.push(evaluation);
                } else if (evaluation.criteria[1] === 'P') {
                    supporting_level.push(evaluation);
                }
            }
        }

        if (vs_sa_level.length) {
            sortedMetList = sortedMetList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedMetList = sortedMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedMetList = sortedMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedMetList = sortedMetList.concat(supporting_level);
        }
    }

    // sort Not-Met
    if (evaluationNotMet.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationNotMet) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'P') {
                supporting_level.push(evaluation);
            }
        }

        if (vs_sa_level.length) {
            sortedNotMetList = sortedNotMetList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotMetList = sortedNotMetList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotMetList = sortedNotMetList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotMetList = sortedNotMetList.concat(supporting_level);
        }
    }

    //sort Not-Evaluated and untouched
    if (evaluationNotEvaluated.length) {
        // temp storage
        let vs_sa_level = [];
        let strong_level = [];
        let moderate_level = [];
        let supporting_level = [];

        for (let evaluation of evaluationNotEvaluated) {
            if (evaluation.criteria === 'PVS1' || evaluation.criteria === 'BA1') {
                vs_sa_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'S') {
                strong_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'M') {
                moderate_level.push(evaluation);
            } else if (evaluation.criteria[1] === 'P') {
                supporting_level.push(evaluation);
            }
        }

        if (vs_sa_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList .concat(vs_sa_level);
        }
        if (strong_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(strong_level);
        }
        if (moderate_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(moderate_level);
        }
        if (supporting_level.length) {
            sortedNotEvaluatedList = sortedNotEvaluatedList.concat(supporting_level);
        }
    }

    return ({
        met: sortedMetList,
        not_met: sortedNotMetList,
        not_evaluated: sortedNotEvaluatedList
    });
}
