'use strict';

import React, { PropTypes } from 'react';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, X_LINKED } from './constants/evidence_types';
import CASE_INFO_TYPES from './constants/case_info_types';
import { defaultScore } from './helpers/default_score';
import { scoreRange } from './helpers/score_range';
import { userScore } from './helpers/user_score';

// Render scoring panel in Gene Curation Interface
var ScoreMain = module.exports.ScoreMain = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        session: React.PropTypes.object, // Session object passed from parent
        evidence: React.PropTypes.object, // Individual, Experimental or Case Control
        modeInheritance: React.PropTypes.string, // Mode of Inheritance
        evidenceType: React.PropTypes.string, // 'Individual', 'Experimental' or 'Case Control'
        handleUserScoreObj: React.PropTypes.func, // Function to call create/update score object
        scoreSubmit: React.PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        submitBusy: React.PropTypes.bool // TRUE while the form submit is running
    },

    getInitialState() {
        return {
            evidenceScores: [], // One or more scores
            userScoreUuid: null, // Pre-existing logged-in user's score uuuid
            modeInheritanceType: null, // Mode of Inheritance types
            caseInfoTypeGroup: [], // Array of Case Information types given the Mode of Inheritance type
            scoreStatus: null, // Score status that allow scoring (e.g. 'Score', 'Review')
            caseInfoType: null, // Case information type (e.g. 'Variant is De Novo')
            defaultScore: null, // Calculated default score given the 'Score Status' or 'Case Information type'
            modifiedScore: null, // Score that is selected by curator and it is different from the calculated default score
            scoreRange: [], // Calculated score range
            scoreExplanation: null, // Explanation for selecting a different score from the calculated default score
            showScoreInput: false, // TRUE if either 'Score' or 'Review' is selected
            updateDefaultScore: false, // TRUE if either 'Score Status' or 'Case Information type' are changed
            requiredScoreExplanation: false, // TRUE if a different score is selected from the range
            submitBusy: false // TRUE while form is submitting
        };
    },

    componentDidMount() {
        this.loadData();
    },

    loadData() {
        // Prep the following when the component is loaded
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        this.setState({modeInheritanceType: modeInheritanceType}, () => {
            let caseInfoTypeGroup = this.getCaseInfoTypeGroup(modeInheritanceType);
            this.setState({caseInfoTypeGroup: caseInfoTypeGroup});
        });
        // Get evidenceScore object for the logged-in user if exists
        let evidenceObj = this.props.evidence;
        if (evidenceObj && evidenceObj.scores && evidenceObj.scores.length) {
            this.setState({evidenceScores: evidenceObj.scores}, () => {
                let loggedInUserScore = this.getUserScore(evidenceObj.scores);
                if (loggedInUserScore) {
                    this.setState({userScoreUuid: loggedInUserScore.uuid});
                    // Render or remove the default score, score range, and explanation fields
                    let scoreStatus = loggedInUserScore.scoreStatus;
                    /**************************************************************************************/
                    /* Curators are allowed to access the score form fields when the 'Score' is selected, */
                    /* or when 'Review' is selected given the matched Mode of Inheritance types           */
                    /* (although its score won't be counted from the summary).                            */
                    /**************************************************************************************/
                    if (scoreStatus && (scoreStatus === 'Score' || (scoreStatus === 'Review' && modeInheritanceType.length))) {
                        this.setState({scoreStatus: scoreStatus, showScoreInput: true}, () => {
                            this.refs.scoreStatus.setValue(scoreStatus);
                            // If the score form fields are allowed, then proceed with the following
                            let caseInfoType = loggedInUserScore.caseInfoType,
                                defaultScore = loggedInUserScore.calculatedScore,
                                modifiedScore = loggedInUserScore.score,
                                scoreExplanation = loggedInUserScore.scoreExplanation,
                                calcScoreRange = [];
                            this.setState({caseInfoType: (caseInfoType && caseInfoType !== 'none') ? caseInfoType : null}, () => {
                                this.refs.caseInfoType.setValue(caseInfoType);
                            });
                            this.setState({defaultScore: !isNaN(parseFloat(defaultScore)) ? defaultScore : null});
                            this.setState({modifiedScore: !isNaN(parseFloat(modifiedScore)) ? modifiedScore : null}, () => {
                                calcScoreRange = this.getScoreRange(modeInheritanceType, caseInfoType, defaultScore);
                                this.setState({scoreRange: calcScoreRange}, () => {
                                    this.refs.scoreRange.setValue(modifiedScore ? modifiedScore : 'none');
                                });
                            });
                            if (!isNaN(parseFloat(modifiedScore)) && scoreExplanation.length) {
                                this.setState({scoreExplanation: scoreExplanation, requiredScoreExplanation: true}, () => {
                                    this.refs.scoreExplanation.setValue(scoreExplanation);
                                });
                            }
                            this.updateUserScoreObj();
                        });
                    } else {
                        this.setState({scoreStatus: scoreStatus ? scoreStatus : null}, () => {
                            this.refs.scoreStatus.setValue(scoreStatus);
                            this.updateUserScoreObj();
                        });
                        this.setState({showScoreInput: false});
                    }
                }
            });
        }
    },

    handleScoreStatusChange(e) {
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        if (this.refs.scoreStatus) {
            // Render or remove the case info types, default score, score range, and explanation fields
            // Parse score status value and set the state
            let selectedScoreStatus = this.refs.scoreStatus.getValue();
            this.setState({scoreStatus: selectedScoreStatus});
            if (selectedScoreStatus === 'Score' || (selectedScoreStatus === 'Review' && modeInheritanceType.length)) {
                // Reset the states and update the calculated default score
                // Reset variant scenario dropdown options if any changes
                // Reset score range dropdown options if any changes
                // Reset explanation if score status is changed
                this.setState({
                    showScoreInput: true,
                    caseInfoType: null,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreExplanation: null,
                    requiredScoreExplanation: false,
                    updateDefaultScore: true
                }, () => {
                    this.refs.caseInfoType.resetValue();
                    this.refs.scoreRange.resetValue();
                    this.refs.scoreExplanation.resetValue();
                    this.updateUserScoreObj();
                });
            } else {
                this.setState({
                    showScoreInput: false,
                    caseInfoType: null,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreExplanation: null
                }, () => {this.updateUserScoreObj();});
            }
        }
    },

    handleCaseInfoTypeChange(e) {
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        if (this.refs.caseInfoType) {
            // Get the variant case info type for determining the default score and score range
            // Parse Case Information type value and set the state
            let selectedCaseInfoType = this.refs.caseInfoType.getValue();
            this.setState({caseInfoType: selectedCaseInfoType, updateDefaultScore: true});
            if (selectedCaseInfoType && selectedCaseInfoType !== 'none') {
                let calcDefaultScore = this.getDefaultScore(modeInheritanceType, selectedCaseInfoType, null, this.state.updateDefaultScore);
                this.setState({
                    defaultScore: calcDefaultScore,
                    modifiedScore: null,
                    scoreExplanation: null,
                    requiredScoreExplanation: false
                }, () => {
                    let calcScoreRange = this.getScoreRange(modeInheritanceType, selectedCaseInfoType, calcDefaultScore);
                    this.setState({scoreRange: calcScoreRange}, () => {
                        this.refs.scoreRange.resetValue();
                    });
                    this.refs.scoreExplanation.resetValue();
                    this.updateUserScoreObj();
                });
            } else {
                this.setState({
                    caseInfoType: null,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreExplanation: null,
                    requiredScoreExplanation: false
                }, () => {this.updateUserScoreObj();});
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
                this.setState({scoreExplanation: null, requiredScoreExplanation: false}, () => {
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
            this.setState({scoreExplanation: scoreExplanation}, () => {
                this.updateUserScoreObj();
            });
        }
    },

    // Put together the score object based on the form values for
    // the currently logged-in user
    updateUserScoreObj() {
        let scoreStatus = this.state.scoreStatus;
        let caseInfoType = this.state.caseInfoType;
        let calculatedScore = this.state.defaultScore;
        let score = this.state.modifiedScore;
        let scoreExplanation = this.state.scoreExplanation;
        let evidenceType = this.props.evidenceType;
        let scoreUuid = this.state.userScoreUuid;
        let evidenceScored = this.props.evidence ? this.props.evidence.uuid : null;

        let newUserScoreObj = {};

        if (scoreStatus && scoreStatus !== 'none') {
            newUserScoreObj['scoreStatus'] = scoreStatus;
        } else {
            if ('scoreStatus' in newUserScoreObj) {
                delete newUserScoreObj['scoreStatus'];
            }
        }

        if (caseInfoType && caseInfoType !== 'none') {
            newUserScoreObj['caseInfoType'] = caseInfoType;
        } else {
            if ('caseInfoType' in newUserScoreObj) {
                delete newUserScoreObj['caseInfoType'];
            }
        }

        if (calculatedScore) {
            newUserScoreObj['calculatedScore'] = parseFloat(calculatedScore);
        } else {
            if ('calculatedScore' in newUserScoreObj) {
                delete newUserScoreObj['calculatedScore'];
            }
        }

        if (score) {
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
            this.props.handleUserScoreObj(newUserScoreObj);
        }
    },

    // Determine mode of inheritance type via modeInheritance
    getModeInheritanceType(modeInheritance) {
        let modeInheritanceType;

        if (modeInheritance && modeInheritance.length) {
            if (modeInheritance.indexOf('Autosomal dominant inheritance') > -1) {
                modeInheritanceType = AUTOSOMAL_DOMINANT;
            } else if (modeInheritance.indexOf('Autosomal recessive inheritance') > -1) {
                modeInheritanceType = AUTOSOMAL_RECESSIVE;
            } else if (modeInheritance.indexOf('X-linked') > -1) {
                modeInheritanceType = X_LINKED;
            } else {
                modeInheritanceType = '';
                console.warn("Can't calculate score. Reason - improper mode of inheritance.");
            }
        }

        return modeInheritanceType;
    },

    // Find the group of Case Information types given the Mode of Inheritance
    getCaseInfoTypeGroup(modeInheritanceType) {
        // Put CASE_INFO_TYPES object keys into an array
        const caseInfoTypeKeys = Object.keys(CASE_INFO_TYPES);
        // Default group of Case Information types in dropdown selection
        let caseInfoTypeGroup = CASE_INFO_TYPES.OTHER;
        // Assign different group of Case Information types given the matched Mode of Inheritance type
        caseInfoTypeKeys.forEach(key => {
            if (modeInheritanceType && modeInheritanceType === key) {
                caseInfoTypeGroup = CASE_INFO_TYPES[modeInheritanceType];
            }
        });

        return caseInfoTypeGroup;
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

    // Find the default calculated score given the types of
    // Mode of Inheritance and Case Information
    getDefaultScore(modeInheritanceType, caseInfoType, loggedInUserScore, updateDefaultScore) {
        let calcDefaultScore;

        if (loggedInUserScore && loggedInUserScore.calculatedScore) {
            if (updateDefaultScore) {
                // A different scenario is selected after a pre-existing score is loaded from db
                calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType);
            } else {
                // A pre-existing score is loaded from db
                calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType, loggedInUserScore.calculatedScore);
            }
        } else {
            // New. No pre-exisitng score for the currently logged-in user
            calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType);
        }
        
        return calcDefaultScore;
    },

    // Find the calculated score range given the types of
    // Mode of Inheritance and Case Information
    getScoreRange(modeInheritanceType, caseInfoType, calcDefaultScore) {
        let calcScoreRange = [];

        if (scoreRange(modeInheritanceType, caseInfoType, defaultScore).length) {
            calcScoreRange = scoreRange(modeInheritanceType, caseInfoType, defaultScore);
        }

        return calcScoreRange;
    },

    render() {
        // states
        let evidenceScores = this.state.evidenceScores;
        let modeInheritanceType = this.state.modeInheritanceType;
        let caseInfoTypeGroup = this.state.caseInfoTypeGroup.length ? this.state.caseInfoTypeGroup : [];
        let scoreStatus = this.state.scoreStatus ? this.state.scoreStatus : 'none';
        let caseInfoType = this.state.caseInfoType ? this.state.caseInfoType : 'none';
        let defaultScore = this.state.defaultScore ? this.state.defaultScore : 'Insufficient information to obtain score';
        let modifiedScore = this.state.modifiedScore ? this.state.modifiedScore : 'none';
        let scoreExplanation = this.state.scoreExplanation ? this.state.scoreExplanation : '';
        let scoreRange = this.state.scoreRange ? this.state.scoreRange : [];
        let showScoreInput = this.state.showScoreInput;
        let updateDefaultScore = this.state.updateDefaultScore;
        let requiredScoreExplanation = this.state.requiredScoreExplanation;

        // TRUE if Mode of Inheritance is either AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, or X_LINKED
        let shouldCalcScore = modeInheritanceType && modeInheritanceType.length ? true : false;
 
        return (
            <div>
                <div className="row">
                    <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue={scoreStatus}
                        value={scoreStatus} handleChange={this.handleScoreStatusChange}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
                        <option value="Review">Review</option>
                        <option value="Contradicts">Contradicts</option>
                    </Input>
                    {showScoreInput ?
                        <div>
                            <Input type="select" ref="caseInfoType" label="Confirm Case Information type:" defaultValue={caseInfoType}
                                value={caseInfoType} handleChange={this.handleCaseInfoTypeChange}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                {caseInfoTypeGroup.map(function(item, i) {
                                    return <option key={i} value={item.TYPE}>{item.DESCRIPTION}</option>;
                                })}
                            </Input>
                            <dl className="dl-horizontal calculated-score">
                                <dt className="col-sm-5 control-label">Default Score</dt>
                                <dd className="col-sm-7">{defaultScore}</dd>
                            </dl>
                            <Input type="select" ref="scoreRange" label={<span>Select a score different from default score:<i>(optional)</i></span>}
                                defaultValue={modifiedScore.toString()} value={modifiedScore.toString()} handleChange={this.handleScoreRangeChange}
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                inputDisabled={scoreRange && scoreRange.length ? false : true}>
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                {scoreRange.map(function(score, i) {
                                    return <option key={i} value={score}>{score}</option>;
                                })}
                            </Input>
                            <Input type="textarea" ref="scoreExplanation" required={requiredScoreExplanation} inputDisabled={!requiredScoreExplanation}
                                label={<span>Explain reason(s) for change:<i>(<strong>required</strong> for selecting different score)</i></span>}
                                value={scoreExplanation} handleChange={this.handleScoreExplanation}
                                error={this.getFormError('scoreExplanation')} clearError={this.clrFormErrors.bind(null, 'scoreExplanation')}
                                placeholder="Note: If you selected a score different from the default score, you must provide a reason for the change here."
                                rows="3" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
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
