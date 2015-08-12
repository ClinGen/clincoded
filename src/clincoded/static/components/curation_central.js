'use strict';
var React = require('react');
var _ = require('underscore');
var url = require('url');
var moment = require('moment');
var globals = require('./globals');
var curator = require('./curator');
var modal = require('../libs/bootstrap/modal');
var form = require('../libs/bootstrap/form');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;
var CurationMixin = require('./curator').CurationMixin;
var parsePubmed = require('../libs/parse-pubmed').parsePubmed;

var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var PmidDoiButtons = curator.PmidDoiButtons;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var PmidSummary = curator.PmidSummary;
var queryKeyValue = globals.queryKeyValue;
var external_url_map = globals.external_url_map;


// Curator page content
var CurationCentral = React.createClass({
    mixins: [RestMixin, CurationMixin, ModalMixin],

    getInitialState: function() {
        return {
            currPmid: queryKeyValue('pmid', this.props.href),
            currGdm: {}
        };
    },

    // Called when currently selected PMID changes
    currPmidChange: function(pmid) {
        if (pmid !== undefined) {
            // pass currPmidChange(0) if you want to clear the PMID selection
            if (pmid === 0) {
                window.location.replace('/curation-central/?gdm=' + this.state.currGdm.uuid);
            }

            // otherwise, replaceState to the specified pmid
            var gdm = this.state.currGdm;
            if (Object.keys(gdm).length) {
                // Find the annotation in the GDM matching the given pmid
                var currAnnotation = _(gdm.annotations).find(annotation => {
                    return annotation.article.pmid === pmid;
                });
                if (currAnnotation) this.setState({currPmid: currAnnotation.article.pmid});
            }
            if (this.state.currGdm && Object.keys(this.state.currGdm).length) {
                window.history.replaceState(window.state, '', '/curation-central/?gdm=' + this.state.currGdm.uuid + '&pmid=' + pmid);
            }
        }
    },

    // Retrieve the GDM object from the DB with the given uuid
    getGdm: function(uuid, pmid) {
        this.getRestData('/gdm/' + uuid).then(gdm => {
            // The GDM object successfully retrieved; set the Curator Central component
            this.setState({currGdm: gdm, currOmimId: gdm.omimId});
            this.currPmidChange(pmid);
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
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
        var newAnnotation;
        var currGdm = this.state.currGdm;

        // Put together a new annotation object with the article reference
        var newAnnotationObj = {
            owner: this.props.session['auth.userid'],
            article: article.pmid,
            dateTime: new Date().toISOString(),
            active: true
        };

        // Post new annotation to the DB. fetch returns a JS promise.
        this.postRestData('/evidence/', newAnnotationObj).then(data => {
            // Save the new annotation; fetch the currently displayed GDM as an object without its embedded
            // objects; basically the object as it exists in the DB. We'll update that and write it back to the DB.
            newAnnotation = data['@graph'][0];
            return this.getRestData('/gdm/' + this.state.currGdm.uuid + '/?frame=object');
        }).then(gdmObj => {
            // We'll get 422 (Unprocessible entity) if we PUT any of these fields:
            delete gdmObj.uuid;
            delete gdmObj['@id'];
            delete gdmObj['@type'];
            delete gdmObj.status;

            // Add our new annotation reference to the array of annotations in the GDM.
            gdmObj.annotations.push('/evidence/' + newAnnotation.uuid + '/');
            return this.putRestData('/gdm/' + this.state.currGdm.uuid, gdmObj);
        }).then(data => {
            // Retrieve the updated GDM and set it as the new state GDM to force a rerendering.
            this.getGdm(data['@graph'][0].uuid, article.pmid);
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    render: function() {
        var gdm = this.state.currGdm;
        var pmid = this.state.currPmid;

        // Find the GDM's annotation for the article with the curren PMID
        var annotation = gdm.annotations && gdm.annotations.length && _(gdm.annotations).find(function(annotation) {
            return pmid === annotation.article.pmid;
        });
        var currArticle = annotation ? annotation.article : null;

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                <div className="container">
                    <div className="row curation-content">
                        <div className="col-md-3">
                            <PmidSelectionList annotations={gdm.annotations} currPmid={pmid} currPmidChange={this.currPmidChange}
                                    protocol={this.props.href_url.protocol} updateGdmArticles={this.updateGdmArticles} />
                        </div>
                        <div className="col-md-6">
                            {currArticle ?
                                <div className="curr-pmid-overview">
                                    <PmidSummary article={currArticle} displayJournal />
                                    <PmidDoiButtons pmid={currArticle.pmid} />
                                    <BetaNote annotation={annotation} session={this.props.session} />
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
                                <CurationPalette gdm={gdm} annotation={annotation} session={this.props.session} />
                                <Modal title='Reassign PubMed aritcle to another Mode of Inheritance'>
                                    <button className="btn btn-primary pmid-selection-add-btn" modal={<ReassignPmid protocol={this.props.protocol}
                                            currPmidChange={this.currPmidChange} closeModal={this.closeModal} gdm={gdm} article={currArticle} />}>Reassign PMID</button>
                                </Modal>
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
        var curatorMatch = annotation.owner === (session && session.user_properties && session.user_properties.email);

        return (
            <div>
                {!curatorMatch ?
                    <div className="beta-note">
                        <p>Currently, only the curator who adds a paper to a Gene-Disease record can associate evidence with that paper.</p>
                        <p>PMID:{annotation.article.pmid} added by {annotation.owner}.</p>
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
        updateGdmArticles: React.PropTypes.func // Function to call when we have an article to add to the GDM
    },

    render: function() {
        var annotations = _(this.props.annotations).sortBy(function(annotation) {
            // Sort list of articles by first author
            return annotation.article.authors[0];
        });

        return (
            <div className="pmid-selection-wrapper">
                <div className="pmid-selection-add">
                    <Modal title='Add new PubMed Article'>
                        <button className="btn btn-primary pmid-selection-add-btn" modal={<AddPmidModal protocol={this.props.protocol} closeModal={this.closeModal} updateGdmArticles={this.props.updateGdmArticles} />}>
                            Add New PMID(s)
                        </button>
                    </Modal>
                </div>
                {annotations ?
                    <div className="pmid-selection-list">
                        {annotations.map(annotation => {
                            var classList = 'pmid-selection-list-item' + (annotation.article.pmid === this.props.currPmid ? ' curr-pmid' : '');

                            return (
                                <div key={annotation.article.pmid} className={classList} onClick={this.props.currPmidChange.bind(null, annotation.article.pmid)}>
                                    <div className="pmid-selection-list-specs">
                                        <PmidSummary article={annotation.article} />
                                    </div>
                                    <div className="pmid-selection-list-pmid"><a href={external_url_map['PubMed'] + annotation.article.pmid} target="_blank">PMID: {annotation.article.pmid}</a></div>
                                </div>
                            );
                        })}
                    </div>
                : null}
                {annotations.length == 0 ?
                    <div className="pmid-selection-help">
                        <i>Add papers to this Gene-Disease Record using the <strong>Add New PMID(s)</strong> button; click on any added paper to view its abstract and begin curating evidence from that paper.</i>
                    </div>
                :null }
            </div>
        );
    }
});


// The content of the Add PMID(s) modal dialog box
var AddPmidModal = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        closeModal: React.PropTypes.func, // Function to call to close the modal
        protocol: React.PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        updateGdmArticles: React.PropTypes.func // Function to call when we have an article to add to the GDM
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        // Valid if the field has only 10 or fewer digits
        if (valid) {
            valid = this.getFormValue('pmid').match(/^[0-9]{1,10}$/i);
            if (!valid) {
                this.setFormErrors('pmid', 'Only numbers allowed');
            }
        }
        return valid;
    },

    // Called when the modal form’s submit button is clicked. Handles validation and triggering
    // the process to add an article.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.saveFormValue('pmid', this.refs.pmid.getValue());
        if (this.validateForm()) {
            // Form is valid -- we have a good PMID. Fetch the article with that PMID
            var enteredPmid = this.getFormValue('pmid');
            this.getRestData('/articles/' + enteredPmid).then(article => {
                // Close the modal; update the GDM with this article.
                return Promise.resolve(article);
            }, e => {
                var url = this.props.protocol + external_url_map['PubMedSearch'];
                // PubMed article not in our DB; go out to PubMed itself to retrieve it as XML
                return this.getRestDataXml(external_url_map['PubMedSearch'] + enteredPmid).then(xml => {
                    var newArticle = parsePubmed(xml, enteredPmid);
                    newArticle.dateTime = moment().format();
                    return this.postRestData('/articles/', newArticle).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                });
            }).then(article => {
                this.props.closeModal();
                this.props.updateGdmArticles(article);
            }).catch(function(e) {
                console.log('ERROR %o', e);
            });
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.props.closeModal();
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-std">
                <div className="modal-body">
                    <Input type="text" ref="pmid" label="Enter a PubMed ID"
                        error={this.getFormError('pmid')} clearError={this.clrFormErrors.bind(null, 'pmid')}
                        labelClassName="control-label" groupClassName="form-group" required />
                </div>
                <div className='modal-footer'>
                    <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                    <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="Add Article" />
                </div>
            </Form>
        );
    }
});

// The content of the Add PMID(s) modal dialog box
var ReassignPmid = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        closeModal: React.PropTypes.func, // Function to call to close the modal
        protocol: React.PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        currPmidChange: React.PropTypes.func // Function to call when currently selected article changes
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            currGdmUuid: '',
            evidenceUuid: '',
            otherGdms: [],
            selectedGdmUuid: ''
        };
    },

    onGdmSelectChange: function(e) {
        this.setState({ selectedGdmUuid: e.target.value });
    },

    getData: function() {
        // run through current GDM's annotations and find uuid of selected evidence;
        // also set uuid of current GDM
        for (var i = 0; i < this.props.gdm.annotations.length; i++) {
            var tempAnnotation = this.props.gdm.annotations[i];
            if (tempAnnotation.article.uuid == this.props.article.uuid) {
                this.setState({
                    currGdmUuid: this.props.gdm.uuid,
                    evidenceUuid: tempAnnotation.uuid
                });
            }
        }
        // find other GDMs with same Gene and Disease...
        this.getRestData('/search/?type=gdm&gene.uuid=' + this.props.gdm.gene.uuid + '&disease.uuid=' + this.props.gdm.disease.uuid).then(data => {
            var tempOtherGdms = [];
            for (var i = 0; i < data['@graph'].length; i++) {
                var tempGdm = data['@graph'][i];
                // ... but different Mode of Inheritance
                if (tempGdm.uuid != this.props.gdm.uuid) {
                    tempOtherGdms.push({
                        uuid: tempGdm.uuid,
                        gdm: tempGdm.gene.symbol + "–" + tempGdm.disease.term + "–" + tempGdm.modeInheritance
                    });
                }
            }
            this.setState({otherGdms: tempOtherGdms});
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    componentDidMount: function() {
        this.getData();
    },

    // Called when the modal form’s submit button is clicked. Handles validation and triggering
    // the process to add an article.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        var newGdmUuid = e.target.elements.newGdm.value;
        // grab complete data for both involved GDMs; regrabbing currGdm data as it might have changed
        // since initial page load
        this.getRestDatas(['/gdm/' + this.state.currGdmUuid + '/?frame=object', '/gdm/' + newGdmUuid + '/?frame=object'],
                [function() {}, function() {}]).then(data => {
            var currGdm = data[0];
            var newGdm = data[1];
            var currGdmAnnotIndex;
            var failState = true;
            console.log(this.state.evidenceUuid);
            // find index of annotation we want from new currGdm object
            for (var i = 0; i < currGdm.annotations.length; i++) {
                console.log(currGdm.annotations[i]);
                if (currGdm.annotations[i] == '/evidence/' + this.state.evidenceUuid + '/') {
                    currGdmAnnotIndex = i;
                    failState = false;
                }
            }
            // make sure that this annotation doesn't already exist in the newGdm object
            for (var i = 0; i < newGdm.annotations.length; i++) {
                if (newGdm.annotations[i] == '/evidence/' + this.state.evidenceUuid + '/') failState = true;
            }
            if (failState == false) {
                newGdm.annotations.push(currGdm.annotations[currGdmAnnotIndex]);
                currGdm.annotations.splice(currGdmAnnotIndex, 1);
                // We'll get 422 (Unprocessible entity) if we PUT any of these fields:
                delete currGdm.uuid;
                delete currGdm.status;
                delete currGdm['@id'];
                delete currGdm['@type'];
                delete newGdm.uuid;
                delete newGdm.status;
                delete newGdm['@id'];
                delete newGdm['@type'];
                // PUT the new current GDM and the new receiving GDM
                this.putRestData('/gdm/' + newGdmUuid, newGdm);
                this.putRestData('/gdm/' + this.state.currGdmUuid, currGdm);
                this.props.closeModal();
                // refresh page
                this.props.currPmidChange(0);
            }
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.props.closeModal();
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-std">
                <div className="modal-body">
                    Reassign this article to which related GDM?
                    {this.state.otherGdms.length > 0 ?
                    <div className="radio">
                        {this.state.otherGdms.map(function(item) {
                            return <label key={item.uuid}><input type="radio" name="newGdm" id={item.uuid} value={item.uuid}
                                checked={this.state.selectedGdmUuid === item.uuid} onChange={this.onGdmSelectChange} />{item.gdm}</label>;
                        }, this)}
                    </div>
                    : <ul><li>No related GDMs found</li></ul>}
                    If there are no related GDMs, or if the GDM you are looking for is not listed, please create the GDM <a href="/create-gene-disease/">here</a>.
                </div>
                <div className='modal-footer'>
                    <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                    {this.state.selectedGdmUuid !== '' ?
                        <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="Reassign Article" />
                        : <a href="#" className="btn btn-primary btn-inline-spacer disabled" role="button">Reassign Article</a>
                    }
                </div>
            </Form>
        );
    }
});
