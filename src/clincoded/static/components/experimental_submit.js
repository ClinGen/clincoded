"use strict";
var React = require('react');
var _ = require('underscore');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var form = require('../libs/bootstrap/form');
var panel = require('../libs/bootstrap/panel');

var RecordHeader = curator.RecordHeader;
var PmidSummary = curator.PmidSummary;
var queryKeyValue = globals.queryKeyValue;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Panel = panel.Panel;


var ExperimentalSubmit = React.createClass({
    mixins: [FormMixin, RestMixin],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            experimental: null, // Experimental object given in query string
            annotation: null // Annotation object given in query string
        };
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var experimentalUuid = this.queryValues.experimentalUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            experimentalUuid ? '/experimental/' + experimentalUuid : '',
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
                    case 'Gdm':
                        stateObj.gdm = data;
                        break;

                    case 'Experimental':
                        stateObj.experimental = data;
                        break;

                    case 'Annotation':
                        stateObj.annotation = data;
                        break;

                    default:
                        break;
                }
            });

            // Set all the state variables we've collected
            this.setState(stateObj);

            // Not passing data to anyone; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // After the Experimental Curation page component mounts, grab the GDM, experimental, and annotation UUIDs (as many as given)
    // from the query string and retrieve the corresponding objects from the DB, if they exist. Note, we have to do this after
    // the component mounts because AJAX DB queries can't be done from unmounted components.
    componentDidMount: function() {
        // Get the 'evidence', 'gdm', and 'experimental' UUIDs from the query string and save them locally.
        this.loadData();
    },

    render: function() {
        var gdm = this.state.gdm;
        var experimental = this.state.experimental;
        var annotation = this.state.annotation;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.experimentalUuid = queryKeyValue('experimental', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);

        // Build the link to go back and edit the newly created experimental page
        var editExperimentalLink = (gdm && experimental && annotation) ? '/experimental-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&experimental=' + experimental.uuid : '';

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={gdm && gdm.omimId} session={session} linkGdm={true} pmid={annotation ? annotation.article.pmid : null} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal />
                        </div>
                    : null}
                    {experimental ?
                        <div className="viewer-titles submit-titles">
                            <h1>{experimental.evidenceType}<br />Experimental Data Information: {experimental.label}</h1> <a href={editExperimentalLink} className="btn btn-info">Edit/Assess</a>
                        </div>
                    : null}
                    <div className="row">
                        <div className="col-md-10 col-md-offset-1 col-sm-10 col-sm-offset-1">
                            <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                <div className="submit-results-panel-info">
                                    <em>Your Experimental Data has been added!</em>
                                </div>
                            </Panel>
                            { experimental && annotation && annotation.article ?
                                <Panel panelClassName="submit-results-panel submit-results-response">
                                    <div className="family-submit-results-choices">
                                        <div className="submit-results-panel-info"></div>
                                        <div className="submit-results-buttons">
                                            <div className="col-md-6">
                                                <span className="family-submit-results-btn">
                                                    <a className="btn btn-default" href={'/experimental-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid}>Add another Experimental Data entry</a>
                                                </span>
                                            </div>
                                            <div className="col-md-6">
                                                <span className="family-submit-results-btn">
                                                    <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            : null }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(ExperimentalSubmit, 'curator_page', 'experimental-submit');
