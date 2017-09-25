'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryCaseLevel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            caseLevelEvidenceList: this.props.caseLevelEvidenceList
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.caseLevelEvidenceList) {
            this.setState({caseLevelEvidenceList: nextProps.caseLevelEvidenceList});
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
                    {evidence.ageValue ? <span>{evidence.ageValue} {evidence.ageUnit.length ? evidence.ageUnit : null}</span> : null}
                </td>
                <td className="evidence-ethnicity">
                    {evidence.ethnicity}
                </td>
                <td className="evidence-phenotypes">
                    {evidence.hpoIdInDiagnosis.length ? evidence.hpoIdInDiagnosis.join(', ') : null}
                    {evidence.hpoIdInDiagnosis.length && evidence.termsInDiagnosis.length ? <span>; </span> : null}
                    {evidence.termsInDiagnosis}
                </td>
                <td className="evidence-segregation-num-affected">
                    {evidence.segregationNumAffected}
                </td>
                <td className="evidence-segregation-num-unaffected">
                    {evidence.segregationNumUnaffected}
                </td>
                <td className="evidence-lod-score">
                    {evidence.segregationLodScore}
                </td>
                <td className="evidence-lod-score-counted">
                    {evidence.segregationLodScore ?
                        <span>{evidence.includeLodScoreInAggregateCalculation ? 'Yes' : 'No'}</span>
                        : null}
                </td>
                <td className="evidence-previous-testing">
                    {evidence.previousTesting}
                </td>
                <td className="evidence-detection-methods">
                    {evidence.genotypingMethods.length ? evidence.genotypingMethods.join(', ') : null}
                </td>
                <td className="evidence-proband-score">
                    {evidence.scoreStatus !== 'Contradicts' ?
                        (evidence.modifiedScore ?
                            <span>{evidence.modifiedScore} ({evidence.defaultScore})</span>
                            :
                            <span>{evidence.defaultScore} ({evidence.defaultScore})</span>
                        )
                        :
                        <span>{evidence.scoreStatus}</span>
                    }
                </td>
            </tr>
        );
    }

    render() {
        const caseLevelEvidenceList = this.state.caseLevelEvidenceList;
        let self = this;

        return (
            <div className="evidence-summary panel-case-level">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case Level (variants, segregation)</h3>
                    </div>
                    {caseLevelEvidenceList && caseLevelEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Variant type</th>
                                    <th rowSpan="2">Variant</th>
                                    <th rowSpan="2">Reference</th>
                                    <th rowSpan="2">Sex</th>
                                    <th rowSpan="2">Age</th>
                                    <th rowSpan="2">Ethnicity</th>
                                    <th rowSpan="2">Phenotypes</th>
                                    <th colSpan="4">Segregations</th>
                                    <th rowSpan="2">Previous testing</th>
                                    <th rowSpan="2">Methods of detection</th>
                                    <th rowSpan="2">Proband score (default)</th>
                                </tr>
                                <tr>
                                    <th># Aff</th>
                                    <th># Unaff</th>
                                    <th>LOD score</th>
                                    <th>Counted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {caseLevelEvidenceList.map((item, i) => {
                                    return (self.renderCaseLevelEvidence(item, i));
                                })}
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
    caseLevelEvidenceList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryCaseLevel;