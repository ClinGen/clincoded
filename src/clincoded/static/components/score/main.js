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
            caseInfoType: null, // Case information type (e.g. 'Variant is De Novo')
            defaultScore: null, // Calculated default score given the 'Score Status' or 'Case Information type'
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
        let evidenceObj = this.props.evidence;
        // Get evidenceScore object for the logged-in user if exists
        if (evidenceObj.scores && evidenceObj.scores.length) {
            this.setState({evidenceScores: evidenceObj.scores}, () => {
                let loggedInUserScore = this.getUserScore(evidenceObj.scores);
                if (loggedInUserScore) {
                    this.setState({userScoreUuid: loggedInUserScore.uuid});
                    // Render or remove the default score, score range, and explanation fields
                    if (loggedInUserScore.scoreStatus && (loggedInUserScore.scoreStatus === 'Score' || loggedInUserScore.scoreStatus === 'Review')) {
                        this.setState({showScoreInput: true}, () => {
                            if (!isNaN(parseFloat(loggedInUserScore.score)) && loggedInUserScore.scoreExplanation.length) {
                                this.setState({requiredScoreExplanation: true});
                            }
                        });
                    } else {
                        this.setState({showScoreInput: false});
                    }
                    if (loggedInUserScore.caseInfoType && loggedInUserScore.caseInfoType !== 'none') {
                        this.setState({caseInfoType: loggedInUserScore.caseInfoType});
                    } else {
                        this.setState({caseInfoType: null});
                    }
                }
            });
        }
    },

    handleSelectChange(ref, e) {
        if (this.refs.scoreStatus) {
            // Render or remove the case info types, default score, score range, and explanation fields
            let selected = this.refs.scoreStatus.getValue();
            let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
            if (selected === 'Score' || (selected === 'Review' && modeInheritanceType.length)) {
                this.setState({showScoreInput: true}, () => {
                    // Reset score range dropdown options if these changes apply
                    this.refs.scoreRange.setValue('none');
                    // Reset explanation if score status is changed
                    this.refs.scoreExplanation.resetValue();
                    this.setState({requiredScoreExplanation: false});
                });
            } else {
                this.setState({showScoreInput: false});
            }
            this.setState({caseInfoType: null, updateDefaultScore: true}, () => {
                // Reset variant scenario dropdown options if any changes
                this.refs.caseInfoType.setValue('none');
            });
        } else if (this.refs.caseInfoType) {
            // Get the variant case info type for determining the default score and score range
            let selected = this.refs.caseInfoType.getValue();
            if (selected !== 'none') {
                this.setState({caseInfoType: selected});
            } else {
                this.setState({caseInfoType: null});
            }
            this.setState({updateDefaultScore: true}, () => {
                // Reset score range dropdown options if any changes
                this.refs.scoreRange.setValue('none');
                // Reset explanation if default score is changed
                this.refs.scoreExplanation.resetValue();
                this.setState({requiredScoreExplanation: false});
            });
        } else if (this.refs.scoreRange) {
            /****************************************************/
            /* If a different score is selected from the range, */
            /* make explanation text box "required".            */
            /****************************************************/
            let selected = this.refs.scoreRange.getValue();
            if (selected !== 'none') {
                this.setState({requiredScoreExplanation: true});
            } else {
                this.setState({requiredScoreExplanation: false}, () => {
                    // Reset explanation if default score is kept
                    this.refs.scoreExplanation.resetValue();
                });
            } 
        }

        this.updateUserScoreObj();
    },

    // Create new evidenceScore object based on the form values
    updateUserScoreObj() {
        let scoreStatus = this.getFormValue('scoreStatus') !== 'none' ? this.getFormValue('scoreStatus') : null;
        let caseInfoType = this.state.caseInfoType;
        let calculatedScore = this.state.defaultScore;
        let score = this.getFormValue('scoreRange') !== 'none' ? parseFloat(this.getFormValue('scoreRange')) : null;
        let scoreExplanation = this.getFormValue('scoreExplanation');
        let evidenceType = this.props.evidenceType;
        let scoreUuid = this.state.userScoreUuid;
        let evidenceScored = this.props.evidence.uuid;

        this.props.handleUserScoreObj(scoreStatus, caseInfoType, defaultScore, score, scoreExplanation, evidenceType, scoreUuid, evidenceScored);
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
    getDefaultScore(modeInheritanceType, loggedInUserScore, caseInfoType, updateDefaultScore) {
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
    getScoreRange(modeInheritanceType, calcDefaultScore, caseInfoType) {
        let calcScoreRange = [];

        if (scoreRange(modeInheritanceType, caseInfoType, defaultScore).length) {
            calcScoreRange = scoreRange(modeInheritanceType, caseInfoType, defaultScore);
        }

        return calcScoreRange;
    },

    render() {
        // states
        let evidenceScores = this.state.evidenceScores;
        let showScoreInput = this.state.showScoreInput;
        let updateDefaultScore = this.state.updateDefaultScore;
        let caseInfoType = this.state.caseInfoType;
        let requiredScoreExplanation = this.state.requiredScoreExplanation;

        // variables
        let loggedInUserScore = this.getUserScore(evidenceScores);
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        let caseInfoTypeGroup = this.getCaseInfoTypeGroup(modeInheritanceType);
        let defaultScore = this.getDefaultScore(modeInheritanceType, loggedInUserScore, caseInfoType, updateDefaultScore);
        let scoreRange = this.getScoreRange(modeInheritanceType, defaultScore, caseInfoType);

        // TRUE if Mode of Inheritance is either AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, or X_LINKED
        let shouldCalcScore = modeInheritanceType && modeInheritanceType.length ? true : false;
 
        return (
            <div className="row">
                <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue="none"
                    value={loggedInUserScore && loggedInUserScore.scoreStatus ? loggedInUserScore.scoreStatus : null} handleChange={this.handleSelectChange}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
                    <option value="Review">Review</option>
                    <option value="Contradicts">Contradicts</option>
                </Input>
                {showScoreInput ?
                    <div>
                        <Input type="select" ref="caseInfoType" label="Confirm Case Information type:" defaultValue="none" handleChange={this.handleSelectChange}
                            value={loggedInUserScore && loggedInUserScore.caseInfoType ? loggedInUserScore.caseInfoType : null}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            {caseInfoTypeGroup.map(function(item, i) {
                                return <option key={i} value={item.TYPE}>{item.DESCRIPTION}</option>;
                            })}
                        </Input>
                        <dl className="dl-horizontal calculated-score">
                            <dt className="col-sm-5 control-label">Default Score</dt>
                            <dd className="col-sm-7">{defaultScore ? defaultScore : 'Insufficient information to obtain score'}</dd>
                        </dl>
                        <Input type="select" ref="scoreRange" label={<span>Select a score different from default score:<i>(optional)</i></span>} defaultValue="none"
                            value={loggedInUserScore && loggedInUserScore.score ? loggedInUserScore.score : null}  handleChange={this.handleSelectChange}
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
                            value={loggedInUserScore && loggedInUserScore.scoreExplanation ? loggedInUserScore.scoreExplanation : ''}
                            error={this.getFormError('scoreExplanation')} clearError={this.clrFormErrors.bind(null, 'scoreExplanation')}
                            placeholder="Note: If you selected a score different from the default score, you must provide a reason for the change here."
                            rows="3" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                    </div>
                : null}
                {this.props.scoreSubmit ?
                    <div className="curation-submit clearfix">
                        <Input type="button" inputClassName="btn-primary pull-right" clickHandler={this.props.scoreSubmit} title="Save" submitBusy={this.props.submitBusy} />
                    </div>
                : null}
            </div>
        );
    },
});
