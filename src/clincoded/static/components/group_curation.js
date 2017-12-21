'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, content_views, history_views, queryKeyValue, external_url_map, country_codes } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';
import { parsePubmed } from '../libs/parse-pubmed';
import * as CuratorHistory from './curator_history';
import * as methods from './methods';
import ModalComponent from '../libs/bootstrap/modal';
import { GroupDisease } from './disease';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const PmidDoiButtons = curator.PmidDoiButtons;
const DeleteButton = curator.DeleteButton;

var GroupCuration = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            group: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            groupName: '', // Currently entered name of the group
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            submitBusy: false, // True while form is submitting
            diseaseObj: {},
            diseaseUuid: null,
            diseaseError: null,
            diseaseRequired: false
        };
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({genotyping2Disabled: false});
        } else if (ref === 'groupname') {
            this.setState({groupName: this.refs[ref].getValue()});
        } else if (ref === 'hpoid' || ref === 'phenoterms') {
            this.setState({diseaseError: null, diseaseRequired: false}, () => {
                this.clrFormErrors('diseaseError');
            });
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

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            if (stateObj.group) {
                stateObj.genotyping2Disabled = !(stateObj.group.method && stateObj.group.method.genotypingMethods && stateObj.group.method.genotypingMethods.length);
                this.setState({groupName: stateObj.group.label});
                if (stateObj.group['commonDiagnosis'] && stateObj.group['commonDiagnosis'].length > 0) {
                    this.setState({diseaseObj: stateObj.group['commonDiagnosis'][0]});
                }
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

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var groupDiseases = [], groupGenes, groupArticles;
            var savedGroup;
            var formError = false;

            // Parse comma-separated list fields
            var geneSymbols = curator.capture.genes(this.getFormValue('othergenevariants'));
            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var hpotext = curator.capture.hpoids(this.getFormValue('phenoterms'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));

            var valid_phoId = false;
            // Check HPO ID format
            if (hpoids && hpoids.length && _(hpoids).any(function(id) { return id === null; })) {
                // HPOID list is bad
                formError = true;
                this.setFormErrors('hpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }
            else if (hpoids && hpoids.length && !_(hpoids).any(function(id) { return id === null; })) {
                valid_phoId = true;
            }

            let valid_disease = false;
            if (!this.state.diseaseObj || (this.state.diseaseObj && !this.state.diseaseObj['term'])) {
                valid_disease = false;
            } else {
                valid_disease = true;
            }

            // Check HPO ID and HPO text
            if (!formError && !valid_disease && !valid_phoId && (!hpotext || !hpotext.length)) {
                // Can not empty at all of them
                formError = true;
                this.setState({diseaseError: 'Required', diseaseRequired: true}, () => {
                    this.setFormErrors('diseaseError', 'Enter disease term and/or HPO Id(s) and/or Phenotype free text.');
                });
                this.setFormErrors('hpoid', 'Enter disease term and/or HPO Id(s) and/or Phenotype free text.');
                this.setFormErrors('phenoterms', 'Enter disease term and/or HPO Id(s) and/or Phenotype free text.');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (geneSymbols && geneSymbols.length && _(geneSymbols).any(function(id) { return id === null; })) {
                // Gene symbol list is bad
                formError = true;
                this.setFormErrors('othergenevariants', 'Use gene symbols (e.g. SMAD3) separated by commas');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (pmids && pmids.length && _(pmids).any(function(id) { return id === null; })) {
                // PMID list is bad
                formError = true;
                this.setFormErrors('otherpmids', 'Use PubMed IDs (e.g. 12345678) separated by commas');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (nothpoids && nothpoids.length && _(nothpoids).any(function(id) { return id === null; })) {
                // NOT HPOID list is bad
                formError = true;
                this.setFormErrors('nothpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            if (!formError) {
                let searchStr;
                this.setState({submitBusy: true});
                /**
                 * Retrieve disease from database. If not existed, add it to the database.
                 */
                let diseaseObj = this.state.diseaseObj;
                this.getRestData('/search?type=disease&diseaseId=' + diseaseObj.diseaseId).then(diseaseSearch => {
                    if (valid_disease) {
                        let diseaseUuid;
                        if (diseaseSearch.total === 0) {
                            return this.postRestData('/diseases/', diseaseObj).then(result => {
                                let newDisease = result['@graph'][0];
                                diseaseUuid = newDisease['uuid'];
                                this.setState({diseaseUuid: diseaseUuid}, () => {
                                    groupDiseases.push(diseaseUuid);
                                    return Promise.resolve(result);
                                });
                            });
                        } else {
                            let _id = diseaseSearch['@graph'][0]['@id'];
                            diseaseUuid = _id.slice(10, -1);
                            this.setState({diseaseUuid: diseaseUuid}, () => {
                                groupDiseases.push(diseaseUuid);
                            });
                        }
                    }
                    else {
                        // when no disease given.
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given disease couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setState({diseaseError: 'Error on validating disease.'});
                    throw e;
                }).then(diseases => {
                    if (geneSymbols && geneSymbols.length) {
                        // At least one gene symbol entered; search the DB for them.
                        searchStr = '/search/?type=gene&' + geneSymbols.map(function(symbol) { return 'symbol=' + symbol; }).join('&');
                        return this.getRestData(searchStr).then(genes => {
                            if (genes['@graph'].length === geneSymbols.length) {
                                // Successfully retrieved all genes
                                groupGenes = genes;
                                return Promise.resolve(genes);
                            } else {
                                this.setState({submitBusy: false}); // submit error; re-enable submit button
                                var missingGenes = _.difference(geneSymbols, genes['@graph'].map(function(gene) { return gene.symbol; }));
                                this.setFormErrors('othergenevariants', missingGenes.join(', ') + ' not found');
                                throw genes;
                            }
                        });
                    } else {
                        // No genes entered; just pass null to the next then
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids && pmids.length) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all PMIDs, so just set groupArticles and return
                                groupArticles = articles;
                                return Promise.resolve(articles);
                            } else {
                                // some PMIDs were not in our db already
                                // generate list of PMIDs and pubmed URLs for those PMIDs
                                var missingPmids = _.difference(pmids, articles['@graph'].map(function(article) { return article.pmid; }));
                                var missingPmidsUrls = [];
                                for (var missingPmidsIndex = 0; missingPmidsIndex < missingPmids.length; missingPmidsIndex++) {
                                    missingPmidsUrls.push(external_url_map['PubMedSearch']  + missingPmids[missingPmidsIndex]);
                                }
                                // get the XML for the missing PMIDs
                                return this.getRestDatasXml(missingPmidsUrls).then(xml => {
                                    var newArticles = [];
                                    var invalidPmids = [];
                                    var tempArticle;
                                    // loop through the resulting XMLs and parsePubmed them
                                    for (var xmlIndex = 0; xmlIndex < xml.length; xmlIndex++) {
                                        tempArticle = parsePubmed(xml[xmlIndex]);
                                        // check to see if Pubmed actually had an entry for the PMID
                                        if ('pmid' in tempArticle) {
                                            newArticles.push(tempArticle);
                                        } else {
                                            // PMID was not found at Pubmed
                                            invalidPmids.push(missingPmids[xmlIndex]);
                                        }
                                    }
                                    // if there were invalid PMIDs, throw an error with a list of them
                                    if (invalidPmids.length > 0) {
                                        this.setState({submitBusy: false}); // submit error; re-enable submit button
                                        this.setFormErrors('otherpmids', 'PMID(s) ' + invalidPmids.join(', ') + ' not found');
                                        throw invalidPmids;
                                    }
                                    // otherwise, post the valid PMIDs
                                    if (newArticles.length > 0) {
                                        return this.postRestDatas('/articles', newArticles).then(data => {
                                            for (var dataIndex = 0; dataIndex < data.length; dataIndex++) {
                                                articles['@graph'].push(data[dataIndex]['@graph'][0]);
                                            }
                                            groupArticles = articles;
                                            return Promise.resolve(data);
                                        });
                                    }
                                    return Promise(articles);
                                });
                            }
                        });
                    } else {
                        // No PMIDs entered; just pass null to the next then
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Now make the new group. If we're editing the form, first copy the old group
                    // to make sure we have everything not from the form.
                    var newGroup = this.state.group ? curator.flatten(this.state.group) : {};
                    newGroup.label = this.getFormValue('groupname');

                    /**
                     * Set the disease UUID as the value for the Group's disease
                     */
                    if (groupDiseases && groupDiseases.length) {
                        newGroup.commonDiagnosis = groupDiseases.map(disease => { return disease; });
                    }
                    else {
                        delete newGroup.commonDiagnosis;
                    }

                    // If a method object was created (at least one method field set), get its new object's
                    var newMethod = methods.create.call(this);
                    if (newMethod) {
                        newGroup.method = newMethod;
                    }

                    // Fill in the group fields from the Common Diseases & Phenotypes panel
                    if (hpoids && hpoids.length) {
                        newGroup.hpoIdInDiagnosis = hpoids;
                    }
                    else if (newGroup.hpoIdInDiagnosis) {
                        delete newGroup.hpoIdInDiagnosis;
                    }
                    var phenoterms = this.getFormValue('phenoterms');
                    if (phenoterms) {
                        newGroup.termsInDiagnosis = phenoterms;
                    }
                    else if (newGroup.termsInDiagnosis) {
                        delete newGroup.termsInDiagnosis;
                    }
                    if (nothpoids && nothpoids.length) {
                        newGroup.hpoIdInElimination = nothpoids;
                    }
                    phenoterms = this.getFormValue('notphenoterms');
                    if (phenoterms) {
                        newGroup.termsInElimination = phenoterms;
                    }

                    // Fill in the group fields from the Group Demographics panel
                    var value = this.getFormValue('malecount');
                    if (value) {
                        newGroup.numberOfMale = parseInt(value, 10);
                    }
                    value = this.getFormValue('femalecount');
                    if (value) {
                        newGroup.numberOfFemale = parseInt(value, 10);
                    }
                    value = this.getFormValue('country');
                    if (value !== 'none') {
                        newGroup.countryOfOrigin = value;
                    }
                    value = this.getFormValue('ethnicity');
                    if (value !== 'none') {
                        newGroup.ethnicity = value;
                    }
                    value = this.getFormValue('race');
                    if (value !== 'none') {
                        newGroup.race = value;
                    }
                    value = this.getFormValue('agerangetype');
                    if (value !== 'none') {
                        newGroup.ageRangeType = value + '';
                    }
                    value = this.getFormValue('agefrom');
                    if (value) {
                        newGroup.ageRangeFrom = parseInt(value, 10);
                    }
                    value = this.getFormValue('ageto');
                    if (value) {
                        newGroup.ageRangeTo = parseInt(value, 10);
                    }
                    value = this.getFormValue('ageunit');
                    if (value !== 'none') {
                        newGroup.ageRangeUnit = value;
                    }

                    // Fill in the group fields from Group Information panel
                    newGroup.totalNumberIndividuals = parseInt(this.getFormValue('indcount'), 10);
                    if (this.getFormValue('indfamilycount')) newGroup.numberOfIndividualsWithFamilyInformation = parseInt(this.getFormValue('indfamilycount'), 10);
                    if (this.getFormValue('notindfamilycount')) newGroup.numberOfIndividualsWithoutFamilyInformation = parseInt(this.getFormValue('notindfamilycount'), 10);
                    if (this.getFormValue('indvariantgenecount')) newGroup.numberOfIndividualsWithVariantInCuratedGene = parseInt(this.getFormValue('indvariantgenecount'), 10);
                    if (this.getFormValue('notindvariantgenecount')) newGroup.numberOfIndividualsWithoutVariantInCuratedGene = parseInt(this.getFormValue('notindvariantgenecount'), 10);
                    if (this.getFormValue('indvariantothercount')) newGroup.numberOfIndividualsWithVariantInOtherGene = parseInt(this.getFormValue('indvariantothercount'), 10);

                    // Add array of 'Other genes found to have variants in them'
                    if (groupGenes) {
                        newGroup.otherGenes = groupGenes['@graph'].map(function(article) { return article['@id']; });
                    }

                    // Add array of other PMIDs
                    if (groupArticles) {
                        newGroup.otherPMIDs = groupArticles['@graph'].map(function(article) { return article['@id']; });
                    }

                    value = this.getFormValue('additionalinfogroup');
                    if (value) {
                        newGroup.additionalInformation = value;
                    }

                    // Add affiliation if the user is associated with an affiliation
                    // and if the data object has no affiliation
                    if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                        if (!newGroup.affiliation) {
                            newGroup.affiliation = this.props.affiliation.affiliation_id;
                        }
                    }

                    // Either update or create the group object in the DB
                    if (this.state.group) {
                        // We're editing a group. PUT the new group object to the DB to update the existing one.
                        return this.putRestData('/groups/' + this.state.group.uuid, newGroup).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        // We created a group; post it to the DB
                        return this.postRestData('/groups/', newGroup).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }).then(newGroup => {
                    savedGroup = newGroup;
                    if (!this.state.group) {
                        return this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                            // Get a flattened copy of the fresh annotation object and put our new group into it,
                            // ready for writing.
                            var annotation = curator.flatten(freshAnnotation);
                            if (!annotation.groups) {
                                annotation.groups = [];
                            }
                            annotation.groups.push(newGroup['@id']);

                            // Post the modified annotation to the DB
                            return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(data => {
                                return Promise.resolve({group: newGroup, annotation: data['@graph'][0]});
                            });
                        });
                    }

                    // Modifying an existing group; don't need to modify the annotation
                    return Promise.resolve({group: newGroup, annotation: null});
                }).then(data => {
                    var meta;

                    // Record history of the group creation
                    if (data.annotation) {
                        // Record the creation of a new group
                        meta = {
                            group: {
                                gdm: this.state.gdm['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        this.recordHistory('add', data.group, meta);
                    } else {
                        // Record the modification of an existing group
                        this.recordHistory('modify', data.group);
                    }

                    // Navigate to Curation Central or Family Submit page, depending on previous page
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut) {
                        this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid + '&pmid=' + this.state.annotation.article.pmid);
                    } else {
                        this.context.navigate('/group-submit/?gdm=' + this.state.gdm.uuid + '&group=' + savedGroup.uuid + '&evidence=' + this.state.annotation.uuid);
                    }
                }).catch(function(e) {
                    console.log('GROUP CREATION ERROR=: %o', e);
                });
            }
        }
    },

    /**
     * Update the 'diseaseObj' state used to save data upon form submission
     */
    updateDiseaseObj(diseaseObj) {
        this.setState({diseaseObj: diseaseObj, diseaseRequired: false}, () => {
            this.clrMultiFormErrors(['diseaseError', 'hpoid', 'phenoterms']);
        });
    },

    /**
     * Clear error msg on missing disease
     */
    clearErrorInParent() {
        this.setState({diseaseError: null});
    },

    render: function() {
        var gdm = this.state.gdm;
        var annotation = this.state.annotation;
        var pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        var group = this.state.group;
        var method = (group && group.method && Object.keys(group.method).length) ? group.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.groupUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/group-submit/?gdm=' + gdm.uuid + (group ? '&group=' + group.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        return (
            <div>
                {(!this.queryValues.groupUuid || this.state.group) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(group ? 'Edit' : 'Curate') + ' Group Information'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    <span> &#x2F;&#x2F; {this.state.groupName ? <span> Group {this.state.groupName}</span> : <span className="no-entry">No entry</span>}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {GroupName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Group — Common Disease(s) & Phenotype(s)" open>
                                                {GroupCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Group — Demographics" open>
                                                {GroupDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Group — Information" open>
                                                {GroupProbandInfo.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Group — Methods" open>
                                                {methods.render.call(this, method, 'group')}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Group — Additional Information" open>
                                                {GroupAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {group ?
                                                <DeleteButton gdm={gdm} parent={annotation} item={group} pmid={pmid} />
                                            : null}
                                            <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                        </div>
                                    </Form>
                                </div>
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});

curator_page.register(GroupCuration, 'curator_page', 'group-curation');


// Group Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupName = function() {
    var group = this.state.group;

    return (
        <div className="row">
            <Input type="text" ref="groupname" label="Group Label:" value={group && group.label ? group.label : ''} maxLength="60" handleChange={this.handleChange}
                error={this.getFormError('groupname')} clearError={this.clrFormErrors.bind(null, 'groupname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">{curator.renderLabelNote('Group')}</p>
        </div>
    );
};


// Common diseases group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupCommonDiseases = function() {
    let group = this.state.group;
    let hpoidVal = group && group.hpoIdInDiagnosis ? group.hpoIdInDiagnosis.join(', ') : '';
    let nothpoidVal = group && group.hpoIdInElimination ? group.hpoIdInElimination.join(', ') : '';

    return (
        <div className="row">
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-warning">Please enter a disease term and/or phenotype(s); phenotypes may be entered using HPO ID(s) (preferred)
                    or free text when there is no appropriate HPO ID.</p>
            </div>
            <GroupDisease gdm={this.state.gdm} group={group} updateDiseaseObj={this.updateDiseaseObj} diseaseObj={this.state.diseaseObj}
                error={this.state.diseaseError} clearErrorInParent={this.clearErrorInParent} session={this.props.session} required={this.state.diseaseRequired} />
            <Input type="textarea" ref="hpoid" label={<LabelHpoId />} rows="4" value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrMultiFormErrors.bind(null, ['hpoid', 'phenoterms'])} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="2" value={group && group.termsInDiagnosis ? group.termsInDiagnosis : ''}
                error={this.getFormError('phenoterms')} clearError={this.clrMultiFormErrors.bind(null, ['hpoid', 'phenoterms'])} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Group</em> if they are specifically noted in the paper.</p>
            <Input type="textarea" ref="nothpoid" label={<LabelHpoId not />} rows="4" value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="2" value={group && group.termsInElimination ? group.termsInElimination : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
var LabelHpoId = createReactClass({
    propTypes: {
        not: PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
            </span>
        );
    }
});

// HTML labels for inputs follow.
var LabelPhenoTerms = createReactClass({
    propTypes: {
        not: PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                (<span className="normal">free text</span>):
            </span>
        );
    }
});

// Demographics group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupDemographics = function() {
    var group = this.state.group;

    return (
        <div className="row">
            <Input type="number" inputClassName="integer-only" ref="malecount" label="# males:" value={group && group.numberOfMale ? group.numberOfMale : ''}
                error={this.getFormError('malecount')} clearError={this.clrFormErrors.bind(null, 'malecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" inputClassName="integer-only" ref="femalecount" label="# females:" value={group && group.numberOfFemale ? group.numberOfFemale : ''}
                error={this.getFormError('femalecount')} clearError={this.clrFormErrors.bind(null, 'femalecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none"
                value={group && group.countryOfOrigin ? group.countryOfOrigin : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none"
                value={group && group.ethnicity ? group.ethnicity : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={group && group.race ? group.race : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Asian">Asian</option>
                <option value="Black">Black</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="White">White</option>
                <option value="Mixed">Mixed</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Age Range</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none"
                    value={group && group.ageRangeType ? group.ageRangeType : 'none'}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="number" ref="agefrom" inputClassName="input-inline integer-only" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('agefrom')} clearError={this.clrFormErrors.bind(null, 'agefrom')}
                        value={group && group.ageRangeFrom ? group.ageRangeFrom : ''} />
                    <span className="group-age-inter">to</span>
                    <Input type="number" ref="ageto" inputClassName="input-inline integer-only" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('ageto')} clearError={this.clrFormErrors.bind(null, 'ageto')}
                        value={group && group.ageRangeTo ? group.ageRangeTo : ''} />
                </Input>
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none"
                    value={group && group.ageRangeUnit ? group.ageRangeUnit : 'none'}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                </Input>
            </div>
        </div>
    );
};


// Group information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupProbandInfo = function() {
    var group = this.state.group;
    var othergenevariantsVal = group && group.otherGenes ? group.otherGenes.map(function(gene) { return gene.symbol; }).join(', ') : '';

    return(
        <div className="row">
            <Input type="number" inputClassName="integer-only" ref="indcount" label="Total number individuals in group:"
                value={group && group.totalNumberIndividuals ? group.totalNumberIndividuals : ''}
                error={this.getFormError('indcount')} clearError={this.clrFormErrors.bind(null, 'indcount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" required />
            <Input type="number" inputClassName="integer-only" ref="indfamilycount" label="# individuals with family information:"
                value={group && group.numberOfIndividualsWithFamilyInformation ? group.numberOfIndividualsWithFamilyInformation : ''}
                error={this.getFormError('indfamilycount')} clearError={this.clrFormErrors.bind(null, 'indfamilycount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" inputClassName="integer-only" ref="notindfamilycount" label="# individuals WITHOUT family information:"
                value={group && group.numberOfIndividualsWithoutFamilyInformation ? group.numberOfIndividualsWithoutFamilyInformation : ''}
                error={this.getFormError('notindfamilycount')} clearError={this.clrFormErrors.bind(null, 'notindfamilycount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" inputClassName="integer-only" ref="indvariantgenecount" label="# individuals with variant in gene being curated:"
                value={group && group.numberOfIndividualsWithVariantInCuratedGene ? group.numberOfIndividualsWithVariantInCuratedGene : ''}
                error={this.getFormError('indvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'indvariantgenecount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" inputClassName="integer-only" ref="notindvariantgenecount" label="# individuals without variant in gene being curated:"
                value={group && group.numberOfIndividualsWithoutVariantInCuratedGene ? group.numberOfIndividualsWithoutVariantInCuratedGene : ''}
                error={this.getFormError('notindvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'notindvariantgenecount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" inputClassName="integer-only" ref="indvariantothercount" label="# individuals with variant found in other gene:"
                value={group && group.numberOfIndividualsWithVariantInOtherGene ? group.numberOfIndividualsWithVariantInOtherGene : ''}
                error={this.getFormError('indvariantothercount')} clearError={this.clrFormErrors.bind(null, 'indvariantothercount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="text" ref="othergenevariants" label={<LabelOtherGenes />} inputClassName="uppercase-input"
                value={othergenevariantsVal} placeholder="e.g. DICER1, SMAD3"
                error={this.getFormError('othergenevariants')} clearError={this.clrFormErrors.bind(null, 'othergenevariants')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
class LabelOtherGenes extends Component {
    render() {
        return <span>Other genes found to have variants in them (<a href={external_url_map['HGNCHome']} title="HGNC home page in a new tab" target="_blank">HGNC</a> symbol):</span>;
    }
}


// Additional Information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupAdditional = function() {
    var group = this.state.group;
    var otherpmidsVal = group && group.otherPMIDs ? group.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : '';

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfogroup" label="Additional Information about Group:" rows="5"
                value={group && group.additionalInformation ? group.additionalInformation : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same Group:" rows="5"
                value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-info">
                    Note: Any variants associated with probands that will be counted towards the Classification are not
                    captured at the Group level - variants and their association with probands are required to be captured
                    at the Family or Individual level. Once you submit the Group information, you will be prompted to enter
                    Family/Individual information.
                </p>
            </div>
        </div>
    );
};


class GroupViewer extends Component {
    render() {
        var context = this.props.context;
        var method = context.method;

        var tempGdmPmid = curator.findGdmPmidFromObj(context);
        var tempGdm = tempGdmPmid[0];
        var tempPmid = tempGdmPmid[1];

        return (
            <div>
                <ViewRecordHeader gdm={tempGdm} pmid={tempPmid} />
                <div className="container">
                    <div className="row curation-content-viewer">
                        <div className="viewer-titles">
                            <h1>View Group: {context.label}</h1>
                            <h2>
                                {tempGdm ? <a href={'/curation-central/?gdm=' + tempGdm.uuid + (tempGdm ? '&pmid=' + tempPmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                <span> // Group {context.label}</span>
                            </h2>
                        </div>
                        <Panel title="Common Disease(s) & Phenotype(s)" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Common Diagnosis</dt>
                                    <dd>{context.commonDiagnosis && context.commonDiagnosis.map(function(disease, i) {
                                        return <span key={disease.diseaseId}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank">{disease.diseaseId.replace('_', ':')}</a> : null}</span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>HPO IDs</dt>
                                    <dd>{context.hpoIdInDiagnosis && context.hpoIdInDiagnosis.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype Terms</dt>
                                    <dd>{context.termsInDiagnosis}</dd>
                                </div>

                                <div>
                                    <dt>NOT HPO IDs</dt>
                                    <dd>{context.hpoIdInElimination && context.hpoIdInElimination.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>NOT phenotype terms</dt>
                                    <dd>{context.termsInElimination}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Group — Demographics" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt># Males</dt>
                                    <dd>{context.numberOfMale}</dd>
                                </div>

                                <div>
                                    <dt># Females</dt>
                                    <dd>{context.numberOfFemale}</dd>
                                </div>

                                <div>
                                    <dt>Country of Origin</dt>
                                    <dd>{context.countryOfOrigin}</dd>
                                </div>

                                <div>
                                    <dt>Ethnicity</dt>
                                    <dd>{context.ethnicity}</dd>
                                </div>

                                <div>
                                    <dt>Race</dt>
                                    <dd>{context.race}</dd>
                                </div>

                                <div>
                                    <dt>Age Range Type</dt>
                                    <dd>{context.ageRangeType}</dd>
                                </div>

                                <div>
                                    <dt>Age Range</dt>
                                    <dd>{context.ageRangeFrom || context.ageRangeTo ? <span>{context.ageRangeFrom + ' – ' + context.ageRangeTo}</span> : null}</dd>
                                </div>

                                <div>
                                    <dt>Age Range Unit</dt>
                                    <dd>{context.ageRangeUnit}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Group — Information" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Total number individuals in group</dt>
                                    <dd>{context.totalNumberIndividuals}</dd>
                                </div>

                                <div>
                                    <dt># individuals with family information</dt>
                                    <dd>{context.numberOfIndividualsWithFamilyInformation}</dd>
                                </div>

                                <div>
                                    <dt># individuals WITHOUT family information</dt>
                                    <dd>{context.numberOfIndividualsWithoutFamilyInformation}</dd>
                                </div>

                                <div>
                                    <dt># individuals with variant in gene being curated</dt>
                                    <dd>{context.numberOfIndividualsWithVariantInCuratedGene}</dd>
                                </div>

                                <div>
                                    <dt># individuals without variant in gene being curated</dt>
                                    <dd>{context.numberOfIndividualsWithoutVariantInCuratedGene}</dd>
                                </div>

                                <div>
                                    <dt># individuals with variant found in other gene</dt>
                                    <dd>{context.numberOfIndividualsWithVariantInOtherGene}</dd>
                                </div>

                                <div>
                                    <dt>Other genes found to have variants in them</dt>
                                    <dd>{context.otherGenes && context.otherGenes.map(function(gene, i) {
                                        return <span key={gene.symbol}>{i > 0 ? ', ' : ''}<a href={external_url_map['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"} target="_blank">{gene.symbol}</a></span>;
                                    })}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Group — Methods" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Previous testing</dt>
                                    <dd>{method ? (method.previousTesting === true ? 'Yes' : (method.previousTesting === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Description of previous testing</dt>
                                    <dd>{method && method.previousTestingDescription}</dd>
                                </div>

                                <div>
                                    <dt>Genome-wide study</dt>
                                    <dd>{method ? (method.genomeWideStudy === true ? 'Yes' : (method.genomeWideStudy === false ? 'No' : '')) : ''}</dd>
                                </div>

                                <div>
                                    <dt>Genotyping methods</dt>
                                    <dd>{method && method.genotypingMethods && method.genotypingMethods.join(', ')}</dd>
                                </div>

                                {method && (method.entireGeneSequenced === true || method.entireGeneSequenced === false) ?
                                    <div>
                                        <dt>Entire gene sequenced</dt>
                                        <dd>{method.entireGeneSequenced === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                {method && (method.copyNumberAssessed === true || method.copyNumberAssessed === false) ?
                                    <div>
                                        <dt>Copy number assessed</dt>
                                        <dd>{method.copyNumberAssessed === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                {method && (method.specificMutationsGenotyped === true || method.specificMutationsGenotyped === false) ?
                                    <div>
                                        <dt>Specific mutations genotyped</dt>
                                        <dd>{method.specificMutationsGenotyped === true ? 'Yes' : 'No'}</dd>
                                    </div>
                                    : null}

                                <div>
                                    <dt>Description of genotyping method</dt>
                                    <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                                </div>

                                <div>
                                    <dt>Additional Information about Group Method</dt>
                                    <dd>{method && method.additionalInformation}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Group — Additional Information" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Additional Information about Group</dt>
                                    <dd>{context.additionalInformation}</dd>
                                </div>

                                <dt>Other PMID(s) that report evidence about this same group</dt>
                                <dd>{context.otherPMIDs && context.otherPMIDs.map(function(article, i) {
                                    return <span key={article.pmid}>{i > 0 ? ', ' : ''}<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span>;
                                })}</dd>
                            </dl>
                        </Panel>
                    </div>
                </div>
            </div>
        );
    }
}

content_views.register(GroupViewer, 'group');


// Display a history item for adding a group
class GroupAddHistory extends Component {
    render() {
        var history = this.props.history;
        var group = history.primary;
        var gdm = history.meta.group.gdm;
        var article = history.meta.group.article;

        return (
            <div>
                Group <a href={group['@id']}>{group.label}</a>
                <span> added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a></span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                {group.affiliation ?
                    <span className="last-edited-by-name">; last edited by {group.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(GroupAddHistory, 'group', 'add');


// Display a history item for modifying a group
class GroupModifyHistory extends Component {
    render() {
        var history = this.props.history;
        var group = history.primary;

        return (
            <div>
                Group <a href={group['@id']}>{group.label}</a>
                <span> modified</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                {group.affiliation ?
                    <span className="last-edited-by-name">; last edited by {group.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(GroupModifyHistory, 'group', 'modify');


// Display a history item for deleting a group
class GroupDeleteHistory extends Component {
    render() {
        var history = this.props.history;
        var group = history.primary;

        // Prepare to display a note about associated families and individuals
        // This data can now only be obtained from the history object's hadChildren field
        var collateralObjects = history.hadChildren == 1 ? true : false;

        return (
            <div>
                <span>Group {group.label} deleted</span>
                <span>{collateralObjects ? ' along with any associated families and individuals' : ''}</span>
                <span>; {moment(history.last_modified).format("YYYY MMM DD, h:mm a")}</span>
                {group.affiliation ?
                    <span className="last-edited-by-name">; last edited by {group.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(GroupDeleteHistory, 'group', 'delete');
