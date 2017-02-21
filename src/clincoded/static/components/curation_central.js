'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('./globals');
var moment = require('moment');
var curator = require('./curator');
var modal = require('../libs/bootstrap/modal');
var form = require('../libs/bootstrap/form');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;
var CurationMixin = require('./curator').CurationMixin;
var CuratorHistory = require('./curator_history');
var parsePubmed = require('../libs/parse-pubmed').parsePubmed;
var add_external_resource = require('./add_external_resource');
var AddResourceId = add_external_resource.AddResourceId;

var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var PmidDoiButtons = curator.PmidDoiButtons;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var VariantHeader = curator.VariantHeader;
var PmidSummary = curator.PmidSummary;
var queryKeyValue = globals.queryKeyValue;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;


// Curator page content
var CurationCentral = React.createClass({
    mixins: [RestMixin, CurationMixin, CuratorHistory],

    getInitialState: function() {
        return {
            currPmid: queryKeyValue('pmid', this.props.href),
            currGdm: null
        };
    },

    // Called when currently selected PMID changes
    currPmidChange: function(pmid) {
        if (pmid !== undefined) {
            var gdm = this.state.currGdm;

            if (gdm) {
                // Find the annotation in the GDM matching the given pmid
                var currAnnotation = curator.pmidToAnnotation(gdm,pmid);

                if (currAnnotation) {
                    this.setState({currPmid: currAnnotation.article.pmid});
                }
            }
            if (this.state.currGdm) {
                window.history.replaceState(window.state, '', '/curation-central/?gdm=' + this.state.currGdm.uuid + '&pmid=' + pmid);
            }
        }
    },

    // Retrieve the GDM object from the DB with the given uuid
    getGdm: function(uuid, pmid) {
        return this.getRestData('/gdm/' + uuid, null, true).then(gdm => {
            // The GDM object successfully retrieved; set the Curator Central component
            this.setState({currGdm: gdm, currOmimId: gdm.omimId});
            // If a PMID isn't pre-selected from the URL and PMIDs exist, select the first one in the PMID list by default
            if (pmid == undefined && gdm.annotations && gdm.annotations.length > 0) {
                var annotations = _(gdm.annotations).sortBy(function(annotation) {
                    // Sort list of articles by first author
                    return annotation.article.authors[0].toLowerCase();
                });
                pmid = annotations[0].article.pmid;
            }
            this.currPmidChange(pmid);

            // Focus the current PMID selection in left PMID column
            var userPmidList = document.getElementById('user-pmid-list');
            var selectedPmid = document.getElementById('selected-pmid');
            userPmidList.scrollTop = 0;
            if (selectedPmid && userPmidList.scrollHeight > userPmidList.clientHeight) {
                userPmidList.scrollTop += selectedPmid.offsetTop - 50;
            }

            return gdm;
        }).catch(function(e) {
            console.log('GETGDM ERROR=: %o', e);
        });
    },

    // After the Curator Central page component mounts, grab the uuid from the query string and
    // retrieve the corresponding GDM from the DB.
    componentDidMount: function() {
        var gdmUuid = queryKeyValue('gdm', this.props.href);
        var pmid = queryKeyValue('pmid', this.props.href);
        if (gdmUuid) {
            this.getGdm(gdmUuid, pmid);
        }
    },

    // Add an article whose object is given to the current GDM
    updateGdmArticles: function(article) {
        var currGdm = this.state.currGdm;

        // Put together a new annotation object with the article reference
        var newAnnotationObj = {
            article: article.pmid,
            active: true
        };

        // Post new annotation to the DB. fetch returns a JS promise.
        this.postRestData('/evidence/', newAnnotationObj).then(data => {
            // Save the new annotation; fetch the currently displayed GDM as an object without its embedded
            // objects; basically the object as it exists in the DB. We'll update that and write it back to the DB.
            return (data['@graph'][0]);
        }).then(newAnnotation => {
            return this.getRestData('/gdm/' + currGdm.uuid, null, true).then(freshGdm => {
                var gdmObj = curator.flatten(freshGdm);
                // Add our new annotation reference to the array of annotations in the GDM.
                if (!gdmObj.annotations) {
                    gdmObj.annotations = [];
                }
                gdmObj.annotations.push(newAnnotation['@id']);

                return this.putRestData('/gdm/' + currGdm.uuid, gdmObj).then(data => {
                    return data['@graph'][0];
                });
            });
        }).then(gdm => {
            // Record history of adding a PMID to a GDM
            var meta = {
                article: {
                    gdm: gdm['@id']
                }
            };
            this.recordHistory('add', article, meta);

            // Retrieve the updated GDM and set it as the new state GDM to force a rerendering.
            return this.getGdm(gdm.uuid, article.pmid);
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    render: function() {
        var gdm = this.state.currGdm;
        var pmid = this.state.currPmid;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Find the GDM's annotation for the article with the curren PMID
        var annotation = gdm && gdm.annotations && gdm.annotations.length && _(gdm.annotations).find(function(annotation) {
            return pmid === annotation.article.pmid;
        });
        var currArticle = annotation ? annotation.article : null;

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} />
                <div className="container">
                    <VariantHeader gdm={gdm} pmid={this.state.currPmid} session={session} />
                    <div className="row curation-content">
                        <div className="col-md-3">
                            <PmidSelectionList annotations={gdm && gdm.annotations} currPmid={pmid} currPmidChange={this.currPmidChange} currGdm={gdm}
                                protocol={this.props.href_url.protocol} updateGdmArticles={this.updateGdmArticles} currGdm={gdm} />
                        </div>
                        <div className="col-md-6">
                            {currArticle ?
                                <div className="curr-pmid-overview">
                                    <PmidSummary article={currArticle} displayJournal />
                                    <PmidDoiButtons pmid={currArticle.pmid} />
                                    <BetaNote annotation={annotation} session={session} />
                                    {currArticle.abstract ?
                                        <div className="pmid-overview-abstract">
                                            <h4>Abstract</h4>
                                            <p>{currArticle.abstract}</p>
                                        </div>
                                    : null}
                                </div>
                            : null}
                        </div>
                        {currArticle ?
                            <div className="col-md-3">
                                <CurationPalette gdm={gdm} annotation={annotation} session={session} />
                            </div>
                        : null}
                    </div>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(CurationCentral, 'curator_page', 'curation-central');


var BetaNote = React.createClass({
    render: function() {
        var annotation = this.props.annotation;
        var session = this.props.session;
        var curatorMatch = annotation && userMatch(annotation.submitted_by, session);

        return (
            <div>
                {!curatorMatch ?
                    <div className="beta-note">
                        <p>Currently, only the curator who adds a paper to a Gene-Disease record can associate evidence with that paper.</p>
                        <p>PMID:{annotation.article.pmid} added by {annotation.submitted_by.title}.</p>
                    </div>
                : null}
            </div>
        );
    }
});

// Display the list of PubMed articles passed in pmidItems.
var PmidSelectionList = React.createClass({
    mixins: [ModalMixin],

    propTypes: {
        annotations: React.PropTypes.array, // List of PubMed items
        protocol: React.PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        currPmid: React.PropTypes.string, // PMID of currently selected article
        currPmidChange: React.PropTypes.func, // Function to call when currently selected article changes
        updateGdmArticles: React.PropTypes.func, // Function to call when we have an article to add to the GDM
        currGdm: React.PropTypes.object // Current GDM object
    },

    render: function() {
        var annotations = _(this.props.annotations).sortBy(function(annotation) {
            // Sort list of articles by first author
            return annotation.article.authors[0].toLowerCase();
        });

        return (
            <div className="pmid-selection-wrapper">
                <div className="pmid-selection-add">
                    <AddResourceId resourceType="pubmed" wrapperClass="inline-button-wrapper-fullwidth" buttonWrapperClass="inline-button-wrapper-fullwidth" buttonClass="btn btn-primary pmid-selection-add-btn"
                        protocol={this.props.protocol} parentObj={this.props.currGdm} buttonText="Add New PMID" modalButtonText="Add Article" updateParentForm={this.props.updateGdmArticles} buttonOnly={true} />
                </div>
                {annotations ?
                    <div className="pmid-selection-list" id="user-pmid-list">
                        {annotations.map(annotation => {
                            var classList = 'pmid-selection-list-item' + (annotation.article.pmid === this.props.currPmid ? ' curr-pmid' : '');
                            var elementId = (annotation.article.pmid === this.props.currPmid ? 'selected-pmid' : '');

                            return (
                                <div key={annotation.article.pmid} className={classList} id={elementId} onClick={this.props.currPmidChange.bind(null, annotation.article.pmid)}>
                                    <div className="pmid-selection-list-specs">
                                        <PmidSummary article={annotation.article} />
                                    </div>
                                    <div className="pmid-selection-list-pmid"><a href={external_url_map['PubMed'] + annotation.article.pmid} target="_blank">PMID: {annotation.article.pmid}</a></div>
                                </div>
                            );
                        })}
                    </div>
                : null}
                {annotations.length === 0 ?
                    <div className="pmid-selection-help">
                        <i>Add papers to this Gene-Disease Record using the <strong>Add New PMID(s)</strong> button; click on any added paper to view its abstract and begin curating evidence from that paper.</i>
                    </div>
                :null }
            </div>
        );
    }
});

// Display a history item for adding a PMID to a GDM
var PmidGdmAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var article = history.primary;
        var gdm = history.meta.article.gdm;

        return (
            <div>
                <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a>
                <span> added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(PmidGdmAddHistory, 'Article', 'add');


// Display a history item for deleting a PMID from a GDM
var PmidGdmDeleteHistory = React.createClass({
    render: function() {
        return <div>PMIDGDMDELETE</div>;
    }
});

globals.history_views.register(PmidGdmDeleteHistory, 'Article', 'delete');
