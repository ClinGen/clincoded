'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';
import HpoTerms from '../../libs/get_hpo_term';

class GeneDiseaseEvidenceSummarySegregation extends Component {
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
     * Method to render individual table row of the logged-in user's segregation evidence
     * @param {object} evidence - segregation evidence with LOD score but without proband
     * @param {number} key - unique key
     */
    renderSegregationEvidence(evidence, key) {
        let authors;
        if (evidence.authors && evidence.authors.length) {
            if (evidence.authors.length > 1) {
                authors = evidence.authors[0] + ', et al.';
            } else {
                authors = evidence.authors[0];
            }
        }
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

    /**
     * Sort table rows given a list of evidence and column name
     */
    sortListbyColName(evidenceList, colName) {
        let sortedList = [];
        if (evidenceList.length) {
            sortedList = evidenceList.sort((x, y) =>
                x['segregationPublishedLodScore'] ? x['segregationPublishedLodScore'] : x['segregationEstimatedLodScore'] - y['segregationPublishedLodScore'] ? y['segregationPublishedLodScore'] : y['segregationEstimatedLodScore']
            );
        }
        return sortedList;
    }

    render() {
        const segregationEvidenceList = this.props.segregationEvidenceList;
        let sortedEvidenceList = this.state.mounted ? this.sortListbyColName(segregationEvidenceList) : segregationEvidenceList;
        let self = this;

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
                                    <th>Reference</th>
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
                                    return (self.renderSegregationEvidence(item, i));
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
    hpoTerms: PropTypes.object
};

export default GeneDiseaseEvidenceSummarySegregation;