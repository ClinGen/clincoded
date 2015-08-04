'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;

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


var FamilyCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState: function() {
        return {
            gdm: {}, // GDM object given in UUID
            annotation: {}, // Annotation object given in UUID
            article: {}, // Article from the annotation
            family: {}, // If we're editing a group, this gets the fleshed-out group object we're editing
            extraFamilyCount: 0, // Number of extra families to create
            extraFamilyNames: [], // Names of extra families to create
            genotyping2Disabled: true // True if genotyping method 2 dropdown disabled
        };
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({genotyping2Disabled: false});
        }
    },

    // Retrieve the GDM and annotation objects with the given UUIDs from the DB. If successful, set the component
    // state to the retrieved objects to cause a rerender of the component.
    getGdmAnnotation: function(gdmUuid, annotationUuid) {
        this.getRestDatas([
            '/gdm/' + gdmUuid,
            '/evidence/' + annotationUuid + '?frame=object' // Use flattened object because it can be updated
        ]).then(data => {
            var annotation = data[1];
            this.setState({gdm: data[0], annotation: annotation, currOmimId: data[0].omimId});
            return this.getRestData(annotation.article);
        }).then(article => {
            return this.setState({article: article});
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    // If a group UUID is given in the query string, load it into the group state variable.
    loadFamily: function(familyUuid) {
        this.getRestData(
            '/families/' + familyUuid
        ).then(family => {
            // See if the loaded group's genotyping methods are being used.
            var genotypingMethodUsed = !!(family.method && family.method.genotypingMethods && family.method.genotypingMethods.length);

            // Received group data; set the current state with it
            this.setState({family: family, genotyping2Disabled: !genotypingMethodUsed});
            return Promise.resolve();
        }).catch(function(e) {
            console.log('FAMILY LOAD ERROR=: %o', e);
            parseAndLogError.bind(undefined, 'getRequest');
        });
    },

    // After the Group Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        if (this.queryValues.annotationUuid && this.queryValues.gdmUuid) {
            // Query the DB with this UUID, setting the component state if successful.
            this.getGdmAnnotation(this.queryValues.gdmUuid, this.queryValues.annotationUuid);
        }

        // If a family's UUID was given in the query string, retrieve the famly data for editing.
        if (this.queryValues.familyUuid) {
            this.loadFamily(this.queryValues.familyUuid);
        }
    },

    // Called when user changes the number of copies of family
    extraFamilyCountChanged: function(e) {
        this.setState({extraFamilyCount: e.target.value});
    },

    // Write a family object to the DB.
    writeFamilyObj: function(newFamily, familyDiseases, familyArticles, familyLabel) {
        var methodPromise; // Promise from writing (POST/PUT) a method to the DB

        // Make a new method and save it to the DB
        var family = this.state.family;
        var newMethod = this.createMethod();
        if (!newMethod) {
            // No method in the current form field values. Just return a null promise
            methodPromise = Promise.resolve(null);
        } else if (family && family.method && Object.keys(family.method).length) {
            // We're editing a family and it had an existing method. Just PUT an update to the method.
            methodPromise = this.putRestData('/methods/' + this.state.family.method.uuid, newMethod).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        } else {
            // We're either creating a family, or editing an existing group that didn't have a method
            // Post the new method to the DB. When the promise returns with the new method
            // object, pass it to the next promise-processing code.
            methodPromise = this.postRestData('/methods/', newMethod).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }

        // Wrote (POST/PUT) method to the DB. Now work on the segregation
        return methodPromise.then(newMethod => {
            // Make a new segregation object and save it to the DB
            var newSegregation = this.createSegregation();
            if (newSegregation) {
                var family = this.state.family;
                if (family && family.segregation && Object.keys(family.segregation).length) {
                    // We're editing a family and it had an existing method. Just PUT an update to the method.
                    return this.putRestData('/segregations/' + family.segregation.uuid, newSegregation).then(data => {
                        return Promise.resolve({method: newMethod, segregation: data['@graph'][0]});
                    });
                } else {
                    // We're either creating a family, or editing an existing family that didn't have a segregation
                    // Post the new segregation to the DB. When the promise returns with the new segregation
                    // object, pass it to the next promise-processing code.
                    return this.postRestData('/segregations/', newSegregation).then(data => {
                        return Promise.resolve({method: newMethod, segregation: data['@graph'][0]});
                    });
                }
            } else {
                return Promise.resolve({method: newMethod, segregation: null});
            }
        }).then(methSeg => {
            // All family subobjects written. Now write the family object itself. We may be writing more than one in
            // parallel, so clone the set-up family object before modifying it for this particular object
            var writerFamily = _.clone(newFamily);
            writerFamily.dateTime = moment().format();
            if (familyLabel) {
                writerFamily.label = familyLabel;
            }

            // If a method and/or segregation object was created (at least one method/segregation field set), assign it to the family.
            // If writing multiple family objects, reuse the one we made, but assign new methods and segregations because each family
            // needs unique objects here.
            if (methSeg.method) {
                writerFamily.method = methSeg.method['@id'];
            }
            if (methSeg.segregation) {
                writerFamily.segregation = methSeg.segregation['@id'];
            }

            // Either update or create the family object in the DB
            if (this.state.family && Object.keys(this.state.family).length) {
                // We're editing a family. PUT the new family object to the DB to update the existing one.
                return this.putRestData('/families/' + this.state.family.uuid, writerFamily).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            } else {
                // We created a group; post it to the DB
                return this.postRestData('/families/', writerFamily).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            }
        });
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var newFamily = {}; // Holds the new group object;
            var familyDiseases = null, familyArticles;
            var formError = false;

            // Parse the comma-separated list of Orphanet IDs
            var orphaIds = captureOrphas(this.getFormValue('orphanetid'));
            var pmids = capturePmids(this.getFormValue('otherpmids'));

            // Check that all HPO terms appear valid
            var hpoTerms = this.getFormValue('hpoid');
            if (hpoTerms) {
                var rawHpoids = _.compact(hpoTerms.toUpperCase().split(','));
                var hpoids = _.compact(rawHpoids.map(function(id) { return captureHpoid(id); }));
                if (rawHpoids.length !== hpoids.length) {
                    formError = true;
                    this.setFormErrors('hpoid', 'HPO IDs must be in the form “HP:NNNNNNN,” where N is a digit');
                }
            }

            // Check that all NOT HPO terms appear valid
            hpoTerms = this.getFormValue('nothpoid');
            if (hpoTerms) {
                var rawNotHpoids = _.compact(hpoTerms.toUpperCase().split(','));
                var nothpoids = _.compact(rawNotHpoids.map(function(id) { return captureHpoid(id); }));
                if (rawNotHpoids.length !== nothpoids.length) {
                    formError = true;
                    this.setFormErrors('nothpoid', 'Use HPO IDs, e.g. HP:0000123');
                }
            }

            // Check that all Orphanet IDs have the proper format (will check for existence later)
            if (!orphaIds || !orphaIds.length) {
                // No 'orphaXX' found 
                formError = true;
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15) separated by commas');
            }
            if (!formError) {
                // Build search string from given ORPHA IDs
                var searchStr = '/search/?type=orphaPhenotype&' + orphaIds.map(function(id) { return 'orphaNumber=' + id; }).join('&');

                // Verify given Orpha ID exists in DB
                this.getRestData(searchStr).then(diseases => {
                    if (diseases['@graph'].length === orphaIds.length) {
                        // Successfully retrieved all diseases
                        familyDiseases = diseases;
                        return Promise.resolve(diseases);
                    } else {
                        // Get array of missing Orphanet IDs
                        var missingOrphas = _.difference(orphaIds, diseases['@graph'].map(function(disease) { return disease.orphaNumber; }));
                        this.setFormErrors('orphanetid', missingOrphas.map(function(id) { return 'ORPHA' + id; }).join(', ') + ' not found');
                        throw diseases;
                    }
                }, e => {
                    // The given orpha IDs couldn't be retrieved for some reason.
                    this.setFormErrors('orphanetid', 'The given diseases not found');
                    throw e;
                }).then(diseases => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all genes
                                familyArticles = articles;
                                return Promise.resolve(articles);
                            } else {
                                var missingPmids = _.difference(pmids, articles['@graph'].map(function(article) { return article.pmid; }));
                                this.setFormErrors('otherpmids', missingPmids.join(', ') + ' not found');
                                throw articles;
                            }
                        });
                    } else {
                        // No PMIDs entered; just pass null to the next then
                        return Promise.resolve(null);
                    }
                }).then(data => {
                    // Make a new family object based on form fields.
                    var newFamily = this.createFamily(familyDiseases, familyArticles);

                    // Prep for multiple family writes, based on the family count dropdown (only appears when creating a new family,
                    // not when editing a family). This is a count of *extra* families, so add 1 to it to get the number of families
                    // to create.
                    var familyPromises = [];
                    var familyCount = parseInt(this.getFormValue('extrafamilycount'), 10);
                    familyCount = familyCount ? familyCount + 1 : 1;

                    // Write the new family object to the DB
                    for (var i = 0; i < familyCount; ++i) {
                        var familyLabel;
                        if (i > 0) {
                            familyLabel = this.getFormValue('extrafamilyname' + (i - 1));
                        }
                        familyPromises.push(this.writeFamilyObj(newFamily, familyDiseases, familyArticles, familyLabel));
                    }
                    return Promise.all(familyPromises);
                }).then(newFamilies => {
                    if (!this.state.family || Object.keys(this.state.family).length === 0) {
                        // Let's avoid modifying a React state property, so clone it. Add the new group
                        // to the current annotation's 'groups' array.
                        var annotation = _.clone(this.state.annotation);
                        if (!annotation.families) {
                            annotation.families = [];
                        }

                        // Merge existing families in the annotation with the new set of families.
                        Array.prototype.push.apply(annotation.families, newFamilies.map(function(family) { return family['@id']; }));

                        // We'll get 422 (Unprocessible entity) if we PUT any of these fields:
                        delete annotation.uuid;
                        delete annotation['@id'];
                        delete annotation['@type'];

                        // Post the modified annotation to the DB, then go back to Curation Central
                        return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation);
                    } else {
                        return Promise.resolve(this.state.annotation);
                    }
                }).then(data => {
                    // Navigate back to Curation Central page.
                    // FUTURE: Need to navigate to choices page.
                    this.context.navigate('/curation-central/?gdm=' + this.state.gdm.uuid);
                }).catch(function(e) {
                    console.log('FAMILY CREATION ERROR=: %o', e);
                    parseAndLogError.bind(undefined, 'putRequest');
                });
            }
        }
    },

    // Create method object based on the form values
    createMethod: function() {
        var newMethod = {};
        var value1, value2;

        // Put together a new 'method' object
        value1 = this.getFormValue('prevtesting');
        if (value1 !== 'none') {
            newMethod.previousTesting = value1;
        }
        value1 = this.getFormValue('prevtestingdesc');
        if (value1) {
            newMethod.previousTestingDescription = value1;
        }
        value1 = this.getFormValue('genomewide');
        if (value1 !== 'none') {
            newMethod.genomeWideStudy = value1;
        }
        value1 = this.getFormValue('genotypingmethod1');
        value2 = this.getFormValue('genotypingmethod2');
        if (value1 !== 'none' || value2 !== 'none') {
            newMethod.genotypingMethods = _([value1, value2]).filter(function(val) {
                return val !== 'none';
            });
        }
        value1 = this.getFormValue('entiregene');
        if (value1 !== 'none') {
            newMethod.entireGeneSequenced = value1;
        }
        value1 = this.getFormValue('copyassessed');
        if (value1 !== 'none') {
            newMethod.copyNumberAssessed = value1;
        }
        value1 = this.getFormValue('mutationsgenotyped');
        if (value1 !== 'none') {
            newMethod.specificMutationsGenotyped = value1;
        }
        value1 = this.getFormValue('specificmutation');
        if (value1) {
            newMethod.specificMutationsGenotypedMethod = value1;
        }
        value1 = this.getFormValue('additionalinfomethod');
        if (value1) {
            newMethod.additionalInformation = value1;
        }

        return Object.keys(newMethod).length ? newMethod : null;
    },

    // Create segregation object based on the form values
    createSegregation: function() {
        var newSegregation = {};
        var value1;

        // Put together a new 'method' object
        value1 = this.getFormValue('pedigreedesc');
        if (value1) {
            newSegregation.pedigreeDescription = value1;
        }
        value1 = this.getFormValue('pedigreesize');
        if (value1) {
            newSegregation.pedigreeSize = value1;
        }
        value1 = this.getFormValue('nogenerationsinpedigree');
        if (value1) {
            newSegregation.numberOfGenerationInPedigree = value1;
        }
        value1 = this.getFormValue('consanguineous');
        if (value1 !== 'none') {
            newSegregation.consanguineousFamily = value1;
        }
        value1 = this.getFormValue('nocases');
        if (value1) {
            newSegregation.numberOfCases = value1;
        }
        value1 = this.getFormValue('denovo');
        if (value1 !== 'none') {
            newSegregation.deNovoType = value1;
        }
        value1 = this.getFormValue('unaffectedcarriers');
        if (value1 !== 'none') {
            newSegregation.numberOfParentsUnaffectedCarriers = value1;
        }
        value1 = this.getFormValue('noaffected');
        if (value1) {
            newSegregation.numberOfAffectedAlleles = value1;
        }
        value1 = this.getFormValue('noaffected1');
        if (value1) {
            newSegregation.numberOfAffectedWithOneVariant = value1;
        }
        value1 = this.getFormValue('noaffected2');
        if (value1) {
            newSegregation.numberOfAffectedWithTwoVariants = value1;
        }
        value1 = this.getFormValue('nounaffectedcarriers');
        if (value1) {
            newSegregation.numberOfUnaffectedCarriers = value1;
        }
        value1 = this.getFormValue('nounaffectedindividuals');
        if (value1) {
            newSegregation.numberOfUnaffectedIndividuals = value1;
        }
        value1 = this.getFormValue('bothvariants');
        if (value1 !== 'none') {
            newSegregation.probandAssociatedWithBoth = value1;
        }
        value1 = this.getFormValue('addedsegregationinfo');
        if (value1) {
            newSegregation.additionalInformation = value1;
        }

        if (Object.keys(newSegregation).length) {
            newSegregation.dateTime = moment().format();
            newSegregation.owner = this.props.session['auth.userid'];
            return newSegregation;
        }
        return null;
    },

    // Create a family object to be written to the database. Most values come from the values
    // in the form. The created object is returned from the function.
    createFamily: function(familyDiseases, familyArticles) {
        var newFamily = {};

        // Method and/or segregation successfully created if needed (null if not); passed in 'methSeg' object. Now make the new family.
        newFamily.label = this.getFormValue('familyname');

        // Get an array of all given disease IDs
        if (familyDiseases) {
            newFamily.commonDiagnosis = familyDiseases['@graph'].map(function(disease) { return disease['@id']; });
        }

        // Add array of other PMIDs
        if (familyArticles) {
            newFamily.otherPMIDs = familyArticles['@graph'].map(function(article) { return article['@id']; });
        }

        // Fill in the group fields from the Common Diseases & Phenotypes panel
        var hpoTerms = this.getFormValue('hpoid');
        if (hpoTerms) {
            newFamily.hpoIdInDiagnosis = _.compact(hpoTerms.toUpperCase().split(','));
        }
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newFamily.termsInDiagnosis = phenoterms;
        }
        hpoTerms = this.getFormValue('nothpoid');
        if (hpoTerms) {
            newFamily.hpoIdInElimination = _.compact(hpoTerms.toUpperCase().split(','));
        }
        phenoterms = this.getFormValue('notphenoterms');
        if (phenoterms) {
            newFamily.termsInElimination = phenoterms;
        }

        // Fill in the group fields from the Family Demographics panel
        var value = this.getFormValue('malecount');
        if (value) { newFamily.numberOfMale = value + ''; }

        value = this.getFormValue('femalecount');
        if (value) { newFamily.numberOfFemale = value + ''; }

        value = this.getFormValue('country');
        if (value !== 'none') { newFamily.countryOfOrigin = value; }

        value = this.getFormValue('ethnicity');
        if (value !== 'none') { newFamily.ethnicity = value; }

        value = this.getFormValue('race');
        if (value !== 'none') { newFamily.race = value; }

        value = this.getFormValue('agerangetype');
        if (value !== 'none') { newFamily.ageRangeType = value + ''; }

        value = this.getFormValue('agefrom');
        if (value) { newFamily.ageRangeFrom = value + ''; }

        value = this.getFormValue('ageto');
        if (value) { newFamily.ageRangeTo = value + ''; }

        value = this.getFormValue('ageunit');
        if (value !== 'none') { newFamily.ageRangeUnit = value + ''; }

        value = this.getFormValue('additionalinfofamily');
        if (value) { newFamily.additionalInformation = value; }

        return newFamily;
    },

    render: function() {
        var annotation = this.state.annotation;
        var gdm = this.state.gdm;
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);

        return (
            <div>
                {(!this.queryValues.familyUuid || Object.keys(this.state.family).length > 0) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                        <div className="container">
                            <div className="curation-pmid-summary">
                                <PmidSummary article={this.state.article} displayJournal />
                            </div>
                            <h1>Curate Family Information</h1>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {FamilyName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Family – Common Disease & Phenotypes" open>
                                                {FamilyCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Demographics" open>
                                                {FamilyDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Methods" open>
                                                {FamilyMethods.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Segregation" open>
                                                {FamilySegregation.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Additional Information" open>
                                                {FamilyAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        {(!this.state.family || Object.keys(this.state.family).length === 0) ?
                                            <PanelGroup accordion>
                                                <Panel title="Family – Number with identical information" open>
                                                    {FamilyCount.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                        : null}
                                        <Input type="submit" inputClassName="btn-primary pull-right" id="submit" title="Save" />
                                        <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
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

globals.curator_page.register(FamilyCuration, 'curator_page', 'family-curation');


function captureBase(s, re, uppercase) {
    var match, matchResults = [];

    do {
        match = re.exec(s);
        if (match) {
            matchResults.push(uppercase ? match[1].toUpperCase() : match[1]);
        }
    } while(match);
    return matchResults;
}

// Given a string, find all the comma-separated 'orphaXX' occurrences.
// Return all orpha IDs in an array.
function captureOrphas(s) {
    return captureBase(s, /(?:^|,|\s)orpha(\d+)(?=,|\s|$)/gi, true);
}

// Given a string, find all the comma-separated gene symbol occurrences.
// Return all gene symbols in an array.
function captureGenes(s) {
    return s ? captureBase(s, /(?:^|,|\s*)([a-zA-Z](?:\w)*)(?=,|\s*|$)/gi, true) : null;
}

// Given a string, find all the comma-separated PMID occurrences.
// Return all PMIDs in an array.
function capturePmids(s) {
    return s ? captureBase(s, /(?:^|,|\s*)(\d{1,8})(?=,|\s*|$)/gi) : null;
}

function captureHpoid(s) {
    var match = s.toUpperCase().match(/^ *(HP:\d{7}) *$/i);
    return match ? match[1] : null;
}


// Family Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyName = function() {
    var family = this.state.family;

    return (
        <div className="row">
            <Input type="text" ref="familyname" label="Family Name:" value={family.label}
                error={this.getFormError('familyname')} clearError={this.clrFormErrors.bind(null, 'familyname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5">Note: If there is more than one family with IDENTICAL information, you can indicate this at the bottom of this form.</p>
        </div>
    );
};


// If the Family is being edited (we know this because there was a family
// UUID in the query string), then don’t present the ability to specify multiple families.
var FamilyCount = function() {
    var family = this.state.family;

    return (
        <div>
            <p className="col-sm-7 col-sm-offset-5">
                If more than one family has exactly the same information entered above and is associated with the same variants, you can specify how many extra copies of this
                family to make with this drop-down menu to indicate how many <em>extra</em> copies of this family to make when you submit this form, and specify the names
                of each extra family below that.
            </p>
            <Input type="select" ref="extrafamilycount" label="Number of extra identical Families to make:" defaultValue="0" handleChange={this.extraFamilyCountChanged}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                {_.range(11).map(function(count) { return <option key={count}>{count}</option>; })}
            </Input>
            {_.range(this.state.extraFamilyCount).map(i => {
                return (
                    <Input key={i} type="text" ref={'extrafamilyname' + i} label={'Family Name ' + (i + 2)}
                        error={this.getFormError('extrafamilyname' + i)} clearError={this.clrFormErrors.bind(null, 'extrafamilyname' + i)}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
                );
            })}
        </div>
    );
};


// Common diseases group curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyCommonDiseases = function() {
    var family = this.state.family;
    var orphanetidVal, hpoidVal, nothpoidVal;

    if (family) {
        orphanetidVal = family.commonDiagnosis ? family.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join() : null;
        hpoidVal = family.hpoIdInDiagnosis ? family.hpoIdInDiagnosis.join() : null;
        nothpoidVal = family.hpoIdInElimination ? family.hpoIdInElimination.join() : null;
    }

    return (
        <div className="row">
            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15"
                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" required />
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={family.termsInDiagnosis}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Family</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={family.termsInElimination}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span><a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> Common Disease(s) in Family:</span>;
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
                Phenotype(s) <span style={{fontWeight: 'normal'}}>(HPO ID(s); <a href="http://compbio.charite.de/phenexplorer/" target="_blank" title="PhenExplorer home page in a new tab">PhenExplorer</a>)</span>:
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

// Demographics family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyDemographics = function() {
    var family = this.state.family;

    return (
        <div className="row">
            <Input type="text" ref="malecount" label="# males:" format="number" value={family.numberOfMale}
                error={this.getFormError('malecount')} clearError={this.clrFormErrors.bind(null, 'malecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="femalecount" label="# females:" format="number" value={family.numberOfFemale}
                error={this.getFormError('femalecount')} clearError={this.clrFormErrors.bind(null, 'femalecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={family.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={family.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Hispanic or Latino</option>
                <option>Not Hispanic or Latino</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={family.race}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
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
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none" value={family.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none" disabled="disabled">Select</option>
                    <option disabled="disabled"></option>
                    <option>Onset</option>
                    <option>Report</option>
                    <option>Diagnosis</option>
                    <option>Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="text" ref="agefrom" inputClassName="input-inline" groupClassName="form-group-inline group-age-input" format="number"
                        error={this.getFormError('agefrom')} clearError={this.clrFormErrors.bind(null, 'agefrom')} value={family.ageRangeFrom} />
                    <span className="group-age-inter">to</span>
                    <Input type="text" ref="ageto" inputClassName="input-inline" groupClassName="form-group-inline group-age-input" format="number"
                        error={this.getFormError('ageto')} clearError={this.clrFormErrors.bind(null, 'ageto')} value={family.ageRangeTo} />
                </Input>
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={family.ageRangeUnit}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none" disabled="disabled">Select</option>
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


// Methods family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyMethods = function() {
    var family = this.state.family;
    var method = (family.method && Object.keys(family.method).length) ? family.method : {};

    return (
        <div className="row">
            <Input type="select" ref="prevtesting" label="Previous Testing:" defaultValue="none" value={method.previousTesting}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="textarea" ref="prevtestingdesc" label="Description of Previous Testing:" rows="5" value={method.previousTestingDescription}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="genomewide" label="Genome-wide Study?:" defaultValue="none" value={method.genomeWideStudy}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Genotyping Method</h4>
            <Input type="select" ref="genotypingmethod1" label="Method 1:" handleChange={this.handleChange} defaultValue="none" value={method.genotypingMethods && method.genotypingMethods[0] ? method.genotypingMethods[0] : null}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Exome sequencing</option>
                <option>Genotyping</option>
                <option>HRM</option>
                <option>PCR</option>
                <option>Sanger</option>
                <option>Whole genome shotgun sequencing</option>
            </Input>
            <Input type="select" ref="genotypingmethod2" label="Method 2:" defaultValue="none" value={method.genotypingMethods && method.genotypingMethods[1] ? method.genotypingMethods[1] : null}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={this.state.genotyping2Disabled}>
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Exome sequencing</option>
                <option>Genotyping</option>
                <option>HRM</option>
                <option>PCR</option>
                <option>Sanger</option>
                <option>Whole genome shotgun sequencing</option>
            </Input>
            <Input type="select" ref="entiregene" label="Entire gene sequenced?:" defaultValue="none" value={method.entireGeneSequenced}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="select" ref="copyassessed" label="Copy number assessed?:" defaultValue="none" value={method.copyNumberAssessed}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="select" ref="mutationsgenotyped" label="Specific Mutations Genotyped?:" defaultValue="none" value={method.specificMutationsGenotyped}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="textarea" ref="specificmutation" label="Method by which Specific Mutations Genotyped:" rows="5" value={method.specificMutationsGenotypedMethod}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="additionalinfomethod" label="Additional Information about Family Method:" rows="8" value={method.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// Segregation family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilySegregation = function() {
    var family = this.state.family;
    var segregation = (family.segregation && Object.keys(family.segregation).length) ? family.segregation : {};

    return (
        <div className="row">
            <Input type="textarea" ref="pedigreedesc" label="Pedigree description:" rows="5" value={segregation.pedigreeDescription}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="pedigreesize" label="Pedigree size:" format="number" value={segregation.pedigreeSize}
                error={this.getFormError('pedigreesize')} clearError={this.clrFormErrors.bind(null, 'pedigreesize')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="nogenerationsinpedigree" label="# generations in pedigree:" format="number" value={segregation.numberOfGenerationInPedigree}
                error={this.getFormError('nogenerationsinpedigree')} clearError={this.clrFormErrors.bind(null, 'nogenerationsinpedigree')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="consanguineous" label="Consanguineous family?:" defaultValue="none" value={segregation.consanguineousFamily}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="text" ref="nocases" label="# cases (phenotype positive):" format="number" value={segregation.numberOfCases}
                error={this.getFormError('nocases')} clearError={this.clrFormErrors.bind(null, 'nocases')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="denovo" label="de novo type:" defaultValue="none" value={segregation.deNovoType}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Inferred</option>
                <option>Confirmed</option>
            </Input>
            <Input type="select" ref="unaffectedcarriers" label="Are parents unaffected carriers?" defaultValue="none" value={segregation.numberOfParentsUnaffectedCarriers}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>0</option>
                <option>1</option>
                <option>2</option>
            </Input>
            <Input type="text" ref="noaffected" label="# affected individuals:" format="number" value={segregation.numberOfAffectedAlleles}
                error={this.getFormError('noaffected')} clearError={this.clrFormErrors.bind(null, 'noaffected')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="noaffected1" label="# affected with 1 variant:" format="number" value={segregation.numberOfAffectedWithOneVariant}
                error={this.getFormError('noaffected1')} clearError={this.clrFormErrors.bind(null, 'noaffected1')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="noaffected2" label="# affected with 2 variants or homozygous for 1:" format="number" value={segregation.numberOfAffectedWithTwoVariants}
                error={this.getFormError('noaffected2')} clearError={this.clrFormErrors.bind(null, 'noaffected2')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="nounaffectedcarriers" label="# unaffected carriers:" format="number" value={segregation.numberOfUnaffectedCarriers}
                error={this.getFormError('nounaffectedcarriers')} clearError={this.clrFormErrors.bind(null, 'nounaffectedcarriers')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="nounaffectedindividuals" label="# unaffected individuals:" format="number" value={segregation.numberOfUnaffectedIndividuals}
                error={this.getFormError('nounaffectedindividuals')} clearError={this.clrFormErrors.bind(null, 'nounaffectedindividuals')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="bothvariants" label="If more than 1 variant, is proband associated with both?" defaultValue="none" value={segregation.probandAssociatedWithBoth}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none" disabled="disabled">Select</option>
                <option disabled="disabled"></option>
                <option>Yes</option>
                <option>No</option>
            </Input>
            <Input type="textarea" ref="addedsegregationinfo" label="Additional Segregation Information:" rows="5" value={segregation.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};


// Additional Information family curation panel. Call with .call(this) to run in the same context
// as the calling component.
var FamilyAdditional = function() {
    var otherpmidsVal;
    var family = this.state.family;
    if (Object.keys(family).length) {
        otherpmidsVal = family.otherPMIDs ? family.otherPMIDs.map(function(article) { return article.pmid; }).join() : null;
    }

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfofamily" label="Additional Information about Family:" rows="5" value={family.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same family:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">
                Note: Any variants associated with the proband in this Family that were captured above will be counted as
                probands — the proband does not need to be captured at the Individual level unless there is additional
                information about the proband that you’d like to capture (e.g. phenotype, methods). Additional information
                about other individuals in the Family may also be captured at the Individual level (including any additional
                variant information).
            </p>
        </div>
    );
};


var FamilyViewer = React.createClass({
    render: function() {
        var context = this.props.context;
        var method = context.method;
        var segregation = context.segregation;

        return (
            <div className="container">
                <div className="row group-curation-content">
                    <h1>{context.label}</h1>
                    <Panel title="Common diseases &amp; phenotypes" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Orphanet Common Diagnosis</dt>
                                <dd>
                                    {context.commonDiagnosis.map(function(disease, i) {
                                        return (
                                            <span key={disease.orphaNumber}>
                                                {i > 0 ? ', ' : ''}
                                                {'ORPHA' + disease.orphaNumber}
                                            </span>
                                        );
                                    })}
                                </dd>
                            </div>

                            <div>
                                <dt>HPO IDs</dt>
                                <dd>{context.hpoIdInDiagnosis.join(', ')}</dd>
                            </div>

                            <div>
                                <dt>Phenotype Terms</dt>
                                <dd>{context.termsInDiagnosis}</dd>
                            </div>

                            <div>
                                <dt>NOT HPO IDs</dt>
                                <dd>{context.hpoIdInElimination.join(', ')}</dd>
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

                    <Panel title="Group — Methods" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Previous testing</dt>
                                <dd>{method && method.previousTesting}</dd>
                            </div>

                            <div>
                                <dt>Description of previous testing</dt>
                                <dd>{method && method.previousTestingDescription}</dd>
                            </div>

                            <div>
                                <dt>Genome-wide study</dt>
                                <dd>{method && method.genomeWideStudy}</dd>
                            </div>

                            <div>
                                <dt>Genotyping methods</dt>
                                <dd>{method && method.genotypingMethods.join(', ')}</dd>
                            </div>

                            <div>
                                <dt>Entire gene sequenced</dt>
                                <dd>{method && method.entireGeneSequenced}</dd>
                            </div>

                            <div>
                                <dt>Copy number assessed</dt>
                                <dd>{method && method.copyNumberAssessed}</dd>
                            </div>

                            <div>
                                <dt>Specific Mutations Genotyped</dt>
                                <dd>{method && method.specificMutationsGenotyped}</dd>
                            </div>

                            <div>
                                <dt>Method by which Specific Mutations Genotyped</dt>
                                <dd>{method && method.specificMutationsGenotypedMethod}</dd>
                            </div>

                            <div>
                                <dt>Additional Information about Group Method</dt>
                                <dd>{method && method.additionalInformation}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Group — Segregation" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Pedigree description</dt>
                                <dd>{segregation && segregation.pedigreeDescription}</dd>
                            </div>

                            <div>
                                <dt>Pedigree size</dt>
                                <dd>{segregation && segregation.pedigreeSize}</dd>
                            </div>

                            <div>
                                <dt># generations in pedigree</dt>
                                <dd>{segregation && segregation.numberOfGenerationInPedigree}</dd>
                            </div>

                            <div>
                                <dt>Consanguineous family</dt>
                                <dd>{segregation && segregation.consanguineousFamily}</dd>
                            </div>

                            <div>
                                <dt># cases (phenotype positive)</dt>
                                <dd>{segregation && segregation.numberOfCases}</dd>
                            </div>

                            <div>
                                <dt>de novo type</dt>
                                <dd>{segregation && segregation.deNovoType}</dd>
                            </div>

                            <div>
                                <dt>Are parents unaffected carriers</dt>
                                <dd>{segregation && segregation.numberOfParentsUnaffectedCarriers}</dd>
                            </div>

                            <div>
                                <dt># affected individuals</dt>
                                <dd>{segregation && segregation.numberOfAffectedAlleles}</dd>
                            </div>

                            <div>
                                <dt># affected with 1 variant</dt>
                                <dd>{segregation && segregation.numberOfAffectedWithOneVariant}</dd>
                            </div>

                            <div>
                                <dt># affected with 2 variants or homozygous for 1</dt>
                                <dd>{segregation && segregation.numberOfAffectedWithTwoVariants}</dd>
                            </div>

                            <div>
                                <dt># unaffected carriers</dt>
                                <dd>{segregation && segregation.numberOfUnaffectedCarriers}</dd>
                            </div>

                            <div>
                                <dt># unaffected individuals</dt>
                                <dd>{segregation && segregation.numberOfUnaffectedIndividuals}</dd>
                            </div>

                            <div>
                                <dt>If more than 1 variant, is proband associated with both</dt>
                                <dd>{segregation && segregation.probandAssociatedWithBoth}</dd>
                            </div>

                            <div>
                                <dt>Additional Segregation information</dt>
                                <dd>{segregation && segregation.additionalInformation}</dd>
                            </div>
                        </dl>
                    </Panel>

                    <Panel title="Family — Additional Information" panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Additional Information about Family</dt>
                                <dd>{context.additionalInformation}</dd>
                            </div>

                            <dt>Other PMID(s) that report evidence about this same Family</dt>
                            <dd>{context.otherPMIDs && context.otherPMIDs.map(function(article, i) {
                                return (
                                    <span key={i}>
                                        {i > 0 ? ', ' : ''}
                                        {article.pmid}
                                    </span>
                                );
                            })}</dd>
                        </dl>
                    </Panel>
                </div>
            </div>
        );
    }
});

globals.content_views.register(FamilyViewer, 'family');
