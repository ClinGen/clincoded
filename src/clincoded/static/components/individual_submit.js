"use strict";
import React from 'react';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { RestMixin } from './rest';
import { queryKeyValue, curator_page } from './globals';
import { Panel } from '../libs/bootstrap/panel';
import * as curator from './curator';
const RecordHeader = curator.RecordHeader;
const PmidSummary = curator.PmidSummary;

var IndividualSubmit = module.exports.FamilySubmit = createReactClass({
    mixins: [RestMixin],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // Family object given in query string
            individual: null, // Group object given in query string
            annotation: null // Annotation object given in query string
        };
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var familyUuid = this.queryValues.familyUuid;
        var individualUuid = this.queryValues.individualUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/group/' + groupUuid : '',
            familyUuid ? '/family/' + familyUuid : '',
            individualUuid ? '/individual/' + individualUuid : '',
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

                    case 'group':
                        stateObj.group = data;
                        break;

                    case 'family':
                        stateObj.family = data;
                        break;

                    case 'individual':
                        stateObj.individual = data;
                        break;

                    case 'annotation':
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
        var group = this.state.group;
        var family = this.state.family;
        var individual = this.state.individual;
        var annotation = this.state.annotation;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the query strings to start the process of loading the objects
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.individualUuid = queryKeyValue('individual', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);

        // Build the link to go back and edit the newly created group page
        var editIndividualLink = (gdm && individual && annotation) ? '/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + individual.uuid : '';
        var addIndividualLink, addIndividualTitle = '';
        if (gdm && annotation) {
            addIndividualLink = '/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid;
        }
        if (family) {
            addIndividualLink += '&family=' + family.uuid;
            addIndividualTitle = ' for this Family';
        } else if (group) {
            addIndividualLink += '&group=' + group.uuid;
            addIndividualTitle = ' for this Group';
        }

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={gdm && gdm.omimId} session={session} linkGdm={true} pmid={annotation ? annotation.article.pmid : null} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal />
                        </div>
                    : null}
                    {individual ?
                        <div className="viewer-titles submit-titles">
                            <h1>Individual Information: {individual.label}</h1> <a href={editIndividualLink} className="btn btn-info">Edit</a>
                        </div>
                    : null}
                    <div className="row">
                        <div className="col-md-10 col-md-offset-1 col-sm-10 col-sm-offset-1">
                            <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                <div className="row">
                                    <div className="col-md-6">
                                        {addIndividualLink ?
                                            <a className="btn btn-default btn-individual-submit" href={addIndividualLink}>Add Another Individual{addIndividualTitle}</a>
                                        : null}
                                    </div>
                                    <div className="col-md-6">
                                        {gdm && annotation ?
                                            <div>
                                                <a className="btn btn-default btn-individual-submit" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                                <div className="submit-results-note">Return to Record Curation page if you would like to add or add or edit a group, family, or individual.</div>
                                            </div>
                                        : null}
                                    </div>
                                </div>
                            </Panel>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(IndividualSubmit, 'curator_page', 'individual-submit');
