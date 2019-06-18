'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';
import HpoTerms from '../../libs/get_hpo_term';

class GeneDiseaseEvidenceSummarySegregation extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mounted: false,
            sortCol: 'lodScore',
            reversed: false
        };
    }

    componentDidMount() {
        this.setState({mounted: true});
    }

    /**
     * Handle clicks in the table column header for sorting
     * @param {string} colName - column name
     */
    handleClickHeader(event, colName) {
        let sortCol = colName;
        let reversed = false;
        if (this.state && this.state.sortCol) {
            reversed = colName === this.state.sortCol ? !this.state.reversed : false;
            this.setState({sortCol: sortCol, reversed: reversed});
        }
    }

    /**
     * Method to render individual table row of the logged-in user's segregation evidence
     * @param {object} evidence - segregation evidence with LOD score but without proband
     * @param {number} key - unique key
     */
    renderSegregationEvidence(evidence, key) {
        let authors = this.props.getEvidenceAuthors(evidence);

        return (
            <tr key={key} className="scored-segregation-evidence">
                <td className="evidence-label">
                    {evidence.label}
                </td>
                <td className="evidence-reference">
                    <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-ethnicity">
                    {evidence.ethnicity}
                </td>
                <td className="evidence-phenotypes">
                    {evidence.hpoIdInDiagnosis.length ?
                        <span><strong>HPO term(s):</strong>
                            <HpoTerms hpoIds={evidence.hpoIdInDiagnosis} hpoTerms={this.props.hpoTerms} />
                        </span> 
                        : null}
                    {evidence.termsInDiagnosis.length ? <span><strong>free text:</strong><br />{evidence.termsInDiagnosis}</span> : null}
                </td>
                <td className="evidence-segregation-num-affected">
                    {evidence.segregationNumAffected}
                </td>
                <td className="evidence-segregation-num-unaffected">
                    {evidence.segregationNumUnaffected}
                </td>
                <td className="evidence-lod-score">
                    {evidence.segregationPublishedLodScore ?
                        <span><strong>Published:</strong> {evidence.segregationPublishedLodScore}</span>
                        : 
                        (evidence.segregationEstimatedLodScore ? <span><strong>Calculated:</strong> {evidence.segregationEstimatedLodScore}</span> : '-')
                    }
                </td>
                <td className="evidence-lod-score-counted">
                    {evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore ? <span>{evidence.includeLodScoreInAggregateCalculation ? 'Yes' : 'No'}</span> : '-'}
                </td>
                <td className="evidence-sequencing-method">
                    {(evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore) && evidence.includeLodScoreInAggregateCalculation && evidence.sequencingMethod ?
                        evidence.sequencingMethod : ''}
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
            let score;
            if (item.includeLodScoreInAggregateCalculation) {
                if (typeof item.segregationPublishedLodScore === 'number') {
                    score = item.segregationPublishedLodScore;
                } else if (typeof item.segregationEstimatedLodScore === 'number') {
                    score = item.segregationEstimatedLodScore;
                }
                allScores.push(score);
            }
        });
        const totalScore = allScores.reduce((a, b) => a + b, 0);
        return parseFloat(totalScore).toFixed(2);
    }

    render() {
        const segregationEvidenceList = this.props.segregationEvidenceList;
        let sortedEvidenceList = this.state.mounted ? this.props.sortListByColName(segregationEvidenceList, this.state.sortCol, this.state.reversed) : segregationEvidenceList;
        let sortIconClass = {reference: 'tcell-sort'};
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="evidence-summary panel-case-level-segregation">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case Level (family segregation information without proband data or scored proband data)</h3>
                    </div>
                    {sortedEvidenceList && sortedEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    <th onClick={(e) => this.handleClickHeader(e, 'reference')}>Reference<span className={sortIconClass.reference}></span></th>
                                    <th>Family ethnicity</th>
                                    <th>Family phenotypes</th>
                                    <th>Number of affected individuals</th>
                                    <th>Number of unaffected individuals</th>
                                    <th>LOD score</th>
                                    <th>LOD score counted</th>
                                    <th>Sequencing method</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvidenceList.map((item, i) => {
                                    return (this.renderSegregationEvidence(item, i));
                                })}
                                <tr>
                                    <td colSpan="6" className="total-score-label">Total LOD score:</td>
                                    <td colSpan="3" className="total-score-value">{this.getTotalScore(sortedEvidenceList)}</td>
                                </tr>
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No segregation evidence for a Family without a proband was found.</span>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummarySegregation.propTypes = {
    segregationEvidenceList: PropTypes.array,
    hpoTerms: PropTypes.object,
    getEvidenceAuthors: PropTypes.func,
    sortListByColName: PropTypes.func
};

export default GeneDiseaseEvidenceSummarySegregation;
