'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { curator_page, history_views, userMatch, queryKeyValue, external_url_map } from './globals';
import { RestMixin } from './rest';
import { FormMixin } from '../libs/bootstrap/form';
import { parseAndLogError } from './mixins';
import { parsePubmed } from '../libs/parse-pubmed';
import { sortListByDate } from '../libs/helpers/sort';
import { AddResourceId } from './add_external_resource';
import PubMedNotesBox from './pubmed_notes_box';
import * as CuratorHistory from './curator_history';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const PmidDoiButtons = curator.PmidDoiButtons;
const RecordHeader = curator.RecordHeader;
const CurationPalette = curator.CurationPalette;
const VariantHeader = curator.VariantHeader;
const PmidSummary = curator.PmidSummary;

// Curator page content
var CurationCentral = createReactClass({
    mixins: [RestMixin, CurationMixin, CuratorHistory, FormMixin],

    propTypes: {
        href_url: PropTypes.object,
        session: PropTypes.object,
        affiliation: PropTypes.object,
        href: PropTypes.string,
        context: PropTypes.object
    },

    getInitialState: function() {
        return {
            currPmid: queryKeyValue('pmid', this.props.href),
            currPmidNotes: {
                nonscorable: {
                    checked: false,
                    text: '',
                },
                other: {
                    checked: false,
                    text: '',
                },
            },
            currGdm: null,
            updateMsg: null,
            submitBusy: false,
            isEditingNotes: false,
            classificationSnapshots: []
        };
    },

    /**
     * Method to get a list of snapshots of a classification, either provisioned or approved,
     * given the matching UUID of the classificaiton object.
     * Called only once in the componentDidMount() lifecycle method via the loadData() method.
     * @param {string} provisionalUuid - UUID of the saved classification object in a snapshot
     */
    getClassificationSnaphots(provisionalUuid) {
        this.getRestData('/search/?type=snapshot&resourceId=' + provisionalUuid).then(result => {
            this.setState({classificationSnapshots: result['@graph']});
        }).catch(err => {
            console.log('Classification Snapshots Fetch Error=: %o', err);
        });
    },

    // Called when currently selected PMID changes
    currPmidChange: function(pmid) {
        if (pmid !== undefined) {
            if (this.state.currPmid !== pmid) {
                this.setState({ updateMsg: null });
            }
            const gdm = this.state.currGdm;
            if (gdm) {
                // Find the annotation in the GDM matching the given pmid
                const currAnnotation = curator.pmidToAnnotation(gdm, pmid);
                if (currAnnotation) {
                    let currPmidNotes = {
                        nonscorable: {
                            checked: false,
                            text: '',
                        },
                        other: {
                            checked: false,
                            text: '',
                        },
                    };
                    if (currAnnotation.articleNotes) {
                        this.setEditMode(false);
                        currPmidNotes = currAnnotation.articleNotes;
                    } else {
                        this.setEditMode(true);
                    }
                    this.setState({ currPmidNotes, currPmid: currAnnotation.article.pmid });
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
            this.setState({currGdm: gdm, currOmimId: gdm.omimId}, () => {
                // Search for classification owned by affiliation or login user
                // And all saved snapshots of this classification
                if (gdm.provisionalClassifications && gdm.provisionalClassifications.length > 0) {
                    for (let provisionalClassification of gdm.provisionalClassifications) {
                        let curatorAffiliation = this.props.affiliation;
                        let affiliation = provisionalClassification.affiliation ? provisionalClassification.affiliation : null;
                        let creator = provisionalClassification.submitted_by;
                        if ((affiliation && curatorAffiliation && affiliation === curatorAffiliation.affiliation_id) || (!affiliation && !curatorAffiliation && creator.uuid === this.props.session.user_properties.uuid)) {
                            this.getClassificationSnaphots(provisionalClassification.uuid);
                        }
                    }
                }
            });
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

        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            if (!newAnnotationObj.affiliation) {
                newAnnotationObj.affiliation = this.props.affiliation.affiliation_id;
            }
        }

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

    handleDeletePmid: function(e, currAnnotation) {
        e.preventDefault(); e.stopPropagation();
        const { currGdm } = this.state;
        const annotationToDelete = curator.flatten(currAnnotation);
        annotationToDelete.status = 'deleted';
        this.putRestData('/evidence/' + currAnnotation.uuid, annotationToDelete);
        this.getRestData('/gdm/' + currGdm.uuid, null, true).then(freshGdm => {
            const gdmObj = curator.flatten(freshGdm);
            if (gdmObj.annotations) {
                const newAnnotations = gdmObj.annotations.filter(annotation => annotation !== currAnnotation['@id']);
                gdmObj.annotations = newAnnotations;
            }
            return this.putRestData('/gdm/' + currGdm.uuid, gdmObj).then(data => {
                return data['@graph'][0];
            }).then(updatedGdm => {
                const meta = {
                    article:{
                        gdm: updatedGdm['@id']
                    }
                };
                this.recordHistory('delete', currAnnotation.article, meta);
                const pmid = _.property(['annotations', 0, 'article', 'pmid'])(updatedGdm);
                return this.getGdm(updatedGdm.uuid, pmid);
            }).catch(err => {
                console.log(JSON.parse(JSON.stringify(err)));
            });
        }).catch(err => {
            console.log('Fetch gdm error', err);
        });
    },

    // Submit handler for the PubMed notes form. Saves article notes and refetches gdm
    handleSaveNotes: function(e, annotation) {
        e.preventDefault(); e.stopPropagation();
        this.setState({ submitBusy: true, updateMsg: null });
        const { currGdm, currPmidNotes } = this.state;
        let newAnnotationObj = curator.flatten(annotation);
        newAnnotationObj.articleNotes = currPmidNotes;

        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            if (!newAnnotationObj.affiliation) {
                newAnnotationObj.affiliation = this.props.affiliation.affiliation_id;
            }
        }

        this.putRestData('/evidence/' + annotation.uuid, newAnnotationObj).then(() => {
            return this.getRestData('/gdm/' + currGdm.uuid, null, true).then(freshGdm => {
                const gdmObj = curator.flatten(freshGdm);
                return this.putRestData('/gdm/' + currGdm.uuid, gdmObj).then(data => {
                    return data['@graph'][0];
                });
            });
        }).then(gdm => {
            const meta = {
                annotation: {
                    gdm: gdm['@id'],
                    article: annotation.article['@id'],
                }
            };
            this.recordHistory('modify', annotation, meta);
            this.setState({ submitBusy: false, updateMsg: <span className="text-success">Notes saved successfully!</span> });
            return this.getGdm(currGdm.uuid, annotation.article.pmid);
        }).catch(err => {
            this.setState({ submitBusy: false, updateMsg: <span className="text-danger">Notes could not be saved successfully!</span> });
            parseAndLogError.bind(undefined, 'putRequest');
        });
    },

    /**
     * Toggles the checkboxes based on checkboxName. Makes a deep copy of @currPmidNotes to avoid state mutation.
     * 
     * @param {object} e 
     * @param {string} checkboxName 
     */
    handleCheckboxChange: function(e, checkboxName) {
        const currPmidNotes = JSON.parse(JSON.stringify(this.state.currPmidNotes));
        if (checkboxName === 'nonscorableCheckbox') {
            currPmidNotes.nonscorable.checked = !currPmidNotes.nonscorable.checked;
        } else if (checkboxName === 'otherCheckbox') {
            currPmidNotes.other.checked = !currPmidNotes.other.checked;
        }
        this.setState({ currPmidNotes });
    },

    /**
     * Changes textarea text based on textAreaName. Makes deep copy of @currPmidNotes to avoid state mutation.
     * 
     * @param {object} e 
     * @param {string} textAreaName 
     */
    handleTextChange: function(e, textAreaName) {
        const currPmidNotes = JSON.parse(JSON.stringify(this.state.currPmidNotes));
        if (textAreaName === 'nonscorableText') {
            currPmidNotes.nonscorable.text = e.target.value;
        } else if (textAreaName === 'otherText') {
            currPmidNotes.other.text = e.target.value;
        }
        this.setState({ currPmidNotes });
    },

    // Change edit mode for notes and resets @updateMsg
    setEditMode: function(isEditingNotes) {
        let updateMsg = this.state.updateMsg;
        if (isEditingNotes) {
            updateMsg = null;
        }
        this.setState({ updateMsg, isEditingNotes });
    },

    render: function() {
        const {
            submitBusy,
            updateMsg,
            isEditingNotes,
            currPmidNotes,
        } = this.state;
        var gdm = this.state.currGdm;
        var pmid = this.state.currPmid;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Find the GDM's annotation for the article with the curren PMID
        var annotation = gdm && gdm.annotations && gdm.annotations.length && _(gdm.annotations).find(function(annotation) {
            return pmid === annotation.article.pmid;
        });
        var currArticle = annotation ? annotation.article : null;

        let affiliation = this.props.affiliation;
        let sortedSnapshotList = this.state.classificationSnapshots.length ? sortListByDate(this.state.classificationSnapshots, 'date_created') : [];

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} affiliation={affiliation}
                    context={this.props.context} classificationSnapshots={sortedSnapshotList} />
                <div className="container">
                    <VariantHeader gdm={gdm} pmid={this.state.currPmid} session={session} affiliation={affiliation} />
                    <div className="row curation-content">
                        <div className="col-md-3">
                            <PmidSelectionList annotations={gdm && gdm.annotations} currPmid={pmid} currPmidChange={this.currPmidChange}
                                protocol={this.props.href_url.protocol} updateGdmArticles={this.updateGdmArticles} currGdm={gdm} />
                        </div>
                        <div className="col-md-6">
                            {currArticle ?
                                <div className="curr-pmid-overview">
                                    <PmidSummary article={currArticle} displayJournal />
                                    <div className="pmid-button-group">
                                        <PmidDoiButtons pmid={currArticle.pmid} />
                                        {
                                            _.isEmpty(annotation.groups) && _.isEmpty(annotation.families) && _.isEmpty(annotation.individuals) && _.isEmpty(annotation.experimentalData) &&
                                            _.isEmpty(annotation.caseControlStudies) && _.isEmpty(annotation.articleNotes) &&
                                                <a className="btn btn-danger delete-button" onClick={(e) => this.handleDeletePmid(e, annotation)}>
                                                    <span>Delete PMID<i className="icon icon-trash-o"></i></span>
                                                </a>
                                        }
                                    </div>
                                    <BetaNote annotation={annotation} session={session} />
                                    <PubMedNotesBox
                                        updateMsg={updateMsg}
                                        submitBusy={submitBusy}
                                        isEditingNotes={isEditingNotes}
                                        annotation={annotation}
                                        currPmidNotes={currPmidNotes}
                                        setEditMode={this.setEditMode}
                                        handleSaveNotes={this.handleSaveNotes}
                                        handleTextChange={this.handleTextChange}
                                        handleCheckboxChange={this.handleCheckboxChange}
                                    />
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
                                <CurationPalette gdm={gdm} annotation={annotation} session={session} affiliation={affiliation} />
                            </div>
                            : null}
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(CurationCentral, 'curator_page', 'curation-central');


class BetaNote extends Component {
    render() {
        var annotation = this.props.annotation;
        var session = this.props.session;
        var curatorMatch = annotation && userMatch(annotation.submitted_by, session);

        return (
            <div>
                {!curatorMatch ?
                    <div className="beta-note">
                        <p>PMID:{annotation.article.pmid} added by {annotation.submitted_by.title}.</p>
                    </div>
                    : null}
            </div>
        );
    }
}

// Display the list of PubMed articles passed in pmidItems.
var PmidSelectionList = createReactClass({
    propTypes: {
        annotations: PropTypes.array, // List of PubMed items
        protocol: PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        currPmid: PropTypes.string, // PMID of currently selected article
        currPmidChange: PropTypes.func, // Function to call when currently selected article changes
        updateGdmArticles: PropTypes.func, // Function to call when we have an article to add to the GDM
        currGdm: PropTypes.object // Current GDM object
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
class PmidGdmAddHistory extends Component {
    render() {
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
}

history_views.register(PmidGdmAddHistory, 'article', 'add');

// Display a history item for deleting a PMID from a GDM
// class PmidGdmDeleteHistory extends Component {
//     render() {
//         return <div>PMIDGDMDELETE</div>;
//     }
// }
const PmidGdmDeleteHistory = ({ history }) => {
    const article = history.primary;
    const gdm = history.meta.article.gdm;

    return (
        <div>
            <span>PMID:{article.pmid}</span>
            <span> deleted from </span>
            <a href={'/curation-central/?gdm=' + gdm.uuid}><strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong></a>
            <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
            <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
        </div>
    );
};

history_views.register(PmidGdmDeleteHistory, 'article', 'delete');

const AnnotationModifyHistory = ({ history }) => {
    const annotation = history.primary;
    const { gdm, article } = history.meta.annotation;
    
    return (
        <div>
            Annotation in <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
            <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
            <span> modified</span>
            <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a></span>
            <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
        </div>
    );
};

history_views.register(AnnotationModifyHistory, 'annotation', 'modify');
