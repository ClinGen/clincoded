'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

class GeneDiseaseEvidenceSummaryExperimental extends Component {
    constructor(props) {
        super(props);
        this.state = {
            experimentalEvidenceList: this.props.experimentalEvidenceList
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.experimentalEvidenceList) {
            this.setState({experimentalEvidenceList: nextProps.experimentalEvidenceList});
        }
    }

    /**
     * Method to render individual table row of the logged-in user's scored evidence
     * @param {object} evidence - scored evidence and its associated experimental evidence
     * @param {number} key - unique key
     */
    renderExperimentalEvidence(evidence, key) {
        return (
            <tr key={key} className="scored-experimental-evidence">
                <td className="evidence-category">
                    {evidence.evidenceType} {evidence.evidenceSubtype && evidence.evidenceSubtype.length ? <span>({evidence.evidenceSubtype})</span> : null}
                </td>
                <td className="evidence-reference">
                    <span>{evidence.authors.join(', ')}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-explanation">
                    {evidence.explanation}
                </td>
                <td className="evidence-score">
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
        const experimentalEvidenceList = this.state.experimentalEvidenceList;
        let self = this;

        return (
            <div className="evidence-summary panel-experimental">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Experimental Evidence</h3>
                    </div>
                    {experimentalEvidenceList && experimentalEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Experimental category</th>
                                    <th>Reference</th>
                                    <th>Explanation</th>
                                    <th>Score (default score)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {experimentalEvidenceList.map((item, i) => {
                                    return (self.renderExperimentalEvidence(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body">
                            <span>No scored Experimental evidence was found.</span>
                        </div>
                    }
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryExperimental.propTypes = {
    experimentalEvidenceList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryExperimental;