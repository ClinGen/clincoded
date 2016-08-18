'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var fetched = require('../fetched');
var RestMixin = require('../rest').RestMixin;
var parseAndLogError = require('../mixins').parseAndLogError;
var form = require('../../libs/bootstrap/form');
var modal = require('../../libs/bootstrap/modal');
var CuratorHistory = require('../curator_history');
var curator = require('../curator');

var Input = form.Input;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var queryKeyValue = globals.queryKeyValue;

// Display the variant curation action bar above the criteria and tabs
var VariantCurationActions = module.exports.VariantCurationActions = React.createClass({
    mixins: [RestMixin, ModalMixin, FormMixin, CuratorHistory],

    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        session: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.string,
        updateInterpretationObj: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            variantUuid: null,
            interpretation: null,
            hasExistingInterpretation: false,
            isInterpretationActive: false,
            hasAssociatedDisease: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.variantData) {
            if (this.props.variantData.associatedInterpretations) {
                if (this.props.variantData.associatedInterpretations.length) {
                    var associatedInterpretations = this.props.variantData.associatedInterpretations;
                    associatedInterpretations.forEach(associatedInterpretation => {
                        if (associatedInterpretation.submitted_by['@id'] === this.props.session.user_properties['@id']) {
                            this.setState({hasExistingInterpretation: true});
                        }
                    });
                }
            }
        }
        if (this.props.editKey === 'true' && this.props.interpretation) {
            this.setState({isInterpretationActive: true});
            if (this.props.interpretation) {
                if (this.props.interpretation.interpretation_disease) {
                    this.setState({hasAssociatedDisease: true});
                }
            }
        }
    },

    updateParentState: function() {
        this.setState({hasAssociatedDisease: true});
    },

    // handler for 'Start new interpretation' & 'Continue interpretation' button click events
    handleInterpretationEvent: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variantObj = this.props.variantData;
        var selectedTab = queryKeyValue('tab', window.location.href),
            selectedSubtab = queryKeyValue('subtab', window.location.href);
        var newInterpretationObj;
        if (!this.state.hasExistingInterpretation) {
            if (variantObj) {
                this.setState({variantUuid: variantObj.uuid});
                // Put together a new interpretation object
                newInterpretationObj = {variant: variantObj.uuid};
            }
            // Post new interpretation to the DB. Once promise returns, go to /curation-variant page with
            // the new interpretation UUID in the query string.
            this.postRestData('/interpretations/', newInterpretationObj).then(data => {
                var newInterpretationUuid = data['@graph'][0].uuid;
                window.location.href = '/variant-central/?edit=true&variant=' + this.state.variantUuid + '&interpretation=' + newInterpretationUuid + (selectedTab ? '&tab=' + selectedTab : '') + (selectedSubtab ? '&subtab=' + selectedSubtab : '');
            }).catch(e => {parseAndLogError.bind(undefined, 'postRequest');});
        } else if (this.state.hasExistingInterpretation && !this.state.isInterpretationActive) {
            window.location.href = '/variant-central/?edit=true&variant=' + variantObj.uuid + '&interpretation=' + variantObj.associatedInterpretations[0].uuid + (selectedTab ? '&tab=' + selectedTab : '') + (selectedSubtab ? '&subtab=' + selectedSubtab : '');
        }
    },

    render: function() {
        var interpretationButtonTitle = '';
        if (!this.state.hasExistingInterpretation) {
            interpretationButtonTitle = 'Start New Interpretation';
        } else if (this.state.hasExistingInterpretation && !this.state.isInterpretationActive) {
            interpretationButtonTitle = 'Continue Interpretation';
        }

        var associateDiseaseButtonTitle = '', associateDiseaseModalTitle = '';
        if (this.state.hasAssociatedDisease) {
            associateDiseaseButtonTitle = 'Edit Disease';
            associateDiseaseModalTitle = 'Associate this interpretation with a different disease';
        } else {
            associateDiseaseButtonTitle = 'Associate with Disease';
            associateDiseaseModalTitle = 'Associate this interpretation with a disease';
        }

        return (
            <div className="container curation-actions curation-variant">
                {(this.state.isInterpretationActive) ?
                    <div className="interpretation-record clearfix">
                        <h2><span>Variant Interpretation Record</span></h2>
                        <div className="btn-group">
                            <Modal title={associateDiseaseModalTitle} wrapperClassName="modal-associate-disease">
                                <button className="btn btn-primary pull-right" modal={<AssociateDisease closeModal={this.closeModal} data={this.props.variantData} session={this.props.session} updateParentState={this.updateParentState}
                                    interpretation={this.props.interpretation} editKey={this.props.editkey} updateInterpretationObj={this.props.updateInterpretationObj} />}>{associateDiseaseButtonTitle}</button>
                            </Modal>
                        </div>
                    </div>
                :
                    <div className="evidence-only clearfix">
                        <Input type="button-button" inputClassName="btn btn-primary pull-right" title={interpretationButtonTitle} clickHandler={this.handleInterpretationEvent} />
                    </div>
                }
            </div>
        );
    }
});

// handle 'Associate with Disease' button click event
var AssociateDisease = React.createClass({
    mixins: [RestMixin, FormMixin],

    contextTypes: {
        handleStateChange: React.PropTypes.func
    },

    propTypes: {
        data: React.PropTypes.object,
        session: React.PropTypes.object,
        closeModal: React.PropTypes.func, // Function to call to close the modal
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.bool,
        updateInterpretationObj: React.PropTypes.func,
        updateParentState: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            submitResourceBusy: false
        };
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        // Check if orphanetid
        if (valid) {
            valid = this.getFormValue('orphanetid').match(/^ORPHA[0-9]{1,6}$/i);
            if (!valid) {
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15)');
            }
        }
        return valid;
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Invoke button progress indicator
        this.setState({submitResourceBusy: true});
        // Get values from form and validate them
        this.saveFormValue('orphanetid', this.refs.orphanetid.getValue());
        if (this.validateForm()) {
            // Get the free-text values for the Orphanet ID to check against the DB
            var orphaId = this.getFormValue('orphanetid').match(/^ORPHA([0-9]{1,6})$/i)[1];
            var interpretationDisease;
            // Get the disease orresponding to the given Orphanet ID.
            // If either error out, set the form error fields
            this.getRestDatas([
                '/diseases/' + orphaId
            ], [
                function() { this.setFormErrors('orphanetid', 'Orphanet ID not found'); }.bind(this)
            ]).then(data => {
                interpretationDisease = data[0]['@id'];
                this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
                    var currInterpretation = interpretation;
                    // get up-to-date copy of interpretation object and flatten it
                    var flatInterpretation = curator.flatten(currInterpretation);
                    // if the interpretation object does not have a disease object, create it
                    if (!('disease' in flatInterpretation)) {
                        flatInterpretation.disease = '';
                        // Return the newly flattened interpretation object in a Promise
                        return Promise.resolve(flatInterpretation);
                    } else {
                        return Promise.resolve(flatInterpretation);
                    }
                }).then(interpretationObj => {
                    if (interpretationDisease) {
                        // Set the disease '@id' to the newly flattened interpretation object's 'disease' property
                        interpretationObj.disease = interpretationDisease;
                        // Update the intepretation object partially with the new disease property value
                        return this.putRestData('/interpretation/' + this.props.interpretation.uuid, interpretationObj).then(result => {
                            this.props.updateInterpretationObj();
                            this.props.updateParentState();
                            this.setState({submitResourceBusy: false});
                            // Need 'submitResourceBusy' state to proceed closing modal
                            return Promise.resolve(this.state.submitResourceBusy);
                        }).then(submitState => {
                            // Close modal after 'submitResourceBusy' is completed
                            if (submitState !== true) {
                                this.props.closeModal();
                            }
                        });
                    }
                });
            }).catch(e => {
                // Some unexpected error happened
                parseAndLogError.bind(undefined, 'fetchedRequest');
            });
        }
    },

    // Called when the modal 'Cancel' button is clicked
    cancelAction: function(e) {
        this.props.closeModal();
    },

    render: function() {
        var disease_id = '';
        if (this.props.interpretation) {
            if (this.props.interpretation.interpretation_disease) {
                disease_id = this.props.interpretation.interpretation_disease;
            }
        }

        return (
            <Form submitHandler={this.submitForm} formClassName="form-std">
                <div className="modal-box">
                    <div className="modal-body clearfix">
                        <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} placeholder="e.g. ORPHA15" value={(disease_id) ? disease_id : null}
                            error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                    </div>
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelAction} title="Cancel" />
                        <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="OK" submitBusy={this.state.submitResourceBusy} />
                    </div>
                </div>
            </Form>
        );
    }
});

var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Enter <a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> ID</span>;
    }
});
