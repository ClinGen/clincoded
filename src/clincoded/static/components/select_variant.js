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
            variantIdType: null,
            variantLoaded: false,
            clinvarVariantId: null,
            clinvarVariantTitle: null
        };
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        /*
        // Get values from form and validate them
        this.saveFormValue('hgncgene', this.refs.hgncgene.getValue().toUpperCase());
        this.saveFormValue('orphanetid', this.refs.orphanetid.getValue());
        this.saveFormValue('hpo', this.refs.hpo.getValue());
        if (this.validateForm()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            var orphaId = this.getFormValue('orphanetid').match(/^ORPHA([0-9]{1,6})$/i)[1];
            var geneId = this.getFormValue('hgncgene');
            var mode = this.getFormValue('hpo');

            // Get the disease and gene objects corresponding to the given Orphanet and Gene IDs in parallel.
            // If either error out, set the form error fields
            this.getRestDatas([
                '/diseases/' + orphaId,
                '/genes/' + geneId
            ], [
                function() { this.setFormErrors('orphanetid', 'Orphanet ID not found'); }.bind(this),
                function() { this.setFormErrors('hgncgene', 'HGNC gene symbol not found'); }.bind(this)
            ]).then(data => {
                // Load GDM if one with matching gene/disease/mode already exists
                return this.getRestData(
                    '/search/?type=gdm&disease.orphaNumber=' + orphaId + '&gene.symbol=' + geneId + '&modeInheritance=' + mode
                ).then(gdmSearch => {
                    if (gdmSearch.total === 0) {
                        // Matching GDM not found. Create a new GDM
                        var newGdm = {
                            gene: geneId,
                            disease: orphaId,
                            modeInheritance: mode
                        };

                        // Post the new GDM to the DB. Once promise returns, go to /curation-central page with the UUID
                        // of the new GDM in the query string.
                        return this.postRestData('/gdm/', newGdm).then(data => {
                            var newGdm = data['@graph'][0];

                            // Record history of adding a GDM
                            var meta = {
                                gdm: {
                                    operation: 'add',
                                    gene: newGdm.gene,
                                    disease: newGdm.disease
                                }
                            };
                            this.recordHistory('add', newGdm, meta);

                            // Navigate to Record Curation
                            var uuid = data['@graph'][0].uuid;
                            this.context.navigate('/curation-central/?gdm=' + uuid);
                        });
                    } else {
                        // Found matching GDM. See of the user wants to curate it.
                        this.setState({gdm: gdmSearch['@graph'][0]});
                        this.openAlert('confirm-edit-gdm');
                    }
                });
            }).catch(e => {
                // Some unexpected error happened
                parseAndLogError.bind(undefined, 'fetchedRequest');
            });
        }
        */
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateClinvarVariantId: function(data) {
        var newVariantInfo = _.clone(this.state.variantInfo);
        var currVariantOption = this.state.variantOption;
        var addVariantDisabled;
        // Set state
        this.setState({variantLoaded: true});
        this.setState({clinvarVariantId: data.clinvarVariantId, clinvarVariantTitle: data.clinvarVariantTitle});
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
                                    labelClassName="col-sm-5 control-label" value="none" wrapperClassName="col-sm-7" groupClassName="form-group"
                                    defaultValue="none" handleChange={this.handleChange} inputDisabled={this.state.variantLoaded}>
                                    <option value="none" disabled></option>
                                    <option value="ClinVar Variation ID">ClinVar Variation ID</option>
                                    <option value="ClinGen Allele Registry ID">ClinGen Allele Registry ID</option>
                                </Input>
                            </div>
                            {this.state.clinvarVariantId ?
                            <div className="row">
                                <h4 className="clinvar-preferred-title">{this.state.clinvarVariantTitle}</h4>
                                <div className="row">
                                    <span className="col-sm-5 col-md-4 control-label"><label>ClinVar Variation ID</label></span>
                                    <span className="col-sm-7 col-md-8 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.clinvarVariantId} target="_blank">{this.state.clinvarVariantId}</a></span>
                                </div>
                            </div>
                            : null}
                            {this.state.variantIdType == "ClinVar Variation ID" ?
                            <div className="row">
                                <AddResourceId resourceType="clinvar" label="ClinVar" buttonClasses="wide-button"
                                    buttonText={this.state.clinvarVariantId ? "Edit ClinVar ID" : "Add ClinVar ID" }
                                    updateParentForm={this.updateClinvarVariantId} buttonOnly={true} />
                            </div>
                            : null}
                            {this.state.variantIdType && this.state.variantIdType != "none" ?
                            <div className="row">
                                <Input type="submit" inputClassName="btn-default pull-right" id="submit" inputDisabled={!this.state.variantLoaded} />
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
