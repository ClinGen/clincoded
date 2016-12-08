'use strict';

import React, { PropTypes } from 'react';
import CASE_INFO_TYPES from './constants/case_info_types';
import { userScore } from './helpers/user_score';

var _ = require('underscore');

// Render scores viewer in Gene Curation Interface
var ScoreViewer = module.exports.ScoreViewer = React.createClass({
    propTypes: {
        evidence: React.PropTypes.object, // Individual, Experimental or Case Control
        otherScores: React.PropTypes.bool // TRUE if we only want show scores by others
    },

    getInitialState() {
        return {
            evidenceScores: [] // One or more scores
        };
    },

    componentDidMount() {
        this.loadData();
    },

    loadData() {
        let evidenceObj = this.props.evidence;
        // Get evidenceScore object for the logged-in user if exists
        if (evidenceObj.scores && evidenceObj.scores.length) {
            this.setState({evidenceScores: evidenceObj.scores});
        }
    },

    // Find the scores owned by other users
    getOtherScores(evidenceScores) {
        let validScores = [], filteredScores = [];
        let user = this.props.session && this.props.session.user_properties;
        let otherScores = this.props.otherScores;

        if (evidenceScores && evidenceScores.length) {
            if (otherScores) {
                filteredScores = evidenceScores.filter(score => {
                    return score.submitted_by.uuid !== user.uuid;
                });
            } else {
                filteredScores = evidenceScores;
            }
        }
        // Insanity check for erroneous score objects with Score Status value as 'none' 
        _.map(filteredScores, score => {
            if (score.scoreStatus !== 'none') {
                validScores.push(score);
            }
        });

        return validScores;
    },

    render() {
        // states
        let evidenceScores = this.state.evidenceScores;

        // variables
        let scores = this.getOtherScores(evidenceScores);

        return (
            <div className="row">
                {scores.map((item, i) => {
                    return (
                        <div key={i} className="variant-view-panel">
                            <h5>{item.submitted_by.title}</h5>
                            {item.scoreStatus && item.scoreStatus === 'Score' ?
                                <div>
                                    <dl className="dl-horizontal">
                                        <dt>Score Status</dt>
                                        <dd>{item.scoreStatus}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Variant Kind</dt>
                                        <dd>{item.caseInfoType ? renderCaseInfoType(item.caseInfoType) : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Default Score</dt>
                                        <dd>{item.calculatedScore ? item.calculatedScore : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Changed Score</dt>
                                        <dd>{item.score ? item.score : null}</dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Reaon(s) for score change</dt>
                                        <dd>{item.scoreExplanation ? item.scoreExplanation : null}</dd>
                                    </dl>
                                </div>
                                :
                                <div><dl className="dl-horizontal"><dt>Score Status</dt><dd>{item.scoreStatus}</dd></dl></div>
                            }
                        </div>
                    );
                })}
            </div>
        );
    },
});

// Transform the stored Case Information type 'value' into 'description'
function renderCaseInfoType(value) {
    let description;
    // Put CASE_INFO_TYPES object keys into an array
    const caseInfoTypeKeys = Object.keys(CASE_INFO_TYPES);
    // Use the 'OTHER' group because it has all 5 Case Information types
    let caseInfoTypeGroup = CASE_INFO_TYPES.OTHER;
    // Assign different number of variant kinds given a matched modeInheritance
    caseInfoTypeGroup.forEach(item => {
        if (value === item.TYPE) {
            description = item.DESCRIPTION;
        }
    });

    return description;
}
