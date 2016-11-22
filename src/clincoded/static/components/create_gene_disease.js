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
var modesOfInheritance = require('./mapping/modes_of_inheritance.json');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Alert = modal.Alert;
var ModalMixin = modal.ModalMixin;
var Panel = panel.Panel;

var CreateGeneDisease = React.createClass({
    mixins: [FormMixin, RestMixin, ModalMixin, CuratorHistory],

    contextTypes: {
        fetch: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            gdm: {},
            adjectiveRequired: false
        };
    },

    // Handle value changes in modeInheritance dropdown selection
    handleChange: function(ref, e) {
        if (ref === 'hpo') {
            //Only show option to select moi adjective if user selects 'X-linked inheritance'
            let selected = this.refs[ref].getValue();
            selected.indexOf('X-linked inheritance') > -1 ? this.setState({adjectiveRequired: true}) : this.setState({adjectiveRequired: false});
        }
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
        if (this.state.adjectiveRequired) {
            this.saveFormValue('moiAdjective', this.refs.moiAdjective.getValue());
        }
        if (this.validateForm()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            var orphaId = this.getFormValue('orphanetid').match(/^ORPHA([0-9]{1,6})$/i)[1];
            var geneId = this.getFormValue('hgncgene');
            var mode = this.getFormValue('hpo');
            let adjective;
            if (this.state.adjectiveRequired) {
                adjective = this.getFormValue('moiAdjective');
            }

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
                        let newGdm = {};
                        if (this.state.adjectiveRequired) {
                            newGdm = {
                                gene: geneId,
                                disease: orphaId,
                                modeInheritance: mode,
                                modeInheritanceAdjective: adjective
                            };
                        } else {
                            newGdm = {
                                gene: geneId,
                                disease: orphaId,
                                modeInheritance: mode
                            };
                        }

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
    },

    render: function() {
        let adjectiveRequired = this.state.adjectiveRequired;

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
                                <Input type="select" ref="hpo" label="Mode of Inheritance" defaultValue="select" handleChange={this.handleChange}
                                    error={this.getFormError('hpo')} clearError={this.clrFormErrors.bind(null, 'hpo')}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="hpo" required>
                                    <option value="select" disabled="disabled">Select</option>
                                    <option value="" disabled="disabled"></option>
                                    {modesOfInheritance.map(function(modeOfInheritance, i) {
                                        return <option key={i} value={modeOfInheritance}>{modeOfInheritance}</option>;
                                    })}
                                </Input>
                                <Input type="select" ref="moiAdjective" label="Select an adjective" defaultValue="none"
                                    error={this.getFormError('moiAdjective')} clearError={this.clrFormErrors.bind(null, 'moiAdjective')}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="moiAdjective"
                                    required={adjectiveRequired ? true : false} inputDisabled={adjectiveRequired ? false : true}>
                                    <option value="none" disabled="disabled">Select</option>
                                    <option disabled="disabled"></option>
                                    <option value="Dominant">Dominant</option>
                                    <option value="Recessive">Recessive</option>
                                    <option value="Primarily recessive with milder female expression">Primarily recessive with milder female expression</option>
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


// Display a history item for adding a PMID to a GDM
var GdmAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var gdm = history.primary;
        var gdmMeta = history.meta.gdm;
        var gdmHref = '/curation-central/?gdm=' + gdm.uuid;

        return (
            <div>
                <a href={gdmHref}>
                    <strong>{gdmMeta.gene.symbol}-{gdmMeta.disease.term}-</strong>
                    <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                </a>
                <span> created</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(GdmAddHistory, 'gdm', 'add');
