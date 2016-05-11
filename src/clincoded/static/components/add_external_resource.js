'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var CuratorHistory = require('./curator_history');
var parseAndLogError = require('./mixins').parseAndLogError;

var parseClinvar = require('../libs/parse-resources').parseClinvar;
var parseCAR = require('../libs/parse-resources').parseCAR;

var Panel = panel.Panel;
var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var Form = form.Form;
var FormMixin = form.FormMixin;
var RestMixin = require('./rest').RestMixin;
var Input = form.Input;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;
var truncateString = globals.truncateString;


// Class for the add resource button. This class only renderes the button to add and clear the fields.
var AddResourceId = module.exports.AddResourceId = React.createClass({
    mixins: [ModalMixin],
    propTypes: {
        resourceType: React.PropTypes.string, // specify what the resource you're trying to add is (passed to Modal)
        label: React.PropTypes.string, // text for the button's label
        labelVisible: React.PropTypes.bool, // specify whether or not the label is visible
        buttonText: React.PropTypes.string, // text for the button
        clearButtonText: React.PropTypes.string, // text for clear button
        initialFormValue: React.PropTypes.string, // specify the initial value of the resource, in case of editing (passed to Modal)
        fieldNum: React.PropTypes.string, // specify which field on the main form this should edit (passed to Modal)
        updateParentForm: React.PropTypes.func, // function to call upon pressing the Save button
        disabled: React.PropTypes.bool, // specify whether or not the button on the main form is disabled
        wrapperClass: React.PropTypes.string, // specify any special css classes for the button
        buttonWrapperClass: React.PropTypes.string, // specify any special css classes for the button
        buttonClass: React.PropTypes.string, // specify any special css classes for the button
        clearButtonClass: React.PropTypes.string, // specify any special css classes for the button
        buttonOnly: React.PropTypes.bool, // specify whether or not only the button should be rendered (no form-group)
        clearButtonRender: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            txtModalTitle: ''
        };
    },

    // set the text of the modal title on load
    componentDidMount: function() {
        switch(this.props.resourceType) {
            case 'clinvar':
                this.setState({txtModalTitle: clinvarTxt('modalTitle')});
                break;
            case 'car':
                this.setState({txtModalTitle: carTxt('modalTitle')});
                break;
        }
    },

    // called when the 'Clear' button is pressed on the main form
    resetForm: function(e) {
        this.props.updateParentForm(null, this.props.fieldNum);
    },

    buttonRender: function() {
        return (
            <span className={"inline-button-wrapper button-push" + (this.props.buttonWrapperClass ? " " + this.props.buttonWrapperClass : "")}>
                <Modal title={this.state.txtModalTitle} className="input-inline" modalClass="modal-default">
                    <a className={"btn btn-default" + (this.props.buttonClass ? " " + this.props.buttonClass : "") + (this.props.disabled ? " disabled" : "")}
                        modal={<AddResourceIdModal resourceType={this.props.resourceType} initialFormValue={this.props.initialFormValue}
                        fieldNum={this.props.fieldNum} updateParentForm={this.props.updateParentForm} protocol={this.props.protocol} closeModal={this.closeModal} />}>
                            {this.props.buttonText}
                    </a>
                </Modal>
            </span>
        );
    },

    clearButtonRender: function() {
        return (
            <Input type="button" title={this.props.clearButtonText ? this.props.clearButtonText : "Clear"} inputClassName={"btn-default" + (this.props.clearButtonClass ? " " + this.props.clearButtonClass : "")} clickHandler={this.resetForm} />
        );
    },

    render: function() {
        if (this.props.buttonOnly) {
            return (
                <div className={"inline-button-wrapper" + (this.props.wrapperClass ? " " + this.props.wrapperClass : "")}>
                    {this.buttonRender()}
                    {this.props.clearButtonRender && this.props.initialFormValue ?
                        this.clearButtonRender()
                    : null}
                </div>
            );
        } else {
            return (
                <div className="form-group">
                    <span className="col-sm-5 control-label">{this.props.labelVisible ? <label>{this.props.label}</label> : null}</span>
                    <span className="col-sm-7">
                        <div className={"inline-button-wrapper button-push" + (this.props.wrapperClass ? " " + this.props.wrapperClass : "")}>
                            {this.buttonRender()}
                            {this.props.clearButtonRender && this.props.initialFormValue ?
                                this.clearButtonRender()
                            : null}
                        </div>
                    </span>
                </div>
            );
        }
    }
});

// Class for the modal for adding external resource IDs
var AddResourceIdModal = React.createClass({
    mixins: [FormMixin, RestMixin, CuratorHistory],

    propTypes: {
        resourceType: React.PropTypes.string, // specify what the resource you're trying to add is
        initialFormValue: React.PropTypes.string, // specify the initial value of the resource, in case of editing
        fieldNum: React.PropTypes.string, // specify which field on the main form this should edit
        closeModal: React.PropTypes.func, // Function to call to close the modal
        protocol: React.PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        updateParentForm: React.PropTypes.func // Function to call when submitting and closing the modal
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            txtInputLabel: '',
            txtInputButton: '',
            txtHelpText: '',
            txtResourceResponse: '',
            inputValue: '',
            queryResourceDisabled: true,
            queryResourceBusy: false, // True while form is submitting
            resourceFetched: false,
            tempResource: {},
            submitResourceBusy: false
        };
    },

    // load text for different parts of the modal on load
    componentDidMount: function() {
        var tempTxtLabel;
        switch(this.props.resourceType) {
            case 'clinvar':
                if (this.props.initialFormValue) {
                    tempTxtLabel = clinvarTxt('editLabel');
                    this.setState({queryResourceDisabled: false});
                    this.setState({inputValue: this.props.initialFormValue});
                } else {
                    tempTxtLabel = clinvarTxt('inputLabel');
                }
                this.setState({
                    txtInputLabel: tempTxtLabel,
                    txtInputButton: clinvarTxt('inputButton'),
                    txtHelpText: clinvarTxt('helpText'),
                    txtResourceResponse: clinvarTxt('resourceResponse')
                });
                break;
            case 'car':
                if (this.props.initialFormValue) {
                    tempTxtLabel = carTxt('editLabel');
                    this.setState({queryResourceDisabled: false});
                    this.setState({inputValue: this.props.initialFormValue});
                } else {
                    tempTxtLabel = carTxt('inputLabel');
                }
                this.setState({
                    txtInputLabel: tempTxtLabel,
                    txtInputButton: carTxt('inputButton'),
                    txtHelpText: carTxt('helpText'),
                    txtResourceResponse: carTxt('resourceResponse')
                });
                break;
        }
    },

    // called when the button to ping the outside API is pressed
    queryResource: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({queryResourceBusy: true, resourceFetched: false});
        // Apply queryResource logic depending on resourceType
        switch(this.props.resourceType) {
            case 'clinvar':
                clinvarQueryResource.call(this);
                break;
            case 'car':
                carQueryResource.call(this);
                break;
        }
    },

    // called when the button to submit the resource to the main form is pressed
    submitResource: function(e) {
        e.preventDefault(); e.stopPropagation();
        // Apply submitResource logic depending on resourceType
        switch(this.props.resourceType) {
            case 'clinvar':
                clinvarSubmitResource.call(this);
                break;
            case 'car':
                carSubmitResource.call(this);
                break;
        }
    },

    // called when the value in the input field is changed
    handleChange: function(e) {
        if (this.refs.resourceId) {
            var tempResourceId = this.refs.resourceId.getValue();
            this.setState({inputValue: tempResourceId, resourceFetched: false, tempResource: {}});
            if (this.refs.resourceId.getValue().length > 0) {
                this.setState({queryResourceDisabled: false});
            } else {
                this.setState({queryResourceDisabled: true});
            }
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.props.closeModal();
    },

    render: function() {
        return (
            <div className="form-std">
                <div className="modal-body">
                    <Input type="text" ref="resourceId" label={this.state.txtInputLabel} handleChange={this.handleChange} value={this.props.initialFormValue}
                        error={this.getFormError('resourceId')} clearError={this.clrFormErrors.bind(null, 'resourceId')} submitHandler={this.submitResource}
                        labelClassName="control-label" groupClassName="resource-input" required />
                    <Input type="button-button" title={this.state.txtInputButton} inputClassName={(this.state.queryResourceDisabled ? "btn-default" : "btn-primary") + " pull-right"} clickHandler={this.queryResource} submitBusy={this.state.queryResourceBusy} inputDisabled={this.state.queryResourceDisabled}/>
                    <div className="row">&nbsp;<br />&nbsp;</div>
                    {this.state.resourceFetched ?
                    <span>
                        <p>&nbsp;<br />{this.state.txtResourceResponse}</p>
                        <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
                    </span>
                    : <span><p className="alert alert-info">{this.state.txtHelpText}</p></span>}
                </div>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="button-button" inputClassName={this.getFormError('resourceId') === null || this.getFormError('resourceId') === undefined || this.getFormError('resourceId') === '' ?
                        "btn-primary btn-inline-spacer" : "btn-primary btn-inline-spacer disabled"} title="Save" clickHandler={this.submitResource} inputDisabled={!this.state.resourceFetched} submitBusy={this.state.submitResourceBusy} />
                </div>
            </div>
        );
    }
});

// Logic and helper functions for resource type 'clinvar' for AddResource modal
function clinvarTxt(field) {
    // Text to use for the resource type of 'clinvar'
    var txt;
    switch(field) {
        case 'modalTitle':
            txt = 'ClinVar Variant';
            break;
        case 'inputLabel':
            txt = 'Enter ClinVar VariationID';
            break;
        case 'editLabel':
            txt = 'Edit ClinVar VariationID';
            break;
        case 'inputButton':
            txt = 'Retrieve from ClinVar';
            break;
        case 'helpText':
            txt = <span>You must enter a ClinVar VariationID. The VariationID is the number found after <strong>/variation/</strong> in the URL for a variant in ClinVar (<a href={external_url_map['ClinVarSearch'] + '139214'} target="_blank">example</a>: 139214).</span>;
            break;
        case 'resourceResponse':
            txt = "Below is the ClinVar Preferred Title for the VariationID you submitted. Press \"Save\" below if it is the correct Variant, otherwise revise your search above:";
            break;
    }
    return txt;
}
function clinvarValidateForm() {
    // validating the field for ClinVarIDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if input isn't zero-filled
    if (valid && formInput.match(/^0+$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Invalid ClinVar ID');
    }
    // valid if input isn't zero-leading
    if (valid && formInput.match(/^0+/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Please re-enter ClinVar ID without any leading 0\'s');

    }
    // valid if the input only has numbers
    if (valid && !formInput.match(/^[0-9]*$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Only numbers allowed');
    }
    return valid;
}
function clinvarQueryResource() {
    // for pinging and parsing data from ClinVar
    this.saveFormValue('resourceId', this.state.inputValue);
    if (clinvarValidateForm.call(this)) {
        var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=';
        var data;
        var id = this.state.inputValue;
        this.getRestDataXml(url + id).then(xml => {
            data = parseClinvar(xml);
            if (data.clinvarVariantId) {
                // found the result we want
                this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
            } else {
                // no result from ClinVar
                this.setFormErrors('resourceId', 'ClinVar ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function clinvarSubmitResource() {
    // for dealing with the main form
    this.setState({submitResourceBusy: true});
    if (this.state.tempResource.clinvarVariantId) {
        this.getRestData('/search/?type=variant&clinvarVariantId=' + this.state.tempResource.clinvarVariantId).then(check => {
            if (check.total) {
                // variation already exists in our db
                this.getRestData(check['@graph'][0]['@id']).then(result => {
                    // if no variant title in db, or db's variant title not matching the retrieved title,
                    // then update db and fetch result again
                    if (!result['clinvarVariantTitle'].length || result['clinvarVariantTitle'] !== this.state.tempResource['clinvarVariantTitle']) {
                        this.putRestData('/variants/' + result['uuid'], this.state.tempResource).then(result => {
                            return this.getRestData(result['@graph'][0]['@id']).then(result => {
                                result.extraData = this.state.tempResource.extraData;
                                this.props.updateParentForm(result, this.props.fieldNum);
                            });
                        });
                    } else {
                        result.extraData = this.state.tempResource.extraData;
                        this.props.updateParentForm(result, this.props.fieldNum);
                    }
                });
            } else {
                // variation is new to our db
                let cleanedResource = this.state.tempResource;
                var tempExtraData = this.state.tempResource.extraData;
                delete cleanedResource['extraData'];
                this.postRestData('/variants/', cleanedResource).then(result_raw => {
                    // record the user adding a new variant entry
                    this.recordHistory('add', result_raw['@graph'][0]).then(history => {
                        let result = result_raw['@graph'][0];
                        result.extraData = tempExtraData;
                        this.props.updateParentForm(result, this.props.fieldNum);
                    });
                });
            }
            this.setState({submitResourceBusy: false});
            this.props.closeModal();
        });
    }
}

// Logic and helper functions for resource type 'car' for AddResource modal
function carTxt(field) {
    // Text to use for the resource type of 'clinvar'
    var txt;
    switch(field) {
        case 'modalTitle':
            txt = 'ClinGen Allele Registry';
            break;
        case 'inputLabel':
            txt = 'Enter CAR ID';
            break;
        case 'editLabel':
            txt = 'Edit CAR ID';
            break;
        case 'inputButton':
            txt = 'Retrieve from CAR';
            break;
        case 'helpText':
            txt = <span>You must enter a ClinGen Allele Registry ID. The CAR ID is the number found after <strong>/variation/</strong> in the URL for a variant in ClinVar (<a href={external_url_map['ClinVarSearch'] + '139214'} target="_blank">example</a>: 139214).</span>;
            break;
        case 'resourceResponse':
            txt = "Below is the CAR Preferred Title for the CAR ID you submitted. Press \"Save\" below if it is the correct Variant, otherwise revise your search above:";
            break;
    }
    return txt;
}
function carValidateForm() {
    // validating the field for ClinVarIDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if the input only has numbers
    if (valid && !formInput.match(/^CA[0-9]{6}$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Invalid CAR ID');
    }
    return valid;
}
function carQueryResource() {
    // for pinging and parsing data from ClinVar
    this.saveFormValue('resourceId', this.state.inputValue);
    if (carValidateForm.call(this)) {
        var url = 'http://reg.genome.network/allele/';
        var data;
        var id = this.state.inputValue;
        this.getRestData(url + id).then(json => {
            data = json;
            console.log('------------json-----------');
            console.log(data);
            console.log('------------json-----------');
            parseCAR(data);

            /*
            if (data.clinvarVariantId) {
                // found the result we want
                this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
            } else {
                // no result from ClinVar
                this.setFormErrors('resourceId', 'ClinVar ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
            */
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function carSubmitResource() {
    // for dealing with the main form
    /*
    this.setState({submitResourceBusy: true});
    if (this.state.tempResource.clinvarVariantId) {
        this.getRestData('/search/?type=variant&clinvarVariantId=' + this.state.tempResource.clinvarVariantId).then(check => {
            if (check.total) {
                // variation already exists in our db
                this.getRestData(check['@graph'][0]['@id']).then(result => {
                    // if no variant title in db, or db's variant title not matching the retrieved title,
                    // then update db and fetch result again
                    if (!result['clinvarVariantTitle'].length || result['clinvarVariantTitle'] !== this.state.tempResource['clinvarVariantTitle']) {
                        this.putRestData('/variants/' + result['uuid'], this.state.tempResource).then(result => {
                            return this.getRestData(result['@graph'][0]['@id']).then(result => {
                                result.extraData = this.state.tempResource.extraData;
                                this.props.updateParentForm(result, this.props.fieldNum);
                            });
                        });``
                    } else {
                        result.extraData = this.state.tempResource.extraData;
                        this.props.updateParentForm(result, this.props.fieldNum);
                    }
                });
            } else {
                // variation is new to our db
                let cleanedResource = this.state.tempResource;
                var tempExtraData = this.state.tempResource.extraData;
                delete cleanedResource['extraData'];
                this.postRestData('/variants/', cleanedResource).then(result_raw => {
                    // record the user adding a new variant entry
                    this.recordHistory('add', result_raw['@graph'][0]).then(history => {
                        let result = result_raw['@graph'][0];
                        result.extraData = tempExtraData;
                        this.props.updateParentForm(result, this.props.fieldNum);
                    });
                });
            }
            this.setState({submitResourceBusy: false});
            this.props.closeModal();
        });
    }
    */
}
