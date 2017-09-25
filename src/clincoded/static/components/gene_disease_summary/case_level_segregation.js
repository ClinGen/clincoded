'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class GeneDiseaseEvidenceSummarySegregation extends Component {
    constructor(props) {
        super(props);
        this.state = {
            segregationEvidenceList: this.props.segregationEvidenceList
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.segregationEvidenceList) {
            this.setState({segregationEvidenceList: nextProps.segregationEvidenceList});
        }
    }

    /**
     * Method to render individual table row of the logged-in user's segregation evidence
     * @param {object} evidence - segregation evidence with LOD score but without proband
     * @param {number} key - unique key
     */
    renderSegregationEvidence(evidence, key) {
        return (
            <tr key={key} className="scored-segregation-evidence">
                <td className="evidence-segregation-num-affected">
                    {evidence.segregationNumAffected}
                </td>
                <td className="evidence-segregation-num-unaffected">
                    {evidence.segregationNumUnaffected}
                </td>
                <td className="evidence-published-lod-score">
                    {evidence.segregationPublishedLodScore}
                </td>
                <td className="evidence-estimated-lod-score">
                    {evidence.segregationEstimatedLodScore}
                </td>
                <td className="evidence-lod-score-counted">
                    {evidence.includeLodScoreInAggregateCalculation ? 'Yes' : 'No'}
                </td>
            </tr>
        );
    }

    render() {
        const segregationEvidenceList = this.state.segregationEvidenceList;
        let self = this;

        return (
            <div className="evidence-summary panel-experimental">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Genetic Evidence: Case Level (segregation without proband)</h3>
                    </div>
                    {segregationEvidenceList && segregationEvidenceList.length ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Number of affected individuals</th>
                                    <th>Number of unaffected individuals</th>
                                    <th>Published LOD score</th>
                                    <th>Estimated LOD score</th>
                                    <th>LOD score counted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {segregationEvidenceList.map((item, i) => {
                                    return (self.renderSegregationEvidence(item, i));
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

GeneDiseaseEvidenceSummarySegregation.propTypes = {
    segregationEvidenceList: PropTypes.array
};

export default GeneDiseaseEvidenceSummarySegregation;