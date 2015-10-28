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
var parsePubmed = require('../libs/parse-pubmed').parsePubmed;

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
var external_url_map = globals.external_url_map;


var GroupCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
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
            submitBusy: false // True while form is submitting
        };
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({genotyping2Disabled: false});
        } else if (ref === 'groupname') {
            this.setState({groupName: this.refs[ref].getValue()});
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
            var groupDiseases, groupGenes, groupArticles;
            var savedGroup;
            var formError = false;

            // Parse comma-separated list fields
            var orphaIds = curator.capture.orphas(this.getFormValue('orphanetid'));
            var geneSymbols = curator.capture.genes(this.getFormValue('othergenevariants'));
            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (!orphaIds || !orphaIds.length || _(orphaIds).any(function(id) { return id === null; })) {
                // ORPHA list is bad
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
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
            if (hpoids && hpoids.length && _(hpoids).any(function(id) { return id === null; })) {
                // HPOID list is bad
                formError = true;
                this.setFormErrors('hpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            // Check that all gene symbols have the proper format (will check for existence later)
            if (nothpoids && nothpoids.length && _(nothpoids).any(function(id) { return id === null; })) {
                // NOT HPOID list is bad
                formError = true;
                this.setFormErrors('nothpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            }

            if (!formError) {
                // Build search string from given ORPHA IDs
                var searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');
                this.setState({submitBusy: true});

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (diseases['@graph'].length === orphaIds.length) {
                        // Successfully retrieved all diseases
                        groupDiseases = diseases;
                        return Promise.resolve(diseases);
                    } else {
                        // Get array of missing Orphanet IDs
                        this.setState({submitBusy: false}); // submit error; re-enable submit button
                        var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                        this.setFormErrors('orphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                        throw diseases;
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setFormErrors('orphanetid', 'The given diseases not found');
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

                    // Get an array of all given disease IDs
                    newGroup.commonDiagnosis = groupDiseases['@graph'].map(function(disease) { return disease['@id']; });

                    // If a method object was created (at least one method field set), get its new object's
                    var newMethod = methods.create.call(this);
                    if (newMethod) {
                        newGroup.method = newMethod;
                    }

                    // Fill in the group fields from the Common Diseases & Phenotypes panel
                    if (hpoids && hpoids.length) {
                        newGroup.hpoIdInDiagnosis = hpoids;
                    }
                    var phenoterms = this.getFormValue('phenoterms');
                    if (phenoterms) {
                        newGroup.termsInDiagnosis = phenoterms;
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
                        // Get a flattened copy of the annotation and put our new group into it,
                        // ready for writing.
                        var annotation = curator.flatten(this.state.annotation);
                        if (annotation.groups) {
                            annotation.groups.push(newGroup['@id']);
                        } else {
                            annotation.groups = [newGroup['@id']];
                        }

                        // Post the modified annotation to the DB, then go back to Curation Central
                        return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation);
                    } else {
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Navigate back to Curation Central page.
                    // FUTURE: Need to navigate to Group Submit page.
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
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(group ? 'Edit' : 'Curate') + ' Group Information'}</h1>
                                <h2>Group: {this.state.groupName ? <span>{this.state.groupName}</span> : <span className="no-entry">No entry</span>}</h2>
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
                                                {methods.render.call(this, method)}
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

globals.curator_page.register(GroupCuration, 'curator_page', 'group-curation');


// Group Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupName = function() {
    var group = this.state.group;

    return (
        <div className="row">
            <Input type="text" ref="groupname" label="Group name:" value={group && group.label} handleChange={this.handleChange}
                error={this.getFormError('groupname')} clearError={this.clrFormErrors.bind(null, 'groupname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
        </div>
    );
};


// Common diseases group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupCommonDiseases = function() {
    var group = this.state.group;
    var orphanetidVal, hpoidVal, nothpoidVal;

    if (group) {
        orphanetidVal = group.commonDiagnosis ? group.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join(', ') : null;
        hpoidVal = group.hpoIdInDiagnosis ? group.hpoIdInDiagnosis.join(', ') : null;
        nothpoidVal = group.hpoIdInElimination ? group.hpoIdInElimination.join(', ') : null;
    }

    return (
        <div className="row">
            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={group && group.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Group</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={group && group.termsInElimination}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Disease in Common (<span style={{fontWeight: 'normal'}}><a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet home page in a new tab">Orphanet</a> term</span>):</span>;
    }
});

// HTML labels for inputs follow.
var LabelHpoId = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span style={{color: 'red'}}>NOT </span> : <span>Shared </span>}
                Phenotype(s) <span style={{fontWeight: 'normal'}}>(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
            </span>
        );
    }
});

// HTML labels for inputs follow.
var LabelPhenoTerms = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span style={{color: 'red'}}>NOT </span> : <span>Shared </span>}
                Phenotype(s) (<span style={{fontWeight: 'normal'}}>free text</span>):
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
            <Input type="number" ref="malecount" label="# males:" value={group && group.numberOfMale}
                error={this.getFormError('malecount')} clearError={this.clrFormErrors.bind(null, 'malecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="femalecount" label="# females:" value={group && group.numberOfFemale}
                error={this.getFormError('femalecount')} clearError={this.clrFormErrors.bind(null, 'femalecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={group && group.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={group && group.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>Hispanic or Latino</option>
                <option>Not Hispanic or Latino</option>
                <option>Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={group && group.race}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option>American Indian or Alaska Native</option>
                <option>Asian</option>
                <option>Black</option>
                <option>Native Hawaiian or Other Pacific Islander</option>
                <option>White</option>
                <option>Mixed</option>
                <option>Unknown</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Age Range</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none" value={group && group.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Onset</option>
                    <option>Report</option>
                    <option>Diagnosis</option>
                    <option>Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="number" ref="agefrom" inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('agefrom')} clearError={this.clrFormErrors.bind(null, 'agefrom')} value={group && group.ageRangeFrom} />
                    <span className="group-age-inter">to</span>
                    <Input type="number" ref="ageto" inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('ageto')} clearError={this.clrFormErrors.bind(null, 'ageto')} value={group && group.ageRangeTo} />
                </Input>
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={group && group.ageRangeUnit}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option>Days</option>
                    <option>Weeks</option>
                    <option>Months</option>
                    <option>Years</option>
                </Input>
            </div>
        </div>
    );
};


// Group information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupProbandInfo = function() {
    var group = this.state.group;
    var othergenevariantsVal = group && group.otherGenes ? group.otherGenes.map(function(gene) { return gene.symbol; }).join() : null;

    return(
        <div className="row">
            <Input type="number" ref="indcount" label="Total number individuals in group:" value={group && group.totalNumberIndividuals}
                error={this.getFormError('indcount')} clearError={this.clrFormErrors.bind(null, 'indcount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" required />
            <Input type="number" ref="indfamilycount" label="# individuals with family information:" value={group && group.numberOfIndividualsWithFamilyInformation}
                error={this.getFormError('indfamilycount')} clearError={this.clrFormErrors.bind(null, 'indfamilycount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" ref="notindfamilycount" label="# individuals WITHOUT family information:" value={group && group.numberOfIndividualsWithoutFamilyInformation}
                error={this.getFormError('notindfamilycount')} clearError={this.clrFormErrors.bind(null, 'notindfamilycount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" ref="indvariantgenecount" label="# individuals with variant in gene being curated:" value={group && group.numberOfIndividualsWithVariantInCuratedGene}
                error={this.getFormError('indvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'indvariantgenecount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" ref="notindvariantgenecount" label="# individuals without variant in gene being curated:" value={group && group.numberOfIndividualsWithoutVariantInCuratedGene}
                error={this.getFormError('notindvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'notindvariantgenecount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="number" ref="indvariantothercount" label="# individuals with variant found in other gene:" value={group && group.numberOfIndividualsWithVariantInOtherGene}
                error={this.getFormError('indvariantothercount')} clearError={this.clrFormErrors.bind(null, 'indvariantothercount')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
            <Input type="text" ref="othergenevariants" label={<LabelOtherGenes />} inputClassName="uppercase-input" value={othergenevariantsVal} placeholder="e.g. DICER1, SMAD3"
                error={this.getFormError('othergenevariants')} clearError={this.clrFormErrors.bind(null, 'othergenevariants')}
                labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-6" groupClassName="form-group" />
        </div>
    );
};

// HTML labels for inputs follow.
var LabelOtherGenes = React.createClass({
    render: function() {
        return <span>Other genes found to have variants in them (<a href={external_url_map['HGNCHome']} title="HGNC home page in a new tab" target="_blank">HGNC</a> symbol):</span>;
    }
});


// Additional Information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var GroupAdditional = function() {
    var otherpmidsVal;
    var group = this.state.group;
    if (group) {
        otherpmidsVal = group.otherPMIDs ? group.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : null;
    }


    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfogroup" label="Additional Information about Group:" rows="5" value={group && group.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same Group:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">
                Note: Any variants associated with probands that will be counted towards the Classification are not
                captured at the Group level - variants and their association with probands are required to be captured
                at the Family or Individual level. Once you submit the Group information, you will be prompted to enter
                Family/Individual information.
            </p>
        </div>
    );
};


var GroupViewer = React.createClass({
    render: function() {
        var context = this.props.context;
        var method = context.method;

        return (
            <div className="container">
                <div className="row curation-content-viewer">
                    <h1>View Group: {context.label}</h1>
                    <Panel title="Common Disease(s) & Phenotype(s)" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Orphanet Common Diagnosis</dt>
                                <dd>{context.commonDiagnosis && context.commonDiagnosis.map(function(disease, i) {
                                    if (i == context.commonDiagnosis.length - 1) {
                                        return <span key={disease.orphaNumber}><a href={external_url_map['OrphaNet'] + disease.orphaNumber} title={"OrphaNet entry for ORPHA" + disease.orphaNumber + " in new tab"} target="_blank">ORPHA{disease.orphaNumber}</a> ({disease.term})</span>
                                    } else {
                                        return <span key={disease.orphaNumber}><a href={external_url_map['OrphaNet'] + disease.orphaNumber} title={"OrphaNet entry for ORPHA" + disease.orphaNumber + " in new tab"} target="_blank">ORPHA{disease.orphaNumber}</a> ({disease.term}), </span>
                                    }
                                })}</dd>
                            </div>

                            <div>
                                <dt>HPO IDs</dt>
                                <dd>{context.hpoIdInDiagnosis && context.hpoIdInDiagnosis.map(function(hpo, i) {
                                    if (i == context.hpoIdInDiagnosis.length - 1) {
                                        return <span key={hpo}><a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>
                                    } else {
                                        return <span key={hpo}><a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a>, </span>
                                    }
                                })}</dd>
                            </div>

                            <div>
                                <dt>Phenotype Terms</dt>
                                <dd>{context.termsInDiagnosis}</dd>
                            </div>

                            <div>
                                <dt>NOT HPO IDs</dt>
                                <dd>{context.hpoIdInElimination && context.hpoIdInElimination.map(function(hpo, i) {
                                    if (i == context.hpoIdInElimination.length - 1) {
                                        return <span key={hpo}><a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>
                                    } else {
                                        return <span key={hpo}><a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a>, </span>
                                    }
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
                            </div>ClinVarSearch

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
                                    if (i == context.otherGenes.length - 1) {
                                        return <span key={gene.symbol}><a href={external_url_map['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"} target="_blank">{gene.symbol}</a></span>
                                    } else {
                                        return <span key={gene.symbol}><a href={external_url_map['HGNC'] + gene.hgncId} title={"HGNC entry for " + gene.symbol + " in new tab"} target="_blank">{gene.symbol}</a>, </span>
                                    }
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

                            <div>
                                <dt>Entire gene sequenced</dt>
                                <dd>{method ? (method.entireGeneSequenced === true ? 'Yes' : (method.entireGeneSequenced === false ? 'No' : '')) : ''}</dd>
                            </div>

                            <div>
                                <dt>Copy number assessed</dt>
                                <dd>{method ? (method.copyNumberAssessed === true ? 'Yes' : (method.copyNumberAssessed === false ? 'No' : '')) : ''}</dd>
                            </div>

                            <div>
                                <dt>Specific mutations genotyped</dt>
                                <dd>{method ? (method.specificMutationsGenotyped === true ? 'Yes' : (method.specificMutationsGenotyped === false ? 'No' : '')) : ''}</dd>
                            </div>

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
                                if (i == context.otherPMIDs.length - 1) {
                                    return <span key={article.pmid}><a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span>
                                } else {
                                    return <span key={article.pmid}><a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a>, </span>
                                }
                            })}</dd>
                        </dl>
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.content_views.register(GroupViewer, 'group');
