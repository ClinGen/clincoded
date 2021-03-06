'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { FUNCTION, FUNCTIONAL_ALTERATION, MODEL_SYSTEMS, RESCUE } from './constants/evidence_types';
import { defaultScore } from './helpers/default_score';
import { scoreRange } from './helpers/score_range';
import { userScore } from './helpers/user_score';
import { affiliationScore } from './helpers/affiliation_score';

// Render scoring panel in Gene Curation Interface
var ScoreExperimental = module.exports.ScoreExperimental = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        session: PropTypes.object, // Session object passed from parent
        evidence: PropTypes.object, // Individual, Experimental or Case Control
        experimentalType: PropTypes.string, // Experimental types
        experimentalEvidenceType: PropTypes.string, // Experimental evidence types
        evidenceType: PropTypes.string, // 'Individual', 'Experimental' or 'Case control'
        handleUserScoreObj: PropTypes.func, // Function to call create/update score object
        scoreSubmit: PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        submitBusy: PropTypes.bool, // TRUE while the form submit is running
        formError: PropTypes.bool, // TRUE if no explanation is given for a different score
        scoreDisabled: PropTypes.bool, // FALSE if the matched checkbox is selected
        affiliation: PropTypes.object // Affiliation object passed from parent
    },

    getInitialState() {
        return {
            evidenceScores: [], // One or more scores
            userScoreUuid: null, // Pre-existing logged-in user's score uuuid
            experimentalType: this.props.experimentalType, // Experimental types
            experimentalEvidenceType: this.props.experimentalEvidenceType, // Types of experimental evidence
            scoreStatus: null, // Score status that allow scoring (e.g. 'Score', 'Review')
            defaultScore: null, // Calculated default score given the 'Score Status' or 'Case Information type'
            modifiedScore: null, // Score that is selected by curator and it is different from the calculated default score
            scoreRange: [], // Calculated score range
            scoreExplanation: null, // Explanation for selecting a different score from the calculated default score
            showScoreInput: false, // TRUE if either 'Score' or 'Review' is selected
            updateDefaultScore: false, // TRUE if either 'Score Status' or 'Case Information type' are changed
            requiredScoreExplanation: false, // TRUE if a different score is selected from the range
            submitBusy: false, // TRUE while form is submitting
            disableScoreStatus: this.props.scoreDisabled, // FALSE if the matched checkbox is selected
            willNotCountScore: false, // TRUE if 'Review' is selected when Mode of Inheritance is not AD, AR, or X-Linked
            formError: false, // TRUE if no explanation is given for a different score
            scoreAffiliation: null // Affiliation associated with the score
        };
    },

    componentDidMount() {
        this.loadData();
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.experimentalType !== this.props.experimentalType) {
            this.setState({experimentalType: nextProps.experimentalType, scoreStatus: null, showScoreInput: false}, () => {
                this.refs.scoreStatus.resetValue();
            });
        }
        if (nextProps.experimentalEvidenceType !== this.props.experimentalEvidenceType) {
            this.setState({experimentalEvidenceType: nextProps.experimentalEvidenceType, scoreStatus: null, showScoreInput: false}, () => {
                this.refs.scoreStatus.resetValue();
            });
        }
        if (nextProps.formError && nextProps.formError !== this.props.formError) {
            this.setState({formError: true});
        }
        this.setState({disableScoreStatus: nextProps.scoreDisabled}, () => {
            if (this.state.disableScoreStatus) {
                this.setState({showScoreInput: false}, () => {
                    this.refs.scoreStatus.resetValue();
                });
            }
        });
    },

    loadData() {
        let experimentalEvidenceType = this.getExperimentalEvidenceType(this.state.experimentalType, this.state.experimentalEvidenceType);
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
                    // Render or remove the default score, score range, and explanation fields
                    let scoreStatus = matchedScore.scoreStatus,
                        defaultScore = matchedScore.calculatedScore,
                        modifiedScore = matchedScore.hasOwnProperty('score') ? matchedScore.score.toString() : null,
                        scoreExplanation = matchedScore.scoreExplanation,
                        calcScoreRange = this.getScoreRange(experimentalEvidenceType, parseFloat(defaultScore));
                    /**************************************************************************************/
                    /* Curators are allowed to access the score form fields when the 'Score' is selected, */
                    /* or when 'Review' is selected given the matched Mode of Inheritance types           */
                    /* (although its score won't be counted from the summary).                            */
                    /**************************************************************************************/
                    if (scoreStatus && (scoreStatus === 'Score' || scoreStatus === 'Review')) {
                        // Setting UI and score object property states
                        this.setState({
                            showScoreInput: true,
                            willNotCountScore: scoreStatus === 'Review' ? true : false,
                            scoreRange: calcScoreRange,
                            requiredScoreExplanation: !isNaN(parseFloat(modifiedScore)) && scoreExplanation.length ? true : false,
                            scoreStatus: scoreStatus,
                            defaultScore: parseFloat(defaultScore) ? defaultScore : null,
                            modifiedScore: !isNaN(parseFloat(modifiedScore)) ? modifiedScore : null,
                            scoreExplanation: scoreExplanation ? scoreExplanation : null
                        }, () => {
                            // Populate input and select option values
                            this.refs.scoreStatus.setValue(scoreStatus);
                            this.refs.scoreRange.setValue(modifiedScore && calcScoreRange ? modifiedScore : 'none');
                            this.refs.scoreExplanation.setValue(scoreExplanation ? scoreExplanation : '');
                            this.updateUserScoreObj();
                        });
                    } else {
                        this.setState({
                            showScoreInput: false,
                            scoreStatus: scoreStatus ? scoreStatus : null,
                            scoreExplanation: scoreExplanation ? scoreExplanation : null
                        }, () => {
                            this.refs.scoreStatus.setValue(scoreStatus ? scoreStatus : 'none');
                            if (this.refs.scoreExplanation) this.refs.scoreExplanation.setValue(scoreExplanation ? scoreExplanation : '');
                            this.updateUserScoreObj();
                        });
                    }
                }
            });
        }
    },

    handleScoreStatusChange(e) {
        let experimentalEvidenceType = this.getExperimentalEvidenceType(this.state.experimentalType, this.state.experimentalEvidenceType);
        if (this.refs.scoreStatus) {
            // Render or remove the default score, score range, and explanation fields
            // Parse score status value and set the state
            let selectedScoreStatus = this.refs.scoreStatus.getValue();
            this.setState({scoreStatus: selectedScoreStatus});
            if (selectedScoreStatus === 'Score' || selectedScoreStatus === 'Review') {
                selectedScoreStatus === 'Review' ? this.setState({willNotCountScore: true}) : this.setState({willNotCountScore: false});
                let calcDefaultScore = this.getDefaultScore(experimentalEvidenceType, null, this.state.updateDefaultScore);
                // Reset the states and update the calculated default score
                // Reset score range dropdown options if any changes
                // Reset explanation if score status is changed
                this.setState({
                    showScoreInput: true,
                    defaultScore: calcDefaultScore,
                    modifiedScore: null,
                    scoreExplanation: null,
                    requiredScoreExplanation: false,
                    formError: false,
                    updateDefaultScore: true
                }, () => {
                    let calcScoreRange = this.getScoreRange(experimentalEvidenceType, calcDefaultScore);
                    this.setState({scoreRange: calcScoreRange}, () => {
                        if (this.refs.scoreRange && this.refs.scoreRange.getValue()) {
                            this.refs.scoreRange.resetValue();
                        }
                    });
                    if (this.refs.scoreExplanation && this.refs.scoreExplanation.getValue()) {
                        this.refs.scoreExplanation.resetValue();
                    }
                    this.updateUserScoreObj();
                });
            } else {
                this.setState({
                    showScoreInput: false,
                    willNotCountScore: false,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreRange: [],
                    scoreExplanation: null,
                    requiredScoreExplanation: false,
                    formError: false
                }, () => {
                    if (this.refs.scoreExplanation && this.refs.scoreExplanation.getValue()) {
                        this.refs.scoreExplanation.resetValue();
                    }
                    this.updateUserScoreObj();
                });
            }
        }
    },

    handleScoreRangeChange(e) {
        if (this.refs.scoreRange) {
            /****************************************************/
            /* If a different score is selected from the range, */
            /* make explanation text box "required".            */
            /****************************************************/
            // Parse the modified score selected by the curator
            let selectedModifiedScore = this.refs.scoreRange.getValue();
            this.setState({modifiedScore: selectedModifiedScore});
            if (!isNaN(parseFloat(selectedModifiedScore))) {
                this.setState({requiredScoreExplanation: true}, () => {
                    this.updateUserScoreObj();
                });
            } else {
                // Reset explanation if default score is kept
                this.setState({scoreExplanation: null, requiredScoreExplanation: false, formError: false}, () => {
                    this.refs.scoreExplanation.resetValue();
                    this.updateUserScoreObj();
                });
            } 
        }
    },

    handleScoreExplanation(e) {
        if (this.refs.scoreExplanation) {
            // Parse the score explanation entered by the curator
            let scoreExplanation = this.refs.scoreExplanation.getValue();
            this.setState({scoreExplanation: scoreExplanation, formError: false}, () => {
                this.updateUserScoreObj();
            });
        }
    },

    // Put together the score object based on the form values for
    // the currently logged-in user
    updateUserScoreObj() {
        let scoreStatus = this.state.scoreStatus;
        let calculatedScore = this.state.defaultScore;
        let score = this.state.modifiedScore;
        let scoreExplanation = this.state.scoreExplanation;
        let evidenceType = this.props.evidenceType;
        let scoreUuid = this.state.userScoreUuid;
        let evidenceScored = this.props.evidence ? this.props.evidence.uuid : null;
        let scoreAffiliation = this.state.scoreAffiliation;

        let newUserScoreObj = {};

        if (scoreStatus && scoreStatus !== 'none') {
            newUserScoreObj['scoreStatus'] = scoreStatus;
        } else {
            if ('scoreStatus' in newUserScoreObj) {
                delete newUserScoreObj['scoreStatus'];
            }
        }

        if (!isNaN(parseFloat(calculatedScore))) {
            newUserScoreObj['calculatedScore'] = parseFloat(calculatedScore);
        } else {
            if ('calculatedScore' in newUserScoreObj) {
                delete newUserScoreObj['calculatedScore'];
            }
        }

        if (!isNaN(parseFloat(score))) {
            newUserScoreObj['score'] = parseFloat(score);
        } else {
            if ('score' in newUserScoreObj) {
                delete newUserScoreObj['score'];
            }
        }

        if (scoreExplanation && scoreExplanation.length) {
            newUserScoreObj['scoreExplanation'] = scoreExplanation;
        } else {
            if ('scoreExplanation' in newUserScoreObj) {
                newUserScoreObj['scoreExplanation'];
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

    // Determine experimental evidence type
    getExperimentalEvidenceType(experimentalType, experimentalEvidenceType) {
        let type;

        if (experimentalType && experimentalType.length) {
            if (experimentalType.indexOf('Biochemical Function') > -1) {
                type = FUNCTION + '_BIOCHEMICAL_FUNCTION';
            } else if (experimentalType.indexOf('Protein Interactions') > -1) {
                type = FUNCTION + '_PROTEIN_INTERACTIONS';
            } else if (experimentalType.indexOf('Expression') > -1) {
                type = FUNCTION + '_EXPRESSION';
            } else if (experimentalType.indexOf('Functional Alteration') > -1) {
                if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Patient cells') > -1) {
                    type = FUNCTIONAL_ALTERATION + '_PATIENT_CELLS';
                } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-patient cells') > -1) {
                    type = FUNCTIONAL_ALTERATION + '_NON_PATIENT_CELLS';
                }
            } else if (experimentalType.indexOf('Model Systems') > -1) {
                if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-human model organism') > -1) {
                    type = MODEL_SYSTEMS + '_NON_HUMAN_MODEL_ORGANISM';
                } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Cell culture model') > -1) {
                    type = MODEL_SYSTEMS + '_CELL_CULTURE_MODEL';
                }
            } else if (experimentalType.indexOf('Rescue') > -1) {
                if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Patient cells') > -1) {
                    type = RESCUE + '_PATIENT_CELLS';
                } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Cell culture model') > -1) {
                    type = RESCUE + '_CELL_CULTURE_MODEL';
                } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Non-human model organism') > -1) {
                    type = RESCUE + '_NON_HUMAN_MODEL_ORGANISM';
                } else if (experimentalEvidenceType && experimentalEvidenceType.indexOf('Human') > -1) {
                    type = RESCUE + '_HUMAN_MODEL';
                }
            }
        }

        return type;
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

    // Find the default calculated score given the types of
    // experimentalType and experimentalEvidenceType
    getDefaultScore(experimentalEvidenceType, loggedInUserScore, updateDefaultScore) {
        let calcDefaultScore;

        if (loggedInUserScore && loggedInUserScore.calculatedScore) {
            if (updateDefaultScore) {
                // A different scenario is selected after a pre-existing score is loaded from db
                calcDefaultScore = defaultScore(null, null, experimentalEvidenceType);
            } else {
                // A pre-existing score is loaded from db
                calcDefaultScore = defaultScore(null, null, experimentalEvidenceType, loggedInUserScore.calculatedScore);
            }
        } else {
            // New. No pre-exisitng score for the currently logged-in user
            calcDefaultScore = defaultScore(null, null, experimentalEvidenceType);
        }
        
        return calcDefaultScore;
    },

    // Find the calculated score range given the types of
    // experimentalType and experimentalEvidenceType
    getScoreRange(experimentalEvidenceType, defaultScore) {
        let calcScoreRange = [];

        if (scoreRange(null, null, experimentalEvidenceType, defaultScore).length) {
            calcScoreRange = scoreRange(null, null, experimentalEvidenceType, defaultScore);
        }

        return calcScoreRange;
    },

    render() {
        // states
        let evidenceScores = this.state.evidenceScores;
        let scoreStatus = this.state.scoreStatus ? this.state.scoreStatus : 'none';
        let defaultScore = this.state.defaultScore ? this.state.defaultScore : 'Insufficient information to obtain score';
        let modifiedScore = this.state.modifiedScore ? this.state.modifiedScore : 'none';
        let scoreExplanation = this.state.scoreExplanation ? this.state.scoreExplanation : '';
        let scoreRange = this.state.scoreRange ? this.state.scoreRange : [];
        let showScoreInput = this.state.showScoreInput;
        let updateDefaultScore = this.state.updateDefaultScore;
        let requiredScoreExplanation = this.state.requiredScoreExplanation;
        let disableScoreStatus = this.state.disableScoreStatus;
        let willNotCountScore = this.state.willNotCountScore;
        let formError = this.state.formError;
 
        return (
            <div>
                <div className="row">
                    <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue={scoreStatus}
                        value={scoreStatus} handleChange={this.handleScoreStatusChange} inputDisabled={disableScoreStatus}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value="Score">Score</option>
                        <option value="Review">Review</option>
                        <option value="Contradicts">Contradicts</option>
                    </Input>
                    {willNotCountScore ?
                        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
                            <p className="alert alert-warning"><i className="icon icon-info-circle"></i> This is marked with the status "Review" and will not be included in the final score.</p>
                        </div>
                        : null}
                    {showScoreInput ?
                        <div>
                            <dl className="dl-horizontal calculated-score">
                                <dt className="col-sm-5 control-label">Default Score</dt>
                                <dd className="col-sm-7">{defaultScore}</dd>
                            </dl>
                            <Input type="select" ref="scoreRange" label={<span>Select a score different from default score:<i>(optional)</i></span>}
                                defaultValue={modifiedScore} value={modifiedScore} handleChange={this.handleScoreRangeChange}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                inputDisabled={scoreRange && scoreRange.length ? false : true}>
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                {scoreRange.map(function(score, i) {
                                    return <option key={i} value={score}>{score}</option>;
                                })}
                            </Input>
                        </div>
                        : null}
                    {scoreStatus !== 'none' ?
                        <div>
                            <Input type="textarea" ref="scoreExplanation" required={requiredScoreExplanation}
                                label={<span>Explanation:{scoreStatus !== 'Contradicts' ? <i>(<strong>Required</strong> when selecting score different from default score)</i> : null}</span>}
                                value={scoreExplanation} handleChange={this.handleScoreExplanation}
                                placeholder="Note: If you selected a score different from the default score, you must provide a reason for the change here."
                                rows="3" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                            {formError ?
                                <div className="col-sm-7 col-sm-offset-5 score-alert-message">
                                    <p className="alert alert-warning"><i className="icon icon-exclamation-triangle"></i> A reason is required for the changed score.</p>
                                </div>
                                : null}
                        </div>
                        : null}
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
