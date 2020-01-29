import React, { Component } from 'react';
import PropTypes from 'prop-types';

import * as curator from '../curator';

const PmidSummary = curator.PmidSummary;

const propTypes = {
    nonscorableEvidenceList: PropTypes.array,
};

const defaultProps = {
    nonscorableEvidenceList: [],
};

const GeneDiseaseEvidenceSummaryNonscorableEvidence = ({
    nonscorableEvidenceList,
}) => (
    <div className="evidence-summary panel-case-control">
        <div className="panel panel-info">
            <div className="panel-heading">
                <h3 className="panel-title">Non-scorable Evidence</h3>
            </div>
            {
                nonscorableEvidenceList && nonscorableEvidenceList.length
                    ? (
                        <table className="table">
                            <tbody>
                                {
                                    nonscorableEvidenceList.map(evidence => (
                                        <tr key={evidence.article.pmid}>
                                            <td>
                                                <span><strong>{ `PMID: ${evidence.article.pmid}` }</strong></span>
                                                <PmidSummary article={evidence.article} displayJournal />
                                                <span>
                                                    <strong>Explanation: </strong>
                                                    {
                                                        evidence.articleNotes && evidence.articleNotes.nonscorable && evidence.articleNotes.nonscorable.text
                                                            ? <span>{ evidence.articleNotes.nonscorable.text }</span>
                                                            : <span>None</span>
                                                    }
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    ) : (
                        <div className="panel-body">
                            <span>No non-scorable evidence was found.</span>
                        </div>
                    )
            }
        </div>
    </div>
);

GeneDiseaseEvidenceSummaryNonscorableEvidence.propTypes = propTypes;
GeneDiseaseEvidenceSummaryNonscorableEvidence.defaultProps = defaultProps;

export default GeneDiseaseEvidenceSummaryNonscorableEvidence;