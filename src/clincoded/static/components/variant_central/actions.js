'use strict';
var React = require('react');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;
var parseAndLogError = require('../mixins').parseAndLogError;
var form = require('../../libs/bootstrap/form');
var modal = require('../../libs/bootstrap/modal');

var Input = form.Input;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var queryKeyValue = globals.queryKeyValue;

// Display the variant curation action bar above the criteria and tabs
var VariantCurationActions = module.exports.VariantCurationActions = React.createClass({
    mixins: [RestMixin, ModalMixin],

    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        session: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            variantUuid: null,
            editKey: queryKeyValue('edit', this.props.href)
        };
    },

    // handler for 'Start new interpreation' button click event
    handleNewInterpretation: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variantObj = this.props.variantData;
        var newInterpretationObj;
        if (variantObj) {
            this.setState({variantUuid: variantObj.uuid});
            // Put together a new interpretation object
            newInterpretationObj = {variant: variantObj.uuid};
        }
        // Post new interpretation to the DB. Once promise returns, go to /curation-variant page with
        // the new interpretation UUID in the query string.
        this.postRestData('/interpretations/', newInterpretationObj).then(data => {
            var newInterpretationUuid = data['@graph'][0].uuid;
            window.location.href = '/variant-central/?variant=' + this.state.variantUuid + '&interpretation=' + newInterpretationUuid;
        }).catch(e => {parseAndLogError.bind(undefined, 'postRequest')});
    },

    // handler for 'Continue interpretation' button click event
    handleExistingInterpretation: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variantObj = this.props.variantData;
        window.location.href = '/variant-central/?edit=true&variant=' + variantObj.uuid + '&interpretation=' + variantObj.associatedInterpretations[0].uuid;
    },

    render: function() {
        return (
            <Form formClassName="form-horizontal form-std">
                <div className="container curation-actions curation-variant">
                    {((this.props.editKey || this.state.editKey) && this.props.interpretation) ?
                        <div className="interpretation-record clearfix">
                            <h2><span>Variant Interpretation Record</span></h2>
                            <div className="btn-group">
                                <Modal title="Associate with Disease" wrapperClassName="modal-associate-disease">
                                    <button className="btn btn-primary pull-right"
                                        modal={<AssociateDisease closeModal={this.closeModal} data={this.props.variantData} interpretation={this.props.interpretation} editKey={this.props.editkey} />}>Associate with Disease</button>
                                </Modal>
                            </div>
                        </div>
                        :
                        <RenderInterpretationButton data={this.props.variantData} session={this.props.session} 
                            handleExistingInterpretation={this.handleExistingInterpretation} handleNewInterpretation={this.handleNewInterpretation} />
                    }
                </div>
            </Form>
        );
    }
});

// Render 'Start new interpretation' or 'Continue interpretation' button
var RenderInterpretationButton = React.createClass({
    propTypes: {
        data: React.PropTypes.object,
        session: React.PropTypes.object,
        handleExistingInterpretation: React.PropTypes.func,
        handleNewInterpretation: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            hasExistingInterpretation: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            if (this.props.data.associatedInterpretations) {
                if (this.props.data.associatedInterpretations.length && this.props.data.submitted_by['@id'] === this.props.session.user_properties['@id']) {
                    this.setState({hasExistingInterpretation: true});
                }
            }
        }
    },

    render: function() {
        return (
            <div className="evidence-only clearfix">
                {(this.state.hasExistingInterpretation) ?
                    <Input type="button-button" inputClassName="btn-primary pull-right" title="Continue interpretation" clickHandler={this.props.handleExistingInterpretation} />
                    :
                    <Input type="button-button" inputClassName="btn-primary pull-right" title="Start new interpretation" clickHandler={this.props.handleNewInterpretation} />
                }
            </div>
        );
    }
});

// handle 'Associate with Disease' button click event
var AssociateDisease = React.createClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        data: React.PropTypes.object,
        closeModal: React.PropTypes.func, // Function to call to close the modal
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.bool
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

        // Get values from form and validate them
        this.saveFormValue('orphanetid', this.refs.orphanetid.getValue());
        if (this.validateForm()) {
            // Get the free-text values for the Orphanet ID to check against the DB
            var orphaId = this.getFormValue('orphanetid').match(/^ORPHA([0-9]{1,6})$/i)[1];

            // Get the disease orresponding to the given Orphanet ID.
            // If either error out, set the form error fields
            this.getRestDatas([
                '/diseases/' + orphaId
            ], [
                function() { this.setFormErrors('orphanetid', 'Orphanet ID not found'); }.bind(this)
            ]).then(data => {
                this.props.closeModal();
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
        return (
            <div className="modal-box">
                <div className="modal-body">
                    <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} placeholder="e.g. ORPHA15"
                        error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                        labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                </div>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelAction} title="Cancel" />
                    <Input type="button" inputClassName="btn-primary btn-inline-spacer" clickHandler={this.submitForm} title="OK" submitBusy={this.state.submitResourceBusy} />
                </div>
            </div>
        );
    }
});

var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Enter <a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> ID</span>;
    }
});
