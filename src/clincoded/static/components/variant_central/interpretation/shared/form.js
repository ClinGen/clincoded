'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var form = require('../../../../libs/bootstrap/form');
var RestMixin = require('../../../rest').RestMixin;
var curator = require('../../../curator');
var evidenceCodes = require('../mapping/evidence_code.json');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Form component to be re-used by various tabs
var CurationInterpretationForm = module.exports.CurationInterpretationForm = React.createClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        renderedFormContent: React.PropTypes.func, // the function that returns the rendering of the form items
        evidenceData: React.PropTypes.object, // any extra evidence data that is passed from the parent page
        evidenceDataUpdated: React.PropTypes.bool, // passed in by parent page, which does the comparison of stored and new external data
        formDataUpdater: React.PropTypes.func, // the function that updates the rendered form with data from evidenceData
        formChangeHandler: React.PropTypes.func, // function that will take care of any in-form logic that needs to be taken in to account
        variantUuid: React.PropTypes.string, // UUID of the parent variant
        criteria: React.PropTypes.array, // array of criteria codes being handled by this form
        criteriaCrossCheck: React.PropTypes.array, // an array of arrays of criteria codes that are to be checked upon submitForm to make sure there are no more than one 'Met'
        interpretation: React.PropTypes.object, // parent interpretation object
        updateInterpretationObj: React.PropTypes.func // function from index.js; this function will pass the updated interpretation object back to index.js
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false, // spinner for Save button
            submitDisabled: false, // disabled for now due to uncertain/non-universal logic
            evidenceType: evidenceCodes[this.props.criteria[0]].category, // specifies what type of evidence object is created; ascertained from first criteria that is passed to this.props.criteria
            evidenceData: null, // any extra data (external sources or otherwise) that will be passed into the evaluation evidence object
            interpretation: this.props.interpretation, // parent interpretation object
            diseaseCriteria: [], // array of criteria codes that are disease-dependent
            diseaseAssociated: false, // flag to define whether or not the interpretation has a disease associated with it
            evaluationExists: false, // flag to define whether or not a previous evaluation for this group already exists
            evidenceDataUpdated: this.props.evidenceDataUpdated, // flag to indicate whether or not the evidence data has changed, in case of interpretation
            checkboxes: {}, // store any checkbox values
            updateMsg: null // specifies what html to display next to button after press
        };
    },

    componentDidMount: function() {
        // this block is for handling props and states on initial load/rendering
        // update the interpretation object when loaded
        if (this.props.interpretation) {
            // check to see if the interpretation has a disease associated with it
            if (this.props.interpretation.interpretation_disease && this.props.interpretation.interpretation_disease !== '') {
                this.setState({diseaseAssociated: true});
            }
            // update the form if needed
            if (this.props.formDataUpdater) {
                this.props.formDataUpdater.call(this, this.props);
            }
            this.interpretationEvalCheck();
        }
        // update the form when extra data is loaded
        if (this.props.evidenceData) {
            this.setState({evidenceData: this.props.evidenceData, evidenceDataUpdated: this.props.evidenceDataUpdated});
        }
        // ascertain which criteria code are disease dependent
        let tempDiseaseCriteria = [];
        this.props.criteria.map(criterion => {
            if (evidenceCodes[criterion].diseaseDependent) {
                tempDiseaseCriteria.push(criterion);
            }
        });
        this.setState({diseaseCriteria: tempDiseaseCriteria});
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation}, () => {
                this.interpretationEvalCheck();
            });
            // check to see if the interpretation has a disease associated with it
            if (nextProps.interpretation.interpretation_disease && nextProps.interpretation.interpretation_disease !== '') {
                this.setState({diseaseAssociated: true});
            }
        }
        // when props are updated, update the form with new extra data, if applicable
        if (nextProps.evidenceData) {
            this.setState({evidenceData: nextProps.evidenceData, evidenceDataUpdated: nextProps.evidenceDataUpdated});
        }
    },

    // helper function to go through interpretation object and check for existing evaluation for
    // rendering on form wrapper
    interpretationEvalCheck: function() {
        if (this.state.interpretation && this.state.interpretation.evaluations && this.state.interpretation.evaluations.length > 0) {
            for (var i = 0; i < this.state.interpretation.evaluations.length; i++) {
                if (this.props.criteria.indexOf(this.state.interpretation.evaluations[i].criteria) > -1) {
                    this.setState({evaluationExists: true});
                    break;
                }
            }
        }
    },

    // generic wrapper function to pass any form changes to the formChangeHandler function passed
    // from the parent page, if applicable
    handleFormChange: function(ref, e) {
        if (this.props.formChangeHandler) {
            this.props.formChangeHandler.call(this, ref, e);
        }
    },

    // generic wrapper function for the dropdowns; only function is to reset form errors, just in case
    handleDropdownChange: function(ref, e) {
        this.clrAllFormErrors();
    },

    // generic wrapper function to properly render checkboxes and pass any changes to the formChangeHandler
    // functino passed from the parent page, if applicable
    handleCheckboxChange: function(ref, e) {
        // properly render checking and unchecking of boxes
        let tempCheckboxes = this.state.checkboxes;
        tempCheckboxes[ref] = tempCheckboxes[ref] ? false : true;
        this.setState({checkboxes: tempCheckboxes});
        // invoke formChangeHandler()
        if (this.props.formChangeHandler) {
            this.props.formChangeHandler.call(this, ref, e);
        }
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true, updateMsg: null}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // cross check criteria values here (no more than one met per cross-check group); for cross checking within the same form group
        var criteriaEvalConflictValues = ['met', 'supporting', 'moderate', 'strong', 'stand-alone', 'very-strong'];
        if (this.props.criteriaCrossCheck && this.props.criteriaCrossCheck.length > 0) {
            var criteriaMetNum = 0,
                criteriaConflicting = [],
                errorMsgCriteria = '',
                crossCheckGroup;
            for (var i = 0; i < this.props.criteriaCrossCheck.length; i++) {
                crossCheckGroup = this.props.criteriaCrossCheck[i];
                // reset criteria conflicting array and message when moving to next cross check group
                criteriaMetNum = 0;
                criteriaConflicting = [];
                errorMsgCriteria = '';
                if (crossCheckGroup.length > 1) {
                    // per criteria cross check group...
                    crossCheckGroup.map((criterion, j) => {
                        // ... check the values...
                        if (criteriaEvalConflictValues.indexOf(this.refs[criterion + '-status'].getValue()) > -1) {
                            criteriaMetNum += 1;
                            criteriaConflicting.push(criterion);
                        }
                        // ... while building the error mesage, just in case
                        if (j < crossCheckGroup.length) {
                            errorMsgCriteria += criterion;
                            if (j < crossCheckGroup.length - 1) {
                                errorMsgCriteria += ', ';
                            }
                            if (j == crossCheckGroup.length - 2) {
                                errorMsgCriteria += 'or ';
                            }
                        }
                    });
                    // after checking a group, if we have an error, throw an error and stop the submitForm action
                    if (criteriaMetNum > 1) {
                        criteriaConflicting.map(criterion => {
                            this.setFormErrors(criterion + "-status", "*");
                        });
                        this.setState({submitBusy: false, updateMsg: <span className="text-danger">Only one of the criteria ({errorMsgCriteria}) can have a value other than "Not Met" or "Not Evaluated"</span>});
                        return false;
                    }
                }
            }
        }

        // passed cross check, so begin saving data
        this.clrAllFormErrors(); // reset form errors too, just in case
        var evaluations = {};
        var existingEvaluationUuids = {};
        var flatInterpretation = null;
        var freshInterpretation = null;
        var evidenceObjectId = null;
        var submittedCriteria = [];
        // for hard-coded crosschecks
        var manualCheck1 = null,
            manualCheck2 = null;
        // begin promise chain
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            // get fresh update of interpretation object so we have newest evaluation list, then flatten it
            flatInterpretation = curator.flatten(freshInterpretation);
            // lets do the disease check for saving criteria code here
            this.props.criteria.map(criterion => {
                if (evidenceCodes[criterion].diseaseDependent) {
                    // criteria is disease-dependent
                    if (flatInterpretation.disease && flatInterpretation.disease !== '') {
                        // criteria is disease-dependent and there is a disease associated with the interpretation
                        // add criteria to list of criteria to save
                        submittedCriteria.push(criterion);
                    }
                } else {
                    // criteria is not disease-dependent, so add it to list of criteria to
                    submittedCriteria.push(criterion);
                }
            });
            // do hard-coded check for PM2 vs PS4
            if (interpretation.evaluations && interpretation.evaluations.length > 0) {
                if (this.props.criteria.indexOf('PM2') > -1) {
                    if (criteriaEvalConflictValues.indexOf(this.refs['PM2-status'].getValue()) > -1) {
                        manualCheck1 = 'PM2';
                        manualCheck2 = 'PS4';
                    }
                } else if (this.props.criteria.indexOf('PS4') > -1) {
                    if (criteriaEvalConflictValues.indexOf(this.refs['PS4-status'].getValue()) > -1) {
                        manualCheck1 = 'PM4';
                        manualCheck2 = 'PM2';
                    }
                }
                if (manualCheck1 && manualCheck2) {
                    for (var i = 0; i < interpretation.evaluations.length; i++) {
                        if (interpretation.evaluations[i].criteria == manualCheck2) {
                            if (interpretation.evaluations[i].criteriaStatus == 'met') {
                                throw 'crossCheckError';
                            } else {
                                break;
                            }
                        }
                    }
                }
            }
            // check existing evaluations and map their UUIDs if they match the criteria in this form
            if (freshInterpretation.evaluations) {
                freshInterpretation.evaluations.map(freshEvaluation => {
                    if (submittedCriteria.indexOf(freshEvaluation.criteria) > -1) {
                        existingEvaluationUuids[freshEvaluation.criteria] = freshEvaluation.uuid;
                        // save the evidence object's id in case we can re-use it
                        if (freshEvaluation[this.state.evidenceType]) {
                            // Note: all evaluations/criteria codes in a form block should all reference the same singular evidence object.
                            // This code has no special handling in the case it encounters multiple evaluations that refer to different evidence
                            // objects. Evaluations that do not point to an evidence object, however, are skipped over
                            evidenceObjectId = freshEvaluation[this.state.evidenceType]['@id'] ? freshEvaluation[this.state.evidenceType]['@id'] : evidenceObjectId;
                        }
                    }
                });
            }

            // figure out if we need to create a new evidence data object or not
            if (this.state.evidenceData) {
                if (this.state.evidenceDataUpdated || (!this.state.evidenceDataUpdated && !evidenceObjectId)) {
                    // only create/update if evidence object has been updated, or if the object data has not been updated
                    // and there is no previous evidence object (new interpretation)
                    let evidenceObject = {variant: this.props.variantUuid};
                    evidenceObject[this.state.evidenceType + 'Data'] = this.state.evidenceData;
                    if (evidenceObjectId) {
                        // previous evidence object exists; update it
                        return this.putRestData(evidenceObjectId, evidenceObject).then(evidenceResult => {
                            return Promise.resolve(evidenceResult['@graph'][0]['@id']);
                        });
                    } else {
                        // previous evidence object not found; create a new one
                        return this.postRestData('/' + this.state.evidenceType + '/', evidenceObject).then(evidenceResult => {
                            return Promise.resolve(evidenceResult['@graph'][0]['@id']);
                        });
                    }
                } else {
                    // previous evidence object found, but the object does not need to be updated
                    return Promise.resolve(evidenceObjectId);
                }
            } else {
                // no relevant evidence object involved
                return Promise.resolve(null);
            }
        }).then(evidenceResult => {
            // generate individual promises for each evaluation. PUTs if the evaluation for the criteria code
            // already exists, and POSTs if not
            var evaluationPromises = [];
            submittedCriteria.map(criterion => {
                evaluations[criterion] = {
                    variant: this.props.variantUuid,
                    criteria: criterion,
                    explanation: this.getFormValue(criterion + '-explanation')
                };

                // set criterion status and modifiers
                if (['supporting', 'moderate', 'strong', 'very-strong', 'stand-alone'].indexOf(this.refs[criterion + '-status'].getValue()) > -1) {
                    // if dropdown selection is a modifier to met, set status to met, and set modifier as needed...
                    evaluations[criterion]['criteriaStatus'] = 'met';
                    evaluations[criterion]['criteriaModifier'] = this.refs[criterion + '-status'].getValue();
                } else {
                    // ... otherwise, set status as dropdown value, and blank out modifier
                    evaluations[criterion]['criteriaStatus'] = this.refs[criterion + '-status'].getValue();
                    evaluations[criterion]['criteriaModifier'] = '';
                }

                // make link to evidence object, if applicable
                if (evidenceResult) {
                    evaluations[criterion][this.state.evidenceType] = evidenceResult;
                }
                if (criterion in existingEvaluationUuids) {
                    evaluationPromises.push(this.putRestData('/evaluation/' + existingEvaluationUuids[criterion], evaluations[criterion]));
                } else {
                    evaluationPromises.push(this.postRestData('/evaluation/', evaluations[criterion]));
                }
            });

            // handle all the above-generated promises
            return Promise.all(evaluationPromises);
        }).then(evaluationResults => {
            let updateInterpretation = false; // flag for whether or not the evaluation object needs to be updated

            // if the interpretation object does not have an evaluations object, create it
            if (!('evaluations' in flatInterpretation)) {
                flatInterpretation.evaluations = [];
            }

            // go through the resulting evaluation object URIs...
            evaluationResults.map(evaluationResult => {
                let evaluationURI = evaluationResult['@graph'][0]['@id'];
                // ... and if it doesn't exist in the original interpretation object, add it
                if (flatInterpretation.evaluations.indexOf(evaluationURI) < 0) {
                    flatInterpretation.evaluations.push(evaluationURI);
                    updateInterpretation = true; // interpretation object now needs to be updated
                }
            });

            // if a new evaluation has been added to the interpretation object, PUT the updated object in
            if (updateInterpretation) {
                return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            } else {
                // otherwise just get an updated copy of the interpretation object, just in case
                return this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(data => {
                    return Promise.resolve(data);
                });
            }
        }).then(interpretation => {
            // REST handling is done. Re-enable Save button, and send the interpretation object back to index.js
            this.setState({submitBusy: false, updateMsg: <span className="text-success">Evaluations for {submittedCriteria.join(', ')} saved successfully!</span>});
            this.props.updateInterpretationObj();
        }).catch(error => {
            if (error == 'crossCheckError') {
                this.setState({submitBusy: false, updateMsg: <span className="text-danger">{manualCheck1} cannot have a value other than "Not Met" or "Not Evaluated" because {manualCheck2} has already been evaluated as being Met</span>});
            } else {
                this.setState({submitBusy: false, updateMsg: <span className="text-danger">Evaluation could not be saved successfully!</span>});
                console.log(error);
            }
        });
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    {this.props.renderedFormContent.call(this)}
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName={(this.state.evaluationExists ? "btn-info" : "btn-primary") + " pull-right btn-inline-spacer"} id="submit" title={this.state.evaluationExists ? "Update" : "Save"}
                        submitBusy={this.state.submitBusy} inputDisabled={this.state.diseaseCriteria && this.state.diseaseCriteria.length == this.props.criteria.length && !this.state.diseaseAssociated} />
                    {this.state.updateMsg ?
                        <div className="submit-info pull-right">{this.state.updateMsg}</div>
                    : null}
                </div>
            </Form>
        );
    }
});


/* Below code is for use in structuring/rendering the VCI eval forms */

// master wrapper for rendering a eval form 'group' (denoted by a single blue note box). Call from tab page where the forms should be rendered,
// in the function to pass into the CurationInterpretationObject object.
// noteContent should be a call to evalFormNoteSectionWrapper() - see below
// dropdownContent should be a call to evalFormDropdownSectionWrapper() - see below
// explanationContent should be a call to evalFormExplanationSectionWrapper() - see below
// divider is a boolean to indicate whether or not a gray divider bar should be rendered at the bottom of the group (for use if there is a subsequent form group before the Save button)
var evalFormSectionWrapper = module.exports.evalFormSectionWrapper = function(noteContent, dropdownContent, explanationContent, divider) {
    return (
        <div>
            <div className="col-sm-4">
                {noteContent}
            </div>
            <div className="col-sm-4 pad-top">
                {dropdownContent}
            </div>
            <div className="col-sm-4 pad-top">
                {explanationContent}
            </div>
            <div className={"clear" + (divider ? " divider" : "")}></div>
        </div>
    );
};

// wrapper for rendering the note section of eval form group. criteriaList should be an array of criteria codes being handled in the section.
// description and disease-dependency are ascertained from evidence_codes.json
var evalFormNoteSectionWrapper = module.exports.evalFormNoteSectionWrapper = function(criteriaList) {
    return (
        <p className="alert alert-info criteria-description">
            {criteriaList.map((criteria, i) => {
                return (
                    <span key={i}>
                        <strong>{criteria}:</strong> {evidenceCodes[criteria].definitionLong}
                        {evidenceCodes[criteria].diseaseDependent ? <span><br /><span className="label label-warning pull-right">Disease dependent</span></span> : null}
                        {i < criteriaList.length - 1 ? <span><br /><br /></span> : null}
                    </span>
                );
            })}
        </p>
    );
};

// wrapper for rendering the dropdown section of eval form group. criteriaList should be an array of criteria codes being handled in the section.
// calls evalFormValueDropdown() to render a dropdown for each criteria
var evalFormDropdownSectionWrapper = module.exports.evalFormDropdownSectionWrapper = function(criteriaList) {
    return (
        <div>
            {criteriaList.map((criteria, i) => {
                return (
                    <span key={i}>
                        {evalFormValueDropdown.call(this, criteria)}
                        {i < criteriaList.length - 1 ? <span className="col-xs-3 pad-bottom"><span className="pull-right">- or -</span></span> : null}
                        <div className="clear"></div>
                    </span>
                );
            })}
        </div>
    );
};

// helper function for evalFormDropdownSectionWrapper() to generate the dropdown for each criteria
function evalFormValueDropdown(criteria) {
    return (
        <Input type="select" ref={criteria + "-status"} label={criteria + ":"} defaultValue="not-evaluated" handleChange={this.handleDropdownChange}
            error={this.getFormError(criteria + "-status")} clearError={this.clrFormErrors.bind(null, criteria + "-status")}
            labelClassName="col-xs-3 control-label" wrapperClassName="col-xs-9" groupClassName="form-group"
            inputDisabled={evidenceCodes[criteria].diseaseDependent && !this.state.diseaseAssociated}>
            <option value="not-evaluated">Not Evaluated</option>
            <option disabled="disabled"></option>
            <option value="met">Met</option>
            <option value="not-met">Not Met</option>
            {criteria[1] === 'P' ? null : <option value="supporting">{criteria}_P</option>}
            {criteria[0] === 'P' && criteria[1] !== 'M' ? <option value="moderate">{criteria}_M</option> : null}
            {criteria[1] === 'S' ? null : <option value="strong">{criteria}_S</option>}
            {(criteria[0] === 'B' && criteria[1] !== 'A') ? <option value="stand-alone">{criteria}_stand alone</option> : null}
            {criteria === 'PS2' ? <option value="very-strong">{criteria}_VS</option> : null}
        </Input>
    );
}

// wrapper for rendering the explanation section of eval form group
// criteriaList should be an array of criteria codes being handled in the section
// hiddenList should be an array of booleans mirroring the size and order of criteriaList, with the booleans indicating whether or not the explanation input for
//      that criteria should be visible. this should generally be used with shareExplanation()
// customContentBefore should be HTML for any elements to render before the explanation inputs, in that column (optional)
// customContentAfter should be HTML for any elements to render after the explanation inputs, in that column (optional)
var evalFormExplanationSectionWrapper = module.exports.evalFormExplanationSectionWrapper = function(criteriaList, hiddenList, customContentBefore, customContentAfter) {
    return (
        <div>
            {customContentBefore ? customContentBefore : null}
            {criteriaList.map((criteria, i) => {
                return (<span key={i}>{evalFormExplanationDefaultInput.call(this, criteria, hiddenList[i])}</span>);
            })}
            {customContentAfter ? customContentAfter : null}
        </div>
    );
};

// helper function for evalFormExplanationSectionWrapper() to generate the explanation input for each criteria
function evalFormExplanationDefaultInput(criteria, hidden) {
    return (
        <Input type="textarea" ref={criteria + "-explanation"} rows="3" label="Explanation:"
            labelClassName="col-xs-4 control-label" wrapperClassName="col-xs-8" groupClassName={hidden ? "hidden" : "form-group"} handleChange={this.handleFormChange}
            inputDisabled={evidenceCodes[criteria].diseaseDependent && !this.state.diseaseAssociated} />
    );
}


/* Below code is for use in 'Update' portions of VCI eval forms */

// helper function for going through interpretation object received from nextProps and updating
// the forms for criteria defined by criteriaList (array of criteria code) with values from previous
// evaluation(s). customActions is a dictionary of criteria-specific logic for updating non-standard
// form fields for a criteria. The key for this dict is the crtieria to which the custom action should
// be applied to, and the value is an anonymous function with the desired logic
var updateEvalForm = module.exports.updateEvalForm = function(nextProps, criteriaList, customActions) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                if (criteriaList.indexOf(evaluation.criteria) > -1) {
                    if (evaluation.criteriaModifier) {
                        this.refs[evaluation.criteria + '-status'].setValue(evaluation.criteriaModifier);
                    } else {
                        this.refs[evaluation.criteria + '-status'].setValue(evaluation.criteriaStatus);
                    }
                    this.refs[evaluation.criteria + '-explanation'].setValue(evaluation.explanation);
                    // apply custom anonymous function logic if applicable
                    if (customActions && evaluation.criteria in customActions) {
                        customActions[evaluation.criteria].call(this, evaluation);
                    }
                }
                this.setState({submitDisabled: false});
            });
        }
    }
};


/* Below code is for use in 'Change' portions of VCI eval forms */

// logic for ensuring that multiple 'shared' criteria have the same explanation values at all times. Usually only one is visible.
// criteriaList should be an array of criteria codes
var shareExplanation = module.exports.shareExplanation = function(ref, criteriaList) {
    let refCriteria = ref.substring(0, ref.indexOf("-")),
        refType = ref.substring(ref.indexOf("-") + 1);
    if (criteriaList.indexOf(refCriteria) > -1 && refType === "explanation") {
        criteriaList.splice(criteriaList.indexOf(refCriteria), 1);
        criteriaList.map(criteria => {
            this.refs[criteria + '-explanation'].setValue(this.refs[ref].getValue());
        });
    }
};
