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


var FamilySubmit = module.exports.FamilySubmit = React.createClass({
    mixins: [FormMixin, RestMixin],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in query string
            family: null, // Group object given in query string
            annotation: null, // Annotation object given in query string
            haveIndividual: '' // Setting of have-individual switch
        };
    },

    // Handle value changes in the form
    handleChange: function(ref, e) {
        if (ref === 'haveindividual') {
            this.setState({haveIndividual: this.refs[ref].getValue()});
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var familyUuid = this.queryValues.familyUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            familyUuid ? '/family/' + familyUuid : '',
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

                    case 'Family':
                        stateObj.family = data;
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
        var family = this.state.family;
        var group = (family && family.associatedGroups.length) ? family.associatedGroups[0] : null;
        var annotation = this.state.annotation;
        var hasVariants = !!(family && family.segregation && family.segregation.variants && family.segregation.variants.length);
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the given family's proband individual if it has one; null if it doesn't.
        var probandIndividual = family && _(family.individualIncluded).find(function(individual) {
            return individual.proband;
        });

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.initialVariants = queryKeyValue('initvar', this.props.href) === ""; // True if variants in family for the first time
        this.queryValues.hadVariants = queryKeyValue('hadvar', this.props.href) === ""; // True if family had variants even if it doesn't now

        // Did family curation code detect that the family had variants, but now doesn't?
        var hadVariants = (gdm && family) ? this.queryValues.hadVariants : false;

        // Build the link to go back and edit the newly created group page
        var editFamilyLink = (gdm && family && annotation) ? '/family-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid : '';

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={gdm && gdm.omimId} session={session} linkGdm={true} pmid={annotation ? annotation.article.pmid : null} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal />
                        </div>
                    : null}
                    {family ?
                        <div className="viewer-titles submit-titles">
                            <h1>Family Information: {family.label}</h1> <a href={editFamilyLink} className="btn btn-info">Edit</a>
                            {group ?
                                <h2>{'Group association: ' + group.label}</h2>
                            : null}
                        </div>
                    : null}
                    <div className="row">
                        <div className="col-md-8 col-md-offset-2 col-sm-10 col-sm-offset-1">
                            {hasVariants || hadVariants ?
                                <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                    <div className="submit-results-panel-info">
                                        <p>An Individual entry for the proband <strong><a href={'/individual/' + probandIndividual.uuid}>{probandIndividual.label}</a></strong> and its associated variant(s) has been created.</p>
                                        <p>You can score and add additional information about this proband, create an entry for a non-proband in this Family, or return to the Record Curation page.</p>
                                        <p><em><strong>Note</strong>: Individual information includes associated variant(s), phenotypes, sex, etc. For a proband, variant information can only be added or edited on the Family page as it is associated with segregation information.</em></p>
                                    </div>
                                    <div className="submit-results-buttons">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <span className="family-submit-results-btn">
                                                    <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + probandIndividual.uuid}>Score / Add information about proband</a>
                                                </span>
                                            </div>
                                            <div className="col-md-6">
                                                <span className="family-submit-results-btn">
                                                    <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid}>Add non-proband Individual</a>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6 col-md-offset-3" >
                                                <span className="family-submit-results-btn">
                                                    <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            :
                                <div>
                                    <Panel panelClassName="submit-results-panel" panelBodyClassName="bg-info">
                                        <Form formClassName="form-horizontal form-std">
                                            <Input type="select" ref="haveindividual" defaultValue={this.state.haveIndividual}
                                                label="No segregating variant information has been associated with this Family. Would you like to add it?"
                                                handleChange={this.handleChange} labelClassName="family-submit-results-label" wrapperClassName="family-submit-results-switch" groupClassName="submit-results-wrapper">
                                                <option value="" disabled="disabled">No Selection</option>
                                                <option disabled="disabled"></option>
                                                <option value="y">Yes</option>
                                                <option value="n">No</option>
                                            </Input>
                                        </Form>
                                        <p className="submit-results-panel-info">
                                            <em><strong>Note</strong>: If you want to associate variant(s) with the proband, you must edit the Family and add variant(s) there. This creates an Individual who is the proband for the Family.</em>
                                        </p>
                                    </Panel>
                                    {this.state.haveIndividual === 'y' || this.state.haveIndividual === 'n' ?
                                        <Panel panelClassName="submit-results-panel submit-results-response">
                                            {(this.state.haveIndividual === 'y' && gdm && annotation && family) ?
                                                <div className="family-submit-results-choices">
                                                    <div className="row">
                                                        <div className="col-md-4 col-md-offset-4">
                                                            <span className="family-submit-results-btn">
                                                                <a className="btn btn-default" href={'/family-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid}>Edit this Family</a>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            : ((this.state.haveIndividual === 'n' && gdm && annotation) ?
                                                <div className="family-submit-results-choices">
                                                    <div className="submit-results-panel-info">
                                                        <p>You can add information about non-proband Individuals in this Family, including variant information by creating an Individual entry for them.</p>
                                                        <p className="submit-results-panel-info">
                                                            <strong>Note</strong>: Individual information includes associated variant(s), phenotypes, sex, etc.
                                                        </p>
                                                    </div>
                                                    <div className="submit-results-buttons">
                                                        <div className="col-lg-6">
                                                            <span className="family-submit-results-btn">
                                                                <a className="btn btn-default" href={'/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid}>Add non-proband Individual</a>
                                                            </span>
                                                        </div>
                                                        <div className="col-lg-6">
                                                            <span className="family-submit-results-btn">
                                                                <a className="btn btn-default" href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}>Return to Record Curation page <i className="icon icon-briefcase"></i></a>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            : null)}
                                        </Panel>
                                    : null}
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(FamilySubmit, 'curator_page', 'family-submit');
