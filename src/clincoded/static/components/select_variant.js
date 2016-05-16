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
            variantIdType: 'none',
            variantLoaded: false,
            variantData: null
        };
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateVariantData: function(data) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        var currVariantOption = this.state.variantOption;
        var addVariantDisabled;
        if (data) {
            // Set state
            this.setState({variantLoaded: true});
            this.setState({variantData: data});
        }
    },

    cancelVariantSelection: function() {
        this.setState({variantLoaded: false, variantIdType: 'none'});
        this.setState({variantData: null});
    },

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
                                        <ol>
                                            <li>Search <a href="">ClinVar</a> for variant.</li>
                                            <li>If found in ClinVar, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                            <li>If not found in ClinVar, search the <a href="">ClinGen Allele Registry</a> with a valid HGVS term for that variant.</li>
                                            <li>If <a href="">ClinGen Allele Registry</a> returns a ClinVar ID, select “ClinVar VariationID” from the pull-down to enter it.</li>
                                            <li>If <a href="">ClinGen Allele Registry</a> does not find a ClinVar ID, register the variant to return a CA ID and then select “ClinGen Allele Registry ID (CA ID)” from the pull-down to enter it.</li>
                                        </ol>
                                    </div>
                                </div>
                                <div className="row">
                                    <Input type="select" ref="variantIdType" label="Select Variant by ID type"
                                        labelClassName="col-sm-5 control-label" value={this.state.variantIdType} wrapperClassName="col-sm-7" groupClassName="form-group"
                                        defaultValue="none" handleChange={this.handleChange} inputDisabled={this.state.variantLoaded}>
                                        <option value="none" disabled></option>
                                        <option value="ClinVar Variation ID">ClinVar Variation ID</option>
                                        <option value="ClinGen Allele Registry ID">ClinGen Allele Registry ID</option>
                                    </Input>
                                    <p className="col-sm-7 col-sm-offset-5 input-note-below-no-bottom"><strong>Note:</strong> Select ID type based on above instructions. Use the ClinVar VariationID whenever possible.</p>
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
                                    <span className="col-sm-5 col-md-4 control-label"><label>CAR ID</label></span>
                                    <span className="col-sm-7 col-md-8 text-no-input">{this.state.variantData.carId}</span>
                                </div>
                            </div>
                            : null}
                            {this.state.variantIdType == "ClinVar Variation ID" ?
                            <div className="row">
                                <AddResourceId resourceType="clinvar" label="ClinVar" wrapperClass="modal-buttons-wrapper" buttonWrapperClass="modal-button-align-reset"
                                    buttonText={this.state.variantData ? "Edit ClinVar ID" : "Add ClinVar ID" } initialFormValue={this.state.variantData && this.state.variantData.clinvarVariantId}
                                    clearButtonText="Cancel Variant Selection" updateParentForm={this.updateVariantData} buttonOnly={true} />
                            </div>
                            : null}
                            {this.state.variantIdType == "ClinGen Allele Registry ID" ?
                            <div className="row">
                                <AddResourceId resourceType="car" label="ClinGen Allele Registry" wrapperClass="modal-buttons-wrapper" buttonWrapperClass="modal-button-align-reset"
                                    buttonText={this.state.variantData ? "Edit CAR ID" : "Add CAR ID" } initialFormValue={this.state.variantData && this.state.variantData.carVariantId}
                                    clearButtonText="Cancel Variant Selection" updateParentForm={this.updateVariantData} buttonOnly={true} clearButtonRender={false} />
                            </div>
                            : null}
                            {this.state.variantData && this.state.variantData.hgvsNames ?
                            <div className="row">
                                {this.state.variantData.hgvsNames.others && this.state.variantData.hgvsNames.others.length > 0 ?
                                    <div className="row">
                                        <span className="col-sm-5 col-md-4 control-label"><label>HGVS terms</label></span>
                                        <span className="col-sm-7 col-md-8 text-no-input">
                                            {this.state.variantData.hgvsNames.others.map(function(hgvs, i) {
                                                return <span key={hgvs}>{hgvs}<br /></span>;
                                            })}
                                        </span>
                                    </div>
                                : null}
                            </div>
                            : null}
                            {this.state.variantData ?
                            <div className="row">
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
