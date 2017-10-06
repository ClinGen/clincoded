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
                    <strong>{evidence.evidenceType}</strong> {evidence.evidenceSubtype && evidence.evidenceSubtype.length ? <span>{evidence.evidenceSubtype}</span> : null}
                </td>
                <td className="evidence-reference">
                    <span>{evidence.authors.join(', ')}, <strong>{evidence.pubYear}</strong>, <a href={external_url_map['PubMed'] + evidence.pmid} target="_blank">PMID: {evidence.pmid}</a></span>
                </td>
                <td className="evidence-explanation">
                    {evidence.explanation}
                </td>
                <td className="evidence-score-status">
                    {<span className={evidence.scoreStatus}>{evidence.scoreStatus}</span>}
                </td>
                <td className="evidence-score">
                    {evidence.scoreStatus !== 'Contradicts' ?
                        (evidence.modifiedScore ?
                            <span><strong>{evidence.modifiedScore}</strong> ({evidence.defaultScore})</span>
                            :
                            <span><strong>{evidence.defaultScore}</strong> ({evidence.defaultScore})</span>
                        )
                        :
                        <span className={evidence.scoreStatus}>n/a</span>
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
                                    <th>Score status</th>
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
    experimentalEvidenceList: PropTypes.array
};

export default GeneDiseaseEvidenceSummaryExperimental;