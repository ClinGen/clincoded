"use strict";
import React from 'react';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { RestMixin } from './rest';
import { queryKeyValue, curator_page } from './globals';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import * as curator from './curator';
const RecordHeader = curator.RecordHeader;
const PmidSummary = curator.PmidSummary;

var GroupSubmit = module.exports.GroupSubmit = createReactClass({
    mixins: [FormMixin, RestMixin],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            annotation: null, // Annotation object given in query string
            haveFamily: 'none', // Setting of have-family switch
            disabled: false
        };
    },

    // Handle value changes in the form
    handleChange: function(ref, e) {
        if (ref === 'havefamily') {
            this.setState({haveFamily: this.refs[ref].getValue(), disabled: true});
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/groups/' + groupUuid : '',
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
        var annotation = this.state.annotation;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);

        // Build the link to go back and edit the newly created group page
        var editGroupLink = (gdm && group && annotation) ? '/group-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid : '';

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={gdm && gdm.omimId} session={session} linkGdm={true} pmid={annotation ? annotation.article.pmid : null} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal />
                        </div>
                    : null}
                    {group ?
                        <div className="viewer-titles submit-titles">
                            <h1>Group Information: {group.label}</h1> <a href={editGroupLink} className="btn btn-info">Edit</a>
                        </div>
                    : null}
                    <div className="row">
                        <div className="col-md-8 col-md-offset-2 col-sm-10 col-sm-offset-1">
                            <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                <Form formClassName="form-horizontal form-std">
                                    <Input type="select" ref="havefamily" label="Do any of the probands or other individuals in this Group have Family Information?" defaultValue={this.state.haveFamily}
                                        handleChange={this.handleChange} labelClassName="group-submit-results-label" wrapperClassName="group-submit-results-switch" groupClassName="submit-results-wrapper">
                                        <option value="none" disabled={this.state.disabled}>No Selection</option>
                                        <option disabled="disabled"></option>
                                        <option value="y">Yes</option>
                                        <option value="n">No</option>
                                    </Input>
                                </Form>
                                <p className="submit-results-panel-info">
                                    <em><strong>Note</strong>: Family Information includes any information about a proband in the group that is part of family and any relatives of the proband
                                    (e.g. average age of onset, race, family ethnicity, etc.) and information about segregation of phenotype(s) and variant(s).</em>
                                </p>
                            </Panel>
                            {(this.state.haveFamily === 'y' && gdm && annotation && group) ?
                                <Panel panelClassName="submit-results-panel submit-results-response">
                                    <p>
                                        <em>Any variant associated with a proband in a Family is captured at the Family level.</em>
                                    </p>
                                    <div className="group-submit-results-choices">
                                        <span className="group-submit-results-btn">
                                            <div className="submit-results-note">To associate segregation, variant, or any other information for a family, <strong>Add New Family for this Group</strong>.</div>
                                            <a className="btn btn-default" href={'/family-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid}>Add New Family for this Group</a>
                                        </span>
                                        <span className="submit-results-choices-sep">OR</span>
                                        <span className="group-submit-results-btn">
                                            <div className="submit-results-note">If you have previously created an entry for this Family, <strong>Return to Record Curation page</strong> to add this Family to the newly created Group.</div>
                                            <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                        </span>
                                    </div>
                                </Panel>
                            : ((this.state.haveFamily === 'n' && gdm && annotation && group) ?
                                <Panel panelClassName="submit-results-panel submit-results-response">
                                    <p>
                                        <em>Any variant associated with an individual that is a member of a Group but not part of a Family is captured at the Individual level.</em>
                                    </p>
                                    <div className="group-submit-results-choices">
                                        <span className="group-submit-results-btn">
                                            <div className="submit-results-note">To associate a variant and/or information such as age, race, etc. with an individual in the Group, <strong>Add New Individuals for this Group</strong>.</div>
                                            <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid}>Add New Individuals for this Group</a>
                                        </span>
                                        <span className="submit-results-choices-sep">OR</span>
                                        <span className="group-submit-results-btn">
                                            <div className="submit-results-note">If you have previously created an entry for this Individual, <strong>Return to Record Curation page</strong> to add this Individual to the newly created Group.</div>
                                            <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                        </span>
                                    </div>
                                </Panel>
                            : null)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(GroupSubmit, 'curator_page', 'group-submit');
