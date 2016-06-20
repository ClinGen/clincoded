'use strict';
var React = require('react');
var _ = require('underscore');
var form = require('../../../../libs/bootstrap/form');
var RestMixin = require('../../../rest').RestMixin;
var curator = require('../../../curator');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Form component to be re-used by various tabs
var CurationInterpretationForm = module.exports.CurationInterpretationForm = React.createClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        formTitle: React.PropTypes.string, // the title of this form section
        renderedFormContent: React.PropTypes.func, // the function that returns the rendering of the form items
        evidenceType: React.PropTypes.string, // specified what type of evidence object is created
        evidenceData: React.PropTypes.object, // any extra evidence data that is passed from the parent page
        evidenceDataUpdated: React.PropTypes.bool, // passed in by parent page, which does the comparison of stored and new external data
        formDataUpdater: React.PropTypes.func, // the function that updates the rendered form with data from evidenceData
        variantUuid: React.PropTypes.string, // UUID of the parent variant
        criteria: React.PropTypes.array, // array of criteria codes being handled by this form
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
            interpretation: null, // parent interpretation object
            updateMsg: null // specifies what html to display next to button after press
        };
    },

    componentDidMount: function() {
        // this block is for handling props and states on initial load/rendering
        // update the interpretation object when loaded
        if (this.props.interpretation) {
            this.setState({interpretation: this.props.interpretation});
        }
        // update the form when extra data is loaded
        if (this.props.evidenceData) {
            this.setState({evidenceType: this.props.evidenceType, evidenceData: this.props.evidenceData, evidenceDataUpdated: this.props.evidenceDataUpdated});
            if (this.props.formDataUpdater) {
                this.props.formDataUpdater.call(this, this.props);
            }
        }
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && nextProps.interpretation != this.props.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        // when props are updated, update the form with new extra data, if applicable
        if (typeof nextProps.evidenceData !== undefined && nextProps.evidenceData != this.props.evidenceData) {
            this.setState({evidenceType: nextProps.evidenceType, evidenceData: nextProps.evidenceData, evidenceDataUpdated: nextProps.evidenceDataUpdated});
            if (this.props.formDataUpdater) {
                this.props.formDataUpdater.call(this, nextProps);
            }
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
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            // get fresh update of interpretation object so we have newest evaluation list, then flatten it
            flatInterpretation = curator.flatten(freshInterpretation);

            // check existing evaluations and map their UUIDs if they match the criteria in this form
            if (freshInterpretation.evaluations) {
                freshInterpretation.evaluations.map(freshEvaluation => {
                    if (this.props.criteria.indexOf(freshEvaluation.criteria) > -1) {
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
            if (this.state.evidenceDataUpdated) {
                let evidenceObject = {variant: this.props.variantUuid};
                evidenceObject[this.state.evidenceType + 'Data'] = this.state.evidenceData;
                return this.postRestData('/' + this.props.evidenceType + '/', evidenceObject).then(evidenceResult => {
                    return Promise.resolve(evidenceResult['@graph'][0]['@id']);
                });
            } else {
                return Promise.resolve(evidenceObjectId);
            }
        }).then(evidenceResult => {
            // generate individual promises for each evaluation. PUTs if the evaluation for the criteria code
            // already exists, and POSTs if not
            var evaluationPromises = [];
            this.props.criteria.map(criterion => {
                evaluations[criterion] = {
                    variant: this.props.variantUuid,
                    criteria: criterion,
                    value: this.getFormValue(criterion + '-value'),
                    description: this.getFormValue(criterion + '-description')
                };
                evaluations[criterion][this.props.evidenceType] = evidenceResult; // don't forget to make the link to the evidence object
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
            this.setState({submitBusy: false, updateMsg: <span className="text-success">Evaluation saved successfully!</span>});
            this.props.updateInterpretationObj(interpretation);
        }).catch(error => {
            this.setState({submitBusy: false, updateMsg: <span className="text-danger">Evaluation could not be saved successfully!</span>});
            console.log(error);
        });
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    {this.props.formTitle ?
                        <h4>{this.props.formTitle}</h4>
                    : null}
                    {this.props.renderedFormContent.call(this)}
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} inputDisabled={this.state.submitDisabled} />
                    {this.state.updateMsg ?
                        <div className="submit-info pull-right">{this.state.updateMsg}</div>
                    : null}
                </div>
            </Form>
        );
    }
});
