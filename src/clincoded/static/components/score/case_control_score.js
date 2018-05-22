'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { userScore } from './helpers/user_score';
import { affiliationScore } from './helpers/affiliation_score';

// Render scoring panel in Gene Curation Interface
var ScoreCaseControl = module.exports.ScoreCaseControl = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        session: PropTypes.object, // Session object passed from parent
        evidence: PropTypes.object, // Individual, Experimental or Case Control
        evidenceType: PropTypes.string, // 'Individual', 'Experimental' or 'Case control'
        handleUserScoreObj: PropTypes.func, // Function to call create/update score object
        scoreSubmit: PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        submitBusy: PropTypes.bool, // TRUE while the form submit is running
        affiliation: PropTypes.object, // Affiliation object passed from parent
        isDisabled: PropTypes.bool // Boolean for the state (disabled or not) of the input field
    },

    getInitialState() {
        return {
            evidenceScores: [], // One or more scores
            modifiedScore: null, // Score that is selected by curator
            userScoreUuid: null, // Pre-existing logged-in user's score uuuid
            submitBusy: false, // TRUE while form is submitting
            scoreAffiliation: null // Affiliation associated with the score
        };
    },

    componentDidMount() {
        this.loadData();
    },

    componentWillReceiveProps(nextProps) {
        if (!this.props.isDisabled && nextProps.isDisabled && this.state.modifiedScore) {
            this.setState({modifiedScore: null}, () => {
                this.refs.scoreRange.resetValue();
                this.updateUserScoreObj();
            });
        }
    },

    loadData() {
        // Prep the following when the component is loaded
        let evidenceObj = this.props.evidence;

        // Get evidenceScore object for the logged-in user if exists
        if (evidenceObj && evidenceObj.scores && evidenceObj.scores.length) {
            this.setState({evidenceScores: evidenceObj.scores}, () => {
                let userAffiliatedScore = this.getUserAffiliatedScore(evidenceObj.scores);
                let loggedInUserScore = this.getUserScore(evidenceObj.scores);
                let matchedScore;
                if (userAffiliatedScore) {
                    matchedScore = userAffiliatedScore;
                    this.setState({scoreAffiliation: this.props.affiliation.affiliation_id});
                } else {
                    matchedScore = loggedInUserScore && !loggedInUserScore.affiliation && !this.props.affiliation ? loggedInUserScore : null;
                }
                if (matchedScore) {
                    this.setState({userScoreUuid: matchedScore.uuid});
                    if (matchedScore.hasOwnProperty('score')) {
                        let modifiedScore = matchedScore.hasOwnProperty('score') ? matchedScore.score.toString() : null;
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
        let scoreAffiliation = this.state.scoreAffiliation;

        let newUserScoreObj = {};

        if (score && score !== 'none') {
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

            // Add affiliation to score object
            // if the user is associated with an affiliation
            // and if the data object has no affiliation
            // and only when there is score data to be saved
            if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                if (scoreAffiliation && scoreAffiliation.length) {
                    newUserScoreObj['affiliation'] = scoreAffiliation;
                } else {
                    newUserScoreObj['affiliation'] = this.props.affiliation.affiliation_id;
                }
            }

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

    // Find the score associated with the currently logged-in user's affiliation
    getUserAffiliatedScore(evidenceScores) {
        let affiliatedScore;
        let affiliationId = this.props.affiliation && this.props.affiliation.affiliation_id;

        if (evidenceScores && evidenceScores.length) {
            affiliatedScore = affiliationScore(evidenceScores, affiliationId);
        }

        return affiliatedScore;
    },

    render() {
        let modifiedScore = this.state.modifiedScore ? this.state.modifiedScore : 'none';
 
        return (
            <div>
                <div className="row">
                    <Input type="select" ref="scoreRange" label="Score:"  handleChange={this.handleScoreRangeChange}
                        defaultValue={modifiedScore} value={modifiedScore} inputDisabled={this.props.isDisabled}
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
