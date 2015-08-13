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

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Alert = modal.Alert;
var ModalMixin = modal.ModalMixin;
var Panel = panel.Panel;


var hpoValues = [
    {value: '', text: 'Select', disabled: true},
    {value: '', text: '', disabled: true},
    {text: 'Autosomal dominant inheritance (HP:0000006)'},
    {text: 'Autosomal dominant inheritance with maternal imprinting (HP:0012275)'},
    {text: 'Autosomal dominant inheritance with paternal imprinting (HP:0012274)'},
    {text: 'Autosomal recessive inheritance (HP:0000007)'},
    {text: 'Autosomal unknown'},
    {text: 'Codominant'},
    {text: 'Genetic anticipation (HP:0003743)'},
    {text: 'Mitochondrial inheritance (HP:0001427)'},
    {text: 'Sex-limited autosomal dominant (HP:0001470)'},
    {text: 'Somatic mutation (HP:0001428)'},
    {text: 'Sporadic (HP:0003745)'},
    {text: 'X-linked dominant inheritance (HP:0001423)'},
    {text: 'X-linked inheritance (HP:0001417)'},
    {text: 'X-linked recessive inheritance (HP:0001419)'},
    {text: 'Y-linked inheritance (HP:0001450)'},
    {text: 'Other'}
];


var CreateGeneDisease = React.createClass({
    mixins: [FormMixin, RestMixin, ModalMixin],

    contextTypes: {
        fetch: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        return {gdm: {}};
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

    editGdm: function() {
        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid);
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

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
    },

    render: function() {
        return (
            <div className="container">
                <h1>{this.props.context.title}</h1>
                <div className="col-md-8 col-md-offset-2 col-sm-9 col-sm-offset-1 form-create-gene-disease">
                    <Panel panelClassName="panel-create-gene-disease">
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            <div className="row">
                                <Input type="text" ref="hgncgene" label={<LabelHgncGene />} placeholder="e.g. DICER1"
                                    error={this.getFormError('hgncgene')} clearError={this.clrFormErrors.bind(null, 'hgncgene')}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                                <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} placeholder="e.g. ORPHA15"
                                    error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
                                <Input type="select" ref="hpo" label="Mode of Inheritance" defaultValue={hpoValues[0].value}
                                    error={this.getFormError('hpo')} clearError={this.clrFormErrors.bind(null, 'hpo')}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                                    {hpoValues.map(function(v, i) {
                                        return <option key={i} value={v.value} disabled={v.disabled ? 'disabled' : ''}>{v.text}</option>;
                                    })}
                                </Input>
                                <Input type="submit" inputClassName="btn-default pull-right" id="submit" />
                            </div>
                        </Form>
                        <Alert id="confirm-edit-gdm" content={<ConfirmEditGdm gdm={this.state.gdm} editGdm={this.editGdm} closeAlert={this.closeAlert} />} />
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(CreateGeneDisease, 'curator_page', 'create-gene-disease');


// HTML labels for inputs follow.
var LabelHgncGene = React.createClass({
    render: function() {
        return <span>Enter <a href="http://www.genenames.org" target="_blank" title="HGNC home page in a new tab">HGNC</a> gene symbol</span>;
    }
});

var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Enter <a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> ID</span>;
    }
});


var ConfirmEditGdm = React.createClass({
    propTypes: {
        gdm: React.PropTypes.object, // GDM object under consideration
        editGdm: React.PropTypes.func, // Function to call to edit the GDM
        closeAlert: React.PropTypes.func // Function to call to close the alert
    },

    // Called when any of the alert's buttons is clicked. Confirm is true if the 'Create' button was clicked;
    // false if the 'Cancel' button was clicked.
    handleClick: function(confirm, e) {
        if (confirm) {
            this.props.editGdm();
        }
        this.props.closeAlert('confirm-edit-gdm');
    },

    render: function() {
        var gdm = this.props.gdm;

        return (
            <div>
                <div className="modal-body">
                    <p>A curation record already exists for <strong>{gdm.gene.symbol} — ORPHA{gdm.disease.orphaNumber} — {gdm.modeInheritance}</strong>. You may curate this existing record, or cancel to specify a different gene — disease — mode.</p>
                </div>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.handleClick.bind(null, false)} title="Cancel" />
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.handleClick.bind(null, true)} title="Curate" />
                </div>
            </div>
        );
    }
});
