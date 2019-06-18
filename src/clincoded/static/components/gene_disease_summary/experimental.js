'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryExperimental extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mounted: false,
            sortCol: 'evidenceType',
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
     * Method to render individual table row of the logged-in user's scored evidence
     * @param {object} evidence - scored evidence and its associated experimental evidence
     * @param {number} key - unique key
     */
    renderExperimentalEvidence(evidence, key) {
        let authors = this.props.getEvidenceAuthors(evidence);

        return (
            <tr key={key} className="scored-experimental-evidence">
                <td className="evidence-label">
                    {evidence.label}
                </td>
                <td className="evidence-category">
                    <strong>{evidence.evidenceType}</strong> {evidence.evidenceSubtype && evidence.evidenceSubtype.length ? <span>{evidence.evidenceSubtype}</span> : null}
                </td>
                <td className="evidence-reference">
                    <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-explanation">
                    {evidence.explanation}
                </td>
                <td className="evidence-score-status">
                    {<span className={evidence.scoreStatus}>{evidence.scoreStatus}</span>}
                </td>
                <td className="evidence-score">
                    {evidence.scoreStatus !== 'Contradicts' ?
                        <span><strong>{typeof evidence.modifiedScore === 'number' ? evidence.modifiedScore : evidence.defaultScore}</strong> ({evidence.defaultScore})</span>
                        :
                        <span className={evidence.scoreStatus}>n/a</span>
                    }
                </td>
                <td className="evidence-score-explanation">
                    {evidence.scoreExplanation}
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
            if (item.scoreStatus.indexOf('Score') > -1) {
                score = typeof item.modifiedScore === 'number' ? item.modifiedScore : item.defaultScore;
                allScores.push(score);
            }
        });
        const totalScore = allScores.reduce((a, b) => a + b, 0);
        return parseFloat(totalScore).toFixed(2);
    }

    render() {
        const experimentalEvidenceList = this.props.experimentalEvidenceList;
        let sortedEvidenceList = this.state.mounted ? this.props.sortListByColName(experimentalEvidenceList, this.state.sortCol, this.state.reversed) : experimentalEvidenceList;
        let sortIconClass = {evidenceType: 'tcell-sort', reference: 'tcell-sort', scoreStatus: 'tcell-sort'};
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="evidence-summary panel-experimental">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Experimental Evidence</h3>
                    </div>
                    {sortedEvidenceList && sortedEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    <th onClick={(e) => this.handleClickHeader(e, 'evidenceType')}>Experimental category<span className={sortIconClass.evidenceType}></span></th>
                                    <th onClick={(e) => this.handleClickHeader(e, 'reference')}>Reference<span className={sortIconClass.reference}></span></th>
                                    <th>Explanation</th>
                                    <th onClick={(e) => this.handleClickHeader(e, 'scoreStatus')}>Score status<span className={sortIconClass.scoreStatus}></span></th>
                                    <th>Points (default points)</th>
                                    <th>Reason for changed score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvidenceList.map((item, i) => {
                                    return (this.renderExperimentalEvidence(item, i));
                                })}
                                <tr>
                                    <td colSpan="5" className="total-score-label">Total points:</td>
                                    <td colSpan="2" className="total-score-value">{this.getTotalScore(sortedEvidenceList)}</td>
                                </tr>
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No Experimental evidence was found.</span>
                        </div>
                    }
                    <div className="panel-footer">
                        <p><strong>Biochemical Function</strong>: The gene product performs a biochemical function shared with other known genes in the disease of interest (A), OR the gene product is consistent with the observed phenotype(s) (B)</p>
                        <p><strong>Protein Interactions</strong>: The gene product interacts with proteins previously implicated (genetically or biochemically) in the disease of interest</p>
                        <p><strong>Expression</strong>: The gene is expressed in tissues relevant to the disease of interest (A), OR the gene is altered in expression in patients who have the disease (B)</p>
                        <p><strong>Functional Alteration of gene/gene product</strong>: The gene and/or gene product function is demonstrably altered in cultured patient or non-patient cells carrying candidate variant(s)</p>
                        <p><strong>Model Systems</strong>: Non-human model organism OR cell culture model with a similarly disrupted copy of the affected gene shows a phenotype consistent with human disease state</p>
                        <p><strong>Rescue</strong>: The phenotype in humans, non-human model organisms, cell culture models, or patient cells can be rescued by exogenous wild-type gene or gene product</p>
                    </div>
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryExperimental.propTypes = {
    experimentalEvidenceList: PropTypes.array,
    getEvidenceAuthors: PropTypes.func,
    sortListByColName: PropTypes.func
};

export default GeneDiseaseEvidenceSummaryExperimental;
