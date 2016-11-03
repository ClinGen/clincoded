'use strict';

import React, {PropTypes} from 'react';
import _ from 'underscore';
import moment from 'moment';

import * as curator from '../curator';

import { Form, Input } from '../../libs/bootstrap/form';

// Utility function to display the Case-Control Evaluation & Score panel,
// and convert its values to an object.
// This object assumes it has a React component's 'this', so these need to be called
module.exports = {

    // Renders Case-Control Evaluation & Score panel
    render(case_control, scores) {
        let statisticOtherType = this.state.statisticOtherType; // 'collapsed' or 'expanded'
        let caseControl = {
            studyType: null,
            detectionMethod: null,
            statisticalValues: [{valueType: null, otherType: null, value: null}],
            pValue: null,
            confidenceIntervalFrom: null,
            confidenceIntervalTo: null,
            demographicInfoMatched: null,
            factorOfDemographicInfoMatched: null,
            explanationForDemographicMatched: null,
            geneticAncestryMatched: null,
            factorOfGeneticAncestryNotMatched: null,
            explanationForGeneticAncestryNotMatched: null,
            diseaseHistoryEvaluated: null,
            explanationForDiseaseHistoryEvaluation: null,
            differInVariables: null,
            explanationForDifference: null,
            comments: null
        };
        if (case_control && case_control.studyType !== 'undefined') {
            caseControl = case_control;
        }
        /*** Keep for next release enhancement
        let evidenceScores = [{score: null, evidenceType: null}];
        if (scores && scores.length) {
            evidenceScores = scores;
        }
        */

        return (
            <div>
                <div className="row section section-study-type-detection-method">
                    <Input type="select" ref="studyType" label="Study type:" defaultValue="none"
                        value={caseControl.studyType ? caseControl.studyType: 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group studyType">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Single variant analysis">Single variant analysis</option>
                        <option value="Aggregate variant analysis">Aggregate variant analysis</option>
                    </Input>
                    <Input type="select" ref="detectionMethod" label="Detection method:" defaultValue="none"
                        value={caseControl.detectionMethod ? caseControl.detectionMethod : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Cases and controls genotyped for variant(s)">Cases and controls genotyped for variant(s)</option>
                        <option value="Cases and controls sequenced for entire gene">Cases and controls sequenced for entire gene</option>
                        <option value="Cases sequenced and controls genotyped">Cases sequenced and controls genotyped</option>
                        <option value="Cases genotyped and controls sequenced">Cases genotyped and controls sequenced</option>
                    </Input>
                </div>
                <div className="row section section-statistics">
                <h3><i className="icon icon-chevron-right"></i> Statistics</h3>
                    <h4 className="col-sm-7 col-sm-offset-5">Statistical Value</h4>
                    {caseControl.statisticalValues.map(entry => {
                        return (
                            <div key={entry.valueType ? entry.valueType : 'none'} className="caseControlStatistics">
                                <Input type="select" ref="statisticValueType" label="Test statistic:" defaultValue="none"
                                    value={entry.valueType ? entry.valueType : 'none'} handleChange={this.handleChange}
                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                                    <option value="none">No Selection</option>
                                    <option disabled="disabled"></option>
                                    <option value="Odds Ratio">Odds Ratio</option>
                                    <option value="Relative Risk">Relative Risk</option>
                                    <option value="Other">Other</option>
                                </Input>
                                <Input type="text" ref="statisticOtherType" label="Other test statistic:" value={entry.otherType ? entry.otherType : null}
                                    error={this.getFormError('statisticOtherType')} clearError={this.clrFormErrors.bind(null, 'statisticOtherType')}
                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6"
                                    groupClassName={'form-group statistic-other-type ' + statisticOtherType} />
                                <Input type="number" ref="statisticValue" label="Value:" value={entry.value ? entry.value : null} handleChange={this.handleChange}
                                    error={this.getFormError("statisticValue")} clearError={this.clrFormErrors.bind(null, "statisticValue")}
                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" placeholder="Number only" />
                            </div>
                        );
                    })}
                    <h4 className="col-sm-7 col-sm-offset-5">Confidence/Significance</h4>
                    <Input type="number" ref="pValue" label="p-value:" value={caseControl.pValue ? caseControl.pValue : null} handleChange={this.handleChange}
                        error={this.getFormError("pValue")} clearError={this.clrFormErrors.bind(null, "pValue")}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" placeholder="Number only" />
                    <Input type="text-range" labelClassName="col-sm-6 control-label" label="Confidence interval (%):" wrapperClassName="col-sm-6">
                        <Input type="number" ref="confidenceIntervalFrom" inputClassName="input-inline" groupClassName="form-group-inline confidence-interval-input"
                            error={this.getFormError("confidenceIntervalFrom")} clearError={this.clrFormErrors.bind(null, "confidenceIntervalFrom")}
                            value={caseControl.confidenceIntervalFrom ? caseControl.confidenceIntervalFrom : null} handleChange={this.handleChange} placeholder="Number only" />
                        <span className="group-age-inter">to</span>
                        <Input type="number" ref="confidenceIntervalTo" inputClassName="input-inline" groupClassName="form-group-inline confidence-interval-input"
                            error={this.getFormError("confidenceIntervalTo")} clearError={this.clrFormErrors.bind(null, "confidenceIntervalTo")}
                            value={caseControl.confidenceIntervalTo ? caseControl.confidenceIntervalTo : null} handleChange={this.handleChange} placeholder="Number only" />
                    </Input>
                </div>
                <div className="row section section-bias-category">
                    <h3><i className="icon icon-chevron-right"></i> Bias Category</h3>
                    <Input type="select" ref="demographicInfoMatched" label="1. Are case and control cohorts matched by demographic information?"
                        defaultValue="none" value={caseControl.demographicInfoMatched ? caseControl.demographicInfoMatched : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="select" ref="factorOfDemographicInfoMatched" label="If yes, select one of the following:"
                        defaultValue="none" value={caseControl.factorOfDemographicInfoMatched ? caseControl.factorOfDemographicInfoMatched : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Age">Age</option>
                        <option value="Sex">Sex</option>
                        <option value="Ethnicity">Ethnicity</option>
                        <option value="Location of recruitment">Location of recruitment</option>
                    </Input>
                    <Input type="textarea" ref="explanationForDemographicMatched" label="Explanation:" rows="5"
                        value={caseControl.explanationForDemographicMatched ? caseControl.explanationForDemographicMatched : null}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="geneticAncestryMatched" label="2. Are case and control cohorts matched for genetic ancestry?"
                        defaultValue="none" value={caseControl.geneticAncestryMatched ? caseControl.geneticAncestryMatched : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="select" ref="factorOfGeneticAncestryNotMatched" label="If no, select one of the following:"
                        defaultValue="none" value={caseControl.factorOfGeneticAncestryNotMatched ? caseControl.factorOfGeneticAncestryNotMatched : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="No, but investigators accounted for genetic ancestry in analysis">No, but investigators accounted for genetic ancestry in analysis</option>
                        <option value="No, investigators did NOT account for genetic ancestry in analysis">No, investigators did NOT account for genetic ancestry in analysis</option>
                    </Input>
                    <Input type="textarea" ref="explanationForGeneticAncestryNotMatched" label="Explanation:" rows="5"
                        value={caseControl.explanationForGeneticAncestryNotMatched ? caseControl.explanationForGeneticAncestryNotMatched : null}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="diseaseHistoryEvaluated" label="3. Are case and control cohorts equivalently evaluated for primary disease outcome and/or family history of disease?"
                        defaultValue="none" value={caseControl.diseaseHistoryEvaluated ? caseControl.diseaseHistoryEvaluated : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes to both presence/absence of phenotype and family history">Yes to both presence/absence of phenotype and family history</option>
                        <option value="Yes to presence/absence of phenotype. No to family history evaluation.">Yes to presence/absence of phenotype. No to family history evaluation.</option>
                        <option value="No to presence/absence of phenotype. Yes to family history evaluation.">No to presence/absence of phenotype. Yes to family history evaluation.</option>
                        <option value="No to both presence/absence of phenotype and family history">No to both presence/absence of phenotype and family history</option>
                    </Input>
                    <Input type="textarea" ref="explanationForDiseaseHistoryEvaluation" label="Explanation:" rows="5"
                        value={caseControl.explanationForDiseaseHistoryEvaluation ? caseControl.explanationForDiseaseHistoryEvaluation : null}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="differInVariables" label="4. Do case and control cohorts differ in any other variables?"
                        defaultValue="none" value={caseControl.differInVariables ? caseControl.differInVariables : 'none'}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="textarea" ref="explanationForDifference" label="If yes, explain:" rows="5"
                        value={caseControl.explanationForDifference ? caseControl.explanationForDifference : null}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                </div>
                <div className="row section section-comments">
                    <h3><i className="icon icon-chevron-right"></i> Comments</h3>
                    <Input type="textarea" ref="comments" label="Please provide any comments regarding case-control evaluation:" rows="5"
                        value={caseControl.comments ? caseControl.comments : null}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                </div>
                <div className="row section section-score">
                    <h3><i className="icon icon-chevron-right"></i> Score Case-Control Study</h3>
                    <div className="evidenceScores">
                        <Input type="select" ref="evidenceScore" label="Score:" defaultValue="none" value={scores && scores.score ? scores.score : 'none'}
                            labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </Input>
                    </div>
                </div>
            </div>
        );
    },

    // Create new Case-Control object based on the form values
    handleCaseControlObj() {
        let newCaseControlObj = {};
        newCaseControlObj.statisticalValues = [];

        // Iterate statistical values array
        /*** Keep for next release enhancement
        let statisticsNodes = document.querySelectorAll('.caseControlStatistics'),
            newObj = {}, newArray = [];
        let statisticsObjects = Array.from(statisticsNodes);
        statisticsObjects.forEach(obj => {
            newObj = {
                valueType: obj.getFormValue('statisticValueType'),
                otherType: obj.getFormValue('statisticOtherType'),
                value: obj.getFormValue('statisticValue')
            };
            newArray.push(newObj);
        });
        */

        let newArray = [];
        let newObj = {
            valueType: this.getFormValue('statisticValueType') !== 'none' ? this.getFormValue('statisticValueType') : '',
            otherType: this.getFormValue('statisticOtherType') !== 'none' ? this.getFormValue('statisticOtherType') : '',
            value: this.getFormValue('statisticValue') ? parseFloat(this.getFormValue('statisticValue')) : null
        };
        newArray.push(newObj);

        // Put together a new 'caseControl' object
        newCaseControlObj = {
            studyType: this.getFormValue('studyType') !== 'none' ? this.getFormValue('studyType') : '',
            detectionMethod: this.getFormValue('detectionMethod') !== 'none' ? this.getFormValue('detectionMethod') : '',
            statisticalValues: newArray,
            pValue: this.getFormValue('pValue') ? parseFloat(this.getFormValue('pValue')) : null,
            confidenceIntervalFrom: this.getFormValue('confidenceIntervalFrom') ? parseFloat(this.getFormValue('confidenceIntervalFrom')) : null,
            confidenceIntervalTo: this.getFormValue('confidenceIntervalTo') ? parseFloat(this.getFormValue('confidenceIntervalTo')) : null,
            demographicInfoMatched: this.getFormValue('demographicInfoMatched') !== 'none' ? this.getFormValue('demographicInfoMatched') : '',
            factorOfDemographicInfoMatched: this.getFormValue('factorOfDemographicInfoMatched') !== 'none' ? this.getFormValue('factorOfDemographicInfoMatched') : '',
            explanationForDemographicMatched: this.getFormValue('explanationForDemographicMatched'),
            geneticAncestryMatched: this.getFormValue('geneticAncestryMatched') !== 'none' ? this.getFormValue('geneticAncestryMatched') : '',
            factorOfGeneticAncestryNotMatched: this.getFormValue('factorOfGeneticAncestryNotMatched') !== 'none' ? this.getFormValue('factorOfGeneticAncestryNotMatched') : '',
            explanationForGeneticAncestryNotMatched: this.getFormValue('explanationForGeneticAncestryNotMatched'),
            diseaseHistoryEvaluated: this.getFormValue('diseaseHistoryEvaluated') !== 'none' ? this.getFormValue('diseaseHistoryEvaluated') : '',
            explanationForDiseaseHistoryEvaluation: this.getFormValue('explanationForDiseaseHistoryEvaluation'),
            differInVariables: this.getFormValue('differInVariables') !== 'none' ? this.getFormValue('differInVariables') : '',
            explanationForDifference: this.getFormValue('explanationForDifference'),
            comments: this.getFormValue('comments')
        };

        return Object.keys(newCaseControlObj).length ? newCaseControlObj : null;
    },

    // Create new Evaluation-Score object based on the form values
    handleScoreObj() {
        let newScoreObj = {};

        // Iterate scores array
        /*** Keep for next release enhancement
        let scoreNodes = document.querySelectorAll('.evidenceScores'),
            newScore = {};
        let scoreObjects = Array.from(scoreNodes);
        scoreObjects.forEach(obj => {
            newScore = {
                score: obj.getFormValue('evidenceScore'),
                evidenceType: 'Case control'
            };
            // Put together a new 'evidenceScores' object
            newScoreObj.push(newScore);
        });
        */

        // Put together a new 'evidenceScores' object
        newScoreObj = {
            score: this.getFormValue('evidenceScore') !== 'none' ? parseInt(this.getFormValue('evidenceScore'), 10) : null,
            evidenceType: 'Case control'
        };

        return Object.keys(newScoreObj).length ? newScoreObj : null;
    }
};
