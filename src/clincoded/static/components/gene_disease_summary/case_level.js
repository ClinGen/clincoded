'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';
import HpoTerms from '../../libs/get_hpo_term';
import { renderVariantTitle } from '../../libs/render_variant_title';

class GeneDiseaseEvidenceSummaryCaseLevel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            mounted: false,
            sortCol: 'variantType',
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
     * @param {object} evidence - scored evidence and its associated case-control evidence
     * @param {number} key - unique key
     */
    renderCaseLevelEvidence(evidence, key) {
        let authors = this.props.getEvidenceAuthors(evidence);

        return (
            <tr key={key} className="scored-case-level-evidence">
                <td className="evidence-label">
                    {evidence.label}
                </td>
                <td className="evidence-variant-type">
                    {evidence.variantType}
                </td>
                <td className="evidence-variant">
                    {evidence.variants.map((variant, i) => {
                        return (
                            <div key={i} className="variant-info">
                                {renderVariantTitle(variant)}
                            </div>
                        );
                    })}
                </td>
                <td className="evidence-reference">
                    <span>{authors}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-sex">
                    {evidence.sex}
                </td>
                <td className="evidence-age">
                    {evidence.ageValue ? <span>{evidence.ageType ? <strong>Age of {evidence.ageType}: </strong> : null}{evidence.ageValue} {evidence.ageUnit.length ? evidence.ageUnit : null}</span> : null}
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
                    {evidence.segregationNumAffected ? evidence.segregationNumAffected : '-'}
                </td>
                <td className="evidence-segregation-num-unaffected">
                    {evidence.segregationNumUnaffected ? evidence.segregationNumUnaffected : '-'}
                </td>
                <td className="evidence-lod-score">
                    {evidence.segregationPublishedLodScore ?
                        <span><strong>Published:</strong> {evidence.segregationPublishedLodScore}</span>
                        : 
                        <span>{evidence.segregationEstimatedLodScore ? <span><strong>Calculated:</strong> {evidence.segregationEstimatedLodScore}</span> : '-'}</span>
                    }
                </td>
                <td className="evidence-lod-score-counted">
                    {evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore ? <span>{evidence.includeLodScoreInAggregateCalculation ? 'Yes' : 'No'}</span> : '-'}
                </td>
                <td className="evidence-sequencing-method">
                    {(evidence.segregationPublishedLodScore || evidence.segregationEstimatedLodScore) && evidence.includeLodScoreInAggregateCalculation && evidence.sequencingMethod ?
                        evidence.sequencingMethod : ''}
                </td>
                <td className="evidence-previous-testing-description">
                    {evidence.previousTestingDescription}
                </td>
                <td className="evidence-detection-methods">
                    {evidence.genotypingMethods.length ?
                        evidence.genotypingMethods.map((method, i) => {
                            return (
                                <span key={i}>{i > 0 ? <span>; </span> : null}<strong>Method {i+1}:</strong> {method}</span>
                            );
                        })
                        : null}
                    {evidence.specificMutationsGenotypedMethod && evidence.specificMutationsGenotypedMethod.length ?
                        <span className="genotyping-method-description"><strong>Description of genotyping method:</strong>{evidence.specificMutationsGenotypedMethod}</span>
                        : null}
                </td>
                <td className="evidence-score-status">
                    {<span className={evidence.scoreStatus}>{evidence.scoreStatus}</span>}
                </td>
                <td className="evidence-proband-score">
                    {evidence.variantType.length ?
                        <span>
                            {evidence.scoreStatus !== 'Contradicts' ?
                                <span><strong>{typeof evidence.modifiedScore === 'number' ? evidence.modifiedScore : evidence.defaultScore}</strong>  ({evidence.defaultScore})</span>
                                :
                                <span className={evidence.scoreStatus}>n/a</span>
                            }
                        </span>
                        : null}
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
        const caseLevelEvidenceList = this.props.caseLevelEvidenceList;
        let sortedEvidenceList = this.state.mounted ? this.props.sortListByColName(caseLevelEvidenceList, this.state.sortCol, this.state.reversed) : caseLevelEvidenceList;
        let sortIconClass = {variantType: 'tcell-sort', reference: 'tcell-sort', scoreStatus: 'tcell-sort'};
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="evidence-summary panel-case-level">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case Level (variants, segregation)</h3>
                    </div>
                    {sortedEvidenceList && sortedEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Label</th>
                                    <th rowSpan="2" onClick={(e) => this.handleClickHeader(e, 'variantType')}>Variant type<span className={sortIconClass.variantType}></span></th>
                                    <th rowSpan="2">Variant</th>
                                    <th rowSpan="2" onClick={(e) => this.handleClickHeader(e, 'reference')}>Reference<span className={sortIconClass.reference}></span></th>
                                    <th rowSpan="2">Proband sex</th>
                                    <th rowSpan="2">Proband age</th>
                                    <th rowSpan="2">Proband ethnicity</th>
                                    <th rowSpan="2">Proband phenotypes</th>
                                    <th colSpan="5">Segregations</th>
                                    <th rowSpan="2">Proband previous testing</th>
                                    <th rowSpan="2">Proband methods of detection</th>
                                    <th rowSpan="2" onClick={(e) => this.handleClickHeader(e, 'scoreStatus')}>Score status<span className={sortIconClass.scoreStatus}></span></th>
                                    <th rowSpan="2">Proband points (default points)</th>
                                    <th rowSpan="2">Reason for changed score</th>
                                </tr>
                                <tr>
                                    <th># Aff</th>
                                    <th># Unaff</th>
                                    <th>LOD score</th>
                                    <th>Counted</th>
                                    <th>Sequencing</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvidenceList.map((item, i) => {
                                    return (this.renderCaseLevelEvidence(item, i));
                                })}
                                <tr>
                                    <td colSpan="16" className="total-score-label">Total points:</td>
                                    <td colSpan="2" className="total-score-value">{this.getTotalScore(sortedEvidenceList)}</td>
                                </tr>
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No scored Case Level evidence was found.</span>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryCaseLevel.propTypes = {
    caseLevelEvidenceList: PropTypes.array,
    hpoTerms: PropTypes.object,
    getEvidenceAuthors: PropTypes.func,
    sortListByColName: PropTypes.func
};

export default GeneDiseaseEvidenceSummaryCaseLevel;
