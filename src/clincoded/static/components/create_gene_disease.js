'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('./globals');
var fetched = require('./fetched');
var form = require('../libs/bootstrap/form');
var panel = require('../libs/bootstrap/panel');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;
var CuratorHistory = require('./curator_history');
var modesOfInheritance = require('./mapping/modes_of_inheritance.json');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Panel = panel.Panel;

import ModalComponent from '../libs/bootstrap/modal';

var CreateGeneDisease = React.createClass({
    mixins: [FormMixin, RestMixin, CuratorHistory],

    contextTypes: {
        fetch: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            gdm: {},
            adjectives: [],
            adjectiveDisabled: true
        };
    },

    // Handle value changes in modeInheritance dropdown selection
    handleChange: function(ref, e) {
        if (ref === 'hpo') {
            let selected = this.refs[ref].getValue();
            /******************************************************/
            /* If 'X-linked inheritance' is selected,             */
            /* enable adjective menu and set it a required field. */
            /* If 'Autosomal dominant inheritance' is selected,   */
            /* or 'Autosomal recessive inheritance is selected,   */
            /* enable adjective menu only & set it not required.  */
            /* Everything else, disable adjective menu.           */
            /******************************************************/
            if (selected.indexOf('X-linked inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['X-linked inheritance (HP:0001417)']);
            } else if (selected.indexOf('Autosomal dominant inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Autosomal dominant inheritance (HP:0000006)']);
            } else if (selected.indexOf('Autosomal recessive inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Autosomal recessive inheritance (HP:0000007)']);
            } else if (selected.indexOf('Mitochondrial inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Mitochondrial inheritance (HP:0001427)']);
            } else if (selected.indexOf('Other') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Other']);
            } else {
                this.handleAdjectives(true, []);
            }
        }
    },

    // Helper method for the 'handleChange' method to minimize repetitive code
    handleAdjectives: function(adjectiveDisabled, adjectives) {
        this.setState({
            adjectiveDisabled: adjectiveDisabled,
            adjectives: adjectives
        }, () => {this.refs.moiAdjective.setValue('none');});
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
        let moiAdjectiveValue = this.refs.moiAdjective.getValue();
        if (moiAdjectiveValue && moiAdjectiveValue !== 'none') {
            this.saveFormValue('moiAdjective', moiAdjectiveValue);
        }
        if (this.validateForm()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            var orphaId = this.getFormValue('orphanetid').match(/^ORPHA([0-9]{1,6})$/i)[1];
            var geneId = this.getFormValue('hgncgene');
            var mode = this.getFormValue('hpo');
            let adjective = this.getFormValue('moiAdjective');

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
                        let newGdm = {
                            gene: geneId,
                            disease: orphaId,
                            modeInheritance: mode
                        };
                        if (adjective && adjective.length) {
                            newGdm['modeInheritanceAdjective'] = adjective;
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
                        this.child.openModal();
                    }
                });
            }).catch(e => {
                // Some unexpected error happened
                parseAndLogError.bind(undefined, 'fetchedRequest');
            });
        }
    },

    // Called when any of the alert's buttons is clicked. Confirm is true if the 'Create' button was clicked;
    // false if the 'Cancel' button was clicked.
    handleAlertClick: function(confirm, e) {
        if (confirm) {
            this.editGdm();
        }
        this.child.closeModal();
    },

    render: function() {
        let adjectives = this.state.adjectives;
        let adjectiveDisabled = this.state.adjectiveDisabled;
        const moiKeys = Object.keys(modesOfInheritance);
        let gdm = this.state.gdm;

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
                                    {moiKeys.map(function(modeOfInheritance, i) {
                                        return <option key={i} value={modeOfInheritance}>{modeOfInheritance}</option>;
                                    })}
                                </Input>
                                <Input type="select" ref="moiAdjective" label="Select an adjective" defaultValue="none"
                                    error={this.getFormError('moiAdjective')} clearError={this.clrFormErrors.bind(null, 'moiAdjective')} inputDisabled={adjectiveDisabled}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="moiAdjective">
                                    <option value="none">Select</option>
                                    <option disabled="disabled"></option>
                                    {adjectives.map(function(adjective, i) {
                                        return <option key={i} value={adjective}>{adjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1]}</option>;
                                    })}
                                </Input>
                                <div><p className="alert alert-warning">Currently, the above options (gene, disease, mode of inheritance, or adjective) cannot be altered for a Gene:Disease record once the record has been created. This includes adding an adjective to a Gene:Disease:Mode of inheritance record that has already been created or editing an adjective associated with a record.</p></div>
                                <Input type="submit" inputClassName="btn-default pull-right" id="submit" />
                            </div>
                        </Form>
                        {gdm && gdm.gene && gdm.disease && gdm.modeInheritance ?
                            <ModalComponent modalClass="modal-default" modalWrapperClass="confirm-edit-gdm-modal" onRef={ref => (this.child = ref)}>
                                <div>
                                    <div className="modal-body">
                                        <p>A curation record already exists for <strong>{gdm.gene.symbol} — ORPHA{gdm.disease.orphaNumber} — {gdm.modeInheritance}</strong>. You may curate this existing record, or cancel to specify a different gene — disease — mode.</p>
                                    </div>
                                    <div className='modal-footer'>
                                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.handleAlertClick.bind(null, false)} title="Cancel" />
                                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.handleAlertClick.bind(null, true)} title="Curate" />
                                    </div>
                                </div>
                            </ModalComponent>
                        : null}
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
