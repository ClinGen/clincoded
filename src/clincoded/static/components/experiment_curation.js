'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var methods = require('./methods');

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var PmidSummary = curator.PmidSummary;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var PmidDoiButtons = curator.PmidDoiButtons;
var queryKeyValue = globals.queryKeyValue;
var country_codes = globals.country_codes;


var ExperimentCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            experiment: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            experimentName: '', // Currently entered name of the group
            experimentType: ''
        };
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'experimentName' && this.refs[ref].getValue()) {
            this.setState({experimentName: this.refs[ref].getValue()});
        } else if (ref === 'experimentType') {
            this.setState({experimentType: this.refs[ref].getValue()});
        } else if (ref === 'wildTypeRescuePhenotype') {
            console.log(this.refs[ref].getValue());
            console.log(this.refs[ref]);
            this.refs[ref].checked = this.refs[ref].getValue() === false ? true : false;
        } else if (ref === 'patientVariantRescue') {
            this.refs[ref].checked = this.refs[ref].getValue() === false ? true : false;
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var experimentUuid = this.queryValues.experimentUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            experimentUuid ? '/experimental/' + experimentUuid : '',
            annotationUuid ? '/evidence/' + annotationUuid : ''
        ]);

        // With all given query string variables, get the corresponding objects from the DB.
        this.getRestDatas(
            uris
        ).then(datas => {
            // See what we got back so we can build an object to copy in this React object's state to rerender the page.
            var stateObj = {};
            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;

                    case 'experimental':
                        stateObj.experiment = data;
                        break;

                    case 'annotation':
                        stateObj.annotation = data;
                        break;

                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            if (stateObj.experiment) {
                this.setState({
                    experimentName: stateObj.experiment.label,
                    experimentType: stateObj.experiment.evidenceType
                });
            }

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No one’s waiting but the user; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // After the Group Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        this.loadData();
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var groupGenes;
            var goSlimIDs, geneSymbols, hpoIDs, uberonIDs, efoIDs;
            var formError = false;

            if (this.state.experimentType == 'Biochemical Function') {
                // Check form for Biochemical Function panel
                goSlimIDs = curator.capture.goslims(this.getFormValue('identifiedFunction'));
                geneSymbols = curator.capture.genes(this.getFormValue('geneWithSameFunctionSameDisease.genes'));
                hpoIDs = curator.capture.hpoids(this.getFormValue('geneFunctionConsistentWithPhenotype.phenotypeHPO'));
                if (goSlimIDs && goSlimIDs.length && _(goSlimIDs).any(function(id) { return id === null; })) {
                    // GO_Slim ID is bad
                    formError = true;
                    this.setFormErrors('identifiedFunction', 'Use GO_Slim ID (e.g. GO:0012345)');
                }
                if (goSlimIDs.length > 1) {
                    // More than one GO_Slim ID specified
                    this.setFormErrors('identifiedFunction', 'Enter only one GO_Slim ID');
                }
                if (geneSymbols && geneSymbols.length && _(geneSymbols).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('geneWithSameFunctionSameDisease.genes', 'Use gene symbols (e.g. SMAD3) separated by commas');
                }
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('geneFunctionConsistentWithPhenotype.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
            }
            else if (this.state.experimentType == 'Protein Interactions') {
                // Check form for Protein Interactions panel
                geneSymbols = curator.capture.genes(this.getFormValue('interactingGenes'));
                if (geneSymbols && geneSymbols.length && _(geneSymbols).any(function(id) { return id === null; })) {
                    // Gene symbol list is bad
                    formError = true;
                    this.setFormErrors('interactingGenes', 'Use gene symbols (e.g. SMAD3) separated by commas');
                }
            }
            else if (this.state.experimentType == 'Expression') {
                // Check form for Expression panel
                uberonIDs = curator.capture.uberonids(this.getFormValue('organOfTissue'));
                if (uberonIDs && uberonIDs.length && _(uberonIDs).any(function(id) { return id === null; })) {
                    // Uberon ID is bad
                    formError = true;
                    this.setFormErrors('organOfTissue', 'Use Uberon ID (e.g. UBERON_0000948)');
                }
                if (uberonIDs.length > 1) {
                    // More than one Uberon ID specified
                    this.setFormErrors('organOfTissue', 'Enter only one Uberon ID');
                }
            }
            else if (this.state.experimentType == 'Functional alteration of gene/gene product') {
                // Check form for Functional Alterations panel
                goSlimIDs = curator.capture.goslims(this.getFormValue('normalFunctionOfGene'));
                efoIDs = curator.capture.efoids(this.getFormValue('funcalt.patientCellType'));
                if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                    // EFO ID is bad
                    formError = true;
                    this.setFormErrors('funcalt.patientCellType', 'Use EFO ID (e.g. 0000001)');
                }
                if (efoIDs.length > 1) {
                    // More than one EFO ID specified
                    this.setFormErrors('funcalt.patientCellType', 'Enter only one EFO ID');
                }
                efoIDs = curator.capture.efoids(this.getFormValue('funcalt.engineeredEquivalentCellType'));
                if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                    // EFO ID is bad
                    formError = true;
                    this.setFormErrors('funcalt.engineeredEquivalentCellType', 'Use EFO ID (e.g. 0000001)');
                }
                if (efoIDs.length > 1) {
                    // More than one EFO ID specified
                    this.setFormErrors('funcalt.engineeredEquivalentCellType', 'Enter only one EFO ID');
                }
                if (goSlimIDs && goSlimIDs.length && _(goSlimIDs).any(function(id) { return id === null; })) {
                    // GO_Slim ID is bad
                    formError = true;
                    this.setFormErrors('normalFunctionOfGene', 'Use GO_Slim ID (e.g. GO:0012345)');
                }
                if (goSlimIDs.length > 1) {
                    // More than one GO_Slim ID specified
                    this.setFormErrors('normalFunctionOfGene', 'Enter only one GO_Slim ID');
                }
            }
            else if (this.state.experimentType == 'Model Systems') {
                // Check form for Model Systems panel
                hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPO'));
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('model.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('model.phenotypeHPO', 'Enter only one HPO ID');
                }
                hpoIDs = curator.capture.hpoids(this.getFormValue('model.phenotypeHPOObserved'));
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('model.phenotypeHPOObserved', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('model.phenotypeHPOObserved', 'Enter only one HPO ID');
                }
            }
            else if (this.state.experimentType == 'Rescue') {
                // Check form for Rescue panel
                hpoIDs = curator.capture.hpoids(this.getFormValue('rescue.phenotypeHPO'));
                efoIDs = curator.capture.efoids(this.getFormValue('rescue.patientCellType'));
                if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                    // EFO ID is bad
                    formError = true;
                    this.setFormErrors('rescue.patientCellType', 'Use EFO ID (e.g. 0000001)');
                }
                if (efoIDs.length > 1) {
                    // More than one EFO ID specified
                    this.setFormErrors('rescue.patientCellType', 'Enter only one EFO ID');
                }
                efoIDs = curator.capture.efoids(this.getFormValue('rescue.engineeredEquivalentCellType'));
                if (efoIDs && efoIDs.length && _(efoIDs).any(function(id) { return id === null; })) {
                    // EFO ID is bad
                    formError = true;
                    this.setFormErrors('rescue.engineeredEquivalentCellType', 'Use EFO ID (e.g. 0000001)');
                }
                if (efoIDs.length > 1) {
                    // More than one EFO ID specified
                    this.setFormErrors('rescue.engineeredEquivalentCellType', 'Enter only one EFO ID');
                }
                if (hpoIDs && hpoIDs.length && _(hpoIDs).any(function(id) { return id === null; })) {
                    // HPO ID is bad
                    formError = true;
                    this.setFormErrors('rescue.phenotypeHPO', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
                if (hpoIDs.length > 1) {
                    // More than one HPO ID specified
                    this.setFormErrors('rescue.phenotypeHPO', 'Enter only one HPO ID');
                }
            }

            if (!formError) {
                console.log('form pass');

                var newExperiment = {};
                newExperiment.label = this.getFormValue('experimentName');
                newExperiment.evidenceType = this.getFormValue('experimentType');

                if (this.getFormValue('experimentType') === '') {
                    var searchStr = '/search/?type=gene&' + geneSymbols.map(function(symbol) { return 'symbol=' + symbol; }).join('&');


                    this.getRestData(searchStr).then(diseases => {
                        if (geneSymbols && geneSymbols.length) {
                            // At least one gene symbol entered; search the DB for them.
                            searchStr = '/search/?type=gene&' + geneSymbols.map(function(symbol) { return 'symbol=' + symbol; }).join('&');
                            return this.getRestData(searchStr).then(genes => {
                                if (genes['@graph'].length === geneSymbols.length) {
                                    // Successfully retrieved all genes
                                    groupGenes = genes;
                                    return Promise.resolve(genes);
                                } else {
                                    var missingGenes = _.difference(geneSymbols, genes['@graph'].map(function(gene) { return gene.symbol; }));
                                    this.setFormErrors('othergenevariants', missingGenes.join(', ') + ' not found');
                                    throw genes;
                                }
                            });
                        } else {
                            // No genes entered; just pass null to the next then
                            return Promise.resolve(null);
                        }
                    }).then(data => {
                        var newExperiment = Object.keys(this.state.annotation).length ? curator.flatten(this.state.annotation) : {};


                        console.log(newExperiment);
                    }).catch(function(e) {
                        console.log('GROUP CREATION ERROR=: %o', e);
                    });




                }
                else if (this.getFormValue('experimentType') == 'Rescue') {
                    newExperiment.rescue = {};
                    var patientCellOrEngineeredEquivalent = this.getFormValue('patientCellOrEngineeredEquivalent');
                    if (patientCellOrEngineeredEquivalent) {
                        newExperiment.rescue.patientCellOrEngineeredEquivalent = patientCellOrEngineeredEquivalent;
                    }
                    var patientCellType = this.getFormValue('rescue.patientCellType');
                    if (patientCellType) {
                        newExperiment.rescue.patientCellType = patientCellType;
                    }
                    var engineeredEquivalentCellType = this.getFormValue('rescue.engineeredEquivalentCellType');
                    if (engineeredEquivalentCellType) {
                        newExperiment.rescue.engineeredEquivalentCellType = engineeredEquivalentCellType;
                    }
                    var descriptionOfGeneAlteration = this.getFormValue('descriptionOfGeneAlteration');
                    if (descriptionOfGeneAlteration) {
                        newExperiment.rescue.descriptionOfGeneAlteration = descriptionOfGeneAlteration;
                    }
                    var phenotypeHPO = this.getFormValue('rescue.phenotypeHPO');
                    if (phenotypeHPO) {
                        newExperiment.rescue.phenotypeHPO = phenotypeHPO;
                    }
                    var phenotypeFreeText = this.getFormValue('phenotypeFreeText');
                    if (phenotypeFreeText) {
                        newExperiment.rescue.phenotypeFreeText = phenotypeFreeText;
                    }
                    var rescueMethod = this.getFormValue('rescueMethod');
                    if (rescueMethod) {
                        newExperiment.rescue.rescueMethod = rescueMethod;
                    }
                    var wildTypeRescuePhenotype = this.getFormValue('wildTypeRescuePhenotype');
                    newExperiment.rescue.wildTypeRescuePhenotype = wildTypeRescuePhenotype;
                    var patientVariantRescue = this.getFormValue('patientVariantRescue');
                    newExperiment.rescue.patientVariantRescue = patientVariantRescue;
                    var explanation = this.getFormValue('explanation');
                    if (explanation) {
                        newExperiment.rescue.explanation = explanation;
                    }
                    var evidenceInPaper = this.getFormValue('evidenceInPaper');
                    if (evidenceInPaper) {
                        newExperiment.rescue.evidenceInPaper = evidenceInPaper;
                    }
                }

                console.log(newExperiment);

                if (this.state.experiment) {
                    // We're editing a experiment. PUT the new group object to the DB to update the existing one.
                    this.putRestData('/experimental/' + this.state.experiment.uuid, newExperiment).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });

                } else {
                    // We created a group; post it to the DB
                    this.postRestData('/experimental/', newExperiment).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    }).then(newExperiment => {
                        var savedExperiment = newExperiment;
                        if (!this.state.experiment) {
                            // Get a flattened copy of the annotation and put our new group into it,
                            // ready for writing.
                            var annotation = curator.flatten(this.state.annotation);
                            if (annotation.experimentalData) {
                                annotation.experimentalData.push(newExperiment['@id']);
                            } else {
                                annotation.experimentalData = [newExperiment['@id']];
                            }

                            // Post the modified annotation to the DB, then go back to Curation Central
                            return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation);
                        } else {
                            return Promise.resolve(null);
                        }
                    });
                }

            }
        }
    },

    render: function() {
        var gdm = this.state.gdm;
        var annotation = this.state.annotation;
        var experiment = this.state.experiment;
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get the 'evidence', 'gdm', and 'experiment' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.experimentUuid = queryKeyValue('experiment', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        return (
            <div>
                {(!this.queryValues.experimentUuid || this.state.experiment) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(experiment ? 'Edit' : 'Curate') + ' Group Information'}</h1>
                                <h2>Experiment: {this.state.experimentName ? <span>{this.state.experimentName}</span> : <span className="no-entry">No entry</span>}{this.state.experimentType ? <span> ({this.state.experimentType})</span> : null}</h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {GroupName.call(this)}
                                        </Panel>


                                        {this.state.experimentType == 'Biochemical Function' ?
                                            <PanelGroup accordion><Panel title="Biochemical Function" open>
                                                {TypeBiochemicalFunction.call(this)}
                                            </Panel></PanelGroup>
                                        : null }
                                        {this.state.experimentType == 'Protein Interactions' ?
                                            <PanelGroup accordion><Panel title="Protein Interactions" open>
                                                {TypeProteinInteractions.call(this)}
                                            </Panel></PanelGroup>
                                        : null }
                                        {this.state.experimentType == 'Expression' ?
                                            <PanelGroup accordion><Panel title="Expression" open>
                                                {TypeExpression.call(this)}
                                            </Panel></PanelGroup>
                                        : null }
                                        {this.state.experimentType == 'Functional alteration of gene/gene product' ?
                                            <PanelGroup accordion><Panel title="Functional alteration of gene/gene product" open>
                                                {TypeFunctionalAlteration.call(this)}
                                            </Panel></PanelGroup>
                                        : null }
                                        {this.state.experimentType == 'Model Systems' ?
                                            <PanelGroup accordion><Panel title="Model Systems" open>
                                                {TypeModelSystems.call(this)}
                                            </Panel></PanelGroup>
                                        : null }
                                        {this.state.experimentType == 'Rescue' ?
                                            <PanelGroup accordion><Panel title="Rescue" open>
                                                {TypeRescue.call(this)}
                                            </Panel></PanelGroup>
                                        : null }






                                        {this.state.experimentType != '' && this.state.experimentType != 'none' ?
                                            <div className="curation-submit clearfix">
                                                <Input type="submit" inputClassName="btn-primary pull-right" id="submit" title="Save" />
                                                <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                            </div>
                                        : null }
                                    </Form>
                                </div>
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});

globals.curator_page.register(ExperimentCuration, 'curator_page', 'experiment-curation');


// Group Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupName = function() {
    var experiment = this.state.experiment;

    return (
        <div className="row">
            <Input type="text" ref="experimentName" label="Experiment name:" value={experiment && experiment.label} handleChange={this.handleChange}
                error={this.getFormError('experimentName')} clearError={this.clrFormErrors.bind(null, 'experimentName')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="select" ref="experimentType" label="Experiment type:" defaultValue="none" value={experiment && experiment.evidenceType} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Biochemical Function</option>
                <option>Protein Interactions</option>
                <option>Expression</option>
                <option>Functional alteration of gene/gene product</option>
                <option>Model Systems</option>
                <option>Rescue</option>
            </Input>
        </div>
    );
};

// Biochemical Function type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeBiochemicalFunction = function() {
    var biochemicalFunction = this.state.experiment.biochemicalFunction ? this.state.experiment.biochemicalFunction : {};
    if (biochemicalFunction) {
        biochemicalFunction.identifiedFunction = biochemicalFunction.identifiedFunction ? biochemicalFunction.identifiedFunction.join() : null;
        biochemicalFunction.evidenceForFunction = biochemicalFunction.evidenceForFunction ? biochemicalFunction.evidenceForFunction.join() : null;
        biochemicalFunction.evidenceForFunctionInPaper = biochemicalFunction.evidenceForFunctionInPaper ? biochemicalFunction.evidenceForFunctionInPaper.join() : null;
        biochemicalFunction.geneWithSameFunctionSameDisease = biochemicalFunction.geneWithSameFunctionSameDisease ? biochemicalFunction.geneWithSameFunctionSameDisease : {};
        if (biochemicalFunction.geneWithSameFunctionSameDisease) {
            biochemicalFunction.geneWithSameFunctionSameDisease.genes = biochemicalFunction.geneWithSameFunctionSameDisease.genes ? biochemicalFunction.geneWithSameFunctionSameDisease.genes.join() : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction.join() : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes = biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes ? biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes.join() : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper = biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper ? biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper.join() : null;
            biochemicalFunction.geneWithSameFunctionSameDisease.assessments = biochemicalFunction.geneWithSameFunctionSameDisease.assessments ? biochemicalFunction.geneWithSameFunctionSameDisease.assessments.join() : null;
        }
        biochemicalFunction.geneFunctionConsistentWithPhenotype = biochemicalFunction.geneFunctionConsistentWithPhenotype ? biochemicalFunction.geneFunctionConsistentWithPhenotype : {};
        if (biochemicalFunction.geneFunctionConsistentWithPhenotype) {
            biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO.join() : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText = biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText ? biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation = biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation ? biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper = biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper ? biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper : null;
            biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments = biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments ? biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments : null;
        }
    }
    return (
        <div className="row">
            <Input type="text" ref="identifiedFunction" label={<LabelIdentifiedFunction />} value={biochemicalFunction.identifiedFunction} placeholder="e.g. GO:0008150"
                error={this.getFormError('identifiedFunction')} clearError={this.clrFormErrors.bind(null, 'identifiedFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="evidenceForFunction" label="Evidence for function:" rows="5" value={biochemicalFunction.evidenceForFunction}
                error={this.getFormError('evidenceForFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceForFunctionInPaper" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.evidenceForFunctionInPaper}
                error={this.getFormError('evidenceForFunctionInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceForFunctionInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter evidence for A and/or B (at least one required)</p>
            <h4 className="col-sm-7 col-sm-offset-5">A. Gene(s) with same function implicated in same disease</h4>
            <Input type="text" ref="geneWithSameFunctionSameDisease.genes" label="Genes (HGNC):" value={biochemicalFunction.geneWithSameFunctionSameDisease.genes} placeholder="e.g. DICER1"
                error={this.getFormError('geneWithSameFunctionSameDisease.genes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.genes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction" label="Evidence that other gene(s) have the same function:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="geneWithSameFunctionSameDisease.sharedDisease" label="Shared disease (Orphanet):" value="DICER1"
                error={this.getFormError('geneWithSameFunctionSameDisease.sharedDisease')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.sharedDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required disabled="disabled" />
            <Input type="checkbox" ref="geneWithSameFunctionSameDisease.geneImplicatedWithDisease" label="Has this gene or genes been implicated in the above disease?:" value={biochemicalFunction.geneWithSameFunctionSameDisease.geneImplicatedWithDisease} placeholder="e.g. DICER1"
                error={this.getFormError('geneWithSameFunctionSameDisease.geneImplicatedWithDisease')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.geneImplicatedWithDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.explanationOfOtherGenes" label="Explanation of relationship of other gene(s) to the disease:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}
                error={this.getFormError('geneWithSameFunctionSameDisease.explanationOfOtherGenes')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.explanationOfOtherGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="geneWithSameFunctionSameDisease.evidenceInPaper" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}
                error={this.getFormError('geneWithSameFunctionSameDisease.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneWithSameFunctionSameDisease.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <h4 className="col-sm-7 col-sm-offset-5">B. Gene function consistent with phenotype</h4>
            <Input type="text" ref="geneFunctionConsistentWithPhenotype.phenotypeHPO" label={<LabelHPOIDs />} value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.phenotypeFreeText" label="Phenotype (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.explanation" label="Explanation of how phenotype is consistent with disease (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.explanation')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="geneFunctionConsistentWithPhenotype.evidenceInPaper" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}
                error={this.getFormError('geneFunctionConsistentWithPhenotype.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'geneFunctionConsistentWithPhenotype.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Biochemical Functions panel
var LabelIdentifiedFunction = React.createClass({
    render: function() {
        return <span>Identified Function (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});
var LabelHPOIDs = React.createClass({
    render: function() {
        return <span><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in new window">HPO</a> ID(s):</span>;
    }
});

// Protein Interaction type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeProteinInteractions = function() {
    var proteinInteractions = this.state.experiment.proteinInteractions ? this.state.experiment.proteinInteractions : {};
    if (proteinInteractions) {
        proteinInteractions.interactingGenes = proteinInteractions.interactingGenes ? proteinInteractions.interactingGenes.join() : null;
        proteinInteractions.interactionType = proteinInteractions.interactionType ? proteinInteractions.interactionType.join() : null;
        proteinInteractions.experimentalInteractionDetection = proteinInteractions.experimentalInteractionDetection ? proteinInteractions.experimentalInteractionDetection.join() : null;
        proteinInteractions.geneImplicatedInDisease = proteinInteractions.geneImplicatedInDisease ? proteinInteractions.geneImplicatedInDisease.join() : null;
        proteinInteractions.relationshipOfOtherGenesToDisese = proteinInteractions.relationshipOfOtherGenesToDisese ? proteinInteractions.relationshipOfOtherGenesToDisese.join() : null;
        proteinInteractions.evidenceInPaper = proteinInteractions.evidenceInPaper ? proteinInteractions.evidenceInPaper.join() : null;
        proteinInteractions.assessments = proteinInteractions.assessments ? proteinInteractions.assessments.join() : null;
    }
    return (
        <div className="row">
            <Input type="text" ref="interactingGenes" label="Interacting gene(s) (HGNC):" value={proteinInteractions.interactingGenes} placeholder="e.g. DICER1"
                error={this.getFormError('interactingGenes')} clearError={this.clrFormErrors.bind(null, 'interactingGenes')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="select" ref="interactionType" label="Interaction Type:" defaultValue="none" value={proteinInteractions.interactionType} handleChange={this.handleChange}
                error={this.getFormError('interactionType')} clearError={this.clrFormErrors.bind(null, 'interactionType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>physical association (MI:0915)</option>
                <option>genetic interaction (MI:0208)</option>
                <option>negative genetic interaction (MI:0933)</option>
                <option>positive genetic interaction (MI:0935)</option>
            </Input>
            <Input type="select" ref="experimentalInteractionDetection" label="Experimental interaction detection:" defaultValue="none" value={proteinInteractions.experimentalInteractionDetection} handleChange={this.handleChange}
                error={this.getFormError('experimentalInteractionDetection')} clearError={this.clrFormErrors.bind(null, 'experimentalInteractionDetection')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>coimmunoprecipitation (M:0019)</option>
                <option>pull down (M:0096)</option>
                <option>affinity chromatography technology (M:0004)</option>
                <option>protein cross-linking with a bifunctional reagent (M0031)</option>
                <option>comigration in gel electrophoresis (M:0807)</option>
                <option>x-ray crystallography (MI:0114)</option>
                <option>electron microscopy (MI:0040)</option>
            </Input>
            <Input type="checkbox" ref="geneImplicatedInDisease" label="Has this gene or genes been implicated in the above disease?:" value={proteinInteractions.geneImplicatedInDisease} placeholder=""
                error={this.getFormError('geneImplicatedInDisease')} clearError={this.clrFormErrors.bind(null, 'geneImplicatedInDisease')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="relationshipOfOtherGenesToDisese" label="Explanation of relationship of other gene(s) to the disease:" rows="5" value={proteinInteractions.relationshipOfOtherGenesToDisese}
                error={this.getFormError('relationshipOfOtherGenesToDisese')} clearError={this.clrFormErrors.bind(null, 'relationshipOfOtherGenesToDisese')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={proteinInteractions.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// Expression type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeExpression = function() {
    var expression = this.state.experiment.expression ? this.state.experiment.expression : {};
    if (expression) {
        expression.organOfTissue = expression.organOfTissue ? expression.organOfTissue.join() : null;
        expression.normalExpression = expression.normalExpression ? expression.normalExpression : {};
        if (expression.normalExpression) {
            expression.normalExpression.expressedInTissue = expression.normalExpression.expressedInTissue ? expression.normalExpression.expressedInTissue : null;
            expression.normalExpression.evidence = expression.normalExpression.evidence ? expression.normalExpression.evidence.join() : null;
            expression.normalExpression.evidenceInPaper = expression.normalExpression.evidenceInPaper ? expression.normalExpression.evidenceInPaper.join() : null;
            expression.normalExpression.assessments = expression.normalExpression.assessments ? expression.normalExpression.assessments.join() : null;
        }
        expression.alteredExpression = expression.alteredExpression ? expression.alteredExpression : {};
        if (expression.alteredExpression) {
            expression.normalExpression.expressedInPatients = expression.normalExpression.expressedInPatients ? expression.normalExpression.expressedInPatients : null;
            expression.alteredExpression.evidence = expression.alteredExpression.evidence ? expression.alteredExpression.evidence.join() : null;
            expression.alteredExpression.evidenceInPaper = expression.alteredExpression.evidenceInPaper ? expression.alteredExpression.evidenceInPaper.join() : null;
            expression.alteredExpression.assessments = expression.alteredExpression.assessments ? expression.alteredExpression.assessments.join() : null;
        }
    }
    return (
        <div className="row">
            <Input type="text" ref="organOfTissue" label={<LabelUberonId />} value={expression.organOfTissue} placeholder="e.g. UBERON_0000948"
                error={this.getFormError('organOfTissue')} clearError={this.clrFormErrors.bind(null, 'organOfTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <p className="col-sm-7 col-sm-offset-5">Enter evidence for A and/or B (at least one required)</p>
            <h4 className="col-sm-7 col-sm-offset-5">A. Gene normally expressed in tissue relevant to the disease</h4>
            <Input type="checkbox" ref="normalExpression.expressedInTissue" label="Is gene normally expressed in tissues relevant to the disease?:" value={expression.normalExpression.expressedInTissue} placeholder="e.g. DICER1"
                error={this.getFormError('normalExpression.expressedInTissue')} clearError={this.clrFormErrors.bind(null, 'normalExpression.expressedInTissue')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="normalExpression.evidence" label="Evidence for normal expression in tissue:" rows="5" value={expression.normalExpression.evidence}
                error={this.getFormError('normalExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="normalExpression.evidenceInPaper" label="Information about where evidence can be found in paper:" rows="5" value={expression.normalExpression.evidenceInPaper}
                error={this.getFormError('normalExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'normalExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <h4 className="col-sm-7 col-sm-offset-5">B. Altered expression in Patients</h4>
            <Input type="checkbox" ref="alteredExpression.expressedInPatients" label="Is gene normally expressed in tissues relevant to the disease?:" value={expression.alteredExpression.expressedInPatients} placeholder="e.g. DICER1"
                error={this.getFormError('alteredExpression.expressedInPatients')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.expressedInPatients')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="alteredExpression.evidence" label="Evidence for normal expression in tissue:" rows="5" value={expression.alteredExpression.evidence}
                error={this.getFormError('alteredExpression.evidence')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidence')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="alteredExpression.evidenceInPaper" label="Information about where evidence can be found in paper:" rows="5" value={expression.alteredExpression.evidenceInPaper}
                error={this.getFormError('alteredExpression.evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'alteredExpression.evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
        </div>
    );
}

// HTML labels for Expression panel.
var LabelUberonId = React.createClass({
    render: function() {
        return <span>Organ of tissue relevant to disease, in which gene expression is examined (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/UBERON" target="_blank" title="Open Uberon in a new tab">Uberon</a> ID</span>):</span>;
    }
});

// Functional Alteration type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeFunctionalAlteration = function() {
    var functionalAlteration = this.state.experiment.functionalAlteration ? this.state.experiment.functionalAlteration : {};
    if (functionalAlteration) {
        functionalAlteration.cellMutationOrEngineeredEquivalent = functionalAlteration.cellMutationOrEngineeredEquivalent ? functionalAlteration.cellMutationOrEngineeredEquivalent.join() : null;
        functionalAlteration.patientCellType = functionalAlteration.patientCellType ? functionalAlteration.patientCellType.join() : null;
        functionalAlteration.engineeredEquivalentCellType = functionalAlteration.engineeredEquivalentCellType ? functionalAlteration.engineeredEquivalentCellType.join() : null;
        functionalAlteration.descriptoinOfGeneAlteration = functionalAlteration.descriptoinOfGeneAlteration ? functionalAlteration.descriptoinOfGeneAlteration.join() : null;
        functionalAlteration.normalFunctionOfGene = functionalAlteration.normalFunctionOfGene ? functionalAlteration.normalFunctionOfGene.join() : null;
        functionalAlteration.evidenceForNormalFunction = functionalAlteration.evidenceForNormalFunction ? functionalAlteration.evidenceForNormalFunction.join() : null;
        functionalAlteration.evidenceInPaper = functionalAlteration.evidenceInPaper ? functionalAlteration.evidenceInPaper.join() : null;
        functionalAlteration.assessments = functionalAlteration.assessments ? functionalAlteration.assessments.join() : null;
    }
    return (
        <div className="row">
            <Input type="select" ref="cellMutationOrEngineeredEquivalent" label="Patient cells with candidate mutation or engineered equivalent?:" defaultValue="none" value={functionalAlteration.cellMutationOrEngineeredEquivalent} handleChange={this.handleChange}
                error={this.getFormError('cellMutationOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'cellMutationOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="text" ref="funcalt.patientCellType" label={<LabelPatientCellType />} value={functionalAlteration.patientCellType} placeholder="e.g. 0000001"
                error={this.getFormError('funcalt.patientCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.patientCellType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="funcalt.engineeredEquivalentCellType" label={<LabelEngineeredEquivalent />} value={functionalAlteration.engineeredEquivalentCellType} placeholder="e.g. 0000001"
                error={this.getFormError('funcalt.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'funcalt.engineeredEquivalentCellType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="descriptoinOfGeneAlteration" label="Description of gene alteration:" rows="5" value={functionalAlteration.descriptoinOfGeneAlteration}
                error={this.getFormError('descriptoinOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptoinOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="normalFunctionOfGene" label={<LabelNormalFunctionOfGene />} value={functionalAlteration.normalFunctionOfGene} placeholder=""
                error={this.getFormError('normalFunctionOfGene')} clearError={this.clrFormErrors.bind(null, 'normalFunctionOfGene')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="evidenceForNormalFunction" label="Evidence for altered function:" rows="5" value={functionalAlteration.evidenceForNormalFunction}
                error={this.getFormError('evidenceForNormalFunction')} clearError={this.clrFormErrors.bind(null, 'evidenceForNormalFunction')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found in paper:" rows="5" value={functionalAlteration.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Functional Alterations panel.
var LabelPatientCellType = React.createClass({
    render: function() {
        return <span>Patient cell type (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/EFO" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});
var LabelEngineeredEquivalent = React.createClass({
    render: function() {
        return <span>Engineered equivalent cell type/line (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/EFO" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});
var LabelNormalFunctionOfGene = React.createClass({
    render: function() {
        return <span>Normal function of gene/gene product (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});

// Model Systems type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeModelSystems = function() {
    var modelSystems = this.state.experiment.modelSystems ? this.state.experiment.modelSystems : {};
    if (modelSystems) {
        modelSystems.animalOrCellCulture = modelSystems.animalOrCellCulture ? modelSystems.animalOrCellCulture.join() : null;
        modelSystems.animalModel = modelSystems.animalModel ? modelSystems.animalModel.join() : null;
        modelSystems.cellCulture = modelSystems.cellCulture ? modelSystems.cellCulture.join() : null;
        modelSystems.descriptionOfGeneAlteration = modelSystems.descriptionOfGeneAlteration ? modelSystems.descriptionOfGeneAlteration.join() : null;
        modelSystems.phenotypeHPO = modelSystems.phenotypeHPO ? modelSystems.phenotypeHPO.join() : null;
        modelSystems.phenotypeFreeText = modelSystems.phenotypeFreeText ? modelSystems.phenotypeFreeText.join() : null;
        modelSystems.phenotypeHPOObserved = modelSystems.phenotypeHPOObserved ? modelSystems.phenotypeHPOObserved.join() : null;
        modelSystems.phenotypeFreetextObserved = modelSystems.phenotypeFreetextObserved ? modelSystems.phenotypeFreetextObserved.join() : null;
        modelSystems.explanation = modelSystems.explanation ? modelSystems.explanation.join() : null;
        modelSystems.evidenceInPaper = modelSystems.evidenceInPaper ? modelSystems.evidenceInPaper.join() : null;
        modelSystems.assessments = modelSystems.assessments ? modelSystems.assessments.join() : null;
    }
    return (
        <div className="row">
            <Input type="select" ref="animalOrCellCulture" label="Non-human animal or cell-culture model?:" defaultValue="none" value={modelSystems.animalOrCellCulture} handleChange={this.handleChange}
                error={this.getFormError('animalOrCellCulture')} clearError={this.clrFormErrors.bind(null, 'animalOrCellCulture')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Animal model</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="select" ref="animalModel" label="Animal model:" defaultValue="none" value={modelSystems.animalModel} handleChange={this.handleChange}
                error={this.getFormError('animalModel')} clearError={this.clrFormErrors.bind(null, 'animalModel')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Cat (Felis catus) 9685</option>
                <option>Chicken (Gallus gallus) 9031</option>
                <option>Chimpanzee (Pan troglodytes) 9598</option>
                <option>Cow (Bos taurus) 9913</option>
                <option>Dog (Canis lupus familaris) 9615</option>
                <option>Frog (Xenopus) 262014</option>
                <option>Fruit fly (Drosophila) 7215</option>
                <option>Gerbil (Gerbilinae) 10045</option>
                <option>Guinea pig (Cavia porcellus) 10141</option>
                <option>Hamster (Cricetinae) 10026</option>
                <option>Macaque (Macaca) 9539</option>
                <option>Mouse (Mus musculus) 10090</option>
                <option>Pig (Sus scrofa) 9823</option>
                <option>Rabbit (Oryctolagus crunicu) 9986</option>
                <option>Rat (Rattus norvegicus) 10116</option>
                <option>Round worm (Carnorhabditis elegans) 6239</option>
                <option>Sheep (Ovis aries) 9940</option>
                <option>Zebrafish (Daanio rerio) 7955</option>
            </Input>
            <Input type="text" ref="cellCulture" label="Cell-culture type/line:" value={modelSystems.cellCulture} placeholder=""
                error={this.getFormError('cellCulture')} clearError={this.clrFormErrors.bind(null, 'cellCulture')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:" rows="5" value={modelSystems.descriptionOfGeneAlteration}
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="model.phenotypeHPO" label={<LabelPatientPhenotype />} value={modelSystems.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('model.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreeText" label="Patient phenotype:" rows="5" value={modelSystems.phenotypeFreeText}
                error={this.getFormError('phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="model.phenotypeHPOObserved" label={<LabelPhenotypeObserved />} value={modelSystems.phenotypeHPOObserved} placeholder="e.g. HP:0010704"
                error={this.getFormError('model.phenotypeHPOObserved')} clearError={this.clrFormErrors.bind(null, 'model.phenotypeHPOObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreetextObserved" label="Phenotype observed in model system:" rows="5" value={modelSystems.phenotypeFreetextObserved}
                error={this.getFormError('phenotypeFreetextObserved')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreetextObserved')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="explanation" label="Explanation:" rows="5" value={modelSystems.explanation}
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={modelSystems.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Model Systems panel.
var LabelPatientPhenotype = React.createClass({
    render: function() {
        return <span>Patient phenotype (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});
var LabelPhenotypeObserved = React.createClass({
    render: function() {
        return <span>Phenotype observed in model system (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});

// Rescue type curation panel. Call with .call(this) to run in the same context
// as the calling component.
var TypeRescue = function() {
    var experiment = this.state.experiment ? this.state.experiment : {};
    var rescue = experiment.rescue ? experiment.rescue : {};
    if (rescue) {
        rescue.patientCellOrEngineeredEquivalent = rescue.patientCellOrEngineeredEquivalent ? rescue.patientCellOrEngineeredEquivalent : null;
        rescue.patientCellType = rescue.patientCellType ? rescue.patientCellType : null;
        rescue.engineeredEquivalentCellType = rescue.engineeredEquivalentCellType ? rescue.engineeredEquivalentCellType : null;
        rescue.descriptionOfGeneAlteration = rescue.descriptionOfGeneAlteration ? rescue.descriptionOfGeneAlteration : null;
        rescue.phenotypeHPO = rescue.phenotypeHPO ? rescue.phenotypeHPO : null;
        rescue.phenotypeFreeText = rescue.phenotypeFreeText ? rescue.phenotypeFreeText : null;
        rescue.rescueMethod = rescue.rescueMethod ? rescue.rescueMethod : null;
        rescue.wildTypeRescuePhenotype = rescue.wildTypeRescuePhenotype ? rescue.wildTypeRescuePhenotype : false;
        rescue.patientVariantRescue = rescue.patientVariantRescue ? rescue.patientVariantRescue : false;
        rescue.explanation = rescue.explanation ? rescue.explanation : null;
        rescue.evidenceInPaper = rescue.evidenceInPaper ? rescue.evidenceInPaper : null;
        rescue.assessments = rescue.assessments ? rescue.assessments : null;
    }
    return (
        <div className="row">
            <Input type="select" ref="patientCellOrEngineeredEquivalent" label="Patient cells with or engineered equivalent?:" defaultValue="none" value={rescue.patientCellOrEngineeredEquivalent} handleChange={this.handleChange}
                error={this.getFormError('patientCellOrEngineeredEquivalent')} clearError={this.clrFormErrors.bind(null, 'patientCellOrEngineeredEquivalent')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="text" ref="rescue.patientCellType" label={<LabelPatientCellType />} value={rescue.patientCellType} placeholder=""
                error={this.getFormError('rescue.patientCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.patientCellType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="rescue.engineeredEquivalentCellType" label={<LabelEngineeredEquivalent />} value={rescue.engineeredEquivalentCellType} placeholder=""
                error={this.getFormError('rescue.engineeredEquivalentCellType')} clearError={this.clrFormErrors.bind(null, 'rescue.engineeredEquivalentCellType')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="descriptionOfGeneAlteration" label="Description of gene alteration:" rows="5" value={rescue.descriptionOfGeneAlteration}
                error={this.getFormError('descriptionOfGeneAlteration')} clearError={this.clrFormErrors.bind(null, 'descriptionOfGeneAlteration')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="rescue.phenotypeHPO" label="Phenotype to rescue (HPO)" value={rescue.phenotypeHPO} placeholder="e.g. HP:0010704"
                error={this.getFormError('rescue.phenotypeHPO')} clearError={this.clrFormErrors.bind(null, 'rescue.phenotypeHPO')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenotypeFreeText" label="Phenotype to rescue:" rows="5" value={rescue.phenotypeFreeText}
                error={this.getFormError('phenotypeFreeText')} clearError={this.clrFormErrors.bind(null, 'phenotypeFreeText')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="rescueMethod" label="Method used to rescue:" rows="5" value={rescue.rescueMethod}
                error={this.getFormError('rescueMethod')} clearError={this.clrFormErrors.bind(null, 'rescueMethod')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="checkbox" ref="wildTypeRescuePhenotype" label="Does the wild-type rescue the above phenotype?:" checked={rescue.wildTypeRescuePhenotype}
                error={this.getFormError('wildTypeRescuePhenotype')} clearError={this.clrFormErrors.bind(null, 'wildTypeRescuePhenotype')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="checkbox" ref="patientVariantRescue" label="Does patient variant rescue?:" checked={rescue.patientVariantRescue}
                error={this.getFormError('patientVariantRescue')} clearError={this.clrFormErrors.bind(null, 'patientVariantRescue')} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="explanation" label="Explanation:" rows="5" value={rescue.explanation}
                error={this.getFormError('explanation')} clearError={this.clrFormErrors.bind(null, 'explanation')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="evidenceInPaper" label="Information about where evidence can be found on paper" rows="5" value={rescue.evidenceInPaper}
                error={this.getFormError('evidenceInPaper')} clearError={this.clrFormErrors.bind(null, 'evidenceInPaper')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}


// Associated Variants curation panel. Call with .call(this) to run in the same context
// as the calling component.
var AssociatedVariants = function() {
    return (
        <div className="row">
            <p className="col-sm-7 col-sm-offset-5">If your functional data was about one or more particular variants,
            please associated it with those variant(s) <em>(optional, and only when functional data is about this specific variant -
                expression, functional alteration of gene/gene product, Model Systems, Rescue)</em></p>
            <Input type="text" ref="variant.dbSNP" label={<LabelAssociatedVariantdbSNP />} value="" placeholder="e.g. rs1748"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="variant.ClinVar" label={<LabelAssociatedVariantClinVar />} value="" placeholder="e.g. RCV000162091"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="text" ref="variant.HGVS" label={<LabelAssociatedVariantHGVS />} value="" placeholder="e.g. NM_001009944.2:c.12420G>A"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="variant.other" label="Other description (only when no ID available):" rows="5" value=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for Associated Variants panel.
var LabelAssociatedVariantdbSNP = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">dbSNP</a> ID:</span>;
    }
});
var LabelAssociatedVariantClinVar = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">ClinVar</a> ID:</span>;
    }
});
var LabelAssociatedVariantHGVS = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">HGVS</a> term (if no dbSNP or ClinVar ID):</span>;
    }
});
