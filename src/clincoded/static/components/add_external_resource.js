'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var CuratorHistory = require('./curator_history');
var variantHgvsRender = require('./curator').variantHgvsRender;
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


// Class for the add resource button. This class only renders the button to add and clear the fields, and contains the modal wrapper.
// The modal itself is defined by the AddResourceIdModal class below.
var AddResourceId = module.exports.AddResourceId = React.createClass({
    mixins: [ModalMixin],
    propTypes: {
        resourceType: React.PropTypes.string, // specify what the resource you're trying to add is (passed to Modal)
        label: React.PropTypes.string, // text for the button's label
        labelVisible: React.PropTypes.bool, // specify whether or not the label is visible
        buttonText: React.PropTypes.string, // text for the button
        clearButtonText: React.PropTypes.string, // text for clear button
        modalButtonText: React.PropTypes.string, // text for submit button in modal
        initialFormValue: React.PropTypes.string, // specify the initial value of the resource, in case of editing (passed to Modal)
        fieldNum: React.PropTypes.string, // specify which field on the main form this should edit (passed to Modal)
        updateParentForm: React.PropTypes.func, // function to call upon pressing the Save button
        disabled: React.PropTypes.bool, // specify whether or not the button on the main form is disabled
        wrapperClass: React.PropTypes.string, // specify any special css classes for the button
        buttonWrapperClass: React.PropTypes.string, // specify any special css classes for the button
        buttonClass: React.PropTypes.string, // specify any special css classes for the button
        clearButtonClass: React.PropTypes.string, // specify any special css classes for the button
        buttonOnly: React.PropTypes.bool, // specify whether or not only the button should be rendered (no form-group)
        clearButtonRender: React.PropTypes.bool // specify whether or not the Clear button should be rendered
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

    // renders the main Add/Edit button
    buttonRender: function() {
        return (
            <span className={"inline-button-wrapper button-push" + (this.props.buttonWrapperClass ? " " + this.props.buttonWrapperClass : "")}>
                <Modal title={this.state.txtModalTitle} className="input-inline" modalClass="modal-default">
                    <a className={"btn btn-default" + (this.props.buttonClass ? " " + this.props.buttonClass : "") + (this.props.disabled ? " disabled" : "")}
                        modal={<AddResourceIdModal resourceType={this.props.resourceType} initialFormValue={this.props.initialFormValue} modalButtonText={this.props.modalButtonText}
                        fieldNum={this.props.fieldNum} updateParentForm={this.props.updateParentForm} protocol={this.props.protocol} closeModal={this.closeModal} />}>
                            {this.props.buttonText}
                    </a>
                </Modal>
            </span>
        );
    },

    // renders the main Clear button
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
        modalButtonText: React.PropTypes.string, // text for submit button in modal
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
            txtInputLabel: '', // Text for the input's label (rendered above the input box)
            txtInputButton: '', // Text for the input's submit button (rendered below the input box)
            txtHelpText: '', // Text for blue box below input's submit button (disappears after the input button is clicked)
            txtResourceResponse: '', // Text to display once a response from the resource has been obtained
            inputValue: '', // Default value for input box
            queryResourceDisabled: true, // Flag to disable the input button
            queryResourceBusy: false, // Flag to indicate the input button's 'busy' state
            resourceFetched: false, // Flag to indicate that a response from the resource has been obtained
            tempResource: {}, // Temporary object to hold the resource response
            submitResourceBusy: false // Flag to indicate that the modal's submit button is in a 'busy' state (creating local db entry)
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
                    txtResourceResponse: clinvarTxt('resourceResponse', this.props.modalButtonText ? this.props.modalButtonText : "Save")
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
                    txtResourceResponse: carTxt('resourceResponse', this.props.modalButtonText ? this.props.modalButtonText : "Save")
                });
                break;
        }
    },

    // called when the button to ping the outside resource is pressed
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

    // called when a resource result is returned; returns render elements for the result
    renderResourceResult: function() {
        var renderResult;
        switch(this.props.resourceType) {
            case 'clinvar':
                renderResult = clinvarRenderResourceResult.call(this);
                break;
            case 'car':
                renderResult = carRenderResourceResult.call(this);
                break;
        }
        return renderResult;
    },

    // called when the button to submit the resource to the main form (local db) is pressed
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
                    <div>
                        <p>&nbsp;<br />{this.state.txtResourceResponse}</p>
                        {this.renderResourceResult()}
                    </div>
                    : <span><p className="alert alert-info">{this.state.txtHelpText}</p></span>}
                </div>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="button-button" inputClassName={this.getFormError('resourceId') === null || this.getFormError('resourceId') === undefined || this.getFormError('resourceId') === '' ?
                        "btn-primary btn-inline-spacer" : "btn-primary btn-inline-spacer disabled"} title={this.props.modalButtonText ? this.props.modalButtonText : "Save"} clickHandler={this.submitResource} inputDisabled={!this.state.resourceFetched} submitBusy={this.state.submitResourceBusy} />
                </div>
            </div>
        );
    }
});

/*
Below are the logic and helper functions for the difference resource types.
The ___Txt() functions hold the different text that should be displayed for that resource in the modal.
The ___ValidateForm() functions hold the function that validates the input in the modal, specific to that resource.
The ___QueryResource() functions hold the primary logic for reaching out to the resource and parsing the data/handling the response,
    specific to that resource. These functions are called when the user hits the 'Retrieve'/'Edit' button in the modal
The ___RenderResourceResult() functions return the rendered html elements for the resource response
The ___SubmitResource() functions hold the primary logic for submitting the parsed resource object to the internal database,
    specific to that resource. These functions are called when the user hits the 'Submit' button on the modal, subsequently closing it.
*/

// Logic and helper functions for resource type 'clinvar' for AddResource modal
function clinvarTxt(field, extra) {
    // Text to use for the resource type of 'clinvar'
    var txt;
    if (!extra) {
        extra = '';
    }
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
            txt = <span>You must enter a ClinVar VariationID. The VariationID can be found in the light blue box on a variant page (example: <a href={external_url_map['ClinVarSearch'] + '139214'} target="_blank">139214</a>).</span>;
            break;
        case 'resourceResponse':
            txt = "Below are the data from ClinVar for the VariationID you submitted. Press \"" + extra + "\" below if it is the correct Variant, otherwise revise your search above:";
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
        })
        .catch(function(e) {
            // error handling for ClinVar query
            this.setFormErrors('resourceId', 'Error querying ClinVar. Please check your input and try again.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function clinvarRenderResourceResult() {
    return(
        <div>
            <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
            {this.state.tempResource && this.state.tempResource.hgvsNames ?
                <div className="row">
                    {this.state.tempResource.hgvsNames.others && this.state.tempResource.hgvsNames.others.length > 0 ?
                        <div className="row">
                            <span className="col-sm-5 col-md-3 control-label"><label>HGVS terms</label></span>
                            <span className="col-sm-7 col-md-9 text-no-input">
                                {variantHgvsRender(this.state.tempResource.hgvsNames)}
                            </span>
                        </div>
                    : null}
                </div>
            : null}
        </div>
    );
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
                                this.props.updateParentForm(result, this.props.fieldNum);
                            });
                        });
                    } else {
                        this.props.updateParentForm(result, this.props.fieldNum);
                    }
                });
            } else {
                // variation is new to our db
                this.postRestData('/variants/', this.state.tempResource).then(result => {
                    // record the user adding a new variant entry
                    this.recordHistory('add', result['@graph'][0]).then(history => {
                        this.props.updateParentForm(result['@graph'][0], this.props.fieldNum);
                    });
                });
            }
            this.setState({submitResourceBusy: false});
            this.props.closeModal();
        });
    }
}

// Logic and helper functions for resource type 'car' for AddResource modal
function carTxt(field, extra) {
    // Text to use for the resource type of 'car'
    var txt;
    if (!extra) {
        extra = '';
    }
    switch(field) {
        case 'modalTitle':
            txt = 'ClinGen Allele Registry';
            break;
        case 'inputLabel':
            txt = 'Enter CA ID';
            break;
        case 'editLabel':
            txt = 'Edit CA ID';
            break;
        case 'inputButton':
            txt = 'Retrieve from ClinGen Allele Registry';
            break;
        case 'helpText':
            txt = <span>You must enter a ClinGen Allele Registry ID (CA ID). This CA ID is returned when you register an allele with the ClinGen Allele Registry (example: <a href={external_url_map['CARallele-test'] + '139214.html'} target="_blank">CA139214</a>).</span>;
            break;
        case 'resourceResponse':
            txt = "Below are the data from the ClinGen Allele Registry for the CA ID you submitted. Press \"" + extra + "\" below if it is the correct Variant, otherwise revise your search above:";
            break;
    }
    return txt;
}
function carValidateForm() {
    // validating the field for CA IDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if the input begins with 'CA', followed by 6 numbers
    if (valid && !formInput.match(/^CA[0-9]{6}$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Invalid CA ID');
    }
    return valid;
}
function carQueryResource() {
    // for pinging and parsing data from CAR
    this.saveFormValue('resourceId', this.state.inputValue);
    if (carValidateForm.call(this)) {
        var url = 'http://reg.genome.network/allele/';
        var data;
        var id = this.state.inputValue;
        this.getRestData(url + id).then(json => {
            data = parseCAR(json);
            if (data.clinvarVariantId) {
                // if the CAR result has a ClinVar variant ID, query ClinVar with it, and use its data
                url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=';
                this.getRestDataXml(url + data.clinvarVariantId).then(xml => {
                    var data_cv = parseClinvar(xml);
                    if (data_cv.clinvarVariantId) {
                        // found the result we want
                        data_cv.carId = this.state.inputValue;
                        this.setState({queryResourceBusy: false, tempResource: data_cv, resourceFetched: true});
                    } else {
                        // something failed with the parsing of ClinVar data; roll back to CAR data
                        this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
                    }
                })
                .catch(function(e) {
                    // error handling for ClinVar query
                    this.setFormErrors('resourceId', 'Error querying ClinVar for additional data. Please check your input and try again.');
                    this.setState({queryResourceBusy: false, resourceFetched: false});
                });
            } else if (data.carId) {
                // if the CAR result has no ClinVar variant ID, just use the CAR data set
                this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
            } else {
                this.setFormErrors('resourceId', 'CA ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        })
        .catch(function(e) {
            // error handling for CAR query
            this.setFormErrors('resourceId', 'Error querying the ClinGen Allele Registry. Please check your input and try again.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function carRenderResourceResult() {
    return(
        <div>
            <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
            {this.state.tempResource && this.state.tempResource.hgvsNames ?
                <div className="row">
                    {this.state.tempResource.hgvsNames.others && this.state.tempResource.hgvsNames.others.length > 0 ?
                        <div className="row">
                            <span className="col-sm-5 col-md-3 control-label"><label>HGVS terms</label></span>
                            <span className="col-sm-7 col-md-9 text-no-input">
                                {variantHgvsRender(this.state.tempResource.hgvsNames)}
                            </span>
                        </div>
                    : null}
                </div>
            : null}
        </div>
    );
}
function carSubmitResource() {
    // for dealing with the main form
    this.setState({submitResourceBusy: true});
    if (this.state.tempResource.clinvarVariantId || this.state.tempResource.carId) {
        var internal_uri;
        if (this.state.tempResource.clinvarVariantId) {
            internal_uri = '/search/?type=variant&clinvarVariantId=' + this.state.tempResource.clinvarVariantId;
        } else if (this.state.tempResource.carId) {
            internal_uri = '/search/?type=variant&carId=' + this.state.tempResource.carId;
        }
        this.getRestData(internal_uri).then(check => {
            if (check.total) {
                // variation already exists in our db
                this.getRestData(check['@graph'][0]['@id']).then(result => {
                    // if no variant title in db, or db's variant title not matching the retrieved title,
                    // then update db and fetch result again
                    if (!result['clinvarVariantTitle'].length || result['clinvarVariantTitle'] !== this.state.tempResource['clinvarVariantTitle']) {
                        this.putRestData('/variants/' + result['uuid'], this.state.tempResource).then(result => {
                            return this.getRestData(result['@graph'][0]['@id']).then(result => {
                                this.props.updateParentForm(result, this.props.fieldNum);
                            });
                        });
                    } else {
                        this.props.updateParentForm(result, this.props.fieldNum);
                    }
                });
            } else {
                // variation is new to our db
                this.postRestData('/variants/', this.state.tempResource).then(result => {
                    // record the user adding a new variant entry
                    this.recordHistory('add', result['@graph'][0]).then(history => {
                        this.props.updateParentForm(result['@graph'][0], this.props.fieldNum);
                    });
                });
            }
            this.setState({submitResourceBusy: false});
            this.props.closeModal();
        });
    }
}
