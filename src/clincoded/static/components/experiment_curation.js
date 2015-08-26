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
                                <PanelGroup accordion>
                                    {this.state.experimentType == 'Biochemical Function' ?
                                        <Panel title="Biochemical Function" open>
                                            {TypeBiochemicalFunction.call(this)}
                                        </Panel>
                                    : null }
                                </PanelGroup>
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
            <Input type="select" ref="experimenttype" label="Experiment type:" defaultValue="none" value={this.state.experiment.type} handleChange={this.handleChange}
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
    return (
        <div className="row">
            Identified Function
        </div>
    );
}
