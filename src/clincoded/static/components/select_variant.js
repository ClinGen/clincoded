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

    // When the form is submitted, we should already have the relevant variant saved in our db,
    // and its uuid. Forward the user to the variant curation hub on click.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        if (this.state.variantData && this.state.variantData.uuid) {
            this.context.navigate('/variant-central/?variant=' + this.state.variantData.uuid);
        }
    },

    // Update the variantData upon interaction with the Add Resource modal
    updateVariantData: function(data) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        var currVariantOption = this.state.variantOption;
        var addVariantDisabled;
        if (data) {
            this.setState({variantLoaded: true, variantData: data});
        }
    },

    // If the user clicks the Cancel Variant Selection button, reset the page
    cancelVariantSelection: function() {
        this.setState({variantLoaded: false, variantIdType: 'select'});
        this.setState({variantData: null});
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
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            {!this.state.variantLoaded ?
                            <div>
                                <div className="row">
                                    <div className="alert alert-info">
                                        Instructions (please follow this order to determine correct ID for variant)<br /><br />
                                        <ol className="instructions">
                                            <li>Search <a href="http://www.ncbi.nlm.nih.gov/clinvar/">ClinVar</a> for variant.</li>
                                            <li>If found in ClinVar, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                            <li>If not found in ClinVar, search the <a href="">ClinGen Allele Registry</a> with a valid HGVS term for that variant.
                                            <ol type="a">
                                                <li>If <a href={external_url_map['CAR-test']}>ClinGen Allele Registry</a> returns a ClinVar ID, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                                <li>If <a href={external_url_map['CAR-test']}>ClinGen Allele Registry</a> does not find a ClinVar ID, register the variant to return a CA ID and then select "ClinGen Allele Registry ID (CA ID)" from the pull-down and enter the CA ID.</li>
                                            </ol>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                                <div className="row">
                                    <Input type="select" ref="variantIdType" label="Select Variant by ID type"
                                        labelClassName="col-sm-5 col-md-4 control-label" value={this.state.variantIdType} wrapperClassName="col-sm-7 col-md-8" groupClassName="form-group"
                                        defaultValue="select" handleChange={this.handleChange} inputDisabled={this.state.variantLoaded}>
                                        <option value="select" disabled>Select</option>
                                        <option value="none" disabled></option>
                                        <option value="ClinVar Variation ID">ClinVar Variation ID</option>
                                        <option value="ClinGen Allele Registry ID">ClinGen Allele Registry ID</option>
                                    </Input>
                                    <p className="col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4 input-note-below-no-bottom"><strong>Note:</strong> Select ID type based on above instructions. Use the ClinVar VariationID whenever possible.</p>
                                </div>
                            </div>
                            : null}
                            {this.state.variantData && this.state.variantData.clinvarVariantId ?
                            <div className="row">
                                <h4 className="clinvar-preferred-title">{this.state.variantData.clinvarVariantTitle}</h4>
                                <div className="row">
                                    <span className="col-sm-5 col-md-4 control-label"><label>ClinVar Variation ID</label></span>
                                    <span className="col-sm-7 col-md-8 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.variantData.clinvarVariantId} target="_blank">{this.state.variantData.clinvarVariantId}</a></span>
                                </div>
                            </div>
                            : null}
                            {this.state.variantData && this.state.variantData.carId ?
                            <div className="row">
                                <div className="row">
                                    <span className="col-sm-5 col-md-4 control-label"><label>CA ID</label></span>
                                    <span className="col-sm-7 col-md-8 text-no-input"><a href={external_url_map['CARallele-test'] + this.state.variantData.carId + '.html'} target="_blank">{this.state.variantData.carId}</a></span>
                                </div>
                            </div>
                            : null}
                            {this.state.variantIdType == "ClinVar Variation ID" ?
                            <div className="row col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4">
                                <AddResourceId resourceType="clinvar" label="ClinVar" wrapperClass="modal-buttons-wrapper"
                                    buttonText={this.state.variantData ? "Edit ClinVar ID" : "Add ClinVar ID" } initialFormValue={this.state.variantData && this.state.variantData.clinvarVariantId}
                                    clearButtonText="Cancel Variant Selection" updateParentForm={this.updateVariantData} buttonOnly={true} />
                            </div>
                            : null}
                            {this.state.variantIdType == "ClinGen Allele Registry ID" ?
                            <div className="row col-sm-7 col-md-8 col-sm-offset-5 col-md-offset-4">
                                <AddResourceId resourceType="car" label="ClinGen Allele Registry" wrapperClass="modal-buttons-wrapper"
                                    buttonText={this.state.variantData ? "Edit CA ID" : "Add CA ID" } initialFormValue={this.state.variantData && this.state.variantData.carVariantId}
                                    clearButtonText="Cancel Variant Selection" updateParentForm={this.updateVariantData} buttonOnly={true} clearButtonRender={false} />
                            </div>
                            : null}
                            {this.state.variantData && this.state.variantData.hgvsNames && Object.keys(this.state.variantData.hgvsNames).length > 0 ?
                            <div className="row">
                                <span className="col-sm-5 col-md-4 control-label"><label>HGVS terms</label></span>
                                <span className="col-sm-7 col-md-8 text-no-input">
                                    {variantHgvsRender(this.state.variantData.hgvsNames)}
                                </span>
                            </div>
                            : null}
                            {this.state.variantData ?
                            <div className="row submit-buttons-wrapper">
                                <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="View Variant" inputDisabled={!this.state.variantLoaded} />
                                <Input type="button" inputClassName="btn-default btn-inline-spacer pull-right" title="Cancel Variant Selection" clickHandler={this.cancelVariantSelection} />
                            </div>
                            : null}
                        </Form>
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(SelectVariant, 'curator_page', 'select-variant');
