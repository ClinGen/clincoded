'use strict';

import React, { PropTypes } from 'react';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { userScore } from './helpers/user_score';

// Render scoring panel in Gene Curation Interface
var ScoreCaseControl = module.exports.ScoreCaseControl = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        session: React.PropTypes.object, // Session object passed from parent
        evidence: React.PropTypes.object, // Individual, Experimental or Case Control
        evidenceType: React.PropTypes.string, // 'Individual', 'Experimental' or 'Case control'
        handleUserScoreObj: React.PropTypes.func, // Function to call create/update score object
        scoreSubmit: React.PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        submitBusy: React.PropTypes.bool // TRUE while the form submit is running
    },

    getInitialState() {
        return {
            evidenceScores: [], // One or more scores
            modifiedScore: null, // Score that is selected by curator
            userScoreUuid: null, // Pre-existing logged-in user's score uuuid
            submitBusy: false // TRUE while form is submitting
        };
    },

    componentDidMount() {
        this.loadData();
    },

    loadData() {
        // Prep the following when the component is loaded
        let evidenceObj = this.props.evidence;

        // Get evidenceScore object for the logged-in user if exists
        if (evidenceObj && evidenceObj.scores && evidenceObj.scores.length) {
            this.setState({evidenceScores: evidenceObj.scores}, () => {
                let loggedInUserScore = this.getUserScore(evidenceObj.scores);
                if (loggedInUserScore) {
                    this.setState({userScoreUuid: loggedInUserScore.uuid});
                    if (loggedInUserScore.hasOwnProperty('score')) {
                        let modifiedScore = loggedInUserScore.score.toString();
                        this.setState({modifiedScore: !isNaN(parseFloat(modifiedScore)) ? modifiedScore : null}, () => {
                            this.refs.scoreRange.setValue(modifiedScore ? modifiedScore : 'none');
                            this.updateUserScoreObj();
                        });
                    }
                }
            });
        }
    },

    handleScoreRangeChange(e) {
        if (this.refs.scoreRange) {
            // Parse the modified score selected by the curator
            let selectedModifiedScore = this.refs.scoreRange.getValue();
            if (!isNaN(parseFloat(selectedModifiedScore))) {
                this.setState({modifiedScore: selectedModifiedScore}, () => {
                    this.updateUserScoreObj();
                });
            } else {
                this.setState({modifiedScore: null}, () => {
                    this.updateUserScoreObj();
                });
            } 
        }
    },

    // Put together the score object based on the form values for
    // the currently logged-in user
    updateUserScoreObj() {
        let score = this.state.modifiedScore;
        let evidenceType = this.props.evidenceType;
        let scoreUuid = this.state.userScoreUuid;
        let evidenceScored = this.props.evidence ? this.props.evidence.uuid : null;

        let newUserScoreObj = {};

        if (score) {
            newUserScoreObj['score'] = parseFloat(score);
        } else {
            if ('score' in newUserScoreObj) {
                delete newUserScoreObj['score'];
            }
        }

        if (evidenceType && evidenceType.length) {
            newUserScoreObj['evidenceType'] = evidenceType;
        }

        if (scoreUuid && scoreUuid.length) {
            newUserScoreObj['uuid'] = scoreUuid;
        }

        if (evidenceScored && evidenceScored.length) {
            newUserScoreObj['evidenceScored'] = evidenceScored;
        }

        // Call parent function to update user object state
        if (Object.keys(newUserScoreObj).length) {
            this.props.handleUserScoreObj(newUserScoreObj);
        }
    },

    // Find the score owned by the currently logged-in user
    getUserScore(evidenceScores) {
        let loggedInUserScore;
        let user = this.props.session && this.props.session.user_properties;

        if (evidenceScores && evidenceScores.length) {
            loggedInUserScore = userScore(evidenceScores, user && user.uuid);
        }

        return loggedInUserScore;
    },

    render() {
        let modifiedScore = this.state.modifiedScore ? this.state.modifiedScore : 'none';
 
        return (
            <div>
                <div className="row">
                    <Input type="select" ref="scoreRange" label="Score:"  handleChange={this.handleScoreRangeChange}
                        defaultValue={modifiedScore} value={modifiedScore}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="0">0</option>
                        <option value="0.5">0.5</option>
                        <option value="1">1</option>
                        <option value="1.5">1.5</option>
                        <option value="2">2</option>
                        <option value="2.5">2.5</option>
                        <option value="3">3</option>
                        <option value="3.5">3.5</option>
                        <option value="4">4</option>
                        <option value="4.5">4.5</option>
                        <option value="5">5</option>
                        <option value="5.5">5.5</option>
                        <option value="6">6</option>
                    </Input>
                </div>
                {this.props.scoreSubmit ?
                    <div className="curation-submit clearfix">
                        <Input type="button" inputClassName="btn-primary pull-right" clickHandler={this.props.scoreSubmit}
                        title="Save" submitBusy={this.props.submitBusy} />
                    </div>
                : null}
            </div>
        );
    },
});
