'use strict';
import React, {PropTypes} from 'react';
const evidenceCodes = require('./mapping/evidence_code.json');

const EvaluationSummary = ({interpretation}) => {
    const evaluations = interpretation.evaluations;

    const arrayCriteriaMet = evaluations.filter(filterByStatus);

    return (
        <div className="container evaluation-summary">
            <h2><span>Evaluations Summary View</span></h2>

            {(evaluations && evaluations.length) ?
                <div className="summary-content-wrapper">
                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria meeting an evaluation strength</h3>
                        </div>
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            {arrayCriteriaMet ?
                                <tbody>
                                    {arrayCriteriaMet.map(function(item, i) {
                                        return (renderMetCriteriaRow(item, i));
                                    })}
                                </tbody>
                                :
                                <div className="panel-body">
                                    <span>No criteria meeting an evaluation strength.</span>
                                </div>
                            }
                        </table>
                    </div>

                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria evaluated as "Not met"</h3>
                        </div>
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            {(evaluations && evaluations.length) ?
                                <tbody>
                                    {evaluations.map(function(item, i) {
                                        if (item.criteriaStatus && item.criteriaStatus === 'not-met') {
                                            return (
                                                <tr key={i} className="row-criteria-not-met">
                                                    <td className="criteria-class col-md-1">
                                                        {getCriteriaType(item) === 'benign' ?
                                                            <span className="benign"><i className="icon icon-check-circle"></i></span>
                                                            :
                                                            <span className="pathogenic"><i className="icon icon-check-circle"></i></span>
                                                        }
                                                    </td>
                                                    <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
                                                    <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
                                                    <td className="criteria-modified col-md-1">N/A</td>
                                                    <td className="evaluation-status col-md-2">Not Met</td>
                                                    <td className="evaluation-description col-md-4">{item.explanation}</td>
                                                </tr>
                                            );
                                        }
                                    })}
                                </tbody>
                            :
                                <div className="panel-body">
                                    <span>No criteria evaluated as "Not met".</span>
                                </div>
                            }
                        </table>
                    </div>

                    <div className="panel panel-info datasource-evaluation-summary">
                        <div className="panel-heading">
                            <h3 className="panel-title">Criteria "Not yet evaluated"</h3>
                        </div>
                        <table className="table">
                            <thead>
                                {tableHeader()}
                            </thead>
                            {(evaluations && evaluations.length) ?
                                <tbody>
                                    {evaluations.map(function(item, i) {
                                        if (item.criteriaStatus && item.criteriaStatus === 'not-evaluated') {
                                            return (
                                                <tr key={i} className="row-criteria-not-evaluated">
                                                    <td className="criteria-class col-md-1">
                                                        {getCriteriaType(item) === 'benign' ?
                                                            <span className="benign"><i className="icon icon-check-circle"></i></span>
                                                            :
                                                            <span className="pathogenic"><i className="icon icon-check-circle"></i></span>
                                                        }
                                                    </td>
                                                    <td className={'criteria-code col-md-1 ' + getCriteriaClass(item)}>{item.criteria}</td>
                                                    <td className="criteria-description col-md-3">{getCriteriaDescription(item)}</td>
                                                    <td className="criteria-modified col-md-1">N/A</td>
                                                    <td className="evaluation-status col-md-2">Not Evaluated</td>
                                                    <td className="evaluation-description col-md-4">{item.explanation}</td>
                                                </tr>
                                            );
                                        }
                                    })}
                                </tbody>
                            :
                                <div className="panel-body">
                                    <span>No evaluation found.</span>
                                </div>
                            }
                        </table>
                    </div>
                </div>
            :
                <div className="summary-content-wrapper"><p>No evaluations found in this interpretation.</p></div>
            }
        </div>
    );
};

EvaluationSummary.propTypes = {
    interpretation: PropTypes.object.isRequired
};

// Method to update interpretation object with provision checkbox value
function handleClick() {
    // handle checkbox click event
}

// Method to filter 'evaluations' array by criteria status
function filterByStatus(obj) {
    if (obj.criteriaStatus && obj.criteriaStatus === 'met') {
        return true;
    }
}

// Method to render static table header
function tableHeader() {
    return (
        <tr>
            <th>B/P</th>
            <th>Criteria</th>
            <th>Criteria Descriptions</th>
            <th>Modified</th>
            <th>Evaluation Status</th>
            <th>Evaluation Descriptions</th>
        </tr>
    );
}

// Method to render "met" criteria table rows
function renderMetCriteriaRow(item, key) {
    const strengthLevels = ['very-strong', 'strong', 'moderate', 'supporting'];
    
    //strengthLevels.forEach(level => {
        //if (getCriteriaStrength(item) === level) {
            //if (item.criteriaStatus && item.criteriaStatus === 'met') {
            //console.log(item.criteria + " is === " + getCriteriaStrength(item) + ' vs ' + level);
            return (
                <tr key={key} className="row-criteria-met" data-evaltype={getCriteriaType(item)}>
                    <td className="criteria-class col-md-1">
                        {getCriteriaType(item) === 'benign' ?
                            <span className="benign"><i className="icon icon-check-circle"></i></span>
                            :
                            <span className="pathogenic"><i className="icon icon-check-circle"></i></span>
                        }
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
            //}
        //}
    //});
}

// Method to get critetia type: benign or pathogenic
function getCriteriaType(entry) {
    const keys = Object.keys(evidenceCodes);
    let type;

    keys.map(key => {
        if (key === entry.criteria) {
            switch (evidenceCodes[key].class) {
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

export default EvaluationSummary;
