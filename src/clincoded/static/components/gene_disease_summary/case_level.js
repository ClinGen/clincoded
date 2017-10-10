'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryCaseLevel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            caseLevelEvidenceList: this.props.caseLevelEvidenceList,
            hpoTermList: this.props.hpoTermList
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.caseLevelEvidenceList) {
            this.setState({caseLevelEvidenceList: nextProps.caseLevelEvidenceList});
        }
        if (nextProps.hpoTermList && nextProps.hpoTermList.length) {
            this.setState({hpoTermList: nextProps.hpoTermList});
        }
    }

    /**
     * Method to render individual table row of the logged-in user's scored evidence
     * @param {object} evidence - scored evidence and its associated case-control evidence
     * @param {number} key - unique key
     */
    renderCaseLevelEvidence(evidence, key) {
        return (
            <tr key={key} className="scored-case-level-evidence">
                <td className="evidence-variant-type">
                    {evidence.variantType}
                </td>
                <td className="evidence-variant">
                    {evidence.variants.map((variant, i) => {
                        return (
                            <div key={i} className="variant-info">
                                <span className="variant-title">
                                    {variant.clinvarVariantTitle ?
                                        variant.clinvarVariantTitle : (variant.hgvsNames && variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : variant.hgvsNames.GRCh38)
                                    }
                                </span>
                            </div>
                        );
                    })}
                </td>
                <td className="evidence-reference">
                    <span>{evidence.authors.join(', ')}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
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
                    {evidence.hpoIdInDiagnosis.length ? <span><strong>HPO term(s):</strong><br />{this.state.hpoTermList.map((term, i) => <span key={i}>{term}<br /></span>)}</span> : null}
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
        const caseLevelEvidenceList = this.state.caseLevelEvidenceList;
        let sortedEvidenceList = this.sortListbyColName(caseLevelEvidenceList, 'variantType');
        let self = this;

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
                                    <th rowSpan="2">Variant type</th>
                                    <th rowSpan="2">Variant</th>
                                    <th rowSpan="2">Reference</th>
                                    <th rowSpan="2">Proband sex</th>
                                    <th rowSpan="2">Proband age</th>
                                    <th rowSpan="2">Proband ethnicity</th>
                                    <th rowSpan="2">Proband phenotypes</th>
                                    <th colSpan="4">Segregations</th>
                                    <th rowSpan="2">Proband previous testing</th>
                                    <th rowSpan="2">Proband methods of detection</th>
                                    <th rowSpan="2">Score status</th>
                                    <th rowSpan="2">Proband score (default)</th>
                                    <th rowSpan="2">Reason for changed score</th>
                                </tr>
                                <tr>
                                    <th># Aff</th>
                                    <th># Unaff</th>
                                    <th>LOD score</th>
                                    <th>Counted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvidenceList.map((item, i) => {
                                    return (self.renderCaseLevelEvidence(item, i));
                                })}
                                <tr>
                                    <td colSpan="14" className="total-score-label">Total score:</td>
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
    hpoTermList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryCaseLevel;