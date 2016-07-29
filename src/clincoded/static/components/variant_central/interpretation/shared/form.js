'use strict';
var React = require('react');
var _ = require('underscore');
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
        evidenceType: React.PropTypes.string, // specified what type of evidence object is created
        evidenceData: React.PropTypes.object, // any extra evidence data that is passed from the parent page
        evidenceDataUpdated: React.PropTypes.bool, // passed in by parent page, which does the comparison of stored and new external data
        formDataUpdater: React.PropTypes.func, // the function that updates the rendered form with data from evidenceData
        formChangeHandler: React.PropTypes.func, // function that will take care of any in-form logic that needs to be taken in to account
        variantUuid: React.PropTypes.string, // UUID of the parent variant
        criteria: React.PropTypes.array, // array of criteria codes (non-disease-specific) being handled by this form
        criteriaDisease: React.PropTypes.array, // array of criteria codes (disease-specific) being handled by this form
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
            evidenceData: null, // any extra data (external sources or otherwise) that will be passed into the evaluation evidence object
            interpretation: this.props.interpretation, // parent interpretation object
            diseaseAssociated: false, // flag to define whether or not the interpretation has a disease associated with it
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
        }
        // update the form when extra data is loaded
        if (this.props.evidenceData) {
            this.setState({evidenceType: this.props.evidenceType, evidenceData: this.props.evidenceData, evidenceDataUpdated: this.props.evidenceDataUpdated});
        }
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
            // check to see if the interpretation has a disease associated with it
            if (nextProps.interpretation.interpretation_disease && nextProps.interpretation.interpretation_disease !== '') {
                this.setState({diseaseAssociated: true});
            }
        }
        // when props are updated, update the form with new extra data, if applicable
        if (typeof nextProps.evidenceData !== undefined && nextProps.evidenceData != this.props.evidenceData) {
            this.setState({evidenceType: nextProps.evidenceType, evidenceData: nextProps.evidenceData, evidenceDataUpdated: nextProps.evidenceDataUpdated});
        }
    },

    // generic wrapper function to pass any form changes to the formChangeHandler function passed
    // from the parent page, if applicable
    handleFormChange: function(ref, e) {
        if (this.props.formChangeHandler) {
            this.props.formChangeHandler.call(this, ref, e);
        }
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

        var evaluations = {};
        var existingEvaluationUuids = {};
        var flatInterpretation = null;
        var freshInterpretation = null;
        var evidenceObjectId = null;
        var submittedCriteria = this.props.criteria ? this.props.criteria : [];
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            // get fresh update of interpretation object so we have newest evaluation list, then flatten it
            flatInterpretation = curator.flatten(freshInterpretation);
            // lets do the disease check for saving criteria code here
            if (flatInterpretation.disease && flatInterpretation.disease !== '' && this.props.criteriaDisease && this.props.criteriaDisease.length > 0) {
                submittedCriteria = submittedCriteria.concat(this.props.criteriaDisease);
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
                if (this.state.evidenceDataUpdated) {
                    let evidenceObject = {variant: this.props.variantUuid};
                    evidenceObject[this.state.evidenceType + 'Data'] = this.state.evidenceData;
                    return this.postRestData('/' + this.props.evidenceType + '/', evidenceObject).then(evidenceResult => {
                        return Promise.resolve(evidenceResult['@graph'][0]['@id']);
                    });
                } else {
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
                // check whether or not criterion value is a checkbox and handle accordingly
                if (this.refs[criterion + '-met'].getValue() === true) {
                    evaluations[criterion]['value'] = 'met';
                } else if (this.refs[criterion + '-not-met'].getValue() === true) {
                    evaluations[criterion]['value'] = 'not-met';
                } else {
                    //evaluations[criterion]['value'] = this.refs[criterion + '-value'].getValue();
                    evaluations[criterion]['value'] = 'not-evaluated';
                }
                // make link to evidence object, if applicable
                if (evidenceResult) {
                    evaluations[criterion][this.props.evidenceType] = evidenceResult;
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
            this.setState({submitBusy: false, updateMsg: <span className="text-danger">Evaluation could not be saved successfully!</span>});
            console.log(error);
        });
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    {this.props.renderedFormContent.call(this)}
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save"
                        submitBusy={this.state.submitBusy} inputDisabled={(!this.props.criteria || this.props.criteria.length == 0) && !this.state.diseaseAssociated} />
                    {this.state.updateMsg ?
                        <div className="submit-info pull-right">{this.state.updateMsg}</div>
                    : null}
                </div>
            </Form>
        );
    }
});


/* Below code is for use in structuring/rendering the VCI eval forms */

var evalFormSectionWrapper = module.exports.evalFormSectionWrapper = function(noteContent, valueContent, explanationContent, divider) {
    return (
        <div>
            <div className="col-sm-4">
                {noteContent}
            </div>
            <div className="col-sm-4 pad-top">
                {valueContent}
            </div>
            <div className="col-sm-4 pad-top">
                {explanationContent}
            </div>
            <div className={"clear" + (divider ? " divider" : "")}></div>
        </div>
    );
};

var evalFormNoteSectionWrapper = module.exports.evalFormNoteSectionWrapper = function(criteriaList) {
    return (
        <p className="alert alert-info">
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

function evalFormValueDropdown(criteria) {
    return (
        <Input type="select" ref={criteria + "-value"} label={criteria + ":"} defaultValue="not-evaluated"
            error={this.getFormError(criteria + "-value")} clearError={this.clrFormErrors.bind(null, criteria + "-value")}
            labelClassName="col-xs-3 control-label" wrapperClassName="col-xs-9" groupClassName="form-group"
            handleChange={this.handleChange}>
            <option value="not-evaluated">{criteria} Not Evaluated</option>
            <option disabled="disabled"></option>
            <option value="met">{criteria} Met</option>
            <option value="not-met">{criteria} Not Met</option>
            <option value="supporting">{criteria} Supporting</option>
            <option value="moderate">{criteria} Moderate</option>
            <option value="strong">{criteria} Strong</option>
            <option value="very-strong">{criteria} Very Strong</option>
        </Input>
    );
}

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

function evalFormExplanationDefaultInput(criteria, hidden) {
    return (
        <Input type="textarea" ref={criteria + "-explanation"} rows="3" label="Explanation:"
            labelClassName="col-xs-4 control-label" wrapperClassName="col-xs-8" groupClassName={hidden ? "hidden" : "form-group"} handleChange={this.handleFormChange} />
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
                    this.refs[evaluation.criteria + '-value'].setValue(evaluation.value);
                    // apply custom anonymous function logic if applicable
                    if (evaluation.criteria in customActions) {
                        customActions[evaluation.criteria].call(this, evaluation);
                    }
                }
                this.setState({submitDisabled: false});
            });
        }
    }
};


/* Below code is for use in 'Change' portions of VCI eval forms */

// logic for ensuring that Met and Not Met of a criteria are not both checked at all times.
var switchCheckboxes = module.exports.switchCheckboxes = function(ref, criteria) {
    if (ref === criteria + '-met' || ref === criteria + '-not-met') {
        let tempCheckboxes = this.state.checkboxes;
        if (this.state.checkboxes[ref]) {
            if (ref === criteria + '-met') {
                tempCheckboxes[criteria + '-not-met'] = false;
            } else if (ref === criteria + '-not-met') {
                tempCheckboxes[criteria + '-met'] = false;
            }
        }
    }
};

// logic for ensuring that two mutually exclusive criteria do not both have Met values.
var switchCrossCheckboxes = module.exports.switchCrossCheckboxes = function(ref, criteria1, criteria2) {
    if (ref === criteria1 + '-met' || ref === criteria2 + '-met') {
        let tempCheckboxes = this.state.checkboxes,
            refCriteria = ref.substring(0,3),
            altCriteria = refCriteria === criteria1 ? criteria2 : criteria1;
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteria + '-met'] = false;
        }
    }
};

// logic for ensuring that two 'shared' criteria have the same explanation values at all times. Usually one is hidden.
var shareExplanation = module.exports.shareExplanation = function(ref, criteria1, criteria2) {
    if (ref === criteria1 + '-explanation' || ref === criteria2 + '-explanation') {
        let refCriteria = ref.substring(0,3),
            altCriteria = refCriteria === criteria1 ? criteria2 : criteria1;
        this.refs[altCriteria + '-explanation'].setValue(this.refs[ref].getValue());
    }
};
