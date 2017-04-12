'use strict';

import React, {PropTypes} from 'react';
import _ from 'underscore';

import * as curator from './curator';

import { RestMixin } from './rest';
import { queryKeyValue, external_url_map, curator_page } from './globals';
import { Form, FormMixin, Input, InputMixin } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';

const RecordHeader = curator.RecordHeader;
const PmidSummary = curator.PmidSummary;

var CaseControlSubmit = module.exports.CaseControlSubmit = React.createClass({
    mixins: [FormMixin, RestMixin],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            caseGroup: null, // Group object given in query string
            annotation: null, // Annotation object given in query string
            haveFamily: '' // Setting of have-family switch
        };
    },

    // Handle value changes in the form
    handleChange: function(ref, e) {
        if (ref === 'havefamily') {
            this.setState({haveFamily: this.refs[ref].getValue()});
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var caseControlUuid = this.queryValues.caseControlUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            caseControlUuid ? '/casecontrol/' + caseControlUuid : '',
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

                    case 'CaseControl':
                        stateObj.caseControl = data;
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

    // After the Family Curation page component mounts, grab the GDM, group, family, and annotation UUIDs (as many as given)
    // from the query string and retrieve the corresponding objects from the DB, if they exist. Note, we have to do this after
    // the component mounts because AJAX DB queries can't be done from unmounted components.
    componentDidMount: function() {
        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.loadData();
    },

    render: function() {
        var gdm = this.state.gdm;
        var caseControl = this.state.caseControl;
        var annotation = this.state.annotation;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.caseControlUuid = queryKeyValue('casecontrol', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);

        // Build the link to go back and edit the newly created group page
        var editCaseControlLink = (gdm && caseControl && annotation) ?
                                    '/case-control-curation/?gdm=' + gdm.uuid +
                                    '&evidence=' + annotation.uuid +
                                    '&casecontrol=' + caseControl.uuid +
                                    '&casecohort=' + caseControl.caseCohort.uuid +
                                    '&controlcohort=' + caseControl.controlCohort.uuid
                                    : '';

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={gdm && gdm.omimId} session={session} linkGdm={true} pmid={annotation ? annotation.article.pmid : null} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal />
                        </div>
                    : null}
                    {caseControl ?
                        <div className="viewer-titles submit-titles">
                            <h1>Case Control Information: {caseControl.label}</h1> <a href={editCaseControlLink} className="btn btn-info">Edit</a>
                        </div>
                    : null}
                    <div className="row">
                        <div className="col-md-8 col-md-offset-2 col-sm-10 col-sm-offset-1">
                            <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                <div className="submit-results-panel-info">
                                    <em>Your Case-Control Data has been saved!</em>
                                </div>
                            </Panel>
                            { gdm && annotation && caseControl ?
                                <Panel panelClassName="submit-results-panel submit-results-response">
                                    <div className="group-submit-results-choices">
                                        <div className="submit-results-panel-info"></div>
                                        <div className="submit-results-buttons">
                                            <div className="col-md-6">
                                                <span className="group-submit-results-btn">
                                                    <a className="btn btn-default" href={'/case-control-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid}>Add another Case-Control entry</a>
                                                </span>
                                            </div>
                                            <div className="col-md-6">
                                                <span className="group-submit-results-btn">
                                                    <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(CaseControlSubmit, 'CuratorPage', 'case-control-submit');
