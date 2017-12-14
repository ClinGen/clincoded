'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import CASE_INFO_TYPES from './constants/case_info_types';
import { getAffiliationName } from '../../libs/get_affiliation_name';

var _ = require('underscore');

// Render scores viewer in Gene Curation Interface
var ScoreViewer = module.exports.ScoreViewer = createReactClass({
    propTypes: {
        session: PropTypes.object, // Session object passed from parent
        evidence: PropTypes.object, // Individual, Experimental or Case Control
        otherScores: PropTypes.bool, // TRUE if we only want show scores by others
        affiliation: PropTypes.object // Affiliation object passed from parent
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
        let affiliation = this.props.affiliation;

        if (evidenceScores && evidenceScores.length) {
            if (otherScores) {
                filteredScores = evidenceScores.filter(score => {
                    if (affiliation && Object.keys(affiliation).length) {
                        return !score.affiliation || score.affiliation !== affiliation.affiliation_id;
                    } else {
                        return score.submitted_by.uuid !== user.uuid || score.affiliation;
                    }
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
        let affiliation = this.props.affiliation;

        return (
            <div className="row">
                {scores.map((item, i) => {
                    return (
                        <div key={i} className="evidence-score-list-viewer">
                            <h5>Curator: {item.affiliation ? getAffiliationName(item.affiliation) : item.submitted_by.title}</h5>
                            <div>
                                {item.scoreStatus && item.scoreStatus !== 'none' && this.props.evidence['@type'][0] !== 'caseControl' ?
                                    <dl className="dl-horizontal">
                                        <dt>Score Status</dt>
                                        <dd>{item.scoreStatus}</dd>
                                    </dl>
                                    : null}
                                {item.caseInfoType ?
                                    <dl className="dl-horizontal">
                                        <dt>Case Information Type</dt>
                                        <dd>{renderCaseInfoType(item.caseInfoType)}</dd>
                                    </dl>
                                    : null}
                                {item.calculatedScore ?
                                    <dl className="dl-horizontal">
                                        <dt>Default Score</dt>
                                        <dd>{item.calculatedScore}</dd>
                                    </dl>
                                    : null}
                                {item.score ?
                                    <dl className="dl-horizontal">
                                        <dt>Changed Score</dt>
                                        <dd>{item.score}</dd>
                                    </dl>
                                    : null}
                                {item.scoreExplanation ?
                                    <dl className="dl-horizontal">
                                        <dt>Reaon(s) for score change</dt>
                                        <dd>{item.scoreExplanation}</dd>
                                    </dl>
                                    : null}
                            </div>
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
