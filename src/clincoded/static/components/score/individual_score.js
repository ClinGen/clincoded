'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, X_LINKED, SEMIDOMINANT } from './constants/evidence_types';
import CASE_INFO_TYPES from './constants/case_info_types';
import { defaultScore } from './helpers/default_score';
import { scoreRange } from './helpers/score_range';
import { userScore } from './helpers/user_score';
import { affiliationScore } from './helpers/affiliation_score';
import { getPathogenicityFromVariant } from '../curator';
import { renderVariantTitle } from '../../libs/render_variant_title';

// Render scoring panel in Gene Curation Interface
const ScoreIndividual = module.exports.ScoreIndividual = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        session: PropTypes.object, // Session object passed from parent
        evidence: PropTypes.object, // Individual, Experimental or Case Control
        modeInheritance: PropTypes.string, // Mode of Inheritance
        evidenceType: PropTypes.string, // 'Individual', 'Experimental' or 'Case Control'
        variantInfo: PropTypes.oneOfType([ // Variant count for Individual evidence: object if on curation form, or array if on view page
            PropTypes.object,
            PropTypes.array
        ]),
        handleUserScoreObj: PropTypes.func, // Function to call create/update score object
        scoreSubmit: PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        submitBusy: PropTypes.bool, // TRUE while the form submit is running
        scoreError: PropTypes.bool, // TRUE if no explanation is given for modified score or no case info type
        scoreErrorMsg: PropTypes.string, // Text string in response to the type of score error
        affiliation: PropTypes.object, // Affiliation object passed from parent
        gdm: PropTypes.object,
        pmid: PropTypes.string
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
            variantInfo: this.props.variantInfo, // Variant count for Individual evidence
            showScoreInput: false, // TRUE if either 'Score' or 'Review' is selected
            showCaseInfoTypeOnly: false, // TRUE if Mode of Inheritance is not AD, AR, or X-Linked
            updateDefaultScore: false, // TRUE if either 'Score Status' or 'Case Information type' are changed
            requiredScoreExplanation: false, // TRUE if a different score is selected from the range
            submitBusy: false, // TRUE while form is submitting
            disableScoreStatus: false, // TRUE if Individual evidence has no variants at all
            willNotCountScore: false, // TRUE if 'Review' is selected when Mode of Inheritance is not AD, AR, or X-Linked
            scoreError: this.props.scoreError, // TRUE if no explanation is given for modified score or no case info type
            scoreErrorMsg: this.props.scoreErrorMsg, // Text string in response to the type of score error
            scoreAffiliation: null, // Affiliation associated with the score
            priorScoreStatus: undefined, // Placeholder score status for clearing explanation text field given the comparison
            origStatus: null, // User originally selected status
            origCaseInfoType: null, // User originally selected case information type
            origScore: null, // User originally selected score
            origScoreExplanation: null // User originally entered explanation for selected score
        };
    },

    componentDidMount() {
        this.loadData();
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.variantInfo !== this.props.variantInfo) {
            this.setState({variantInfo: nextProps.variantInfo}, () => {
                if (this.state.variantInfo && Object.keys(this.state.variantInfo).length > 0) {
                    this.setState({disableScoreStatus: false});
                } else {
                    this.setState({disableScoreStatus: true, scoreStatus: null, showScoreInput: false}, () => {
                        this.refs.scoreStatus.resetValue();
                    });
                }
            });
        }
        this.setState({scoreError: nextProps.scoreError, scoreErrorMsg: nextProps.scoreErrorMsg});
    },

    loadData() {
        // Prep the following when the component is loaded
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        this.setState({
            modeInheritanceType: modeInheritanceType,
            caseInfoTypeGroup: this.getCaseInfoTypeGroup(modeInheritanceType)
        });

        let evidenceObj = this.props.evidence;

        // If the individual evidence has no variants at all, disable the Score Status form field
        if (evidenceObj) {
            if (!evidenceObj.variants || (evidenceObj.variants && evidenceObj.variants.length < 1)) {
                this.setState({disableScoreStatus: true});
            }
        } else {
            if (this.state.variantInfo && Object.keys(this.state.variantInfo).length > 0) {
                this.setState({disableScoreStatus: false});
            } else {
                this.setState({disableScoreStatus: true});
            }
        }

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
                        caseInfoType = matchedScore.caseInfoType,
                        defaultScore = matchedScore.calculatedScore,
                        modifiedScore = matchedScore.hasOwnProperty('score') ? matchedScore.score.toString() : null,
                        scoreExplanation = matchedScore.scoreExplanation,
                        calcScoreRange = this.getScoreRange(modeInheritanceType, caseInfoType, parseFloat(defaultScore));

                    // Save original data for checking if changes has been made
                    this.setState({
                        origStatus: scoreStatus,
                        origCaseInfoType: caseInfoType === undefined ? null : caseInfoType,
                        origScore: modifiedScore,
                        origScoreExplanation: scoreExplanation === undefined ? null : scoreExplanation
                    });
                    /**************************************************************************************/
                    /* Curators are allowed to access the score form fields when the 'Score' is selected, */
                    /* or when 'Review' is selected given the matched Mode of Inheritance types           */
                    /* (although its score won't be counted from the summary).                            */
                    /**************************************************************************************/
                    if (scoreStatus && (scoreStatus === 'Score' || (scoreStatus === 'Review' && modeInheritanceType.length))) {
                        // Setting UI and score object property states
                        this.setState({
                            showScoreInput: true,
                            willNotCountScore: scoreStatus === 'Review' ? true : false,
                            scoreRange: calcScoreRange,
                            requiredScoreExplanation: !isNaN(parseFloat(modifiedScore)) && scoreExplanation.length ? true : false,
                            scoreStatus: scoreStatus,
                            caseInfoType: caseInfoType && caseInfoType !== 'none' ? caseInfoType : null,
                            defaultScore: parseFloat(defaultScore) ? defaultScore : null,
                            modifiedScore: !isNaN(parseFloat(modifiedScore)) ? modifiedScore : null,
                            scoreExplanation: scoreExplanation ? scoreExplanation : null
                        }, () => {
                            // Populate input and select option values
                            this.refs.scoreStatus.setValue(scoreStatus);
                            this.refs.caseInfoType.setValue(caseInfoType ? caseInfoType : 'none');
                            this.refs.scoreRange.setValue(modifiedScore && calcScoreRange ? modifiedScore : 'none');
                            this.refs.scoreExplanation.setValue(scoreExplanation ? scoreExplanation : '');
                            this.updateUserScoreObj();
                        });
                    } else if (scoreStatus && (scoreStatus === 'Supports' || (scoreStatus === 'Review' && modeInheritanceType.length < 1))) {
                        this.setState({
                            showScoreInput: true,
                            showCaseInfoTypeOnly: true,
                            scoreStatus: scoreStatus,
                            caseInfoType: caseInfoType && caseInfoType !== 'none' ? caseInfoType : null
                        }, () => {
                            this.refs.scoreStatus.setValue(scoreStatus);
                            this.refs.caseInfoType.setValue(caseInfoType ? caseInfoType : 'none');
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
        let modeInheritanceType = this.getModeInheritanceType(this.props.modeInheritance);
        if (this.refs.scoreStatus) {
            // Render or remove the case info types, default score, score range, and explanation fields
            // Parse score status value and set the state
            let selectedScoreStatus = this.refs.scoreStatus.getValue();
            this.setState({scoreStatus: selectedScoreStatus});
            if (selectedScoreStatus === 'Score' || (selectedScoreStatus === 'Review' && modeInheritanceType.length)) {
                selectedScoreStatus === 'Review' ? this.setState({willNotCountScore: true}) : this.setState({willNotCountScore: false});
                // Reset the states and update the calculated default score
                // Reset variant scenario dropdown options if any changes
                // Reset score range dropdown options if any changes
                // Reset explanation if score status is changed
                this.setState({
                    showScoreInput: true,
                    showCaseInfoTypeOnly: false,
                    formError: false,
                    updateDefaultScore: true
                }, () => {
                    if (selectedScoreStatus === 'Score' && !this.state.caseInfoType) {
                        this.refs.scoreExplanation.resetValue();
                    }
                    if (this.refs.scoreExplanation && this.refs.scoreExplanation.getValue() && this.state.priorScoreStatus === 'Contradicts') {
                        this.refs.scoreExplanation.resetValue();
                        this.setState({priorScoreStatus: undefined});
                    }
                    this.updateUserScoreObj();
                });
            } else if (selectedScoreStatus === 'Supports' || (selectedScoreStatus === 'Review' && modeInheritanceType.length < 1)) {
                this.setState({
                    showScoreInput: true,
                    showCaseInfoTypeOnly: true
                }, () => {
                    if (this.refs.scoreExplanation && this.refs.scoreExplanation.getValue() && this.state.priorScoreStatus === 'Contradicts') {
                        this.refs.scoreExplanation.resetValue();
                        this.setState({priorScoreStatus: undefined});
                    }
                    this.updateUserScoreObj();
                });
            } else {
                this.setState({
                    scoreRange: [],
                    showScoreInput: false,
                    showCaseInfoTypeOnly: false,
                    willNotCountScore: false,
                    caseInfoType: null,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreExplanation: null,
                    requiredScoreExplanation: false,
                    formError: false,
                    priorScoreStatus: this.state.scoreStatus === 'Contradicts' ? 'Contradicts' : undefined
                }, () => {
                    if (this.refs.scoreExplanation && this.refs.scoreExplanation.getValue()) {
                        this.refs.scoreExplanation.resetValue();
                    }
                    this.updateUserScoreObj();
                });
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
                    requiredScoreExplanation: false,
                    formError: false
                }, () => {
                    let calcScoreRange = this.getScoreRange(modeInheritanceType, selectedCaseInfoType, calcDefaultScore);
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
                    caseInfoType: null,
                    defaultScore: null,
                    modifiedScore: null,
                    scoreRange: [],
                    scoreExplanation: null,
                    requiredScoreExplanation: false,
                    formError: false
                }, () => {
                    if (this.refs.scoreRange && this.refs.scoreRange.getValue()) {
                        this.refs.scoreRange.resetValue();
                    }
                    this.refs.scoreExplanation.resetValue();
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
            this.setState({scoreExplanation: scoreExplanation, formError: false}, () => {
                this.updateUserScoreObj();
            });
        }
    },

    // Check if changes has been made before saving the score object.
    saveScore(e) {
        if ((this.state.scoreStatus === this.state.origStatus ||
            this.state.scoreStatus === 'none' && this.state.origStatus === null) &&
            (this.state.modifiedScore === this.state.origScore ||
             this.state.modifiedScore === 'none' && this.state.origScore === null) &&
            (this.state.scoreExplanation === this.state.origScoreExplanation ||
             this.state.scoreExplanation === '' && this.state.origScoreExplanation === null) &&
            this.state.caseInfoType === this.state.origCaseInfoType) {
                this.setState({scoreError: true, scoreErrorMsg: 'Cannot save because score/explanation has not been modified.  Please make your changes then save.'});
            }
            else {
                this.props.scoreSubmit(e);
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
        let scoreAffiliation = this.state.scoreAffiliation;

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
            } else if (modeInheritance.indexOf('Semidominant inheritance') > -1) {
                modeInheritanceType = SEMIDOMINANT;
            } else {
                // Mode of Inheritance is not either AD, AR, SD, or X-Linked
                modeInheritanceType = '';
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
    // Mode of Inheritance and Case Information
    getDefaultScore(modeInheritanceType, caseInfoType, loggedInUserScore, updateDefaultScore) {
        let calcDefaultScore;

        if (loggedInUserScore && loggedInUserScore.calculatedScore) {
            if (updateDefaultScore) {
                // A different scenario is selected after a pre-existing score is loaded from db
                calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType);
            } else {
                // A pre-existing score is loaded from db
                calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType, null, loggedInUserScore.calculatedScore);
            }
        } else {
            // New. No pre-exisitng score for the currently logged-in user
            calcDefaultScore = defaultScore(modeInheritanceType, caseInfoType);
        }
        
        return calcDefaultScore;
    },

    // Find the calculated score range given the types of
    // Mode of Inheritance and Case Information
    getScoreRange(modeInheritanceType, caseInfoType, defaultScore) {
        let calcScoreRange = [];

        if (scoreRange(modeInheritanceType, caseInfoType, null, defaultScore).length) {
            calcScoreRange = scoreRange(modeInheritanceType, caseInfoType, null, defaultScore);
        }

        return calcScoreRange;
    },

    renderVariantCurationLinks(variants) {
        const gdm = this.props.gdm;
        let gdmUuid = gdm && gdm.uuid ? gdm.uuid : '';
        let pmid = this.props.pmid;
        let affiliation = this.props.affiliation;
        let userUuid = this.props.session && this.props.session.user_properties ? this.props.session.user_properties.uuid : '';
        return (
            <span className="variant-gene-impact-curation-links-wrapper">
                <strong>Curate Variant's Gene Impact:</strong>
                {variants.map((variant, i) => {
                    // See if the variant has a pathogenicity curated in the current GDM
                    let userPathogenicity = null;
                    let inCurrentGdm = _(variant.associatedPathogenicities).find(function(pathogenicity) {
                        let matchingGdm = false;
                        if (gdm && gdm.variantPathogenicity && gdm.variantPathogenicity.length) {
                            matchingGdm = _(gdm.variantPathogenicity).find(function(item) {
                                return item['@id'] === pathogenicity;
                            });
                        }
                        return !!matchingGdm;
                    });

                    if (inCurrentGdm) {
                        userPathogenicity = getPathogenicityFromVariant(gdm, userUuid, variant.uuid, affiliation);
                    }

                    let variantCurationUrl = '/variant-curation/?all&gdm=' + gdmUuid + (pmid ? '&pmid=' + pmid : '') + '&variant=' + variant.uuid;
                    variantCurationUrl += affiliation ? '&affiliation=' + affiliation.affiliation_id : (userUuid ? '&user=' + userUuid : '');
                    variantCurationUrl += userPathogenicity ? '&pathogenicity=' + userPathogenicity.uuid : '';
                            
                    return (
                        <span key={i} className="variant-gene-impact-curation-link-item">
                            <a className="variant-gene-impact-curation-link" href={variantCurationUrl} target="_blank">
                                <span>{renderVariantTitle(variant)}</span>
                            </a>
                        </span>
                    );
                })}
            </span>
        );
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
        let showCaseInfoTypeOnly = this.state.showCaseInfoTypeOnly;
        let updateDefaultScore = this.state.updateDefaultScore;
        let requiredScoreExplanation = this.state.requiredScoreExplanation;
        let disableScoreStatus = this.state.disableScoreStatus;
        let willNotCountScore = this.state.willNotCountScore;
        let scoreError = this.state.scoreError;
        let variants = this.state.variantInfo && Object.keys(this.state.variantInfo).length > 0 ? Object.values(this.state.variantInfo) : (this.state.variantInfo.length ? this.state.variantInfo : []);

        // TRUE if Mode of Inheritance is either AUTOSOMAL_DOMINANT, AUTOSOMAL_RECESSIVE, SEMIDOMINANT, or X_LINKED
        let shouldCalcScore = modeInheritanceType && modeInheritanceType.length ? true : false;

        return (
            <div>
                <div className="row">
                    <div>
                        <p className="alert alert-warning">
                            The gene impact for each variant associated with this proband must be specified in order to score this proband (see variant(s) and
                            links to curating their gene impact in variant section for this Individual, above).
                            <br />
                            {variants.length ? this.renderVariantCurationLinks(variants) : null}
                        </p>
                    </div>
                    <Input type="select" ref="scoreStatus" label="Select Status:" defaultValue={scoreStatus}
                        value={scoreStatus} handleChange={this.handleScoreStatusChange} inputDisabled={disableScoreStatus}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="none">No Selection</option>
                        <option disabled="disabled"></option>
                        <option value={shouldCalcScore ? 'Score' : 'Supports'}>{shouldCalcScore ? 'Score' : 'Supports'}</option>
                        <option value="Review">Review</option>
                        <option value="Contradicts">Contradicts</option>
                    </Input>
                    {disableScoreStatus ?
                        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
                            <p className="alert alert-warning"><i className="icon icon-info-circle"></i> Proband must be associated with at least one variant to Score this evidence.</p>
                        </div>
                        : null}
                    {willNotCountScore ?
                        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
                            <p className="alert alert-warning"><i className="icon icon-info-circle"></i> This is marked with the status "Review" and will not be included in the final score.</p>
                        </div>
                        : null}
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
                            {!showCaseInfoTypeOnly ?
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
                        </div>
                        : null}
                    {scoreStatus !== 'none' ?
                        <div>
                            <Input type="textarea" ref="scoreExplanation" required={requiredScoreExplanation} inputDisabled={scoreStatus === 'Score' && caseInfoType === 'none'}
                                value={scoreExplanation} handleChange={this.handleScoreExplanation}
                                label={<span>Explanation:{scoreStatus === 'Score' || (scoreStatus === 'Review' && modeInheritanceType.length) ?
                                    <i>(<strong>Required</strong> when selecting score different from default score)</i>
                                    : null}</span>}
                                placeholder={scoreStatus === 'Score' || (scoreStatus === 'Review' && modeInheritanceType.length) ?
                                    'Note: If you selected a score different from the default score, you must provide a reason for the change here.'
                                    : null}
                                rows="3" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                        </div>
                        : null}
                    {scoreError ?
                        <div className="col-sm-7 col-sm-offset-5 score-alert-message">
                            <p className="alert alert-warning"><i className="icon icon-exclamation-triangle"></i> {this.state.scoreErrorMsg}</p>
                        </div>
                        : null}
                </div>
                {this.props.scoreSubmit ?
                    <div className="curation-submit clearfix">
                        <Input type="button" inputClassName="btn-primary pull-right" clickHandler={this.saveScore}
                            title="Save" submitBusy={this.props.submitBusy} inputDisabled={disableScoreStatus} />
                    </div>
                    : null}
            </div>
        );
    },
});
