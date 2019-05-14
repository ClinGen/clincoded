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
import { AddResourceId } from './add_external_resource';
import * as CuratorHistory from './curator_history';
import * as methods from './methods';
import { makeStarterIndividual, updateProbandVariants, recordIndividualHistory } from './individual_curation';
import ModalComponent from '../libs/bootstrap/modal';
import { FamilyDisease, FamilyProbandDisease } from './disease';
import { renderVariantLabelAndTitle } from '../libs/render_variant_label_title';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const PmidDoiButtons = curator.PmidDoiButtons;
const DeleteButton = curator.DeleteButton;
import * as Assessments from './assessment';
const AssessmentTracker = Assessments.AssessmentTracker;
const AssessmentPanel = Assessments.AssessmentPanel;
const AssessmentMixin = Assessments.AssessmentMixin;

const MAX_VARIANTS = 2;

// Maps segregation field refs to schema properties
var formMapSegregation = {
    'SEGnumberOfAffectedWithGenotype': 'numberOfAffectedWithGenotype',
    'SEGnumberOfUnaffectedWithoutBiallelicGenotype': 'numberOfUnaffectedWithoutBiallelicGenotype',
    'SEGnumberOfSegregationsForThisFamily': 'numberOfSegregationsForThisFamily',
    'SEGinconsistentSegregationAmongstTestedIndividuals': 'inconsistentSegregationAmongstTestedIndividuals',
    'SEGexplanationForInconsistent': 'explanationForInconsistent',
    'SEGmoiDisplayedForFamily': 'moiDisplayedForFamily',
    'SEGfamilyConsanguineous': 'familyConsanguineous',
    'SEGpedigreeLocation': 'pedigreeLocation',
    'SEGlodPublished': 'lodPublished',
    'SEGpublishedLodScore': 'publishedLodScore',
    'SEGestimatedLodScore': 'estimatedLodScore',
    'SEGincludeLodScoreInAggregateCalculation': 'includeLodScoreInAggregateCalculation',
    'SEGsequencingMethod': 'sequencingMethod',
    'SEGreasonExplanation': 'reasonExplanation',
    'SEGaddedsegregationinfo': 'additionalInformation'
};

var initialCv = {
    assessmentTracker: null, // Tracking object for a single assessment
    filledSegregations: {}, // Tracks segregation fields with values filled in
    segregationAssessed: false, // TRUE if segregation has been assessed by self or others
    othersAssessed: false // TRUE if other curators have assessed the family's segregation
};


var FamilyCuration = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, AssessmentMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func
    },

    cv: initialCv,

    // Keeps track of values from the query string
    queryValues: {},

    propTypes: {
        session: PropTypes.object,
        href: PropTypes.string
    },

    getInitialState: function() {
        this.cv.assessmentTracker = initialCv;

        return {
            gdm: null, // GDM object given in query string
            group: null, // Group object given in query string
            family: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            annotation: null, // Annotation object given in query string
            extraFamilyCount: 0, // Number of extra families to create
            extraFamilyNames: [], // Names of extra families to create
            variantCount: 0, // Number of variants loaded
            variantInfo: {}, // Extra holding info for variant display
            probandIndividual: null, //Proband individual if the family being edited has one
            familyName: '', // Currently entered family name
            familyMoiDisplayed: null,
            individualRequired: false, // Boolean for set up requirement of proband
            individualName: '', // Proband individual name
            isSemidominant: null, // True if Family MOI question returns Semidominant
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            segregationFilled: false, // True if at least one segregation field has a value
            submitBusy: false, // True while form is submitting
            recessiveZygosity: null, // Indicates which zygosity checkbox should be checked, if any
            lodPublished: null, // Switch to show either calculated or estimated LOD score
            estimatedLodScore: null, // track estimated LOD value
            publishedLodScore: null, // track published LOD value
            includeLodScore: false,
            lodLocked: true, // indicate whether or not the LOD score field should be user-editable or not
            lodCalcMode: null, // track which type of calculation we should do for LOD score, if applicable
            diseaseObj: {},
            diseaseUuid: null,
            diseaseError: null,
            probandDiseaseObj: {},
            probandDiseaseUuid: null,
            probandDiseaseError: null
        };
    },

    // Handle value changes in various form fields
    handleChange: function(ref, e) {
        var clinvarid, othervariant;

        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            // Disable the Genotyping Method 2 if Genotyping Method 1 has no value
            this.setState({genotyping2Disabled: this.refs[ref].getValue() === 'none'});
        } else if (ref === 'familyname') {
            this.setState({familyName: this.refs[ref].getValue()});
        } else if (ref === 'individualname') {
            this.setState({
                individualName: this.refs['individualname'].getValue()
            }, () => {
                if (this.state.individualName || (this.state.probandDiseaseObj && this.state.probandDiseaseObj['diseaseId'])) {
                    this.setState({individualRequired: true});
                } else if (!this.state.individualName && (this.state.probandDiseaseObj && !Object.keys(this.state.probandDiseaseObj).length)) {
                    this.setState({individualRequired: false});
                }
            });
        } else if (ref === 'SEGlodPublished') {
            let lodPublished = this.refs[ref].getValue();
            // Find out whether there is pre-existing score in db
            let publishedLodScore;
            if (this.state.family && this.state.family.segregation && this.state.family.segregation.publishedLodScore) {
                publishedLodScore = this.state.family.segregation.publishedLodScore;
            }
            if (lodPublished === 'Yes') {
                this.setState({lodPublished: 'Yes', publishedLodScore: publishedLodScore ? publishedLodScore : null, includeLodScore: false}, () => {
                    if (!this.state.publishedLodScore) {
                        this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
                    }
                });
            } else if (lodPublished === 'No') {
                this.setState({lodPublished: 'No', publishedLodScore: null, includeLodScore: false});
                if (!this.state.estimatedLodScore) {
                    this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
                }
            } else {
                this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
                this.setState({lodPublished: null, publishedLodScore: null, includeLodScore: false});
            }
        } else if (ref === 'SEGincludeLodScoreInAggregateCalculation') {
            let includeLodScore = this.refs[ref].getValue();
            this.setState({includeLodScore: includeLodScore === 'Yes' ? true : false});
            
        } else if (ref === 'zygosityHomozygous') {
            if (this.refs[ref].toggleValue()) {
                this.setState({recessiveZygosity: 'Homozygous'});
                this.refs['zygosityHemizygous'].resetValue();
            } else {
                this.setState({recessiveZygosity: null});
            }
        } else if (ref === 'zygosityHemizygous') {
            if (this.refs[ref].toggleValue()) {
                this.setState({recessiveZygosity: 'Hemizygous'});
                this.refs['zygosityHomozygous'].resetValue();
            } else {
                this.setState({recessiveZygosity: null});
            }
        } else if (ref === 'SEGmoiDisplayedForFamily') {
            let familyMoiDisplayed =  this.refs[ref].getValue();
            if (familyMoiDisplayed === 'Autosomal dominant/X-linked') {
                this.setState({lodLocked: true, lodCalcMode: 'ADX', familyMoiDisplayed: familyMoiDisplayed, isSemidominant: false})
            } else if (familyMoiDisplayed === 'Autosomal recessive') {
                this.setState({lodLocked: true, lodCalcMode: 'AR', familyMoiDisplayed: familyMoiDisplayed, isSemidominant: false})
            } else if (familyMoiDisplayed === 'Semidominant') {
                this.setState({lodLocked: false, lodCalcMode: null, familyMoiDisplayed: familyMoiDisplayed, isSemidominant: true});
            } else {
                this.setState({lodLocked: false, lodCalcMode: null, familyMoiDisplayed: familyMoiDisplayed, isSemidominant: false})
            }
        } else if (ref === 'SEGlodRequirements') {
            // Handle LOD score based on family requirements question if semidominant
            let lodRequirements = this.refs[ref].getValue();
            if (lodRequirements === 'Yes - autosomal dominant/X-linked') {
                this.setState({lodLocked: true, lodCalcMode: 'ADX'});
            } else if (lodRequirements === 'Yes - autosomal recessive') {
                this.setState({lodLocked: true, lodCalcMode: 'AR'});
            }
        } else if (ref.substring(0,3) === 'SEG') {
            // Handle segregation fields to see if we should enable or disable the assessment dropdown
            var value = this.refs[ref].getValue();
            if (this.refs[ref].props.type === 'select') {
                value = value === 'none' ? '' : value;
            }
            if (value !== '') {
                // A segregation field has a value; remember this field
                this.cv.filledSegregations[ref] = true;
            } else {
                // A segregation field lost its value; if we had remembered it, forget it
                if (this.cv.filledSegregations[ref]) {
                    delete this.cv.filledSegregations[ref];
                }
            }

            // Update states for LOD scores; reset SEGincludeLodScoreInAggregateCalculation dropdown if blank
            if (ref === 'SEGestimatedLodScore') {
                let estimatedLodScore = this.refs[ref].getValue();
                this.setState({estimatedLodScore: estimatedLodScore});
                if (estimatedLodScore == '') {
                    this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
                }
            }
            if (ref === 'SEGpublishedLodScore') {
                let publishedLodScore = this.refs[ref].getValue();
                this.setState({publishedLodScore: publishedLodScore});
                if (publishedLodScore == '') {
                    this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
                }
            }

            // Update Estimated LOD if it should be automatically calculated
            if (this.state.lodLocked && (ref === 'SEGnumberOfAffectedWithGenotype'
                || ref === 'SEGnumberOfUnaffectedWithoutBiallelicGenotype'
                || ref === 'SEGnumberOfSegregationsForThisFamily')) {
                this.calculateEstimatedLOD(
                    this.state.lodCalcMode,
                    this.refs['SEGnumberOfAffectedWithGenotype'].getValue(),
                    this.refs['SEGnumberOfUnaffectedWithoutBiallelicGenotype'].getValue(),
                    this.refs['SEGnumberOfSegregationsForThisFamily'].getValue()
                );
            }

            // Now change the state of the assessment dropdown if needed
            // Also force assessment value goes back to Not Assessed when deleting all segregation data
            var filled = Object.keys(this.cv.filledSegregations).length > 0;
            if (this.state.segregationFilled !== filled) {
                this.setState({segregationFilled: filled});
                this.cv.assessmentTracker.currentVal = 'Not Assessed';
                this.updateAssessmentValue(this.cv.assessmentTracker, 'Not Assessed');
            }
        }        
    },

    /**
     * Handle a click on a copy phenotype button
     * @param {*} e - Event
     */
    handleCopyGroupPhenotypes(e) {
        e.preventDefault(); e.stopPropagation();
        var associatedGroups;
        var hpoIds = '';
        var hpoFreeText = '';
        if (this.state.group) {
            // We have a group, so get the disease array from it.
            associatedGroups = [this.state.group];
        } else if (this.state.family && this.state.family.associatedGroups && this.state.family.associatedGroups.length) {
            // We have a family with associated groups. Combine the diseases from all groups.
            associatedGroups = this.state.family.associatedGroups;
        }
        if (associatedGroups && associatedGroups.length > 0) {
            hpoIds = associatedGroups.map(function(associatedGroup, i) {
                if (associatedGroup.hpoIdInDiagnosis && associatedGroup.hpoIdInDiagnosis.length) {
                    return (
                        associatedGroup.hpoIdInDiagnosis.map(function(hpoid, i) {
                            return (hpoid);
                        }).join(', ')
                    );
                }
            });
            if (hpoIds.length) {
                this.refs['hpoid'].setValue(hpoIds.join(', '));
            }
            hpoFreeText = associatedGroups.map(function(associatedGroup, i) {
                if (associatedGroup.termsInDiagnosis) {
                    return associatedGroup.termsInDiagnosis;
                }
            });
            if (hpoFreeText !== '') {
                this.refs['phenoterms'].setValue(hpoFreeText.join(', '));
            }
        }
    },

    // Handle a click on a copy demographics button
    handleCopyGroupDemographics(e) {
        e.preventDefault(); e.stopPropagation();
        var associatedGroups;

        // Retrieve associated group as an array
        if (this.state.group) {
            associatedGroups = [this.state.group];
        } else if (this.state.family && this.state.family.associatedGroups && this.state.family.associatedGroups.length) {
            associatedGroups = this.state.family.associatedGroups;
        }

        // Copy demographics data from associated group to form fields
        // When displaying associated group data (as part of rendering the family form), only one group is
        // considered.  So, only that same group (the first) is used here.  Also, the demographics form
        // fields are drop-down lists (single selection), so only one value is needed for each field.
        if (associatedGroups[0].countryOfOrigin) {
            this.refs['country'].setValue(associatedGroups[0].countryOfOrigin);
        }

        if (associatedGroups[0].ethnicity) {
            this.refs['ethnicity'].setValue(associatedGroups[0].ethnicity);
        }

        if (associatedGroups[0].race) {
            this.refs['race'].setValue(associatedGroups[0].race);
        }
    },

    // Calculate estimated LOD for Autosomal dominant and Autosomal recessive GDMs
    calculateEstimatedLOD: function(lodCalcMode, numAffected=0, numUnaffected=0, numSegregation=0) {
        let estimatedLodScore = null;
        if (lodCalcMode === 'ADX') {
            // LOD scoring if GDM is Autosomal dominant or X-Linked
            if (numSegregation !== '') {
                numSegregation = parseInt(numSegregation);
                estimatedLodScore = Math.log(1 / Math.pow(0.5, numSegregation)) / Math.log(10);
            }
        } else if (lodCalcMode === 'AR') {
            // LOD scoring if GDM is Autosomal recessive
            if (numAffected !== '' && numUnaffected !== '') {
                numAffected = parseInt(numAffected);
                numUnaffected = parseInt(numUnaffected);
                estimatedLodScore = Math.log(1 / (Math.pow(0.25, numAffected - 1) * Math.pow(0.75, numUnaffected))) / Math.log(10);
            }
        }
        if (lodCalcMode === 'ADX' || lodCalcMode === 'AR') {
            if (estimatedLodScore && !isNaN(estimatedLodScore)) {
                estimatedLodScore = parseFloat(estimatedLodScore.toFixed(2));
            } else {
                estimatedLodScore = '';
            }
            // Update state and form field if relevant
            this.setState({estimatedLodScore: estimatedLodScore});
            if (this.refs['SEGestimatedLodScore']) {
                this.refs['SEGestimatedLodScore'].setValue(estimatedLodScore);
            }
            // Reset the SEGincludeLodScoreInAggregateCalculation dropdown if there is no calculated estimated lod score
            if (!estimatedLodScore && this.refs['SEGincludeLodScoreInAggregateCalculation']) {
                this.refs['SEGincludeLodScoreInAggregateCalculation'].resetValue();
            }
        }
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var familyUuid = this.queryValues.familyUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/groups/' + groupUuid : '',
            familyUuid ? '/families/' + familyUuid: '',
            annotationUuid ? '/evidence/' + annotationUuid : ''
        ]);

        // With all given query string variables, get the corresponding objects from the DB.
        this.getRestDatas(
            uris
        ).then(datas => {
            var user = this.props.session && this.props.session.user_properties;
            var userAssessment;

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

            // Update the LOD locked and calculation modes
            if (stateObj.gdm && stateObj.gdm.modeInheritance) {
                if (stateObj.gdm.modeInheritance.indexOf('Autosomal dominant') > -1 || stateObj.gdm.modeInheritance.indexOf('X-linked inheritance') > -1) {
                    stateObj.lodLocked = true;
                    stateObj.lodCalcMode = 'ADX';
                } else if (stateObj.gdm.modeInheritance.indexOf('Autosomal recessive') > -1) {
                    stateObj.lodLocked = true;
                    stateObj.lodCalcMode = 'AR';
                } else {
                    stateObj.lodLocked = false;
                }
            }

            // Update LOD locked and calculation modes based on family moi question for semidom
            if (stateObj.family.segregation && stateObj.family.segregation.moiDisplayedForFamily) {
                if (stateObj.family.segregation.moiDisplayedForFamily.indexOf('Autosomal dominant/X-linked') > -1) {
                    stateObj.lodLocked = true;
                    stateObj.lodCalcMode = 'ADX';
                    stateObj.isSemidominant = false;
                } else if (stateObj.family.segregation.moiDisplayedForFamily.indexOf('Autosomal recessive') > -1) {
                    stateObj.lodLocked = true;
                    stateObj.lodCalcMode = 'AR';
                    stateObj.isSemidominant = false;
                } else if (stateObj.family.segregation.moiDisplayedForFamily.indexOf('Semidominant') > -1) {
                    stateObj.lodlocked = false;
                    stateObj.isSemidominant = true;
                    this.setState({isSemidominant: true})
                } else {
                    stateObj.lodLocked = false;
                    stateObj.isSemidominant = false;
                }
            }

            // Update the family name
            if (stateObj.family) {
                this.setState({familyName: stateObj.family.label});

                if (stateObj.family.commonDiagnosis && stateObj.family.commonDiagnosis.length > 0) {
                    this.setState({diseaseObj: stateObj.family['commonDiagnosis'][0]});
                }

                // Load the previously stored 'Published Calculated LOD score' if any
                stateObj.publishedLodScore = stateObj.family.segregation.publishedLodScore ? stateObj.family.segregation.publishedLodScore : null;
                // Calculate LOD from stored values, if applicable...
                if (stateObj.lodLocked) {
                    this.calculateEstimatedLOD(
                        stateObj.lodCalcMode,
                        stateObj.family.segregation.numberOfAffectedWithGenotype ? stateObj.family.segregation.numberOfAffectedWithGenotype : null,
                        stateObj.family.segregation.numberOfUnaffectedWithoutBiallelicGenotype ? stateObj.family.segregation.numberOfUnaffectedWithoutBiallelicGenotype : null,
                        stateObj.family.segregation.numberOfSegregationsForThisFamily ? stateObj.family.segregation.numberOfSegregationsForThisFamily : null
                    );
                } else {
                    // ... otherwise, show the stored LOD score, if available
                    stateObj.estimatedLodScore = stateObj.family.segregation.estimatedLodScore ? stateObj.family.segregation.estimatedLodScore : null;
                }
            }

            if (stateObj.family) {
                // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
                stateObj.genotyping2Disabled = !(stateObj.family.method && stateObj.family.method.genotypingMethods && stateObj.family.method.genotypingMethods.length);
                // See if any associated individual is a proband
                if (stateObj.family.individualIncluded.length) {
                    stateObj.probandIndividual = _(stateObj.family.individualIncluded).find(function(individual) {
                        return individual.proband;
                    });
                }
                // See if we need to disable the Add Variant button based on the number of variants configured
                var segregation = stateObj.family.segregation;
                if (segregation) {
                    // Adjust the form for incoming variants
                    if (segregation.variants && segregation.variants.length) {
                        // We have variants
                        stateObj.variantCount = segregation.variants.length;
                        stateObj.variantInfo = {};
                        // For each incoming variant, set the form value
                        for (var i = 0; i < segregation.variants.length; i++) {
                            if (segregation.variants[i].clinvarVariantId || segregation.variants[i].carId) {
                                stateObj.variantInfo[i] = {
                                    'clinvarVariantId': segregation.variants[i].clinvarVariantId,
                                    'clinvarVariantTitle': segregation.variants[i].clinvarVariantTitle,
                                    'carId': segregation.variants[i].carId ? segregation.variants[i].carId : null,
                                    'canonicalTranscriptTitle': segregation.variants[i].canonicalTranscriptTitle ? segregation.variants[i].canonicalTranscriptTitle : null,
                                    'hgvsNames': segregation.variants[i].hgvsNames ? segregation.variants[i].hgvsNames : null,
                                    'uuid': segregation.variants[i].uuid // Needed for links to variant assessment/curation
                                };
                            }
                        }
                    }
                    if (segregation.lodPublished === true) {
                        this.setState({lodPublished: 'Yes'});
                    } else if (segregation.lodPublished === false) {
                        this.setState({lodPublished: 'No'});
                    } else if (segregation.lodPublished === null || typeof segregation.lodPublished === 'undefined') {
                        this.setState({lodPublished: null});
                    }
                    // Check whether a saved LOD score is included for classification calculation
                    if (segregation.includeLodScoreInAggregateCalculation) {
                        this.setState({includeLodScore: true});
                    }

                    // Find the current user's segregation assessment from the segregation's assessment list
                    if (segregation.assessments && segregation.assessments.length) {
                        // Find the assessment belonging to the logged-in curator, if any.
                        userAssessment = Assessments.userAssessment(segregation.assessments, user && user.uuid);
                        // See if any assessments are non-default
                        this.cv.segregationAssessed = _(segregation.assessments).find(function(assessment) {
                            return assessment.value !== Assessments.DEFAULT_VALUE;
                        });

                        // See if others have assessed
                        if (user && user.uuid) {
                            this.cv.othersAssessed = Assessments.othersAssessed(segregation.assessments, user.uuid);
                        }
                    }
                    if (stateObj.probandIndividual) {
                        /*****************************************************/
                        /* Show "Add 2nd variant" button if "Heterozygous"   */
                        /* was previously selected but no 2nd variant added  */
                        /*****************************************************/
                        let probandIndividual = stateObj.probandIndividual;
                        if (probandIndividual.recessiveZygosity && probandIndividual.recessiveZygosity.length) {
                            this.setState({recessiveZygosity: probandIndividual.recessiveZygosity});
                        }
                    }
                    // Fill in the segregation filled object so we know whether to enable or disable the assessment dropdown
                    Object.keys(formMapSegregation).forEach(formRef => {
                        if (segregation.hasOwnProperty(formMapSegregation[formRef])) {
                            this.cv.filledSegregations[formRef] = true;
                        }
                    });

                    // Note whether any segregation fields were set so the assessment dropdown is set properly on load
                    stateObj.segregationFilled = Object.keys(this.cv.filledSegregations).length > 0;
                }
            }

            // Make a new tracking object for the current assessment. Either or both of the original assessment or user can be blank
            // and assigned later. Then set the component state's assessment value to the assessment's value -- default if there was no
            // assessment.
            var assessmentTracker = this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');
            this.setAssessmentValue(assessmentTracker);

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No annotation; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e, e.statusText, e.url);
        });
    },

    // Called when user changes the number of copies of family
    extraFamilyCountChanged: function(ref, e) {
        this.setState({extraFamilyCount: e.target.value});
    },

    // Write a family object to the DB.
    writeFamilyObj: function(newFamily, familyLabel) {
        var methodPromise; // Promise from writing (POST/PUT) a method to the DB

        // Get a new family object ready for writing. Modify a copy of it instead
        // of the one we were given.
        var writerFamily = _.clone(newFamily);
        if (familyLabel) {
            writerFamily.label = familyLabel;
        }

        // If a method and/or segregation object was created (at least one method/segregation field set), assign it to the family.
        // If writing multiple family objects, reuse the one we made, but assign new methods and segregations because each family
        // needs unique objects here.
        var newMethod = methods.create.call(this);
        if (newMethod) {
            writerFamily.method = newMethod;
        }

        // Either update or create the family object in the DB
        if (this.state.family) {
            // We're editing a family. PUT the new family object to the DB to update the existing one.
            return this.putRestData('/families/' + this.state.family.uuid, writerFamily).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        } else {
            // We created a family; post it to the DB
            return this.postRestData('/families/', writerFamily).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }
    },

    // Called when a form is submitted.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            var currFamily = this.state.family;
            var newFamily = {}; // Holds the new group object;
            var familyDiseases = [], familyArticles, familyVariants = [], familyAssessments = [];
            var individualDiseases = [];
            var savedFamilies; // Array of saved written to DB
            var formError = false;
            var initvar = false; // T if edited family has variants for the first time, or if new family has variants
            var hadvar = false; // T if family had variants before being edited here.

            var pmids = curator.capture.pmids(this.getFormValue('otherpmids'));
            var hpoids = curator.capture.hpoids(this.getFormValue('hpoid'));
            var nothpoids = curator.capture.hpoids(this.getFormValue('nothpoid'));
            let recessiveZygosity = this.state.recessiveZygosity;

            /**
             * Proband disease is required if Proband name is not nil
             */
            if (this.state.individualName && (this.state.probandDiseaseObj && !Object.keys(this.state.probandDiseaseObj).length)) {
                formError = true;
                this.setState({probandDiseaseError: 'Required for proband'}, () => {
                    this.setFormErrors('probandDisease', 'Required for proband');
                });
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

            // Get variant uuid's if they were added via the modals
            for (var i = 0; i < MAX_VARIANTS; i++) {
                // Grab the values from the variant form panel
                var variantId = this.getFormValue('variantUuid' + i);

                // Build the search string depending on what the user entered
                if (variantId) {
                    // Make a search string for these terms
                    familyVariants.push('/variants/' + variantId);
                }
            }

            // Check that "Published Calculated LOD score" is greater than zero
            if (this.getFormValue('SEGlodPublished') === 'Yes') {
                const publishedLodScore = parseFloat(this.getFormValue('SEGpublishedLodScore'));

                if (!isNaN(publishedLodScore) && publishedLodScore <= 0) {
                    formError = true;
                    this.setFormErrors('SEGpublishedLodScore', 'The published calculated LOD score must be greater than 0');
                }
            }

            // Check that segregation sequencing type value is not 'none'
            // when LOD score is included for calculation
            if (this.getFormValue('SEGincludeLodScoreInAggregateCalculation') === 'Yes' && this.getFormValue('SEGsequencingMethod') === 'none') {
                formError = true;
                this.setFormErrors('SEGsequencingMethod', 'A sequencing method is required');
            }

            if (!formError) {
                let searchStr;
                this.setState({submitBusy: true});

                /**
                 * Retrieve disease from database. If not existed, add it to the database.
                 */
                let diseaseObj = this.state.diseaseObj;
                if (Object.keys(diseaseObj).length && diseaseObj.diseaseId) {
                    searchStr = '/search?type=disease&diseaseId=' + diseaseObj.diseaseId;
                } else {
                    searchStr = '';
                }
                this.getRestData(searchStr).then(diseaseSearch => {
                    if (Object.keys(diseaseSearch).length && diseaseSearch.hasOwnProperty('total')) {
                        let diseaseUuid;
                        if (diseaseSearch.total === 0) {
                            return this.postRestData('/diseases/', diseaseObj).then(result => {
                                let newDisease = result['@graph'][0];
                                diseaseUuid = newDisease['uuid'];
                                this.setState({diseaseUuid: diseaseUuid}, () => {
                                    familyDiseases.push(diseaseUuid);
                                    return Promise.resolve(result);
                                });
                            });
                        } else {
                            let _id = diseaseSearch['@graph'][0]['@id'];
                            diseaseUuid = _id.slice(10, -1);
                            this.setState({diseaseUuid: diseaseUuid}, () => {
                                familyDiseases.push(diseaseUuid);
                            });
                        }
                    } else {
                        return Promise.resolve(null);
                    }
                }, e => {
                    // The given disease couldn't be retrieved for some reason.
                    this.setState({submitBusy: false}); // submit error; re-enable submit button
                    this.setState({diseaseError: 'Error on validating disease.'});
                    throw e;
                }).then(diseases => {
                    // Check for individual disease if we have variants and no existing proband
                    if (!this.state.probandIndividual && this.state.individualRequired) {
                        /**
                         * Retrieve disease from database. If not existed, add it to the database.
                         */
                        let probandDiseaseObj = this.state.probandDiseaseObj;
                        if (Object.keys(probandDiseaseObj).length && probandDiseaseObj.diseaseId) {
                            searchStr = '/search?type=disease&diseaseId=' + probandDiseaseObj.diseaseId;
                        } else {
                            searchStr = '';
                        }
                        return this.getRestData(searchStr).then(diseaseSearch => {
                            if (Object.keys(diseaseSearch).length && diseaseSearch.hasOwnProperty('total')) {
                                let probandDiseaseUuid;
                                if (diseaseSearch.total === 0) {
                                    return this.postRestData('/diseases/', probandDiseaseObj).then(result => {
                                        let newDisease = result['@graph'][0];
                                        probandDiseaseUuid = newDisease['uuid'];
                                        this.setState({probandDiseaseUuid: probandDiseaseUuid}, () => {
                                            individualDiseases.push(probandDiseaseUuid);
                                            return Promise.resolve(result);
                                        });
                                    });
                                } else {
                                    let _id = diseaseSearch['@graph'][0]['@id'];
                                    probandDiseaseUuid = _id.slice(10, -1);
                                    this.setState({probandDiseaseUuid: probandDiseaseUuid}, () => {
                                        individualDiseases.push(probandDiseaseUuid);
                                    });
                                }
                            } else {
                                return Promise.resolve(null);
                            }
                        }, e => {
                            // The given disease couldn't be retrieved for some reason.
                            this.setState({submitBusy: false}); // submit error; re-enable submit button
                            this.setState({probandDiseaseError: 'Error on validating disease.'});
                            throw e;
                        });
                    } else {
                        return Promise.resolve(null);
                    }
                }).then(diseases => {
                    // Handle 'Add any other PMID(s) that have evidence about this same Group' list of PMIDs
                    if (pmids && pmids.length) {
                        // User entered at least one PMID
                        searchStr = '/search/?type=article&' + pmids.map(function(pmid) { return 'pmid=' + pmid; }).join('&');
                        return this.getRestData(searchStr).then(articles => {
                            if (articles['@graph'].length === pmids.length) {
                                // Successfully retrieved all PMIDs, so just set familyArticles and return
                                familyArticles = articles;
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
                                            familyArticles = articles;
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
                    var label, diseases;
                    /*****************************************/
                    /* Need to capture zygosity data and     */
                    /* pass into the individual object       */
                    /*****************************************/
                    let zygosity = this.state.recessiveZygosity;

                    // If we're editing a family, see if we need to update it and its proband individual
                    if (currFamily) {
                        if (currFamily.segregation && currFamily.segregation.variants && currFamily.segregation.variants.length) {
                            // The family being edited had variants; remember that for passing a query string var to family-submit
                            hadvar = true;
                        }

                        // If the family has a proband, update it to the current variant list, and then immediately on to creating a family.
                        if (this.state.probandIndividual) {
                            return updateProbandVariants(this.state.probandIndividual, familyVariants, zygosity, this).then(data => {
                                return Promise.resolve(null);
                            });
                        }
                    }
                    // If we fall through to here, we know the family doesn't (yet) have a proband individual

                    // Creating or editing a family, and the form has at least one variant. Create the starter individual and return a promise
                    // from its creation. Also remember we have new variants.
                    if (!this.state.probandIndividual && this.state.individualRequired) {
                        initvar = true;
                        label = this.getFormValue('individualname');
                        diseases = individualDiseases.map(disease => { return disease; });
                        return makeStarterIndividual(label, diseases, familyVariants, zygosity, this.props.affiliation, this);
                    }

                    // Family doesn't have any variants
                    return Promise.resolve(null);
                }).then(individual => {
                    var gdmUuid = this.state.gdm && this.state.gdm.uuid;
                    var familyUuid = this.state.family && this.state.family.uuid;

                    // Write the assessment to the DB, if there was one. The assessment’s evidence_id won’t be set at this stage, and must be written after writing the family.
                    return this.saveAssessment(this.cv.assessmentTracker, gdmUuid, familyUuid).then(assessmentInfo => {
                        return Promise.resolve({starterIndividual: individual, assessment: assessmentInfo.assessment, updatedAssessment: assessmentInfo.update});
                    });
                }).then(data => {
                    // Make a list of assessments along with the new one if necessary
                    if (currFamily && currFamily.segregation && currFamily.segregation.assessments && currFamily.segregation.assessments.length) {
                        familyAssessments = currFamily.segregation.assessments.map(function(assessment) {
                            return assessment['@id'];
                        });
                    }
                    if (data.assessment && !data.updatedAssessment) {
                        familyAssessments.push(data.assessment['@id']);
                    }

                    // Make a new family object based on form fields.
                    var newFamily = this.createFamily(familyDiseases, familyArticles, familyVariants, familyAssessments);

                    // Prep for multiple family writes, based on the family count dropdown (only appears when creating a new family,
                    // not when editing a family). This is a count of *extra* families, so add 1 to it to get the number of families
                    // to create.
                    var familyPromises = [];
                    var familyCount = parseInt(this.getFormValue('extrafamilycount'), 10);
                    familyCount = familyCount ? familyCount + 1 : 1;

                    // Assign the starter individual if we made one
                    if (data.starterIndividual) {
                        if (!newFamily.individualIncluded) {
                            newFamily.individualIncluded = [];
                        }
                        newFamily.individualIncluded.push(data.starterIndividual['@id']);
                    }

                    // Write the new family object to the DB
                    return this.writeFamilyObj(newFamily).then(newFamily => {
                        return Promise.resolve(_.extend(data, {family: newFamily}));
                    });
                }).then(data => {
                    // If the assessment is missing its evidence_id; fill it in and update the assessment in the DB
                    var newFamily = data.family;
                    var newAssessment = data.assessment;
                    var gdmUuid = this.state.gdm && this.state.gdm.uuid;
                    var familyUuid = newFamily && newFamily.uuid;

                    if (newFamily && newAssessment && !newAssessment.evidence_id) {
                        // We saved a pathogenicity and assessment, and the assessment has no evidence_id. Fix that.
                        return this.saveAssessment(this.cv.assessmentTracker, gdmUuid, familyUuid, newAssessment).then(assessmentInfo => {
                            return Promise.resolve(_.extend(data, {assessment: assessmentInfo.assessment, updatedAssessment: assessmentInfo.update}));
                        });
                    }

                    // Next step relies on the pathogenicity, not the updated assessment
                    return Promise.resolve(data);
                }).then(data => {
                    var newFamily = data.family;
                    var promise;

                    // If we're adding this family to a group, update the group with this family; otherwise update the annotation
                    // with the family.
                    if (!this.state.family) {
                        // Adding a new family
                        if (this.state.group) {
                            // Add the newly saved families to the group
                            promise = this.getRestData('/groups/' + this.state.group.uuid, null, true).then(freshGroup => {
                                var group = curator.flatten(freshGroup);
                                if (!group.familyIncluded) {
                                    group.familyIncluded = [];
                                }
                                group.familyIncluded.push(newFamily['@id']);

                                // Post the modified group to the DB
                                return this.putRestData('/groups/' + this.state.group.uuid, group).then(groupGraph => {
                                    // The next step needs the family, not the group it was written to
                                    return Promise.resolve(_.extend(data, {group: groupGraph['@graph'][0]}));
                                });
                            });
                        } else {
                            // Not part of a group, so add the family to the annotation instead.
                            promise = this.getRestData('/evidence/' + this.state.annotation.uuid, null, true).then(freshAnnotation => {
                                // Get a flattened copy of the fresh annotation object and put our new family into it,
                                // ready for writing.
                                var annotation = curator.flatten(freshAnnotation);
                                if (!annotation.families) {
                                    annotation.families = [];
                                }
                                annotation.families.push(newFamily['@id']);

                                // Post the modified annotation to the DB
                                return this.putRestData('/evidence/' + this.state.annotation.uuid, annotation).then(annotation => {
                                    // The next step needs the family, not the group it was written to
                                    return Promise.resolve(_.extend(data, {annotation: annotation}));
                                });
                            });
                        }
                    } else {
                        // Editing an existing family
                        promise = Promise.resolve(data);
                    }
                    return promise;
                }).then(data => {
                    // Add to the user history. data.family always contains the new or edited family. data.group contains the group the family was
                    // added to, if it was added to a group. data.annotation contains the annotation the family was added to, if it was added to
                    // the annotation. If neither data.group nor data.annotation exist, data.family holds the existing family that was modified.
                    var meta, historyPromise;

                    if (data.annotation) {
                        // Record the creation of a new family added to a GDM
                        meta = {
                            family: {
                                gdm: this.state.gdm['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        historyPromise = this.recordHistory('add', data.family, meta);
                    } else if (data.group) {
                        // Record the creation of a new family added to a group
                        meta = {
                            family: {
                                gdm: this.state.gdm['@id'],
                                group: data.group['@id'],
                                article: this.state.annotation.article['@id']
                            }
                        };
                        historyPromise = this.recordHistory('add', data.family, meta);
                    } else {
                        // Record the modification of an existing family
                        historyPromise = this.recordHistory('modify', data.family);
                    }

                    // Once we're done writing the family history, write the other related histories
                    historyPromise.then(() => {
                        // Write the starter individual history if there was one
                        if (data.starterIndividual) {
                            return recordIndividualHistory(this.state.gdm, this.state.annotation, data.starterIndividual, data.group, data.family, false, this);
                        }
                        return Promise.resolve(null);
                    }).then(() => {
                        // If we're assessing a family segregation, write that to history
                        if (data.family && data.assessment) {
                            this.saveAssessmentHistory(data.assessment, this.state.gdm, data.family, data.updatedAssessment);
                        }
                        return Promise.resolve(null);
                    });

                    // Navigate to Curation Central or Family Submit page, depending on previous page
                    this.resetAllFormValues();
                    if (this.queryValues.editShortcut && !initvar) {
                        this.context.navigate('/family-submit/?gdm=' + this.state.gdm.uuid + '&family=' + data.family.uuid + '&evidence=' + this.state.annotation.uuid + (initvar ? '&initvar' : '') + (hadvar ? '&hadvar' : ''));
                    } else {
                        this.context.navigate('/family-submit/?gdm=' + this.state.gdm.uuid + '&family=' + data.family.uuid + '&evidence=' + this.state.annotation.uuid + (initvar ? '&initvar' : '') + (hadvar ? '&hadvar' : ''));
                    }
                }).catch(function(e) {
                    console.log('FAMILY CREATION ERROR=: %o', e);
                });
            }
        }
    },

    // Create segregation object based on the form values
    createSegregation: function(newFamily, variants, assessments) {
        var newSegregation = {};
        var value1;

        // Unless others have assessed (in which case there's no segregation form), get the segregation
        // values from the form
        if (!this.cv.segregationAssessed) {
            value1 = this.getFormValue('SEGnumberOfAffectedWithGenotype');
            if (value1 && !isNaN(parseInt(value1, 10))) {
                newSegregation[formMapSegregation['SEGnumberOfAffectedWithGenotype']] = parseInt(value1, 10);
            } else {
                if (newSegregation[formMapSegregation['SEGnumberOfAffectedWithGenotype']]) { delete newSegregation[formMapSegregation['SEGnumberOfAffectedWithGenotype']]; }
            }
            value1 = this.getFormValue('SEGnumberOfUnaffectedWithoutBiallelicGenotype');
            if (value1 && !isNaN(parseInt(value1, 10))) {
                newSegregation[formMapSegregation['SEGnumberOfUnaffectedWithoutBiallelicGenotype']] = parseInt(value1, 10);
            } else {
                if (newSegregation[formMapSegregation['SEGnumberOfUnaffectedWithoutBiallelicGenotype']]) { delete newSegregation[formMapSegregation['SEGnumberOfUnaffectedWithoutBiallelicGenotype']]; }
            }
            value1 = this.getFormValue('SEGnumberOfSegregationsForThisFamily');
            if (value1 && !isNaN(parseInt(value1, 10))) {
                newSegregation[formMapSegregation['SEGnumberOfSegregationsForThisFamily']] = parseInt(value1, 10);
            } else {
                if (newSegregation[formMapSegregation['SEGnumberOfSegregationsForThisFamily']]) { delete newSegregation[formMapSegregation['SEGnumberOfSegregationsForThisFamily']]; }
            }
            value1 = this.getFormValue('SEGinconsistentSegregationAmongstTestedIndividuals');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGinconsistentSegregationAmongstTestedIndividuals']] = value1;
            }
            value1 = this.getFormValue('SEGexplanationForInconsistent');
            if (value1) {
                newSegregation[formMapSegregation['SEGexplanationForInconsistent']] = value1;
            }
            value1 = this.getFormValue('SEGmoiDisplayedForFamily');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGmoiDisplayedForFamily']] = value1;
            }
            value1 = this.getFormValue('SEGfamilyConsanguineous');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGfamilyConsanguineous']] = value1;
            }
            value1 = this.getFormValue('SEGpedigreeLocation');
            if (value1) {
                newSegregation[formMapSegregation['SEGpedigreeLocation']] = value1;
            }
            /*
            value1 = this.getFormValue('SEGdenovo');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGdenovo']] = value1;
            }
            */
            value1 = this.getFormValue('SEGlodPublished');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGlodPublished']] = value1 === 'Yes';
            }
            value1 = this.getFormValue('SEGpublishedLodScore');
            if (value1 && !isNaN(parseFloat(value1))) {
                newSegregation[formMapSegregation['SEGpublishedLodScore']] = parseFloat(value1);
            } else {
                if (newSegregation[formMapSegregation['SEGpublishedLodScore']]) { delete newSegregation[formMapSegregation['SEGpublishedLodScore']]; }
            }
            value1 = this.getFormValue('SEGestimatedLodScore');
            if (value1 && !isNaN(parseFloat(value1))) {
                newSegregation[formMapSegregation['SEGestimatedLodScore']] = parseFloat(value1);
            } else {
                if (newSegregation[formMapSegregation['SEGestimatedLodScore']]) { delete newSegregation[formMapSegregation['SEGestimatedLodScore']]; }
            }
            value1 = this.getFormValue('SEGincludeLodScoreInAggregateCalculation');
            if (value1 !== 'none') {
                newSegregation[formMapSegregation['SEGincludeLodScoreInAggregateCalculation']] = value1 === 'Yes';
            }
            value1 = this.getFormValue('SEGsequencingMethod');
            if (value1 && value1 !== 'none') {
                newSegregation[formMapSegregation['SEGsequencingMethod']] = value1;
            } else {
                if (newSegregation[formMapSegregation['SEGsequencingMethod']]) delete newSegregation[formMapSegregation['SEGsequencingMethod']];
            }
            value1 = this.getFormValue('SEGreasonExplanation');
            if (value1) {
                newSegregation[formMapSegregation['SEGreasonExplanation']] = value1;
            }
            value1 = this.getFormValue('SEGaddedsegregationinfo');
            if (value1) {
                newSegregation[formMapSegregation['SEGaddedsegregationinfo']] = value1;
            }
        } else if (newFamily.segregation && Object.keys(newFamily.segregation).length) {
            newSegregation = _.clone(newFamily.segregation);
        }

        if (variants) {
            newSegregation.variants = variants;
        }

        if (assessments) {
            newSegregation.assessments = assessments;
        }

        if (Object.keys(newSegregation).length) {
            newFamily.segregation = newSegregation;
        }
    },

    // Create a family object to be written to the database. Most values come from the values
    // in the form. The created object is returned from the function.
    createFamily: function(familyDiseases, familyArticles, familyVariants, familyAssessments) {
        // Make a new family. If we're editing the form, first copy the old family
        // to make sure we have everything not from the form.
        var newFamily = this.state.family ? curator.flatten(this.state.family) : {};

        // Method and/or segregation successfully created if needed (null if not); passed in 'methSeg' object. Now make the new family.
        newFamily.label = this.getFormValue('familyname');

        // Get an array of all given disease IDs
        if (familyDiseases && familyDiseases.length) {
            newFamily.commonDiagnosis = familyDiseases.map(disease => { return disease; });
        }
        else if (newFamily.commonDiagnosis && newFamily.commonDiagnosis.length > 0) {
            // allow to delete oephanet ids when editing family
            delete newFamily.commonDiagnosis;
        }

        // Add array of other PMIDs
        if (familyArticles) {
            newFamily.otherPMIDs = familyArticles['@graph'].map(function(article) { return article['@id']; });
        }

        // Fill in the group fields from the Common Diseases & Phenotypes panel
        var hpoTerms = this.getFormValue('hpoid');
        if (hpoTerms) {
            newFamily.hpoIdInDiagnosis = _.compact(hpoTerms.toUpperCase().split(', '));
        }
        else if (newFamily.hpoIdInDiagnosis) {
            // allow to delete HPO ids
            delete newFamily.hpoIdInDiagnosis;
        }
        var phenoterms = this.getFormValue('phenoterms');
        if (phenoterms) {
            newFamily.termsInDiagnosis = phenoterms;
        }
        else if (newFamily.termsInDiagnosis) {
            // allow to delete phenotype free text
            delete newFamily.termsInDiagnosis;
        }
        hpoTerms = this.getFormValue('nothpoid');
        if (hpoTerms) {
            newFamily.hpoIdInElimination = _.compact(hpoTerms.toUpperCase().split(', '));
        }
        phenoterms = this.getFormValue('notphenoterms');
        if (phenoterms) {
            newFamily.termsInElimination = phenoterms;
        }

        // Fill in the group fields from the Family Demographics panel
        var value = this.getFormValue('country');
        newFamily.countryOfOrigin = value !== 'none' ? value : '';

        value = this.getFormValue('ethnicity');
        newFamily.ethnicity = value !== 'none' ? value : '';

        value = this.getFormValue('race');
        newFamily.race = value !== 'none' ? value : '';

        value = this.getFormValue('additionalinfofamily');
        if (value) { newFamily.additionalInformation = value; }

        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            if (!newFamily.affiliation) {
                newFamily.affiliation = this.props.affiliation.affiliation_id;
            }
        }

        // Fill in the segregation fields to the family, if there was a form (no form if assessed)
        this.createSegregation(newFamily, familyVariants, familyAssessments);

        return newFamily;
    },

    // Update the ClinVar Variant ID fields upon interaction with the Add Resource modal
    updateVariantId: function(data, fieldNum) {
        let newVariantInfo = _.clone(this.state.variantInfo);
        let variantCount = this.state.variantCount;
        if (data) {
            // Update the form and display values with new data
            this.refs['variantUuid' + fieldNum].setValue(data.uuid);
            newVariantInfo[fieldNum] = {
                'clinvarVariantId': data.clinvarVariantId ? data.clinvarVariantId : null,
                'clinvarVariantTitle': data.clinvarVariantTitle ? data.clinvarVariantTitle : null,
                'carId': data.carId ? data.carId : null,
                'canonicalTranscriptTitle': data.canonicalTranscriptTitle ? data.canonicalTranscriptTitle : null,
                'hgvsNames': data.hgvsNames ? data.hgvsNames : null,
                'uuid': data.uuid
            };
            variantCount += 1;  // We have one more variant to show
        } else {
            // Reset the form and display values
            this.refs['variantUuid' + fieldNum].setValue('');
            delete newVariantInfo[fieldNum];
            variantCount -= 1;  // we have one less variant to show
        }

        // if variant data entered, must enter proband individual name and disease
        // First check if data entered in either ClinVar Variant ID or Other description at each variant
        var noVariantData = true;
        _.range(variantCount).map(i => {
            if (this.refs['variantUuid' + i].getValue()) {
                noVariantData = false;
            }
        });
        // If not entered at all, proband individua is not required and must be no error messages at individual fields.
        if (noVariantData && this.refs['individualname']) {
            if (this.refs['individualname'].getValue() || (this.state.probandDiseaseObj && this.state.probandDiseaseObj['id'])) {
                this.setState({individualRequired: true});
            } else {
                this.setState({individualRequired: false});
            }
            var errors = this.state.formErrors;
            errors['individualname'] = '';
            this.setState({formErrors: errors, probandDiseaseError: null});
        } else {
            this.setState({individualRequired: true});
        }

        // Set state
        this.setState({variantInfo: newVariantInfo, variantCount: variantCount, probandDiseaseError: null});
        this.clrFormErrors('zygosityHemizygous');
        this.clrFormErrors('zygosityHomozygous');
    },

    // Determine whether a Family is associated with a Group
    // or
    // whether an individual is associated with a Family or a Group
    getAssociation: function(item) {
        var associatedGroups, associatedFamilies;

        if (this.state.group) {
            associatedGroups = [this.state.group];
        } else if (this.state.family && this.state.family.associatedGroups && this.state.family.associatedGroups.length) {
            associatedGroups = this.state.family.associatedGroups;
        }

        if (this.state.family) {
            associatedFamilies = [this.state.family];
        } else if (this.state.individual && this.state.individual.associatedFamilies && this.state.individual.associatedFamilies.length) {
            associatedFamilies = this.state.individual.associatedFamilies;
        }

        switch(item) {
            case 'individual':
                return this.state.individual;

            case 'family':
                return this.state.family;

            case 'associatedFamilies':
                return associatedFamilies;

            case 'associatedGroups':
                return associatedGroups;

            default:
                break;
        }
    },

    // After the Family Curation page component mounts, grab the GDM, group, family, and annotation UUIDs (as many as given)
    // from the query string and retrieve the corresponding objects from the DB, if they exist. Note, we have to do this after
    // the component mounts because AJAX DB queries can't be done from unmounted components.
    componentDidMount: function() {
        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.loadData();
    },

    componentWillUnmount: function() {
        // Flush family-specific segregation data
        if (this.cv.segregationAssessed && this.cv.segregationAssessed != false) {
            this.cv.segregationAssessed = false;
        }
        if (this.cv.filledSegregations && Object.keys(this.cv.filledSegregations).length > 0) {
            this.cv.filledSegregations = {};
        }
        if (this.cv.othersAssessed && this.cv.othersAssessed != false) {
            this.cv.othersAssessed = false;
        }
    },

    /**
     * Update the 'diseaseObj' state used to save data upon form submission
     */
    updateDiseaseObj(diseaseObj) {
        this.setState({diseaseObj: diseaseObj});
    },

    /**
     * Update the 'probandDiseaseObj' state used for the proband individual
     */
    updateFamilyProbandDiseaseObj(action, probandDiseaseObj) {
        if (action === 'add' && (probandDiseaseObj && Object.keys(probandDiseaseObj).length > 0)) {
            this.setState({probandDiseaseObj: probandDiseaseObj, individualRequired: true}, () => {
                // Clear 'probandDisease' key in formErrors object
                this.clrFormErrors('probandDisease');
            });
        } else if (action === 'copy' && this.state.diseaseObj) {
            this.setState({probandDiseaseObj: this.state.diseaseObj, individualRequired: true}, () => {
                // Clear 'probandDisease' key in formErrors object
                this.clrFormErrors('probandDisease');
            });
        } else if (action === 'delete') {
            this.setState({probandDiseaseObj: {}}, () => {
                // Clear 'probandDisease' key in formErrors object
                this.clrFormErrors('probandDisease');
            });
            if (this.state.individualName && !this.state.individualName.length) {
                this.setState({individualRequired: true});
            } else {
                this.setState({individualRequired: false});
            }
        }
    },

    /**
     * Clear error msg on missing disease
     */
    clearErrorInParent(target) {
        if (target === 'family') {
            this.setState({diseaseError: null});
        } else if (target === 'familyProband') {
            this.setState({probandDiseaseError: null});
        }
        
    },

    render: function() {
        var gdm = this.state.gdm;
        var family = this.state.family;
        var groups = (family && family.associatedGroups) ? family.associatedGroups :
            (this.state.group ? [this.state.group] : null);
        var annotation = this.state.annotation;
        var pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        var method = (family && family.method && Object.keys(family.method).length) ? family.method : {};
        var submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        var assessments = [];
        var userAssessmentValue = null;
        if (family && family.segregation && family.segregation.assessments && family.segregation.assessments.length) {
            _.map(family.segregation.assessments, assessment => {
                if (assessment.value !== 'Not Assessed') {
                    assessments.push(assessment);
                    if (assessment.submitted_by.uuid === session.user_properties.uuid) {
                        userAssessmentValue = assessment.value;
                    }
                }
            });
        }
        //var is_owner = session && family && (session.user_properties.uuid === family.submitted_by.uuid) ? true : false;

        // Retrieve methods data of "parent" evidence (assuming "parent" can only be a group and there can be only one)
        var parentEvidenceMethod = (groups && groups.length && groups[0].method && Object.keys(groups[0].method).length) ? groups[0].method : null;
        var parentEvidenceName = 'Group';

        // Get the query strings. Have to do this now so we know whether to render the form or not. The form
        // uses React controlled inputs, so we can only render them the first time if we already have the
        // family object read in.
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.familyUuid = queryKeyValue('family', this.props.href);
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === "";

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.familyUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/family-submit/?gdm=' + gdm.uuid + (family ? '&family=' + family.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        return (
            <div>
                {(!this.queryValues.familyUuid || this.state.family) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={annotation.article} displayJournal pmidLinkout />
                                </div>
                                : null}
                            <div className="viewer-titles">
                                <h1>{(family ? 'Edit' : 'Curate') + ' Family Information'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    {groups && groups.length ?
                                        <span> &#x2F;&#x2F; Group {groups.map(function(group, i) { return <span key={group['@id']}>{i > 0 ? ', ' : ''}<a href={group['@id']}>{group.label}</a></span>; })}</span>
                                        : null}
                                    <span> &#x2F;&#x2F; {this.state.familyName ? <span>Family {this.state.familyName}</span> : <span className="no-entry">No entry</span>}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <div className="col-sm-12">
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <Panel>
                                            {FamilyName.call(this)}
                                        </Panel>
                                        <PanelGroup accordion>
                                            <Panel title="Family – Disease(s) & Phenotype(s)" open>
                                                {FamilyCommonDiseases.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family — Demographics" open>
                                                {FamilyDemographics.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family — Methods" open>
                                                {methods.render.call(this, method, 'family', '', parentEvidenceMethod, parentEvidenceName)}
                                            </Panel>
                                        </PanelGroup>

                                        {!this.cv.segregationAssessed ?
                                            <PanelGroup accordion>
                                                <Panel title="Family — Segregation" open>
                                                    {FamilySegregation.call(this)}
                                                </Panel>
                                            </PanelGroup>
                                            :
                                            <div>
                                                {family && family.segregation ?
                                                    <PanelGroup accordion>
                                                        {FamilySegregationViewer(family.segregation, null, true)}
                                                    </PanelGroup>
                                                    : null}
                                            </div>
                                        }

                                        {assessments && assessments.length ?
                                            <Panel panelClassName="panel-data">
                                                <dl className="dl-horizontal">
                                                    <dt>Assessments</dt>
                                                    <dd>
                                                        {assessments.map(function(assessment, i) {
                                                            return (
                                                                <span key={assessment.uuid}>
                                                                    {assessment.value} ({assessment.submitted_by.title})
                                                                    {i < assessments.length-1 ? <br /> : null}
                                                                </span>
                                                            );})
                                                        }
                                                    </dd>
                                                </dl>
                                            </Panel>
                                            : null}

                                        <PanelGroup accordion>
                                            <Panel title="Family — Variant(s) Segregating with Proband" open>
                                                {FamilyVariant.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <PanelGroup accordion>
                                            <Panel title="Family Additional Information" open>
                                                {FamilyAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {family ?
                                                <DeleteButton gdm={gdm} parent={groups.length > 0 ? groups[0] : annotation} item={family} pmid={pmid} disabled={this.cv.othersAssessed} />
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

curator_page.register(FamilyCuration, 'curator_page', 'family-curation');

/**
 * Family Name group curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 * @param {string} displayNote
 */
function FamilyName(displayNote) {
    let family = this.state.family;

    return (
        <div className="row">
            {!this.getAssociation('family') && !this.getAssociation('associatedGroups') ?
                <div className="col-sm-7 col-sm-offset-5"><p className="alert alert-warning">If this Family is a member of a Group, please curate the Group first and then add the Family to that Group.</p></div>
                : null}
            <Input type="text" ref="familyname" label="Family Label:" value={family && family.label ? family.label : ''} handleChange={this.handleChange}
                error={this.getFormError('familyname')} clearError={this.clrFormErrors.bind(null, 'familyname')} maxLength="60"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">{curator.renderLabelNote('Family')}</p>
            {displayNote ?
                <p className="col-sm-7 col-sm-offset-5">Note: If there is more than one family with IDENTICAL information, you can indicate this at the bottom of this form.</p>
                : null}
        </div>
    );
}

/**
 * If the Family is being edited (we know this because there was a family
 * UUID in the query string), then don’t present the ability to specify multiple families.
 */
function FamilyCount() {
    let family = this.state.family;

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
}

/**
 * Common diseases family curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function FamilyCommonDiseases() {
    let family = this.state.family,
        group = this.state.group;
    let associatedGroups;

    // If we're editing a family, make editable values of the complex properties
    let hpoidVal = family && family.hpoIdInDiagnosis ? family.hpoIdInDiagnosis.join(', ') : '';
    let nothpoidVal = family && family.hpoIdInElimination ? family.hpoIdInElimination.join(', ') : '';

    // Make a list of diseases from the group, either from the given group,
    // or the family if we're editing one that has associated groups.renderPhenotype
    if (group) {
        // We have a group, so get the disease array from it.
        associatedGroups = [group];
    } else if (family && family.associatedGroups && family.associatedGroups.length) {
        // We have a family with associated groups. Combine the diseases from all groups.
        associatedGroups = family.associatedGroups;
    }

    return (
        <div className="row">
            {associatedGroups && associatedGroups[0].commonDiagnosis && associatedGroups[0].commonDiagnosis.length ? curator.renderDiseaseList(associatedGroups, 'Group') : null}
            <FamilyDisease group={associatedGroups && associatedGroups[0] ? associatedGroups[0] : null}
                family={family} gdm={this.state.gdm} updateDiseaseObj={this.updateDiseaseObj} clearErrorInParent={this.clearErrorInParent}
                diseaseObj={this.state.diseaseObj} error={this.state.diseaseError} session={this.props.session} />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Family', 'hpo', 'Group') : curator.renderPhenotype(null, 'Family', 'hpo')
            }
            <Input type="textarea" ref="hpoid" label={LabelHpoId()} rows="4" value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                curator.renderPhenotype(associatedGroups, 'Family', 'ft', 'Group') : curator.renderPhenotype(null, 'Family', 'ft')
            }
            <Input type="textarea" ref="phenoterms" label={LabelPhenoTerms()} rows="2" value={family && family.termsInDiagnosis ? family.termsInDiagnosis : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {associatedGroups && ((associatedGroups[0].hpoIdInDiagnosis && associatedGroups[0].hpoIdInDiagnosis.length) || associatedGroups[0].termsInDiagnosis) ?
                <Input type="button" ref={(button) => { this.phenotypecopygroup = button; }} wrapperClassName="col-sm-7 col-sm-offset-5 orphanet-copy" inputClassName="btn-copy btn-last btn-sm"
                    title="Copy all Phenotype(s) from Associated Group" clickHandler={this.handleCopyGroupPhenotypes} />
                : null}
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Family</em> if they are specifically noted in the paper.</p>
            <Input type="textarea" ref="nothpoid" label={LabelHpoId('not')} rows="4" value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300"
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={LabelPhenoTerms('not')} rows="2" value={family && family.termsInElimination ? family.termsInElimination : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

/**
 * HTML labels for inputs follow.
 * @param {string} bool - Value of 'not'
 */
const LabelHpoId = bool => {
    return (
        <span>
            {bool && bool === 'not' ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
            <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
        </span>
    );
};

/**
 * HTML labels for inputs follow.
 * @param {string} bool - Value of 'not'
 */
const LabelPhenoTerms = bool => {
    return (
        <span>
            {bool && bool === 'not' ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
            <span className="normal">(free text)</span>:
        </span>
    );
};

/**
 * Demographics family curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function FamilyDemographics() {
    let family = this.state.family;
    let associatedGroups;
    let hasGroupDemographics = false;

    // Retrieve associated group as an array
    if (this.state.group) {
        associatedGroups = [this.state.group];
    } else if (family && family.associatedGroups && family.associatedGroups.length) {
        associatedGroups = family.associatedGroups;
    }

    // Check if associated group has any demographics data
    if (associatedGroups && (associatedGroups[0].countryOfOrigin || associatedGroups[0].ethnicity || associatedGroups[0].race)) {
        hasGroupDemographics = true;
    }

    return (
        <div className="row">
            {hasGroupDemographics ?
                <Input type="button" ref="copygroupdemographics" wrapperClassName="col-sm-7 col-sm-offset-5 demographics-copy"
                    inputClassName="btn-copy btn-sm" title="Copy Demographics from Associated Group"
                    clickHandler={this.handleCopyGroupDemographics} />
                : null}
            {hasGroupDemographics ? curator.renderParentEvidence('Country of Origin Associated with Group:', associatedGroups[0].countryOfOrigin) : null}
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={family && family.countryOfOrigin ? family.countryOfOrigin : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            {hasGroupDemographics ? curator.renderParentEvidence('Ethnicity Associated with Group:', associatedGroups[0].ethnicity) : null}
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={family && family.ethnicity ? family.ethnicity : 'none'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            {hasGroupDemographics ? curator.renderParentEvidence('Race Associated with Group:', associatedGroups[0].race) : null}
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={family && family.race ? family.race : 'none'}
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
        </div>
    );
}

/**
 * Segregation family curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function FamilySegregation() {
    let family = this.state.family;
    let gdm = this.state.gdm;
    let segregation = (family && family.segregation && Object.keys(family.segregation).length) ? family.segregation : {};
    if (gdm) {
        var semiDom = gdm.modeInheritance.includes('Semidominant');
    }

    return (
        <div className="row section section-family-segregation">
            <h3><i className="icon icon-chevron-right"></i> Tested Individuals</h3>
            <Input type="number" inputClassName="integer-only" ref="SEGnumberOfAffectedWithGenotype" label={<span>For Dominant AND Recessive inheritance:<br/>Number of AFFECTED individuals <i>WITH</i> genotype?</span>}
                value={segregation && segregation.numberOfAffectedWithGenotype ? segregation.numberOfAffectedWithGenotype : ''}
                handleChange={this.handleChange} error={this.getFormError('SEGnumberOfAffectedWithGenotype')} clearError={this.clrFormErrors.bind(null, 'SEGnumberOfAffectedWithGenotype')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="Number only" required />
            <Input type="number" inputClassName="integer-only" ref="SEGnumberOfUnaffectedWithoutBiallelicGenotype"
                label={<span>For Recessive inheritance only:<br/>Number of UNAFFECTED individuals <i>WITHOUT</i> the biallelic genotype? (required for Recessive inheritance)</span>}
                value={segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype ? segregation.numberOfUnaffectedWithoutBiallelicGenotype : ''}
                handleChange={this.handleChange} error={this.getFormError('SEGnumberOfUnaffectedWithoutBiallelicGenotype')} clearError={this.clrFormErrors.bind(null, 'SEGnumberOfUnaffectedWithoutBiallelicGenotype')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="Number only" />
            <Input type="number" inputClassName="integer-only" ref="SEGnumberOfSegregationsForThisFamily"
                label={<span>Number of segregations reported for this Family:<br/>(required for calculating an estimated LOD score for Dominant or X-linked inheritance)</span>}
                value={segregation && segregation.numberOfSegregationsForThisFamily ? segregation.numberOfSegregationsForThisFamily : ''}
                handleChange={this.handleChange} error={this.getFormError('SEGnumberOfSegregationsForThisFamily')} clearError={this.clrFormErrors.bind(null, 'SEGnumberOfSegregationsForThisFamily')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="Number only" />
            <Input type="select" ref="SEGinconsistentSegregationAmongstTestedIndividuals"
                label={<span>Were there any inconsistent segregations amongst TESTED individuals? <i>(i.e. affected individuals WITHOUT the genotype or unaffected individuals WITH the genotype?)</i></span>}
                defaultValue="none" value={segregation && segregation.inconsistentSegregationAmongstTestedIndividuals ? segregation.inconsistentSegregationAmongstTestedIndividuals : 'none'}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <Input type="textarea" ref="SEGexplanationForInconsistent" label={<span>please provide explanation:<br/><i>(optional)</i></span>} rows="5"
                value={segregation && segregation.explanationForInconsistent ? segregation.explanationForInconsistent : ''}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            {semiDom ?    
            <Input type="select" ref="SEGmoiDisplayedForFamily" label="Which mode of inheritance does this family display?:"
                value={segregation && segregation.moiDisplayedForFamily ? segregation.moiDisplayedForFamily : ''} 
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Autosomal dominant/X-linked">Autosomal dominant/X-linked</option>
                <option value="Autosomal recessive">Autosomal recessive</option>
                <option value="Semidominant">Semidominant</option>
            </Input>
            : null}
            <Input type="select" ref="SEGfamilyConsanguineous" label="Is this family consanguineous?:" defaultValue="none"
                value={segregation && segregation.familyConsanguineous ? segregation.familyConsanguineous : 'none'}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not Specified">Not Specified</option>
            </Input>
            <Input type="textarea" ref="SEGpedigreeLocation" label="If pedigree provided in publication, please indicate location:" rows="3"
                value={segregation && segregation.pedigreeLocation ? segregation.pedigreeLocation : ''}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="e.g. Figure 3A" />
            <h3><i className="icon icon-chevron-right"></i> LOD Score (select one to include as score):</h3>
            <Input type="select" ref="SEGlodPublished" label="Published LOD score?:" defaultValue="none"
                value={curator.booleanToDropdown(segregation.lodPublished)}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            {this.state.isSemidominant == true && this.state.lodPublished === 'No' ? 
            <Input type="select" ref="SEGlodRequirements" label="Does the family meet requirements for estimating LOD score for EITHER autosomal dominant/X-linked or autosomal recessive?:"
                value={segregation && segregation.lodRequirements ? segregation.lodRequirements : ''}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes - autosomal dominant/X-linked">Yes - autosomal dominant/X-linked</option>
                <option value="Yes - autosomal recessive">Yes - autosomal recessive</option>
                <option value="No">No</option>
            </Input>
            : null}
            {this.state.lodPublished === 'Yes' ?
                <Input type="number" ref="SEGpublishedLodScore" label="Published Calculated LOD score:"
                    value={segregation && segregation.publishedLodScore ? segregation.publishedLodScore : ''}
                    handleChange={this.handleChange} error={this.getFormError('SEGpublishedLodScore')} clearError={this.clrFormErrors.bind(null, 'SEGpublishedLodScore')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" placeholder="Number only" />
                : null}
            {this.state.lodPublished === 'No' ?
                <Input type="number" ref="SEGestimatedLodScore" label={<span>Estimated LOD score:<br/><i>(optional, and only if no published LOD score)</i></span>}
                    inputDisabled={this.state.lodLocked} value={this.state.estimatedLodScore ? this.state.estimatedLodScore : ''}
                    error={this.getFormError('SEGestimatedLodScore')} clearError={this.clrFormErrors.bind(null, 'SEGestimatedLodScore')}
                    handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                    placeholder={this.state.lodLocked && !this.state.estimatedLodScore ? "Not enough information entered to calculate an estimated LOD score" : "Number only"} />
                : null}
            <Input type="select" ref="SEGincludeLodScoreInAggregateCalculation" label="Include LOD score in final aggregate calculation?"
                defaultValue="none" value={curator.booleanToDropdown(segregation.includeLodScoreInAggregateCalculation)} handleChange={this.handleChange}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                inputDisabled={(this.state.lodPublished === null) || (this.state.lodPublished === 'Yes' && !this.state.publishedLodScore) || (this.state.lodPublished === 'No' && !this.state.estimatedLodScore)}>
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <div className="col-sm-7 col-sm-offset-5 lod-score-inclusion-note">
                <p className="alert alert-warning">
                    Note: For X-linked and autosomal dominant conditions, only include families with 4 or more segregations in the final calculation.
                    For autosomal recessive conditions, only include families with at least 3 affected individuals. See the Gene Curation SOP for additional details.
                </p>
            </div>
            {this.state.includeLodScore ?
                <Input type="select" ref="SEGsequencingMethod" label="Sequencing Method: *"
                    defaultValue="none" value={segregation.sequencingMethod ? segregation.sequencingMethod : 'none'}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                    error={this.getFormError('SEGsequencingMethod')} clearError={this.clrFormErrors.bind(null, 'SEGsequencingMethod')}>
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Candidate gene sequencing">Candidate gene sequencing</option>
                    <option value="Exome/genome or all genes sequenced in linkage region">Exome/genome or all genes sequenced in linkage region</option>
                </Input>
                : null}
            <Input type="textarea" ref="SEGreasonExplanation" label="Explain reasoning:" rows="5"
                value={segregation && segregation.reasonExplanation ? segregation.reasonExplanation : ''} inputDisabled={(this.state.isSemidominant == true && this.state.lodPublished === "Yes")}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="SEGaddedsegregationinfo" label="Additional Segregation Information:" rows="5"
                value={segregation && segregation.additionalInformation ? segregation.additionalInformation : ''} inputDisabled={(this.state.isSemidominant == true && this.state.lodPublished === "Yes")}
                handleChange={this.handleChange} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

/**
 * Display the Family variant panel.
 * The number of copies depends on the variantCount state variable.
 */
function FamilyVariant() {
    let family = this.state.family;
    let group = this.state.group;
    let gdm = this.state.gdm;
    let segregation = family && family.segregation ? family.segregation : null;
    let variants = segregation && segregation.variants;
    let annotation = this.state.annotation;
    let probandIndividual = this.state.probandIndividual ? this.state.probandIndividual : null;
    let gdmUuid = this.state.gdm && this.state.gdm.uuid ? this.state.gdm.uuid : null;
    let pmidUuid = this.state.annotation && this.state.annotation.article.pmid ? this.state.annotation.article.pmid : null;
    let userUuid = this.state.gdm && this.state.gdm.submitted_by.uuid ? this.state.gdm.submitted_by.uuid : null;
    let individualName = this.state.individualName;

    return (
        <div className="row form-row-helper">
            {!family || !family.segregation || !family.segregation.variants || family.segregation.variants.length === 0 ?
                <div className="row">
                    <p className="col-sm-7 col-sm-offset-5">
                        If you would like to score the proband for this family in addition to the LOD score for segregation, you need to create the Individual proband,
                        including adding their associated variant(s). Please follow the steps below -- you will be able to add additional information about the proband
                        following submission of Family information.
                    </p>
                    <p className="col-sm-7 col-sm-offset-5">
                        Note: Probands are indicated by the following icon: <i className="icon icon-proband"></i>
                    </p>
                </div>
                : null}
            {!this.state.probandIndividual ?
                <div className="variant-panel">
                    <div className="col-sm-7 col-sm-offset-5 proband-label-note">
                        <div className="alert alert-warning">Once this Family page is saved, an option to score and add additional information about the proband (e.g. demographics, phenotypes) will appear.</div>
                    </div>
                    <Input type="text" ref="individualname" label="Proband Label" value={individualName} handleChange={this.handleChange}
                        error={this.getFormError('individualname')} clearError={this.clrFormErrors.bind(null, 'individualname')} maxLength="60"
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required={this.state.individualRequired} />
                    <p className="col-sm-7 col-sm-offset-5 input-note-below">Note: Do not enter real names in this field. {curator.renderLabelNote('Individual')}</p>
                    {this.state.diseaseObj ?
                        <div className="form-group">
                            <div className="col-sm-5"><strong className="pull-right">Disease term associated with Family:</strong></div>
                            <div className="col-sm-7"><strong>{this.state.diseaseObj.term}</strong></div>
                        </div>
                        : null
                    }
                    <FamilyProbandDisease gdm={this.state.gdm} group={group} family={family} updateFamilyProbandDiseaseObj={this.updateFamilyProbandDiseaseObj}
                        probandDiseaseObj={this.state.probandDiseaseObj} error={this.state.probandDiseaseError} clearErrorInParent={this.clearErrorInParent}
                        familyDiseaseObj={this.state.diseaseObj} session={this.props.session} required={this.state.individualRequired} />
                </div>
                :
                <p>The proband associated with this Family can be edited here: <a href={"/individual-curation/?editsc&gdm=" + gdm.uuid + "&evidence=" + annotation.uuid + "&individual=" + probandIndividual.uuid}>Edit {probandIndividual.label}</a></p>
            }
            <Input type="checkbox" ref="zygosityHomozygous" label={<span>Check here if homozygous:<br /><i className="non-bold-font">(Note: if homozygous, enter only 1 variant below)</i></span>}
                error={this.getFormError('zygosityHomozygous')} clearError={this.clrFormErrors.bind(null, 'zygosityHomozygous')}
                handleChange={this.handleChange} defaultChecked="false" checked={this.state.recessiveZygosity == 'Homozygous'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
            </Input>
            <Input type="checkbox" ref="zygosityHemizygous" label="Check here if hemizygous:"
                error={this.getFormError('zygosityHemizygous')} clearError={this.clrFormErrors.bind(null, 'zygosityHemizygous')}
                handleChange={this.handleChange} defaultChecked="false" checked={this.state.recessiveZygosity == 'Hemizygous'}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
            </Input>
            {_.range(MAX_VARIANTS).map(i => {
                var variant;

                if (variants && variants.length) {
                    variant = variants[i];
                }

                return (
                    <div key={i} className="variant-panel">
                        {this.state.variantInfo[i] ?
                            <div className="variant-resources">
                                {this.state.variantInfo[i].clinvarVariantId ?
                                    <div className="row variant-data-source">
                                        <span className="col-sm-5 control-label"><label>{<LabelClinVarVariant />}</label></span>
                                        <span className="col-sm-7 text-no-input"><a href={external_url_map['ClinVarSearch'] + this.state.variantInfo[i].clinvarVariantId} target="_blank">{this.state.variantInfo[i].clinvarVariantId}</a></span>
                                    </div>
                                    : null}
                                {this.state.variantInfo[i].carId ?
                                    <div className="row">
                                        <span className="col-sm-5 control-label"><label><LabelCARVariant /></label></span>
                                        <span className="col-sm-7 text-no-input"><a href={`https:${external_url_map['CARallele']}${this.state.variantInfo[i].carId}.html`} target="_blank">{this.state.variantInfo[i].carId}</a></span>
                                    </div>
                                    : null}
                                {renderVariantLabelAndTitle(this.state.variantInfo[i], true)}
                                <div className="row variant-curation">
                                    <span className="col-sm-5 control-label"><label></label></span>
                                    <span className="col-sm-7 text-no-input">
                                        <a href={'/variant-central/?variant=' + this.state.variantInfo[i].uuid} target="_blank">View variant evidence in Variant Curation Interface</a>
                                    </span>
                                </div>
                            </div>
                            : null}
                        <Input type="text" ref={'variantUuid' + i} value={variant && variant.uuid ? variant.uuid : ''}
                            error={this.getFormError('variantUuid' + i)} clearError={this.clrFormErrors.bind(null, 'variantUuid' + i)}
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" />
                        <div className="row">
                            <div className="form-group">
                                <span className="col-sm-5 control-label">{!this.state.variantInfo[i] ? <label>Add Variant:</label> : <label>Clear Variant Selection:</label>}</span>
                                <span className="col-sm-7">
                                    {!this.state.variantInfo[i] || (this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId) ?
                                        <AddResourceId resourceType="clinvar" parentObj={{'@type': ['variantList', 'Family'], 'variantList': this.state.variantInfo}}
                                            buttonText="Add ClinVar ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                            initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].clinvarVariantId} fieldNum={String(i)}
                                            updateParentForm={this.updateVariantId} buttonOnly={true} />
                                        : null}
                                    {!this.state.variantInfo[i] ? <span> - or - </span> : null}
                                    {!this.state.variantInfo[i] || (this.state.variantInfo[i] && !this.state.variantInfo[i].clinvarVariantId) ?
                                        <AddResourceId resourceType="car" parentObj={{'@type': ['variantList', 'Family'], 'variantList': this.state.variantInfo}}
                                            buttonText="Add CA ID" protocol={this.props.href_url.protocol} clearButtonRender={true} editButtonRenderHide={true} clearButtonClass="btn-inline-spacer"
                                            initialFormValue={this.state.variantInfo[i] && this.state.variantInfo[i].carId} fieldNum={String(i)}
                                            updateParentForm={this.updateVariantId} buttonOnly={true} />
                                        : null}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const LabelClinVarVariant = () => {
    return <span><strong><a href={external_url_map['ClinVar']} target="_blank" title="ClinVar home page at NCBI in a new tab">ClinVar</a> Variation ID:</strong></span>;
};

const LabelCARVariant = () => {
    return <span><strong><a href={external_url_map['CAR']} target="_blank" title="ClinGen Allele Registry in a new tab">ClinGen Allele Registry</a> ID:</strong></span>;
};

const LabelOtherVariant = () => {
    return <span>Other description when a ClinVar VariationID does not exist <span className="normal">(important: use CA ID registered with <a href={external_url_map['CAR']} target="_blank">ClinGen Allele Registry</a> whenever possible)</span>:</span>;
};

/**
 * Additional Information family curation panel.
 * Call with .call(this) to run in the same context as the calling component.
 */
function FamilyAdditional() {
    let family = this.state.family;
    let otherpmidsVal = family && family.otherPMIDs ? family.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : '';

    return (
        <div className="row">
            <Input type="textarea" ref="additionalinfofamily" label="Additional Information about Family:" rows="5"
                value={family && family.additionalInformation ? family.additionalInformation : ''}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same family:"
                value={otherpmidsVal} placeholder="e.g. 12089445, 21217753" rows="5"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

/**
 * Determine whether the given segregation contains any non-empty values.
 * @param {object} segregation 
 */
function segregationExists(segregation) {
    let exists = false;

    if (segregation) {
        exists = (segregation.pedigreeDescription && segregation.pedigreeDescription.length > 0) ||
                  segregation.pedigreeSize ||
                  segregation.numberOfGenerationInPedigree ||
                  segregation.moiDisplayedForFamily ||
                  segregation.consanguineousFamily ||
                  segregation.numberOfCases ||
                 (segregation.deNovoType && segregation.deNovoType.length > 0) ||
                  segregation.numberOfParentsUnaffectedCarriers ||
                  segregation.numberOfAffectedAlleles ||
                  segregation.numberOfAffectedWithOneVariant ||
                  segregation.numberOfAffectedWithTwoVariants ||
                  segregation.numberOfUnaffectedCarriers ||
                  segregation.numberOfUnaffectedIndividuals ||
                  segregation.probandAssociatedWithBoth ||
                 (segregation.additionalInformation && segregation.additionalInformation.length > 0);
    }
    return exists;
}

const FamilyViewer = createReactClass({
    mixins: [RestMixin, AssessmentMixin, CuratorHistory],

    cv: {
        assessmentTracker: null, // Tracking object for a single assessment
        gdmUuid: '' // UUID of the GDM; passed in the query string
    },

    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object,
        href: PropTypes.string
    },

    getInitialState() {
        return {
            assessments: null, // Array of assessments for the family's segregation
            updatedAssessment: '', // Updated assessment value
            submitBusy: false // True while form is submitting
        };
    },

    // Handle the assessment submit button
    assessmentSubmit(e) {
        var updatedFamily;
        // GET the family object to have the most up-to-date version
        this.getRestData('/families/' + this.props.context.uuid).then(data => {
            this.setState({submitBusy: true});
            var family = data;

            // Write the assessment to the DB, if there was one.
            return this.saveAssessment(this.cv.assessmentTracker, this.cv.gdmUuid, this.props.context.uuid).then(assessmentInfo => {
                // If we're assessing a family segregation, write that to history
                this.saveAssessmentHistory(assessmentInfo.assessment, null, family, assessmentInfo.update);

                // If we made a new assessment, add it to the family's assessments
                if (assessmentInfo.assessment && !assessmentInfo.update) {
                    updatedFamily = curator.flatten(family);
                    if (!updatedFamily.segregation.assessments) {
                        updatedFamily.segregation.assessments = [];
                    }
                    updatedFamily.segregation.assessments.push(assessmentInfo.assessment['@id']);

                    // Write the updated family object to the DB
                    return this.putRestData('/families/' + family.uuid, updatedFamily).then(data => {
                        return this.getRestData('/families/' + data['@graph'][0].uuid);
                    });
                }

                // Didn't update the family; if updated the assessment, reload the family
                if (assessmentInfo.update) {
                    return this.getRestData('/families/' + family.uuid);
                }

                // Not updating the family
                return Promise.resolve(family);
            });
        }).then(updatedFamily => {
            // update the assessmentTracker object so it accounts for any new assessments
            var userAssessment;
            var assessments = updatedFamily.segregation.assessments;
            var user = this.props.session && this.props.session.user_properties;

            // Find if any assessments for the segregation are owned by the currently logged-in user
            if (assessments && assessments.length) {
                // Find the assessment belonging to the logged-in curator, if any.
                userAssessment = Assessments.userAssessment(assessments, user && user.uuid);
            }
            this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');

            // Wrote the family, so update the assessments state to the new assessment list
            if (updatedFamily && updatedFamily.segregation && updatedFamily.segregation.assessments && updatedFamily.segregation.assessments.length) {
                this.setState({assessments: updatedFamily.segregation.assessments, updatedAssessment: this.cv.assessmentTracker.getCurrentVal()});
            }

            this.setState({submitBusy: false}); // done w/ form submission; turn the submit button back on
            return Promise.resolve(null);
        }).then(data => {
            var tempGdmPmid = curator.findGdmPmidFromObj(this.props.context);
            var tempGdm = tempGdmPmid[0];
            var tempPmid = tempGdmPmid[1];
            window.location.href = '/curation-central/?gdm=' + tempGdm.uuid + '&pmid=' + tempPmid;
        }).catch(function(e) {
            console.log('FAMILY VIEW UPDATE ERROR=: %o', e);
        });
    },

    componentWillMount() {
        var family = this.props.context;

        // Get the GDM and Family UUIDs from the query string
        this.cv.gdmUuid = queryKeyValue('gdm', this.props.href);
        if (family && family.segregation && family.segregation.assessments && family.segregation.assessments.length) {
            this.setState({assessments: family.segregation.assessments});
        }

        if (typeof this.props.session.user_properties !== undefined) {
            var user = this.props.session && this.props.session.user_properties;
            this.loadAssessmentTracker(user);
        }
    },

    componentWillReceiveProps(nextProps) {
        if (typeof nextProps.session.user_properties !== undefined && nextProps.session.user_properties != this.props.session.user_properties) {
            var user = nextProps.session && nextProps.session.user_properties;
            this.loadAssessmentTracker(user);
        }
    },

    loadAssessmentTracker(user) {
        var family = this.props.context;
        var segregation = family.segregation;
        var assessments = this.state.assessments ? this.state.assessments : (segregation ? segregation.assessments : null);

        // Make an assessment tracker object once we get the logged in user info
        if (!this.cv.assessmentTracker && user && segregation) {
            var userAssessment;

            // Find if any assessments for the segregation are owned by the currently logged-in user
            if (assessments && assessments.length) {
                // Find the assessment belonging to the logged-in curator, if any.
                userAssessment = Assessments.userAssessment(assessments, user && user.uuid);
            }
            this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Segregation');
        }
    },

    render() {
        var family = this.props.context;
        var method = family.method;
        var groups = family.associatedGroups;
        var segregation = family.segregation;
        var assessments = this.state.assessments ? this.state.assessments : (segregation ? segregation.assessments : null);
        var validAssessments = [];
        _.map(assessments, assessment => {
            if (assessment.value !== 'Not Assessed') {
                validAssessments.push(assessment);
            }
        });

        var variants = segregation ? ((segregation.variants && segregation.variants.length) ? segregation.variants : []) : [];
        var user = this.props.session && this.props.session.user_properties;
        var userFamily = user && family && family.submitted_by ? user.uuid === family.submitted_by.uuid : false;
        var familyUserAssessed = false; // TRUE if logged-in user doesn't own the family, but the family's owner assessed its segregation
        var othersAssessed = false; // TRUE if we own this segregation, and others have assessed it
        var updateMsg = this.state.updatedAssessment ? 'Assessment updated to ' + this.state.updatedAssessment : '';

        // See if others have assessed
        if (userFamily) {
            othersAssessed = Assessments.othersAssessed(assessments, user.uuid);
        }

        // Note if we don't own the family, but the owner has assessed the segregation
        if (user && family && family.submitted_by) {
            var familyUserAssessment = Assessments.userAssessment(assessments, family.submitted_by.uuid);
            if (familyUserAssessment && familyUserAssessment.value !== Assessments.DEFAULT_VALUE) {
                familyUserAssessed = true;
            }
        }

        // See if the segregation contains anything.
        var haveSegregation = segregationExists(segregation);

        var tempGdmPmid = curator.findGdmPmidFromObj(family);
        var tempGdm = tempGdmPmid[0];
        var tempPmid = tempGdmPmid[1];

        return (
            <div>
                <ViewRecordHeader gdm={tempGdm} pmid={tempPmid} />
                <div className="container">
                    <div className="row curation-content-viewer">
                        <div className="viewer-titles">
                            <h1>View Family: {family.label}</h1>
                            <h2>
                                {tempGdm ? <a href={'/curation-central/?gdm=' + tempGdm.uuid + (tempGdm ? '&pmid=' + tempPmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                {groups && groups.length ?
                                    <span> &#x2F;&#x2F; Group {groups.map(function(group, i) { return <span key={group['@id']}>{i > 0 ? ', ' : ''}<a href={group['@id']}>{group.label}</a></span>; })}</span>
                                    : null}
                                <span> &#x2F;&#x2F; Family {family.label}</span>
                            </h2>
                        </div>
                        <Panel title="Common Disease(s) & Phenotype(s)" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Common Diagnosis</dt>
                                    <dd>{family.commonDiagnosis && family.commonDiagnosis.map(function(disease, i) {
                                        return <span key={disease.diseaseId}>{i > 0 ? ', ' : ''}{disease.term} {!disease.freetext ? <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank">{disease.diseaseId.replace('_', ':')}</a> : null}</span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>HPO IDs</dt>
                                    <dd>{family.hpoIdInDiagnosis && family.hpoIdInDiagnosis.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>Phenotype Terms</dt>
                                    <dd>{family.termsInDiagnosis}</dd>
                                </div>

                                <div>
                                    <dt>NOT HPO IDs</dt>
                                    <dd>{family.hpoIdInElimination && family.hpoIdInElimination.map(function(hpo, i) {
                                        return <span key={hpo}>{i > 0 ? ', ' : ''}<a href={external_url_map['HPO'] + hpo} title={"HPOBrowser entry for " + hpo + " in new tab"} target="_blank">{hpo}</a></span>;
                                    })}</dd>
                                </div>

                                <div>
                                    <dt>NOT phenotype terms</dt>
                                    <dd>{family.termsInElimination}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Family — Demographics" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Country of Origin</dt>
                                    <dd>{family.countryOfOrigin}</dd>
                                </div>

                                <div>
                                    <dt>Ethnicity</dt>
                                    <dd>{family.ethnicity}</dd>
                                </div>

                                <div>
                                    <dt>Race</dt>
                                    <dd>{family.race}</dd>
                                </div>
                            </dl>
                        </Panel>

                        <Panel title="Family — Methods" panelClassName="panel-data">
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
                                    <dt>Additional Information about Family Method</dt>
                                    <dd>{method && method.additionalInformation}</dd>
                                </div>
                            </dl>
                        </Panel>

                        {FamilySegregationViewer(segregation, assessments, true)}

                        {this.cv.gdmUuid && validAssessments && validAssessments.length ?
                            <Panel panelClassName="panel-data">
                                <dl className="dl-horizontal">
                                    <div>
                                        <dt>Assessments</dt>
                                        <dd>
                                            <div>
                                                {validAssessments.map(function(assessment, i) {
                                                    return (
                                                        <span key={assessment.uuid}>
                                                            {i > 0 ? <br /> : null}
                                                            {assessment.value+' ('+assessment.submitted_by.title+')'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </dd>
                                    </div>
                                </dl>
                            </Panel>
                            : null}

                        <Panel title="Family - Variant(s) Segregating with Proband" panelClassName="panel-data">
                            {family.individualIncluded && family.individualIncluded.length ?
                                <div>
                                    {family.individualIncluded.map(function(ind, index) {
                                        return (
                                            <div key={index}>
                                                <dl className="dl-horizontal">
                                                    <dt>Zygosity</dt>
                                                    <dd>{ind.proband && ind.recessiveZygosity ? ind.recessiveZygosity : "None selected"}</dd>
                                                </dl>
                                            </div>
                                        );
                                    })}
                                </div>
                                : null }
                            {variants.map(function(variant, i) {
                                return (
                                    <div className="variant-view-panel" key={variant.uuid ? variant.uuid : i}>
                                        <h5>Variant {i + 1}</h5>
                                        {variant.clinvarVariantId ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinVar Variation ID</dt>
                                                    <dd><a href={`${external_url_map['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`} target="_blank">{variant.clinvarVariantId}</a></dd>
                                                </dl>
                                            </div>
                                            : null }
                                        {variant.carId ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>ClinGen Allele Registry ID</dt>
                                                    <dd><a href={`http:${external_url_map['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for ${variant.carId} in new tab`} target="_blank">{variant.carId}</a></dd>
                                                </dl>
                                            </div>
                                            : null }
                                        {renderVariantLabelAndTitle(variant)}
                                        {variant.otherDescription ?
                                            <div>
                                                <dl className="dl-horizontal">
                                                    <dt>Other description</dt>
                                                    <dd>{variant.otherDescription}</dd>
                                                </dl>
                                            </div>
                                            : null }
                                    </div>
                                );
                            })}
                        </Panel>

                        <Panel title="Family — Additional Information" panelClassName="panel-data">
                            <dl className="dl-horizontal">
                                <div>
                                    <dt>Additional Information about Family</dt>
                                    <dd>{family.additionalInformation}</dd>
                                </div>

                                <dt>Other PMID(s) that report evidence about this same Family</dt>
                                <dd>{family.otherPMIDs && family.otherPMIDs.map(function(article, i) {
                                    return <span key={article.pmid}>{i > 0 ? ', ' : ''}<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span>;
                                })}</dd>
                            </dl>
                        </Panel>
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(FamilyViewer, 'family');


/**
 * Display a segregation in a read-only panel. If the assessments can change while the page
 * gets dispalyed, pass the dynamic assessments in 'assessments'. If the assessments won't
 * change, don't pass anything in assessments -- the assessments in the segregation get displayed.
 */
const FamilySegregationViewer = (segregation, assessments, open) => {
    if (!assessments) {
        assessments = segregation.assessments;
    }

    return (
        <Panel title="Family — Segregation" panelClassName="panel-data" open={open}>
            <dl className="dl-horizontal">
                <div>
                    <dt>Number of AFFECTED individuals with genotype</dt>
                    <dd>{segregation && segregation.numberOfAffectedWithGenotype}</dd>
                </div>

                <div>
                    <dt>Number of UNAFFECTED individuals without the bialletic genotype</dt>
                    <dd>{segregation && segregation.numberOfUnaffectedWithoutBiallelicGenotype}</dd>
                </div>

                <div>
                    <dt>Number of segregations reported for this family</dt>
                    <dd>{segregation && segregation.numberOfSegregationsForThisFamily}</dd>
                </div>

                <div>
                    <dt>Inconsistent segregations amongst TESTED individuals</dt>
                    <dd>{segregation && segregation.inconsistentSegregationAmongstTestedIndividuals}</dd>
                </div>

                <div>
                    <dt>Explanation for the inconsistent segregations</dt>
                    <dd>{segregation && segregation.explanationForInconsistent}</dd>
                </div>

                <div>
                    <dt>Which mode of inheritance does this family display?</dt>
                    <dd>{segregation && segregation.moiDisplayedForFamily}</dd>
                </div>

                <div>
                    <dt>Consanguineous family</dt>
                    <dd>{segregation && segregation.familyConsanguineous}</dd>
                </div>

                <div>
                    <dt>Location of pedigree in publication</dt>
                    <dd>{segregation && segregation.pedigreeLocation}</dd>
                </div>

                <div>
                    <dt>Published Calculated LOD score?</dt>
                    <dd>{segregation && segregation.lodPublished === true ? 'Yes' : (segregation.lodPublished === false ? 'No' : '')}</dd>
                </div>

                <div>
                    <dt>Published Calculated LOD score</dt>
                    <dd>{segregation && segregation.publishedLodScore}</dd>
                </div>

                <div>
                    <dt>Estimated LOD score</dt>
                    <dd>{segregation && segregation.estimatedLodScore}</dd>
                </div>

                <div>
                    <dt>Include LOD score in final aggregate calculation?</dt>
                    <dd>{segregation && segregation.includeLodScoreInAggregateCalculation === true ? 'Yes' : (segregation.includeLodScoreInAggregateCalculation === false ? 'No' : '')}</dd>
                </div>

                {segregation && segregation.includeLodScoreInAggregateCalculation ?
                    <div>
                        <dt>Sequencing Method</dt>
                        <dd>{segregation && segregation.sequencingMethod}</dd>
                    </div>
                    : null}

                <div>
                    <dt>Reason for including LOD or not</dt>
                    <dd>{segregation && segregation.reasonExplanation}</dd>
                </div>

                <div>
                    <dt>Additional Segregation information</dt>
                    <dd>{segregation && segregation.additionalInformation}</dd>
                </div>
            </dl>
        </Panel>
    );
};


/**
 * Display a history item for adding a family
 */
class FamilyAddHistory extends Component {
    render() {
        var history = this.props.history;
        var family = history.primary;
        var gdm = history.meta.family.gdm;
        var group = history.meta.family.group;
        var article = history.meta.family.article;

        return (
            <div>
                Family <a href={family['@id']}>{family.label}</a>
                <span> added to </span>
                {group ?
                    <span>group <a href={group['@id']}>{group.label}</a></span>
                    :
                    <span>
                        <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                        <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                    </span>
                }
                <span> for <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + article.pmid}>PMID:{article.pmid}</a>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(FamilyAddHistory, 'family', 'add');

/**
 * Display a history item for modifying a family
 */
class FamilyModifyHistory extends Component {
    render() {
        var history = this.props.history;
        var family = history.primary;

        return (
            <div>
                Family <a href={family['@id']}>{family.label}</a>
                <span> modified</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(FamilyModifyHistory, 'family', 'modify');

/**
 * Display a history item for deleting a family
 */
class FamilyDeleteHistory extends Component {
    render() {
        var history = this.props.history;
        var family = history.primary;

        // Prepare to display a note about associated families and individuals
        // This data can now only be obtained from the history object's hadChildren field
        var collateralObjects = history.hadChildren == 1 ? true : false;

        return (
            <div>
                <span>Family {family.label} deleted</span>
                <span>{collateralObjects ? ' along with any individuals' : ''}</span>
                <span>; {moment(history.last_modified).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
}

history_views.register(FamilyDeleteHistory, 'family', 'delete');
