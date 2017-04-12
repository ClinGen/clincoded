'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('./globals');
var fetched = require('./fetched');
var form = require('../libs/bootstrap/form');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;
var variantHgvsRender = require('./curator').variantHgvsRender;
var CuratorHistory = require('./curator_history');
var add_external_resource = require('./add_external_resource');
var external_url_map = globals.external_url_map;
var AddResourceId = add_external_resource.AddResourceId;

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Alert = modal.Alert;
var ModalMixin = modal.ModalMixin;
var Panel = panel.Panel;


var SelectVariant = React.createClass({
    mixins: [FormMixin, RestMixin, ModalMixin, CuratorHistory],

    contextTypes: {
        fetch: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            variantIdType: 'select',
            variantLoaded: false,
            variantData: null
        };
    },

    // Update the variantData upon interaction with the Add Resource modal
    updateVariantData: function(data) {
        this.setState({submitResourceBusy: false});
        this.context.navigate('/variant-central/?variant=' + data.uuid);
    },

    // Handle change of the select Variant Type dropdown
    handleChange: function(ref, e) {
        if (ref === 'variantIdType' && this.refs[ref].getValue()) {
            this.setState({variantIdType: this.refs[ref].getValue()});
        }
    },

    render: function() {
        return (
            <div className="container">
                <h1>{this.props.context.title}</h1>
                <div className="col-md-8 col-md-offset-2 col-sm-9 col-sm-offset-1 form-variant-select">
                    <Panel panelClassName="panel-select-variant">
                        <Form formClassName="form-horizontal form-std">
                            {!this.state.variantLoaded ?
                            <div>
                                <div className="row">
                                    <Input type="select" ref="variantIdType" label="Select Variant by ID type"
                                        labelClassName="col-sm-5 col-md-4 control-label" value={this.state.variantIdType} wrapperClassName="col-sm-7 col-md-8" groupClassName="form-group"
                                        defaultValue="select" handleChange={this.handleChange} inputDisabled={this.state.variantLoaded}>
                                        <option value="select" disabled>Select</option>
                                        <option value="none" disabled></option>
                                        <option value="ClinVar Variation ID">ClinVar Variation ID</option>
                                        <option value="ClinGen Allele Registry ID (CA ID)">ClinGen Allele Registry ID (CA ID)</option>
                                    </Input>
                                    <p className="col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4 input-note-below-no-bottom"><strong>Note:</strong> Select ID type based on the instructions below. Use the ClinVar VariationID whenever possible.</p>
                                    {this.state.variantIdType == "ClinVar Variation ID" ?
                                    <div className="row col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4">
                                        <AddResourceId resourceType="clinvar" wrapperClass="modal-buttons-wrapper" protocol={this.props.href_url.protocol}
                                            buttonText={this.state.variantData ? "Edit ClinVar ID" : "Add ClinVar ID" } initialFormValue={this.state.variantData && this.state.variantData.clinvarVariantId}
                                            modalButtonText="Save and View Evidence" updateParentForm={this.updateVariantData} buttonOnly={true} />
                                    </div>
                                    : null}
                                    {this.state.variantIdType == "ClinGen Allele Registry ID (CA ID)" ?
                                    <div className="row col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4">
                                        <AddResourceId resourceType="car" wrapperClass="modal-buttons-wrapper" protocol={this.props.href_url.protocol}
                                            buttonText={this.state.variantData ? "Edit CA ID" : "Add CA ID" } initialFormValue={this.state.variantData && this.state.variantData.carVariantId}
                                            modalButtonText="Save and View Evidence" updateParentForm={this.updateVariantData} buttonOnly={true} />
                                    </div>
                                    : null}
                                </div>
                                <div className="row">
                                    <div className="alert alert-danger">
                                        Note: <strong>This version of the interface currently returns evidence for SNVs (single nucleotide variants) only.</strong> We are currently working to optimize the evidence returned for non-SNVs. However, the interface supports the evaluation/interpretation of any variant.
                                    </div>
                                    <div className="alert alert-info">
                                        Instructions (please follow this order to determine correct ID for variant)<br /><br />
                                        <ol className="instructions">
                                            <li>Search <a href={external_url_map['ClinVar']} target="_blank">ClinVar</a> for variant.</li>
                                            <li>If found in ClinVar, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                            <li>If not found in ClinVar, search the <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry</a> with a valid HGVS term for that variant.
                                            <ol type="a">
                                                <li>If <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry</a> returns a ClinVar ID, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                                <li>If <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry</a> does not find a ClinVar ID, register the variant to return a CA ID and then select "ClinGen Allele Registry ID (CA ID)" from the pull-down and enter the CA ID.</li>
                                            </ol>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            : null}
                        </Form>
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(SelectVariant, 'CuratorPage', 'select-variant');
