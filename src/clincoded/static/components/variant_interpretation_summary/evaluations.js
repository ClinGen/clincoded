'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as evidenceCodes from '../variant_central/interpretation/mapping/evidence_code.json';

class VariantInterpretationSummaryEvaluation extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { interpretation, classification } = this.props;
        let evaluations = interpretation ? interpretation.evaluations : null;
        let sortedEvaluations = evaluations ? sortByStrength(evaluations) : null;

        return (
            <div className="evaluation-summary panel-evaluation-summary">
                <div className="panel panel-info datasource-evaluation-summary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Criteria meeting an evaluation strength</h3>
                    </div>
                    {sortedEvaluations && sortedEvaluations.met ?
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            <tbody>
                                {sortedEvaluations.met.map(function(item, i) {
                                    return (renderMetCriteriaRow(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No criteria meeting an evaluation strength.</span>
                        </div>
                    }
                </div>

                <div className="panel panel-info datasource-evaluation-summary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Criteria evaluated as "Not met"</h3>
                    </div>
                    {sortedEvaluations && sortedEvaluations.not_met ?
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            <tbody>
                                {sortedEvaluations.not_met.map(function(item, i) {
                                    return (renderNotMetCriteriaRow(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No criteria evaluated as "Not met".</span>
                        </div>
                    }
                </div>

                <div className="panel panel-info datasource-evaluation-summary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Criteria "Not yet evaluated"</h3>
                    </div>
                    {sortedEvaluations && sortedEvaluations.not_evaluated ?
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            <tbody>
                                {sortedEvaluations.not_evaluated.map(function(item, i) {
                                    return (renderNotEvalCriteriaRow(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No criteria yet to be evaluated.</span>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

VariantInterpretationSummaryEvaluation.propTypes = {
    interpretation: PropTypes.object,
    classification: PropTypes.object
};

export default VariantInterpretationSummaryEvaluation;

// Method to render static table header
function tableHeader() {
    return (
        <tr>
            <th className="col-md-1"><span className="label-benign">B</span>/<span className="label-pathogenic">P</span></th>
            <th className="col-md-1">Criteria</th>
            <th className="col-md-3">Criteria Descriptions</th>
            <th className="col-md-1">Modified</th>
            <th className="col-md-2">Evaluation Status</th>
            <th className="col-md-4">Evaluation Explanation</th>
        </tr>
    );
}

// Method to render "met" criteria table rows
function renderMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-met" data-evaltype={getCriteriaType(item)}>
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-check-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1" data-modlevel={getModifiedLevel(item)}>
                {item.criteriaModifier ? 'Yes' : 'No'}
            </td>
            <td className="evaluation-status col-md-2">
                {item.criteriaModifier ? item.criteria + '_' + item.criteriaModifier : getCriteriaStrength(item)}
            </td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-met" criteria table rows
function renderNotMetCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-met">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-times-circle"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Met</td>
            <td className="evaluation-description col-md-4">{item.explanation}</td>
        </tr>
    );
}

// Method to render "not-evaluated" criteria table rows
function renderNotEvalCriteriaRow(item, key) {
    return (
        <tr key={key} className="row-criteria-not-evaluated">
            <td className="criteria-class col-md-1">
                <span className={getCriteriaType(item) === 'benign' ? 'benign' : 'pathogenic'}><i className="icon icon-circle-o"></i></span>
            </td>
            <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
            <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
            <td className="criteria-modified col-md-1">N/A</td>
            <td className="evaluation-status col-md-2">Not Evaluated</td>
            <td className="evaluation-description col-md-4">{item.explanation ? item.explanation : null}</td>
        </tr>
    );
}

// Method to get critetia type: benign or pathogenic
function getCriteriaType(entry) {
    const keys = Object.keys(evidenceCodes);
    let type;

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                case 'benign-strong':
                case 'benign-supporting':
                    type = 'benign';
                    break;
                case 'pathogenic-supporting':
                case 'pathogenic-moderate':
                case 'pathogenic-strong' :
                case 'pathogenic-very-strong':
                    type = 'pathogenic';
                    break;
                default:
                    type = '';
            }
        }
    });
    return type;
}

// Method to get criteria class
function getCriteriaClass(entry) {
    const keys = Object.keys(evidenceCodes);
    let classification = '';

    keys.map(key => {
        if (key === entry.criteria) {
            classification = evidenceCodes[key].class;
        }
    });
    return classification;
}

// Method to get short critetia description
function getCriteriaDescription(entry) {
    const keys = Object.keys(evidenceCodes);
    let description = '';

    keys.map(key => {
        if (key === entry.criteria) {
            description = evidenceCodes[key].definition;
        }
    });
    return description;
}

// Method to get criteria strength
function getCriteriaStrength(entry) {
    const keys = Object.keys(evidenceCodes);
    let strength = '';

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
                case 'stand-alone':
                    strength = 'stand-alone';
                    break;
                case 'pathogenic-very-strong':
                    strength = 'very-strong';
                    break;
                case 'benign-strong':
                case 'pathogenic-strong':
                    strength = 'strong';
                    break;
                case 'pathogenic-moderate':
                    strength = 'moderate';
                    break;
                case 'benign-supporting':
                case 'pathogenic-supporting':
                    strength = 'supporting';
                    break;
                default:
                    strength = '';
            }
        }
    });
    return strength;
}

// Method to determine the levels a criteria is modified
function getModifiedLevel(entry) {
    let modifiedLevel;
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'very-strong') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'moderate':
                modifiedLevel = '2-down';
                break;
            case 'supporting':
                modifiedLevel = '3-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'stand-alone') {
        switch (entry.criteriaModifier) {
            case 'strong':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = '2-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'strong') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
            case 'stand-alone':
                modifiedLevel = '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-down';
                break;
            case 'supporting':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-down' : '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'moderate') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = '1-up';
                break;
            case 'supporting':
                modifiedLevel = '1-down';
                break;
        }
    }
    if (entry.criteriaModifier && getCriteriaStrength(entry) === 'supporting') {
        switch (entry.criteriaModifier) {
            case 'very-strong':
                modifiedLevel = '3-up';
                break;
            case 'stand-alone':
                modifiedLevel = '2-up';
                break;
            case 'strong':
                modifiedLevel = (getCriteriaType(entry) === 'pathogenic') ? '2-up' : '1-up';
                break;
            case 'moderate':
                modifiedLevel = '1-up';
                break;
        }
    }
    return modifiedLevel;
}

// Function to sort evaluations by criteria strength level
// Sort Order: very strong or stand alone >> strong >> moderate >> supporting
// Input: array, interpretation.evaluations
// output: object as
//      {
//          met: array of sorted met evaluations,
//          not_met: array of sorted not-met evaluations,
//          not_evaluated: array of sorted not-evaluated and untouched objects;
//                         untouched obj has only one key:value element (criteria: code)
//      }

function sortByStrength(evaluations) {
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