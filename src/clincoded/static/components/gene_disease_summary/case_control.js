'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryCaseControl extends Component {
    constructor(props) {
        super(props);
        this.state = {
            caseControlEvidenceList: this.props.caseControlEvidenceList
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.caseControlEvidenceList) {
            this.setState({caseControlEvidenceList: nextProps.caseControlEvidenceList});
        }
    }

    /**
     * Method to render individual table row of the logged-in user's scored evidence
     * @param {object} evidence - scored evidence and its associated case-control evidence
     * @param {number} key - unique key
     */
    renderCaseControlEvidence(evidence, key) {
        return (
            <tr key={key} className="scored-case-control-evidence">
                <td className="evidence-reference">
                    <span>{evidence.authors.join(', ')}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-disease">
                    <span>{evidence.diseaseTerm}
                        <span> {!evidence.diseaseFreetext ? <span>({evidence.diseaseId.replace('_', ':')})</span> : (evidence.diseasePhenotypes && evidence.diseasePhenotypes.length ? <span>({evidence.diseasePhenotypes.join(', ')})</span> : null)}</span>
                    </span>
                </td>
                <td className="evidence-study-type">
                    {evidence.studyType}
                </td>
                <td className="evidence-detection-method">
                    {evidence.detectionMethod}
                </td>
                <td className="evidence-power-case-cohort">
                    {evidence.caseCohort_numberWithVariant ? evidence.caseCohort_numberWithVariant : null} 
                    {evidence.caseCohort_numberAllGenotypedSequenced ?
                        <span> / {evidence.caseCohort_numberAllGenotypedSequenced}</span>
                        : null}
                </td>
                <td className="evidence-power-control-cohort">
                    {evidence.controlCohort_numberWithVariant ? evidence.controlCohort_numberWithVariant : null}
                    {evidence.controlCohort_numberAllGenotypedSequenced ?
                        <span> / {evidence.controlCohort_numberAllGenotypedSequenced}</span>
                        : null}
                </td>
                <td className="evidence-bias-unknown">
                    ???
                </td>
                <td className="evidence-bias-unknown">
                    ???
                </td>
                <td className="evidence-bias-unknown">
                    ???
                </td>
                <td className="evidence-bias-differ-in-variables">
                    {evidence.differInVariables}
                    {evidence.explanationForDifference.length ? <span> - {evidence.explanationForDifference}</span> : null}
                </td>
                <td className="evidence-statistics-value">
                    {evidence.statisticValueType}
                    {evidence.statisticValueTypeOther.length ? <span> - {evidence.statisticValueTypeOther}</span> : null}
                    {evidence.statisticValue ? <span> / {evidence.statisticValue}</span> : null}
                </td>
                <td className="evidence-statistics-confidence">
                    {evidence.pValue ? evidence.pValue : null}
                    {evidence.confidenceIntervalFrom && evidence.confidenceIntervalTo ? 
                        <span> / {evidence.confidenceIntervalFrom} - {evidence.confidenceIntervalTo}</span> 
                        : null}
                </td>
                <td className="evidence-additional-comments">
                    {evidence.comments}
                </td>
                <td className="evidence-score">
                    {evidence.score}
                </td>
            </tr>
        );
    }

    render() {
        const caseControlEvidenceList = this.state.caseControlEvidenceList;
        let self = this;

        return (
            <div className="evidence-summary panel-case-control">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case-Control</h3>
                    </div>
                    {caseControlEvidenceList && caseControlEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Reference (PMID)</th>
                                    <th rowSpan="2">Case disease associated with case (Disease ID)</th>
                                    <th rowSpan="2">Study type (aggregate or single variant)</th>
                                    <th rowSpan="2">Detection method</th>
                                    <th colSpan="2">Power</th>
                                    <th colSpan="4">Bias</th>
                                    <th colSpan="2">Statistics</th>
                                    <th rowSpan="2">Additional comments</th>
                                    <th rowSpan="2">Score</th>
                                </tr>
                                <tr>
                                    <th>Case</th>
                                    <th>Control</th>
                                    <th>What?</th>
                                    <th>What?</th>
                                    <th>What?</th>
                                    <th>Differ in other variables?</th>
                                    <th>Statistical value</th>
                                    <th>Confidence interval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {caseControlEvidenceList.map((item, i) => {
                                    return (self.renderCaseControlEvidence(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No scored Case-Control evidence was found.</span>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryCaseControl.propTypes = {
    caseControlEvidenceList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryCaseControl;