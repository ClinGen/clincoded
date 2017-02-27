'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var CuratorHistory = require('./curator_history');
var variantHgvsRender = curator.variantHgvsRender;
var PmidSummary = curator.PmidSummary;
var parseAndLogError = require('./mixins').parseAndLogError;

var parsePubmed = require('../libs/parse-pubmed').parsePubmed;
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
        label: React.PropTypes.object, // html for the button's label
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
        clearButtonRender: React.PropTypes.bool, // specify whether or not the Clear button should be rendered
        editButtonRenderHide: React.PropTypes.bool, // specify whether or not the Edit button should be hidden
        parentObj: React.PropTypes.object // parent object; used to see if a duplicate entry exists
    },

    getInitialState: function() {
        return {
            txtModalTitle: ''
        };
    },

    // set the text of the modal title on load
    componentDidMount: function() {
        switch(this.props.resourceType) {
            case 'pubmed':
                this.setState({txtModalTitle: pubmedTxt('modalTitle')});
                break;
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
            <span className={"inline-button-wrapper" + (this.props.buttonWrapperClass ? " " + this.props.buttonWrapperClass : "")}>
                <Modal title={this.state.txtModalTitle} className="input-inline" modalClass="modal-default">
                    <a className={"btn btn-default" + (this.props.buttonClass ? " " + this.props.buttonClass : "") + (this.props.disabled ? " disabled" : "")}
                        modal={<AddResourceIdModal resourceType={this.props.resourceType} initialFormValue={this.props.initialFormValue} modalButtonText={this.props.modalButtonText}
                        fieldNum={this.props.fieldNum} updateParentForm={this.props.updateParentForm} protocol={this.props.protocol} closeModal={this.closeModal} parentObj={this.props.parentObj} />}>
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
                    {this.props.editButtonRenderHide && this.props.initialFormValue ? null : this.buttonRender()}
                    {this.props.clearButtonRender && this.props.initialFormValue ?
                        this.clearButtonRender()
                    : null}
                </div>
            );
        } else {
            return (
                <div className="form-group">
                    <span className="col-sm-5 control-label">{this.props.labelVisible ? this.props.label : null}</span>
                    <span className="col-sm-7">
                        <div className={"inline-button-wrapper" + (this.props.wrapperClass ? " " + this.props.wrapperClass : "")}>
                            {this.props.editButtonRenderHide && this.props.initialFormValue ? null : this.buttonRender()}
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
        updateParentForm: React.PropTypes.func, // Function to call when submitting and closing the modal
        parentObj: React.PropTypes.object // parent object; used to see if a duplicate entry exists
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
            case 'pubmed':
                if (this.props.initialFormValue) {
                    tempTxtLabel = pubmedTxt('editLabel');
                    this.setState({queryResourceDisabled: false});
                    this.setState({inputValue: this.props.initialFormValue});
                } else {
                    tempTxtLabel = pubmedTxt('inputLabel');
                }
                this.setState({
                    txtInputLabel: tempTxtLabel,
                    txtInputButton: pubmedTxt('inputButton'),
                    txtHelpText: pubmedTxt('helpText'),
                    txtResourceResponse: pubmedTxt('resourceResponse', this.props.modalButtonText ? this.props.modalButtonText : "Save")
                });
                break;
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
            case 'pubmed':
                pubmedQueryResource.call(this);
                break;
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
            case 'pubmed':
                renderResult = pubmedRenderResourceResult.call(this);
                break;
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
            case 'pubmed':
                pubmedSubmitResource.call(this);
                break;
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
                    : this.state.txtHelpText}
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

// Logic and helper functions for resource type 'pubmed' for AddResource modal
function pubmedTxt(field, extra) {
    var txt;
    if (!extra) {
        extra = '';
    }
    switch(field) {
        case 'modalTitle':
            txt = 'Add new PubMed Article';
            break;
        case 'inputLabel':
            txt = 'Enter a PMID';
            break;
        case 'editLabel':
            txt = 'Edit PMID';
            break;
        case 'inputButton':
            txt = 'Retrieve PubMed Article';
            break;
        case 'resourceResponse':
            txt = "Select \"" + extra + "\" (below) if the following citation is correct; otherwise, edit the PMID (above) to retrieve a different article.";
            break;
    }
    return txt;
}
function pubmedValidateForm() {
    // validating the field for PMIDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if input isn't zero-filled
    if (valid && formInput.match(/^0+$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'This PMID does not exist');
        this.setState({submitBusy: false});
    }
    // valid if input isn't zero-leading
    if (valid && formInput.match(/^0+/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Please re-enter PMID without any leading 0\'s');
        this.setState({submitBusy: false});
    }
    // valid if the input only has numbers
    if (valid && !formInput.match(/^[0-9]*$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Only numbers allowed');
        this.setState({submitBusy: false});
    }
    // valid if parent object is GDM and input isn't already associated with it
    if (valid && this.props.parentObj && this.props.parentObj['@type'] && this.props.parentObj['@type'][0] == 'Gdm') {
        for (var i = 0; i < this.props.parentObj.annotations.length; i++) {
            if (this.props.parentObj.annotations[i].article.pmid == formInput) {
                valid = false;
                this.setFormErrors('resourceId', 'This article has already been associated with this Gene-Disease Record');
                this.setState({submitBusy: false});
                break;
            }
        }
    }
    // valid if parent object is evidence list (VCI) and input isn't already associated with it - final behavior TBD
    /*
    if (valid && this.props.parentObj && this.props.parentObj['@type'] && this.props.parentObj['@type'][0] == 'evidenceList') {
        for (var j = 0; j < this.props.parentObj.evidenceList.length; j++) {
            if (this.props.parentObj.evidenceList[j].articles[0].pmid == formInput) {
                valid = false;
                this.setFormErrors('resourceId', 'This article has already been associated with this evidence group');
                this.setState({submitBusy: false});
                break;
            }
        }
    }*/
    return valid;
}
function pubmedQueryResource() {
    // for pinging and parsing data from PubMed
    this.saveFormValue('resourceId', this.state.inputValue);
    if (pubmedValidateForm.call(this)) {
        var url = external_url_map['PubMedSearch'];
        var data;
        var id = this.state.inputValue;
        this.getRestData('/articles/' + id).then(article => {
            // article already exists in db
            this.setState({queryResourceBusy: false, tempResource: article, resourceFetched: true});
        }, () => {
            var url = external_url_map['PubMedSearch'];
            // PubMed article not in our DB; go out to PubMed itself to retrieve it as XML
            this.getRestDataXml(external_url_map['PubMedSearch'] + id).then(xml => {
                var data = parsePubmed(xml);
                if (data.pmid) {
                    // found the result we want
                    this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
                } else {
                    // no result from ClinVar
                    this.setFormErrors('resourceId', 'PMID not found');
                    this.setState({queryResourceBusy: false, resourceFetched: false});
                }
            });
        }).catch(e => {
            // error handling for PubMed query
            this.setFormErrors('resourceId', 'Error querying PubMed. Please check your input and try again.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function pubmedRenderResourceResult() {
    return(
        <div>
            {this.state.tempResource ?
                <div className="row">
                    <span className="col-sm-10 col-sm-offset-1"><PmidSummary article={this.state.tempResource} displayJournal pmidLinkout /></span>
                </div>
            : null}
        </div>
    );
}
function pubmedSubmitResource() {
    // for dealing with the main form
    this.setState({submitResourceBusy: true});
    if (this.state.tempResource) {
        this.getRestData('/search/?type=article&pmid=' + this.state.tempResource.pmid).then(check => {
            if (check.total) {
                // article already exists in our db
                this.getRestData(check['@graph'][0]['@id']).then(result => {
                    this.props.updateParentForm(result);
                });
            } else {
                // article is new to our db
                this.postRestData('/article/', this.state.tempResource).then(result => {
                    this.props.updateParentForm(result['@graph'][0]);
                });
            }
            this.setState({submitResourceBusy: false});
            this.props.closeModal();
        });
    }
}

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
            txt =
                <span>
                    <p className="alert alert-info">
                        <span>Enter a ClinVar VariationID. The VariationID can be found in the light blue box on a variant page (example: <a href={external_url_map['ClinVarSearch'] + '139214'} target="_blank">139214</a>).</span>
                    </p>
                </span>;
            break;
        case 'resourceResponse':
            txt = "Below are the data from ClinVar for the VariationID you submitted. Select \"" + extra + "\" below if it is the correct variant, otherwise revise your search above:";
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
    // valid if parent object is family, individual or experimental and input isn't already associated with it
    if (valid && this.props.parentObj && this.props.parentObj['@type'] && this.props.parentObj['@type'][0] == 'variantList') {
        // loop through received variantlist and make sure that the variant is not already associated
        for (var i in this.props.parentObj.variantList) {
            // but don't check against the field it's editing against, in case it is an edit
            if (i != this.props.fieldNum && this.props.parentObj.variantList.hasOwnProperty(i)) {
                if (this.props.parentObj.variantList[i].clinvarVariantId == formInput) {
                    valid = false;
                    this.setFormErrors('resourceId', 'This variant has already been associated with this piece of ' + this.props.parentObj['@type'][1] + ' evidence.');
                    this.setState({submitBusy: false});
                    break;
                }
            }
        }
    }
    return valid;
}
function clinvarQueryResource() {
    // for pinging and parsing data from ClinVar
    this.saveFormValue('resourceId', this.state.inputValue);
    if (clinvarValidateForm.call(this)) {
        var url = external_url_map['ClinVarEutils'];
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
        .catch(e => {
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
        <div className="resource-metadata">
            <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
            {this.state.tempResource && this.state.tempResource.hgvsNames ?
                <div className="row">
                    <div className="row">
                        <span className="col-xs-4 col-md-4 control-label"><label>ClinVar Variant ID</label></span>
                        <span className="col-xs-8 col-md-8 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.tempResource.clinvarVariantId} target="_blank"><strong>{this.state.tempResource.clinvarVariantId}</strong></a></span>
                    </div>
                    {this.state.tempResource.hgvsNames ?
                        <div className="row">
                            <span className="col-xs-4 col-md-4 control-label"><label>HGVS terms</label></span>
                            <span className="col-xs-8 col-md-8 text-no-input">
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
                    // Compare variant data properties
                    // Existing variants in production db will be identified if any of data property below (except clinvarVariantTitle) has value at set retrieved from ClinVar API but not have value in db
                    // In this case, save ClinVar data into the variant.
                    if ((!result['clinvarVariantTitle'].length || result['clinvarVariantTitle'] !== this.state.tempResource['clinvarVariantTitle'])
                        || (this.state.tempResource['dbSNPIds'] && this.state.tempResource['dbSNPIds'].length && (!result['dbSNPIds'] || (result['dbSNPIds'] && !result['dbSNPIds'].length)))
                        || (this.state.tempResource['hgvsNames'] && Object.keys(this.state.tempResource['hgvsNames']).length && (!result['hgvsNames'] || (result['hgvsNames'] && !Object.keys(result['hgvsNames']).length)))
                        || (this.state.tempResource['variationType'] && !result['variationType'])
                        || (this.state.tempResource['molecularConsequenceList'] && Object.keys(this.state.tempResource['molecularConsequenceList']).length && (!result['molecularConsequenceList'] || !Object.keys(!result['molecularConsequenceList'].length)))
                        ) {
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
                console.log('POSTING TO VARIANTS');
                console.log(this.state.session);
                this.postRestData('/variants/', this.state.tempResource).then(result => {
                    // record the user adding a new variant entry
                    console.log(result);
                    console.log(this.state.session);
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
            txt =
                <span>
                    <p className="alert alert-info">
                        <span>Enter a ClinGen Allele Registry ID (CA ID). The CA ID is returned when you register an allele with the ClinGen Allele Registry (example: <a href={`http:${external_url_map['CARallele']}CA003323.html`} target="_blank">CA003323</a>).</span>
                    </p>
                </span>;
            break;
        case 'resourceResponse':
            txt = "Below are the data from the ClinGen Allele Registry for the CA ID you submitted. Select \"" + extra + "\" below if it is the correct variant, otherwise revise your search above:";
            break;
    }
    return txt;
}
function carValidateForm() {
    // validating the field for CA IDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if the input begins with 'CA', followed by 6 numbers
    if (valid && !formInput.match(/^CA[0-9]+$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Invalid CA ID');
    }

    // valid if parent object is family, individual or experimental and input isn't already associated with it
    if (valid && this.props.parentObj && this.props.parentObj['@type'] && this.props.parentObj['@type'][0] == 'variantList') {
        // loop through received variantlist and make sure that the variant is not already associated
        for (var i in this.props.parentObj.variantList) {
            // but don't check against the field it's editing against, in case it is an edit
            if (i != this.props.fieldNum && this.props.parentObj.variantList.hasOwnProperty(i)) {
                if (this.props.parentObj.variantList[i].carId == formInput) {
                    valid = false;
                    this.setFormErrors('resourceId', 'This variant has already been associated with this piece of ' + this.props.parentObj['@type'][1] + ' evidence.');
                    this.setState({submitBusy: false});
                    break;
                }
            }
        }
    }
    return valid;
}
function carQueryResource() {
    // for pinging and parsing data from CAR
    this.saveFormValue('resourceId', this.state.inputValue);
    var error_msg;
    if (carValidateForm.call(this)) {
        var url = this.props.protocol + external_url_map['CARallele'];
        var data;
        var id = this.state.inputValue;
        this.getRestData(url + id).then(json => {
            data = parseCAR(json);
            if (data.clinvarVariantId) {
                // if the CAR result has a ClinVar variant ID, query ClinVar with it, and use its data
                url = external_url_map['ClinVarEutils'];
                this.getRestDataXml(url + data.clinvarVariantId).then(xml => {
                    var data_cv = parseClinvar(xml);
                    if (data_cv.clinvarVariantId) {
                        // found the result we want
                        data_cv.carId = id;
                        this.setState({queryResourceBusy: false, tempResource: data_cv, resourceFetched: true});
                    } else {
                        // something failed with the parsing of ClinVar data; roll back to CAR data
                        this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
                    }
                }).catch(e => {
                    // error handling for ClinVar query
                    this.setFormErrors('resourceId', 'Error querying ClinVar for additional data. Please check your input and try again.');
                    this.setState({queryResourceBusy: false, resourceFetched: false});
                });
            } else if (data.carId) {
                // if the CAR result has no ClinVar variant ID, just use the CAR data set
                this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
            } else {
                // in case the above two fail (theoretically a 404 json response, but an error is thrown instead (see below))
                this.setFormErrors('resourceId', 'CA ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        }).catch(e => {
            // error handling for CAR query
            if (e.status == 404) {
                this.setFormErrors('resourceId', 'CA ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            } else {
                this.setFormErrors('resourceId', 'Error querying the ClinGen Allele Registry. Please check your input and try again.');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function carRenderResourceResult() {
    return(
        <div className="resource-metadata">
            <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
            {this.state.tempResource && this.state.tempResource.hgvsNames ?
                <div className="row">
                    <div className="row">
                        <span className="col-xs-4 col-md-4 control-label"><label>CA ID</label></span>
                        <span className="col-xs-8 col-md-8 text-no-input"><a href={`${this.props.protocol}${external_url_map['CARallele']}${this.state.tempResource.carId}.html`} target="_blank"><strong>{this.state.tempResource.carId}</strong></a></span>
                    </div>
                    {this.state.tempResource.clinvarVariantId ?
                        <div className="row">
                            <span className="col-xs-4 col-md-4 control-label"><label>ClinVar Variant ID</label></span>
                            <span className="col-xs-8 col-md-8 text-no-input"><a href={`${external_url_map['ClinVarSearch']}${this.state.tempResource.clinvarVariantId}`} target="_blank"><strong>{this.state.tempResource.clinvarVariantId}</strong></a></span>
                        </div>
                    : null}
                    {this.state.tempResource.hgvsNames ?
                        <div className="row">
                            <span className="col-xs-4 col-md-4 control-label"><label>HGVS terms</label></span>
                            <span className="col-xs-8 col-md-8 text-no-input">
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
                    if (!result['clinvarVariantTitle'].length || result['clinvarVariantTitle'] !== this.state.tempResource['clinvarVariantTitle'] || result['carId'] !== this.state.tempResource['carId']) {
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
