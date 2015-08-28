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
    mixins: [FormMixin, RestMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: {}, // GDM object given in UUID
            annotation: {}, // Annotation object given in UUID
            experiment: {}, // If we're editing an experiment, this gets the fleshed-out experiment object we're editing
            experimentName: '', // Currently entered name of the experiment
            experimentType: '' // specifies the experiment type
        };
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'experimentname' && this.refs[ref].getValue()) {
            this.setState({experimentName: this.refs[ref].getValue()});
        } else if (ref === 'experimenttype') {
            this.setState({experimentType: this.refs[ref].getValue()});
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

                    case 'experiment':
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
            if (stateObj.experiment && Object.keys(stateObj.experiment).length) {
                stateObj.genotyping2Disabled = !(stateObj.experiment.method && stateObj.experiment.method.genotypingMethods && stateObj.experiment.method.genotypingMethods.length);
                this.setState({experimentName: stateObj.experiment.label});
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

    render: function() {
        var gdm = Object.keys(this.state.gdm).length ? this.state.gdm : null;
        var annotation = Object.keys(this.state.annotation).length ? this.state.annotation : null;
        var experiment = Object.keys(this.state.experiment).length ? this.state.experiment : null;
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get the 'evidence', 'gdm', and 'experiment' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.experimentUuid = queryKeyValue('experiment', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "true";

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={this.state.annotation.article} displayJournal />
                        </div>
                    : null}
                    <div className="viewer-titles">
                        <h1>{(experiment ? 'Edit' : 'Curate') + ' Experiment Information'}</h1>
                        <h2>Experiment: {this.state.experimentName ? <span>{this.state.experimentName}</span> : <span className="no-entry">No entry</span>}{this.state.experimentType ? <span> ({this.state.experimentType})</span> : null}</h2>
                    </div>
                    <div className="row experiment-curation-content">
                        <div className="col-sm-12">
                            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                <Panel>
                                    {ExperimentNameType.call(this)}
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
                                    <PanelGroup accordion>
                                        <Panel title="Functional Data - Associated Variant(s)" open>
                                            {AssociatedVariants.call(this)}
                                        </Panel>
                                    </PanelGroup>
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
        );
    }
});

globals.curator_page.register(ExperimentCuration, 'curator_page', 'experiment-curation');

// Experimental Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var ExperimentNameType = function() {
    return (
        <div className="row">
            <Input type="text" ref="experimentname" label="Experiment name:" value={this.state.experiment.label} handleChange={this.handleChange}
                error={this.getFormError('experimentname')} clearError={this.clrFormErrors.bind(null, 'experimentname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="select" ref="experimenttype" label="Experiment type:" defaultValue="none" value={this.state.experiment.evidenceType} handleChange={this.handleChange}
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
            <Input type="text" ref="hpoid" label={<LabelIdentifiedFunction />} value={biochemicalFunction.identifiedFunction} placeholder="e.g. GO:0008150"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Evidence for function:" rows="5" value={biochemicalFunction.evidenceForFunction}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.evidenceForFunctionInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter evidence for A and/or B (at least one required)</p>
            <h4 className="col-sm-7 col-sm-offset-5">A. Gene(s) with same function implicated in same disease</h4>
            <Input type="text" ref="hpoid" label="Gene (HGNC):" value={biochemicalFunction.geneWithSameFunctionSameDisease.genes} placeholder="e.g. DICER1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Evidence that other gene(s) have the same function:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="hpoid" label="Shared disease (Orphanet):" value={biochemicalFunction.geneWithSameFunctionSameDisease.genes} placeholder="e.g. DICER1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required disabled />
            <Input type="checkbox" ref="hpoid" label="Has this gene or genes been implicated in the above disease?:" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceForOtherGenesWithSameFunction} placeholder="e.g. DICER1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Explanation of relationship of other gene(s) to the disease:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.explanationOfOtherGenes}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.geneWithSameFunctionSameDisease.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Note: Functional data will only be counted towards the summary if assessed.</p>
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={biochemicalFunction.geneWithSameFunctionSameDisease.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">B. Gene function consistent with phenotype</h4>
            <Input type="text" ref="hpoid" label={<LabelHPOIDs />} value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeHPO} placeholder="e.g. HP:0010704"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Phenotype (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.phenotypeFreeText}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="phenoterms" label="Explanation of how phenotype is consistent with disease (free text):" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.explanation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Note: Functional data will only be counted towards the summary if assessed.</p>
            <Input type="select" ref="biochemicalFunction.geneFunctionConsistentWithPhenotypeAssessments" label="Assessment:" defaultValue="none" value={biochemicalFunction.geneFunctionConsistentWithPhenotype.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}

// HTML labels for inputs follow.
var LabelIdentifiedFunction = React.createClass({
    render: function() {
        return <span>Identified Function (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});

// HTML labels for inputs follow.
var LabelHPOIDs = React.createClass({
    render: function() {
        return <span><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in new window">HPO</a> ID(s):</span>;
    }
});

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
            <Input type="text" ref="hpoid" label="Interacting gene(s) (HGNC):" value={proteinInteractions.interactingGenes} placeholder="e.g. GO:0008150"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="select" ref="abc" label="Interaction Type:" defaultValue="none" value={proteinInteractions.interactionType} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>MI Term 1</option>
                <option>MI Term 2</option>
            </Input>
            <Input type="select" ref="abc" label="Experimental interaction detection:" defaultValue="none" value={proteinInteractions.experimentalInteractionDetection} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>MI Term 1</option>
                <option>MI Term 2</option>
            </Input>
            <Input type="checkbox" ref="hpoid" label="Has this gene or genes been implicated in the above disease?:" value={proteinInteractions.geneImplicatedInDisease} placeholder=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Explanation of relationship of other gene(s) to the disease:" rows="5" value={proteinInteractions.relationshipOfOtherGenesToDisese}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found on paper" rows="5" value={proteinInteractions.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={proteinInteractions.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}


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
            <Input type="text" ref="hpoid" label={<LabelUberonId />} value={expression.organOfTissue} placeholder="e.g. UBERON_0000948"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <p className="col-sm-7 col-sm-offset-5">Enter evidence for A and/or B (at least one required)</p>
            <h4 className="col-sm-7 col-sm-offset-5">A. Gene normally expressed in tissue relevant to the disease</h4>
            <Input type="checkbox" ref="hpoid" label="Is gene normally expressed in tissues relevant to the disease?:" value={expression.normalExpression.expressedInTissue} placeholder="e.g. DICER1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Evidence for normal expression in tissue:" rows="5" value={expression.normalExpression.evidence}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={expression.normalExpression.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={expression.normalExpression.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">B. Altered expression in Patients</h4>
            <Input type="checkbox" ref="hpoid" label="Is gene normally expressed in tissues relevant to the disease?:" value={expression.alteredExpression.expressedInPatients} placeholder="e.g. DICER1"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Evidence for normal expression in tissue:" rows="5" value={expression.alteredExpression.evidence}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={expression.alteredExpression.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={expression.alteredExpression.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}

// HTML labels for inputs follow.
var LabelUberonId = React.createClass({
    render: function() {
        return <span>Organ of tissue relevant to disease, in which gene expression is examined (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/UBERON" target="_blank" title="Open Uberon in a new tab">Uberon</a> ID</span>):</span>;
    }
});



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
            <Input type="select" ref="abc" label="Patient cells with candidate mutation or engineered equivalent?:" defaultValue="none" value={functionalAlteration.cellMutationOrEngineeredEquivalent} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="text" ref="hpoid" label={<LabelPatientCellType />} value={functionalAlteration.patientCellType} placeholder="e.g. 0000001"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelEngineeredEquivalent />} value={functionalAlteration.engineeredEquivalentCellType} placeholder="e.g. 0000001"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Description of gene alteration:" rows="5" value={functionalAlteration.descriptoinOfGeneAlteration}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="hpoid" label={<LabelNormalFunctionOfGene />} value={functionalAlteration.normalFunctionOfGene} placeholder=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Evidence for altered function:" rows="5" value={functionalAlteration.evidenceForNormalFunction}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found in paper:" rows="5" value={functionalAlteration.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={functionalAlteration.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}

// HTML labels for inputs follow.
var LabelPatientCellType = React.createClass({
    render: function() {
        return <span>Patient cell type (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/EFO" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});

// HTML labels for inputs follow.
var LabelEngineeredEquivalent = React.createClass({
    render: function() {
        return <span>Engineered equivalent cell type/line (<span style={{fontWeight: 'normal'}}><a href="https://bioportal.bioontology.org/ontologies/EFO" target="_blank" title="Open Uberon in a new tab">EFO</a></span>)</span>;
    }
});

// HTML labels for inputs follow.
var LabelNormalFunctionOfGene = React.createClass({
    render: function() {
        return <span>Normal function of gene/gene product (<span style={{fontWeight: 'normal'}}><a href="http://bit.ly/1fxDvhV" target="_blank" title="Open GO_Slim in a new tab">GO_Slim</a></span>):</span>;
    }
});



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
            <Input type="select" ref="abc" label="Non-human animal or cell-culture model?:" defaultValue="none" value={modelSystems.animalOrCellCulture} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Animal model</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="select" ref="abc" label="Animal model:" defaultValue="none" value={modelSystems.animalModel} handleChange={this.handleChange}
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
            <Input type="text" ref="hpoid" label="Cell-culture type/line:" value={modelSystems.cellCulture} placeholder=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Description of gene alteration:" rows="5" value={modelSystems.descriptionOfGeneAlteration}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="hpoid" label={<LabelPatientPhenotype />} value={modelSystems.phenotypeHPO} placeholder="e.g. HP:0010704"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Patient phenotype:" rows="5" value={modelSystems.phenotypeFreeText}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="hpoid" label={<LabelPhenotypeObserved />} value={modelSystems.phenotypeHPOObserved} placeholder="e.g. HP:0010704"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Phenotype observed in model system:" rows="5" value={modelSystems.phenotypeFreetextObserved}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Explanation:" rows="5" value={modelSystems.explanation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found on paper" rows="5" value={modelSystems.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={modelSystems.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}

// HTML labels for inputs follow.
var LabelPatientPhenotype = React.createClass({
    render: function() {
        return <span>Patient phenotype (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});

// HTML labels for inputs follow.
var LabelPhenotypeObserved = React.createClass({
    render: function() {
        return <span>Phenotype observed in model system (<span style={{fontWeight: 'normal'}}><a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="Open PhenExplorer in a new tab">HPO</a> ID</span>):</span>;
    }
});




var TypeRescue = function() {
    var rescue = this.state.experiment.rescue ? this.state.experiment.rescue : {};

    if (rescue) {
        rescue.patientCellOrEngineeredEquivalent = rescue.patientCellOrEngineeredEquivalent ? rescue.patientCellOrEngineeredEquivalent.join() : null;
        rescue.patientCellType = rescue.patientCellType ? rescue.patientCellType.join() : null;
        rescue.engineeredEquivalentCellType = rescue.engineeredEquivalentCellType ? rescue.engineeredEquivalentCellType.join() : null;
        rescue.descriptionOfGeneAlteration = rescue.descriptionOfGeneAlteration ? rescue.descriptionOfGeneAlteration.join() : null;
        rescue.phenotypeHPO = rescue.phenotypeHPO ? rescue.phenotypeHPO.join() : null;
        rescue.phenotypeFreeText = rescue.phenotypeFreeText ? rescue.phenotypeFreeText.join() : null;
        rescue.rescueMethod = rescue.rescueMethod ? rescue.rescueMethod.join() : null;
        rescue.wildTypeRescuePhenotype = rescue.wildTypeRescuePhenotype ? rescue.wildTypeRescuePhenotype.join() : null;
        rescue.patientVariantRescue = rescue.patientVariantRescue ? rescue.patientVariantRescue.join() : null;
        rescue.explanation = rescue.explanation ? rescue.explanation.join() : null;
        rescue.evidenceInPaper = rescue.evidenceInPaper ? rescue.evidenceInPaper.join() : null;
        rescue.assessments = rescue.assessments ? rescue.assessments.join() : null;
    }

    return (
        <div className="row">
            <Input type="select" ref="abc" label="Patient cells with or engineered equivalent?:" defaultValue="none" value={rescue.patientCellOrEngineeredEquivalent} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Patient cells</option>
                <option>Engineered equivalent</option>
            </Input>
            <Input type="text" ref="hpoid" label={<LabelPatientCellType />} value={rescue.patientCellType} placeholder=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelEngineeredEquivalent />} value={rescue.engineeredEquivalentCellType} placeholder=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Description of gene alteration:" rows="5" value={rescue.descriptionOfGeneAlteration}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="text" ref="hpoid" label="Phenotype to rescue (HPO)" value={rescue.phenotypeHPO} placeholder="e.g. HP:0010704"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="textarea" ref="phenoterms" label="Phenotype to rescue:" rows="5" value={rescue.phenotypeFreeText}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Method used to rescue:" rows="5" value={rescue.rescueMethod}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="checkbox" ref="hpoid" label="Does the wild-type rescue the above phenotype?:" value={rescue.wildTypeRescuePhenotype}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="checkbox" ref="hpoid" label="Does patient variant rescue?:" value={rescue.patientVariantRescue}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Explanation:" rows="5" value={rescue.explanation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <Input type="textarea" ref="phenoterms" label="Information about where evidence can be found on paper" rows="5" value={rescue.evidenceInPaper}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="abc" label="Assessment:" defaultValue="none" value={rescue.assessments} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Assessment 1</option>
                <option>Assessment 2</option>
            </Input>
        </div>
    );
}




// Experimental Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var AssociatedVariants = function() {
    return (
        <div className="row">
            <p className="col-sm-7 col-sm-offset-5">If your functional data was about one or more particular variants,
            please associated it with those variant(s) <em>(optional, and only when functional data is about this specific variant -
                expression, functional alteration of gene/gene product, Model Systems, Rescue)</em></p>
            <Input type="text" ref="hpoid" label={<LabelAssociatedVariantdbSNP />} value="" placeholder="e.g. rs1748"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="hpoid" label={<LabelAssociatedVariantClinVar />} value="" placeholder="e.g. RCV000162091"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="text" ref="hpoid" label={<LabelAssociatedVariantHGVS />} value="" placeholder="e.g. NM_001009944.2:c.12420G>A"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="phenoterms" label="Other description (only when no ID available):" rows="5" value=""
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for inputs follow.
var LabelAssociatedVariantdbSNP = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">dbSNP</a> ID:</span>;
    }
});

// HTML labels for inputs follow.
var LabelAssociatedVariantClinVar = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">ClinVar</a> ID:</span>;
    }
});

// HTML labels for inputs follow.
var LabelAssociatedVariantHGVS = React.createClass({
    render: function() {
        return <span><a href="" target="_blank" title="">HGVS</a> term (if no dbSNP or ClinVar ID):</span>;
    }
});
