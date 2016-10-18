'use strict';

import React, {PropTypes} from 'react';
import _ from 'underscore';
import moment from 'moment';

import * as curator from '../curator';

import { Form, FormMixin, Input, InputMixin } from '../../libs/bootstrap/form';

// Renders Case-Control Evaluation & Score panel
const CaseControlEvalScore = module.exports.CaseControlEvalScore = React.createClass({
    propTypes: {
        caseControlObj: React.PropTypes.object,
        updateCaseControlObj: React.PropTypes.func
    },

    mixins: [
        FormMixin, InputMixin
    ],

    getInitialState() {
        return {
            caseControlObj: this.props.caseControlObj,
            evaluationScore: {
                studyType: null,
                detectionMethod: null,
                statistics: {
                    statisticalValue: {type: null, other_type: null, value: null},
                    confidenceInterval: {pValue: null, rangeFrom: null, rangeTo: null}
                },
                biasCategory: {
                    eval1: {question: null, influence: null, explanation: null},
                    eval2: {question: null, influence: null, explanation: null},
                    eval3: {question: null, explanation: null},
                    eval4: {question: null, explanation: null}
                },
                comments: null,
                score: null
            }
        };
    },
    
    render() {
        let evaluationScore = this.state.evaluationScore;

        return (
            <div>
                <div className="row section section-study-type-detection-method">
                    <Input type="select" ref="studytype" label="Study type:" defaultValue="none" value={evaluationScore.studyType}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Single variant analysis">Single variant analysis</option>
                        <option value="Aggregate variant analysis">Aggregate variant analysis</option>
                    </Input>
                    <Input type="select" ref="detectionmethod" label="Detection method:" defaultValue="none" value={evaluationScore.detectionMethod}
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
                <h3>Statistics</h3>
                    <h4 className="col-sm-7 col-sm-offset-5">Statistical Value</h4>
                    <Input type="select" ref="statisticvauletype" label="Value type:" defaultValue="none" value={evaluationScore.statistics.statisticalValue.type}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Odds Ratio</option>
                        <option value="No">Fischer's exact test</option>
                        <option value="Yes">Beta</option>
                        <option value="No">Hazard Radio</option>
                        <option value="Yes">Relative Risk</option>
                        <option value="No">Other (describe in text box)</option>
                    </Input>
                    <Input type="number" ref="statisticvaule" label="Value:" value={evaluationScore.statistics.statisticalValue.value}
                        error={this.getFormError('statisticvauletype')} clearError={this.clrFormErrors.bind(null, 'statisticvauletype')}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <h4 className="col-sm-7 col-sm-offset-5">Confidence/Significance</h4>
                    <Input type="number" ref="confidencepvaule" label="p-value (%):" value={evaluationScore.statistics.confidenceInterval.pValue}
                        error={this.getFormError('confidencepvaule')} clearError={this.clrFormErrors.bind(null, 'confidencepvaule')}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="text-range" labelClassName="col-sm-6 control-label" label="Confidence interval (%):" wrapperClassName="col-sm-6">
                        <Input type="number" ref="confidenceintervalfrom" inputClassName="input-inline" groupClassName="form-group-inline confidence-interval-input"
                            error={this.getFormError('confidenceintervalfrom')} clearError={this.clrFormErrors.bind(null, 'confidenceintervalfrom')}
                            value={evaluationScore.statistics.confidenceInterval.rangeFrom} />
                        <span className="group-age-inter">to</span>
                        <Input type="number" ref="confidenceintervalto" inputClassName="input-inline" groupClassName="form-group-inline confidence-interval-input"
                            error={this.getFormError('confidenceintervalto')} clearError={this.clrFormErrors.bind(null, 'confidenceintervalto')}
                            value={evaluationScore.statistics.confidenceInterval.rangeTo} />
                    </Input>
                </div>
                <div className="row section section-bias-category">
                    <h3>Bias Category</h3>
                    <Input type="select" ref="biasquestion1" label="1. Are case and control cohorts matched by demographic information?"
                        defaultValue="none" value={evaluationScore.biasCategory.eval1.question}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="select" ref="biasquestion1factor" label="If yes, select one of the following:"
                        defaultValue="none" value={evaluationScore.biasCategory.eval1.influence}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Age">Age</option>
                        <option value="Sex">Sex</option>
                        <option value="Ethnicity">Ethnicity</option>
                        <option value="Location of recruitment">Location of recruitment</option>
                    </Input>
                    <Input type="textarea" ref="biasquestion1desc" label="Explanation:" rows="5" value={evaluationScore.biasCategory.eval1.explanation}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="biasquestion2" label="2. Are case and control cohorts matched for genetic ancestry?"
                        defaultValue="none" value={evaluationScore.biasCategory.eval2.question}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="select" ref="biasquestion2factor" label="If no, select one of the following:"
                        defaultValue="none" value={evaluationScore.biasCategory.eval2.influence}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="No, but investigators accounted for genetic ancestry in analysis">No, but investigators accounted for genetic ancestry in analysis</option>
                        <option value="No, investigators did NOT account for genetic ancestry in analysis">No, investigators did NOT account for genetic ancestry in analysis</option>
                    </Input>
                    <Input type="textarea" ref="biasquestion2desc" label="Explanation:" rows="5" value={evaluationScore.biasCategory.eval2.explanation}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="biasquestion3" label="3. Are case and control cohorts equivalently evaluated for primary disease outcome and/or family history of disease?"
                        defaultValue="none" value={evaluationScore.biasCategory.eval3.question}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes to both presence/absence of phenotype and family history">Yes to both presence/absence of phenotype and family history</option>
                        <option value="Yes to presence/absence of phenotype. No to family history evaluation.">Yes to presence/absence of phenotype. No to family history evaluation.</option>
                        <option value="No to presence/absence of phenotype. Yes to family history evaluation.">No to presence/absence of phenotype. Yes to family history evaluation.</option>
                        <option value="No to both presence/absence of phenotype and family history">No to both presence/absence of phenotype and family history</option>
                    </Input>
                    <Input type="textarea" ref="biasquestion3desc" label="Explanation:" rows="5" value={evaluationScore.biasCategory.eval3.explanation}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                    <Input type="select" ref="biasquestion4" label="4. Do case and control cohorts differ in any other variables?"
                        defaultValue="none" value={evaluationScore.biasCategory.eval4.question}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="textarea" ref="biasquestion4desc" label="If yes, explain:" rows="5" value={evaluationScore.biasCategory.eval4.explanation}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                </div>
                <div className="row section section-comments">
                    <h3>Comments</h3>
                    <Input type="textarea" ref="biascomments" label="Please provide any comments regarding case-control evaluation:" rows="5" value={evaluationScore.comments}
                        labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
                </div>
                <div className="row section section-score">
                    <h3>Score Case-Control Study</h3>
                    <Input type="select" ref="studyscore" label="Score:" defaultValue="none" value={evaluationScore.score}
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
        );
    }
});
