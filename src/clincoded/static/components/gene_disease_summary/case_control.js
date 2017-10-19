'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryCaseControl extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mounted: false
        };
    }

    componentDidMount() {
        this.setState({mounted: true});
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
                        <span> {!evidence.diseaseFreetext ? <span>({evidence.diseaseId.replace('_', ':')})</span> : (evidence.diseasePhenotypes && evidence.diseasePhenotypes.length ? <span>({this.props.hpoTermList.join(', ')})</span> : null)}</span>
                    </span>
                </td>
                <td className="evidence-study-type">
                    {evidence.studyType}
                </td>
                <td className="evidence-detection-method">
                    {evidence.detectionMethod}
                </td>
                <td className="evidence-power-case-cohort-numberAllGenotypedSequenced">
                    {evidence.caseCohort_numberAllGenotypedSequenced ? evidence.caseCohort_numberAllGenotypedSequenced : null}
                </td>
                <td className="evidence-power-control-cohort-numberAllGenotypedSequenced">
                    {evidence.controlCohort_numberAllGenotypedSequenced ? evidence.controlCohort_numberAllGenotypedSequenced : null}
                </td>
                <td className="evidence-bias-confounding">
                    {evidence.comments}
                </td>
                <td className="evidence-statistics-case-cohort-numberWithVariant">
                    {typeof evidence.caseCohort_numberWithVariant === 'number' ? evidence.caseCohort_numberWithVariant : null}
                    {typeof evidence.caseCohort_numberWithVariant === 'number' && evidence.caseCohort_numberAllGenotypedSequenced ? <span>/</span> : null}
                    {typeof evidence.caseCohort_numberAllGenotypedSequenced === 'number' ? evidence.caseCohort_numberAllGenotypedSequenced : null}
                </td>
                <td className="evidence-statistics-control-cohort-numberWithVariant">
                    {typeof evidence.controlCohort_numberWithVariant === 'number' ? evidence.controlCohort_numberWithVariant : null}
                    {typeof evidence.controlCohort_numberWithVariant === 'number' && typeof evidence.controlCohort_numberAllGenotypedSequenced === 'number' ? <span>/</span> : null}
                    {typeof evidence.controlCohort_numberAllGenotypedSequenced === 'number' ? evidence.controlCohort_numberAllGenotypedSequenced : null}
                </td>
                <td className="evidence-statistics-value">
                    {evidence.statisticValueType ? <strong>{evidence.statisticValueType}: </strong> : null}
                    {evidence.statisticValueTypeOther.length ? <span>{evidence.statisticValueTypeOther} - </span> : null}
                    {evidence.statisticValue ? <span>{evidence.statisticValue}</span> : null}
                </td>
                <td className="evidence-statistics-p-value">
                    {evidence.pValue ? evidence.pValue : null}
                </td>
                <td className="evidence-statistics-confidence">
                    {evidence.confidenceIntervalFrom && evidence.confidenceIntervalTo ? 
                        <span>{evidence.confidenceIntervalFrom}-{evidence.confidenceIntervalTo} (%)</span> 
                        : null}
                </td>
                <td className="evidence-score">
                    {evidence.score}
                </td>
            </tr>
        );
    }

    /**
     * Method to get the total score of all scored evidence
     * @param {array} evidenceList - A list of evidence items
     */
    getTotalScore(evidenceList) {
        let allScores = [];
        evidenceList.forEach(item => {
            if (typeof item.score === 'number') {
                allScores.push(item.score);
            }
        });
        const totalScore = allScores.reduce((a, b) => a + b, 0);
        return parseFloat(totalScore).toFixed(2);
    }

    /**
     * Sort table rows given a list of evidence and column name
     */
    sortListbyColName(evidenceList, colName) {
        let sortedList = [];
        if (evidenceList.length) {
            sortedList = evidenceList.sort((x, y) => x[colName].toLowerCase() !== y[colName].toLowerCase() ? x[colName].toLowerCase() < y[colName].toLowerCase() ? -1 : 1 : 0);
        }
        return sortedList;
    }

    render() {
        const caseControlEvidenceList = this.props.caseControlEvidenceList;
        let sortedEvidenceList = this.state.mounted ? this.sortListbyColName(caseControlEvidenceList, 'studyType') : caseControlEvidenceList;
        let self = this;

        return (
            <div className="evidence-summary panel-case-control">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case-Control</h3>
                    </div>
                    {sortedEvidenceList && sortedEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Reference (PMID)</th>
                                    <th rowSpan="2">Disease (Case)</th>
                                    <th rowSpan="2">Study type</th>
                                    <th rowSpan="2">Detection method (Case)</th>
                                    <th colSpan="2">Power</th>
                                    <th rowSpan="2">Bias confounding</th>
                                    <th colSpan="5">Statistics</th>
                                    <th rowSpan="2">Points</th>
                                </tr>
                                <tr>
                                    <th># of cases genotyped/sequenced</th>
                                    <th># of controls genotyped/sequenced</th>
                                    <th>Cases with variant in gene / all cases genotyped/sequenced</th>
                                    <th>Controls with variant in gene / all cases genotyped/sequenced</th>
                                    <th>Test statistic: value</th>
                                    <th>p-value</th>
                                    <th>Confidence interval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvidenceList.map((item, i) => {
                                    return (self.renderCaseControlEvidence(item, i));
                                })}
                                <tr>
                                    <td colSpan="12" className="total-score-label">Total points:</td>
                                    <td className="total-score-value">{this.getTotalScore(sortedEvidenceList)}</td>
                                </tr>
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
    caseControlEvidenceList: PropTypes.array,
    hpoTermList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryCaseControl;