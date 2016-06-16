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
        evidenceData: React.PropTypes.object, // any extra evidence data that is passed from the parent page
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
            submitDisabled: false, // changed by handleChange method, but disabled for now due to uncertain/non-universal logic
            evidenceData: null, // any extra data (external sources or otherwise) that will be passed into the evaluation evidence object
            interpretation: null // parent interpretation object
        };
    },

    componentDidMount: function() {
        // update the interpretation object when loaded
        if (this.props.interpretation) {
            this.setState({interpretation: this.props.interpretation});
        }
        // update the form when extra data is loaded
        if (this.props.evidenceData) {
            this.setState({evidenceData: this.props.evidenceData});
            if (this.props.formDataUpdater) {
                this.props.formDataUpdater.call(this, this.props);
            }
        }
    },

    componentWillReceiveProps: function(nextProps) {
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && nextProps.interpretation != this.props.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        // when props are updated, update the form with new extra data, if applicable
        if (typeof nextProps.evidenceData !== undefined && nextProps.evidenceData != this.props.evidenceData) {
            this.setState({evidenceData: nextProps.evidenceData});
            if (this.props.formDataUpdater) {
                this.props.formDataUpdater.call(this, nextProps);
            }
        }
    },

    handleChange: function(ref, e) {
        // disabled because logic is uncertain/not universal for all form use cases
        /*
        if (ref === 'value') {
            if (this.refs[ref].getValue() == 'No Selection') {
                this.setState({submitDisabled: true});
            } else {
                this.setState({submitDisabled: false});
            }
        }
        */
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true}); // Save button pressed; disable it and start spinner

        // Save all form values from the DOM.
        this.saveAllFormValues();

        var evaluations = {};
        var existingEvaluationUuids = {};
        var flatInterpretation = null;
        var freshInterpretation = null;
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            // get fresh update of interpretation object so we have newest evaluation list, then flatten it
            flatInterpretation = curator.flatten(freshInterpretation);

            // check existing evaluations and map their UUIDs if they match the criteria in this form
            if (freshInterpretation.evaluations) {
                freshInterpretation.evaluations.map(freshEvaluation => {
                    if (this.props.criteria.indexOf(freshEvaluation.criteria) > -1) {
                        existingEvaluationUuids[freshEvaluation.criteria] = freshEvaluation.uuid;
                    }
                });
            }

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
            this.setState({submitBusy: false});
            this.props.updateInterpretationObj(interpretation);
        }).catch(error => {
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
                </div>
            </Form>
        );
    }
});
