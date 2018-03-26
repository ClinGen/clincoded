'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { curator_page, content_views, userMatch, affiliationMatch, truncateString, external_url_map } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';
import * as CuratorHistory from './curator_history';
import ModalComponent from '../libs/bootstrap/modal';
import PopOverComponent from '../libs/bootstrap/popover';
import { GdmDisease } from './disease';
import { GetProvisionalClassification } from '../libs/get_provisional_classification';
import { getAffiliationName } from '../libs/get_affiliation_name';

var CurationMixin = module.exports.CurationMixin = {
    getInitialState: function() {
        return {
            currOmimId: '' // Currently set OMIM ID
        };
    },

    // Get a flattened GDM corresponding to the one given in gdmUuid. update its OMIM ID given in
    // newOmimId, and write it back out. If the write is successful, also update the currOmimId
    // React state variable.
    updateOmimId: function(gdmUuid, newOmimId) {
        this.getRestData(
            '/gdm/' + gdmUuid
        ).then(gdmObj => {
            var gdm = flatten(gdmObj);
            gdm.omimId = newOmimId;
            return this.putRestData('/gdm/' + gdmUuid, gdm).then(data => {
                return Promise.resolve(gdmObj);
            });
        }).then(gdmObj => {
            gdmObj.omimId = newOmimId;
            this.setState({currGdm: gdmObj, currOmimId: newOmimId});
        }).catch(e => {
            console.log('UPDATEOMIMID %o', e);
        });
    },

    // Set the currOmimId state to the given omimId
    setOmimIdState: function(omimId) {
        this.setState({currOmimId: omimId});
    }
};


var CuratorPage = module.exports.CuratorPage = createReactClass({
    render: function() {
        var context = this.props.context;

        var CuratorPageView = curator_page.lookup(context, context.name);
        var content = <CuratorPageView {...this.props} />;
        return (
            <div>{content}</div>
        );
    }
});

content_views.register(CuratorPage, 'curator_page');


// Curation data header for Gene:Disease
var RecordHeader = module.exports.RecordHeader = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        gdm: PropTypes.object, // GDM data to display
        omimId: PropTypes.string, // OMIM ID to display
        updateOmimId: PropTypes.func, // Function to call when OMIM ID changes
        linkGdm: PropTypes.bool, // whether or not to link GDM text back to GDM
        pmid: PropTypes.string,
        affiliation: PropTypes.object,
        classificationSnapshots: PropTypes.array,
        context: PropTypes.object
    },

    getInitialState() {
        return {
            gdm: this.props.gdm,
            classificationSnapshots: this.props.classificationSnapshots,
            diseaseObj: {},
            diseaseUuid: null,
            diseaseError: null
        };
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm});
        }
        if (nextProps.classificationSnapshots) {
            this.setState({classificationSnapshots: nextProps.classificationSnapshots});
        }
    },

    /**
     * Update the 'diseaseObj' state used to save data upon modal form submission
     * Also update the gdm-associated disease object in the database
     */
    updateDiseaseObj(diseaseObj) {
        this.setState({diseaseObj: diseaseObj}, () => {
            let gdm = this.props.gdm;
            this.getRestData('/gdm/' + gdm.uuid).then(gdmObj => {
                let disease = gdmObj && gdmObj.disease;
                
                this.getRestData('/diseases/' + disease.uuid).then(currDiseaseObj => {
                    let flattenDiseaseObj = flatten(currDiseaseObj);
                    // Update disease object properties
                    flattenDiseaseObj['diseaseId'] = diseaseObj['diseaseId'];
                    flattenDiseaseObj['term'] = diseaseObj['term'];
                    // Update description (if any)
                    if (diseaseObj['description']) {
                        flattenDiseaseObj['description'] = diseaseObj['description'];
                    } else {
                        if ('description' in flattenDiseaseObj) {
                            delete flattenDiseaseObj['description'];
                        }
                    }
                    // Update optional phenotypes (applicable to free text only)
                    if (diseaseObj['phenotypes']) {
                        flattenDiseaseObj['phenotypes'] = diseaseObj['phenotypes'];
                    } else {
                        if ('phenotypes' in flattenDiseaseObj) {
                            delete flattenDiseaseObj['phenotypes'];
                        }
                    }
                    // Update optional free text confirmation (applicable to free text only)
                    if (diseaseObj['freetext']) {
                        flattenDiseaseObj['freetext'] = true;
                    } else {
                        if ('freetext' in flattenDiseaseObj) {
                            delete flattenDiseaseObj['freetext'];
                        }
                    }
                    // Update synonyms
                    if (diseaseObj['synonyms']) {
                        flattenDiseaseObj['synonyms'] = diseaseObj['synonyms'];
                    } else {
                        if ('synonyms' in flattenDiseaseObj) {
                            delete flattenDiseaseObj['synonyms'];
                        }
                    }

                    let flattenGdmObj = flatten(gdmObj);
                    if (!diseaseObj['freetext'] && diseaseObj['diseaseId'] !== disease.diseaseId) {
                        /**
                         * Handle the updating of MonDO term
                         */
                        this.getRestData('/search?type=disease&diseaseId=' + diseaseObj['diseaseId']).then(diseaseSearch => {
                            let diseaseUuid;
                            if (diseaseSearch.total === 0) {
                                /**
                                 * Post request for adding new disease to the database
                                 */
                                return this.postRestData('/diseases/', diseaseObj).then(result => {
                                    let newDisease = result['@graph'][0];
                                    diseaseUuid = newDisease['uuid'];
                                    this.setState({diseaseUuid: diseaseUuid});
                                    return Promise.resolve(result);
                                }).then(response => {
                                    /**
                                     * Update existing GDM with a new UUID
                                     */
                                    flattenGdmObj['disease'] = this.state.diseaseUuid;
                                    this.putRestData('/gdm/' + gdm.uuid, flattenGdmObj).then(gdmObj => {
                                        return Promise.resolve(gdmObj['@graph'][0]);
                                    }).then(data => {
                                        this.getRestData('/gdm/' + gdm.uuid).then(updatedGdm => {
                                            this.setState({gdm: updatedGdm});
                                        });
                                    });
                                });
                            } else {
                                /**
                                 * User-selected disease already exists in the database
                                 */
                                let _id = diseaseSearch['@graph'][0]['@id'];
                                diseaseUuid = _id.slice(10, -1);
                                this.setState({diseaseUuid: diseaseUuid});
                                /**
                                 * Update existing GDM with the UUID of the existing disease
                                 */
                                flattenGdmObj['disease'] = this.state.diseaseUuid;
                                this.putRestData('/gdm/' + gdm.uuid, flattenGdmObj).then(gdmObj => {
                                    return Promise.resolve(gdmObj['@graph'][0]);
                                }).then(data => {
                                    this.getRestData('/gdm/' + gdm.uuid).then(updatedGdm => {
                                        this.setState({gdm: updatedGdm});
                                    });
                                });
                            }
                        });
                    } else if (diseaseObj['freetext']) {
                        let freetextDiseaseUuid;
                        /**
                         * Post request for changing disease to free text from Mondo term
                         * Treat as a new disease record since a new free text disease id is generated
                         */
                        return this.postRestData('/diseases/', diseaseObj).then(result => {
                            let newDisease = result['@graph'][0];
                            freetextDiseaseUuid = newDisease['uuid'];
                            this.setState({diseaseUuid: freetextDiseaseUuid});
                            return Promise.resolve(result);
                        }).then(response => {
                            /**
                             * Update existing GDM with a new UUID
                             */
                            flattenGdmObj['disease'] = this.state.diseaseUuid;
                            this.putRestData('/gdm/' + gdm.uuid, flattenGdmObj).then(gdmObj => {
                                return Promise.resolve(gdmObj['@graph'][0]);
                            }).then(data => {
                                this.getRestData('/gdm/' + gdm.uuid).then(updatedGdm => {
                                    this.setState({gdm: updatedGdm});
                                });
                            });
                        });
                    }
                }).catch(err => {
                    console.warn('GCI update disease error :: %o', err);
                });
            }).catch(err => {
                console.warn('Get current GDM error :: %o', err);
            });
        });
    },

    /**
     * Clear error msg on missing disease
     */
    clearErrorInParent() {
        this.setState({diseaseError: null});
    },

    viewEvidenceSummary(e) {
        window.open('/gene-disease-evidence-summary/?gdm=' + this.state.gdm.uuid + '&preview=yes', '_blank');
    },

    /**
     * Method to display classification tag/label in gene-disease record header
     * @param {string} status - The status of a given classification in a GDM
     */
    renderClassificationStatusTag(status) {
        let snapshots = this.state.classificationSnapshots;
        let filteredSnapshots = [];
        // Determine whether the classification had been previously approved
        if (snapshots && snapshots.length) {
            filteredSnapshots = snapshots.filter(snapshot => {
                return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'classification';
            });
        }
        if (status === 'In progress') {
            return <span className="label label-warning">IN PROGRESS</span>;
        } else if (status === 'Provisional') {
            if (filteredSnapshots.length) {
                return (
                    <span><span className="label label-success">APPROVED</span><span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span></span>
                );
            } else {
                return <span className="label label-info">PROVISIONAL</span>;
            }
        } else if (status === 'Approved') {
            return <span className="label label-success">APPROVED</span>;
        }
    },

    /**
     * Method to render the header of a given classification in the gene-disease record header
     * @param {object} classification - Any given classification in a GDM
     */
    renderClassificationHeader(classification) {
        return (
            <div className="header-classification">
                <strong>Classification:</strong>
                <span className="classification-status">
                    {classification && Object.keys(classification).length ?
                        this.renderClassificationStatusTag(classification.classificationStatus ? classification.classificationStatus : 'In progress')
                        :
                        <span className="no-classification">None</span>
                    }
                </span>
            </div>
        );
    },

    /**
     * Method to get all other existing classifications (of a gdm) that are not owned by the logged-in user,
     * or owned by the affiliation that the logged-in user is part of.
     * @param {object} gdm - The gene-disease record
     * @param {object} currClassification - The classification owned by the logged-in user or by an affiliation
     */
    getOtherClassifications(gdm, currClassification) {
        const context = this.props.context;
        let classificationList = gdm && gdm.provisionalClassifications ? gdm.provisionalClassifications : null;
        let otherClassifications = [];
        if (context && context.name === 'curation-central') {
            if (classificationList && classificationList.length) {
                if (currClassification && Object.keys(currClassification).length) {
                    otherClassifications = classificationList.filter(classification => {
                        return classification['@id'] !== currClassification['@id'];
                    });
                } else {
                    otherClassifications = classificationList;
                }
                
            }
        }
        return otherClassifications;
    },

    render: function() {
        var gdm = this.state.gdm;
        var disease = gdm && gdm.disease;
        var session = this.props.session && Object.keys(this.props.session).length ? this.props.session : null;
        var summaryPage = this.props.summaryPage ? true : false;
        var summaryButton = true;
        var variant = this.props.variant;
        var annotations = gdm && gdm.annotations;

        let affiliation = this.props.affiliation;

        if (gdm && gdm['@type'][0] === 'gdm') {
            var gene = this.props.gdm.gene;
            var mode = this.props.gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];
            // Display selected MOI adjective if any. Otherwise, display selected MOI.
            var modeInheritanceAdjective = this.props.gdm.modeInheritanceAdjective ? this.props.gdm.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
            var pmid = this.props.pmid;
            var i, j, k;
            // if provisional exist, show summary and classification, Edit link and Generate New Summary button.
            let provisionalClassification = GetProvisionalClassification(gdm, affiliation, session);
            let otherClassifications = this.getOtherClassifications(gdm, provisionalClassification.provisional);

            // go through all annotations, groups, families and individuals to find one proband individual with all variant assessed.
            var supportedVariants = getUserPathogenicity(gdm, session);
            if (!summaryButton && gdm.annotations && gdm.annotations.length > 0 && supportedVariants && supportedVariants.length > 0) {
                for (i in gdm.annotations) {
                    var annotation = gdm.annotations[i];
                    if (annotation.individuals && annotation.individuals.length > 0 && searchProbandIndividual(annotation.individuals, supportedVariants)) {
                        summaryButton = true;
                        break;
                    }
                    if (!summaryButton && annotation.families && annotation.families.length > 0) {
                        for (j in annotation.families) {
                            if (annotation.families[j].individualIncluded && annotation.families[j].individualIncluded.length > 0 &&
                                searchProbandIndividual(annotation.families[j].individualIncluded, supportedVariants)) {
                                summaryButton = true;
                                break;
                            }
                        }
                    }
                    if (summaryButton) {
                        break;
                    }
                    else if (annotation.groups && annotation.groups.length > 0) {
                        for (j in annotation.groups) {
                            if (annotation.groups[j].familyIncluded && annotation.groups[j].familyIncluded.length > 0) {
                                for (k in annotation.groups[j].familyIncluded) {
                                    if (annotation.groups[j].familyIncluded[k].individualIncluded && annotation.groups[j].familyIncluded[k].individualIncluded.length > 0 &&
                                        searchProbandIndividual(annotation.groups[j].familyIncluded[k].individualIncluded, supportedVariants)) {
                                        summaryButton = true;
                                        break;
                                    }
                                }
                            }
                            if (summaryButton) {
                                break;
                            }
                            else if (annotation.groups[j].individualIncluded && annotation.groups[j].individualIncluded.length > 0 &&
                                searchProbandIndividual(annotation.groups[j].individualIncluded, supportedVariants)) {
                                summaryButton = true;
                                break;
                            }
                        }
                    }
                    if (summaryButton) {
                        break;
                    }
                }
            }

            /*
            let provisionalPage = provisionalClassification.provisionalExist && provisionalClassification.provisional.classificationStatus === 'Approved' ? '/provisional-classification/?gdm=' : '/provisional-curation/?gdm=';
            let provisionalParam = provisionalClassification.provisionalExist && provisionalClassification.provisional.classificationStatus === 'Approved' ? '' : (provisionalClassification.provisionalExist ? '&edit=yes' : '&calculate=yes');
            let provisionalUrl = provisionalPage + gdm.uuid + provisionalParam;
            */

            return (
                <div>
                    <div className="curation-data-title">
                        <div className="container">
                            <div>
                                <span>
                                    <h1>{gene.symbol} – {disease.term}
                                        <span className="gdm-disease-edit">
                                            {userMatch(gdm.submitted_by, session) && !gdm.annotations.length ?
                                                <GdmDisease gdm={gdm} updateDiseaseObj={this.updateDiseaseObj} error={this.state.diseaseError}
                                                    clearErrorInParent={this.clearErrorInParent} session={this.props.session} />
                                                : null}
                                        </span>
                                        <span>&nbsp;
                                            {this.props.linkGdm ?
                                                <a href={`/curation-central/?gdm=${gdm.uuid}` + (pmid ? `&pmid=${pmid}` : '')}><i className="icon icon-briefcase"></i></a>
                                                : <i className="icon icon-briefcase"></i>
                                            }
                                        </span>
                                    </h1>
                                    <h2><i>{modeInheritanceAdjective ? mode + ' (' + modeInheritanceAdjective + ')' : mode}</i></h2>
                                </span>
                            </div>
                            <div className="provisional-info-panel">
                                <table>
                                    <tbody>
                                        <tr>
                                            <td>
                                                {provisionalClassification ? this.renderClassificationHeader(provisionalClassification.provisional) : null}
                                            </td>
                                            <td className="button-box">
                                                { !summaryPage ?
                                                    <a className="btn btn-primary btn-inline-spacer" role="button" onClick={this.viewEvidenceSummary}>Preview Evidence Summary <i className="icon icon-file-text"></i></a>
                                                    : null}
                                                { summaryButton ?
                                                    ( !summaryPage ?
                                                        <a className="btn btn-primary btn-inline-spacer pull-right" role="button" href={'/provisional-curation/?gdm=' + gdm.uuid + (provisionalClassification.provisionalExist ? '&edit=yes' : '&calculate=yes')}>Classification Matrix <i className="icon icon-table"></i></a>
                                                        : null
                                                    )
                                                    : null}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="2">
                                                {provisionalClassification.provisionalExist ?
                                                    <div className="header-classification-content">
                                                        {provisionalClassification.provisional.affiliation ?
                                                            <div><span className="header-classification-item">Affiliation: <strong>{getAffiliationName(provisionalClassification.provisional.affiliation)}</strong></span></div>
                                                            :
                                                            <div><span className="header-classification-item">Curator: {provisionalClassification.provisional.submitted_by.title}</span></div>
                                                        }
                                                        {provisionalClassification.provisional.classificationStatus === 'Provisional' ?
                                                            <div>
                                                                <span className="header-classification-item">Provisional Classification: {provisionalClassification.provisional.alteredClassification === 'No Selection' ? provisionalClassification.provisional.autoClassification : provisionalClassification.provisional.alteredClassification}, saved on {moment(provisionalClassification.provisional.last_modified).format("YYYY MMM DD")}</span>
                                                                <span> [ <a href={'/provisional-classification/?gdm=' + gdm.uuid}>View Current Provisional</a> ]</span>
                                                            </div>
                                                            : null}
                                                        {provisionalClassification.provisional.classificationStatus === 'Approved' ?
                                                            <div>
                                                                <span className="header-classification-item">Approved Classification: {provisionalClassification.provisional.alteredClassification === 'No Selection' ? provisionalClassification.provisional.autoClassification : provisionalClassification.provisional.alteredClassification}, saved on {moment(provisionalClassification.provisional.last_modified).format("YYYY MMM DD")}</span>
                                                                <span> [ <a href={'/provisional-classification/?gdm=' + gdm.uuid}>View Current Approved</a> ]</span>
                                                            </div>
                                                            : null}
                                                        {provisionalClassification.provisional.alteredClassification === 'No Selection' ?
                                                            <div>
                                                                <span className="header-classification-item">Last Saved Classification: {provisionalClassification.provisional.classificationPoints.evidencePointsTotal} ({provisionalClassification.provisional.autoClassification}); no modification from calculated value</span>
                                                            </div>
                                                            :
                                                            <div>
                                                                <span className="header-classification-item">Last Saved Classification: {provisionalClassification.provisional.alteredClassification}; Modified from Calculated = {provisionalClassification.provisional.classificationPoints.evidencePointsTotal} ({provisionalClassification.provisional.autoClassification}); {moment(provisionalClassification.provisional.last_modified).format("YYYY MMM DD, h:mm a")}</span>
                                                            </div>
                                                        }
                                                    </div>
                                                    : null}
                                            </td>
                                        </tr>
                                        {otherClassifications && otherClassifications.length ?
                                            <tr>
                                                <td colSpan="2">
                                                    <h4>Other Classifications</h4>
                                                    {otherClassifications.map(classification => {
                                                        return (
                                                            <div key={classification.uuid} className="other-classification">
                                                                {this.renderClassificationHeader(classification)}
                                                                <div className="header-classification-content">
                                                                    {classification.affiliation ?
                                                                        <div><span className="header-classification-item">Affiliation: <strong>{getAffiliationName(classification.affiliation)}</strong></span></div>
                                                                        :
                                                                        <div><span className="header-classification-item">Curator: {classification.submitted_by.title}</span></div>
                                                                    }
                                                                    {classification.classificationStatus === 'Provisional' ?
                                                                        <div>
                                                                            <span className="header-classification-item">Provisional Classification: {classification.alteredClassification === 'No Selection' ? classification.autoClassification : classification.alteredClassification}, saved on {moment(classification.last_modified).format("YYYY MMM DD")}</span>
                                                                            <span> [ <a href={'/provisional-classification/?gdm=' + gdm.uuid}>View Current Provisional</a> ]</span>
                                                                        </div>
                                                                        : null}
                                                                    {classification.classificationStatus === 'Approved' ?
                                                                        <div>
                                                                            <span className="header-classification-item">Approved Classification: {classification.alteredClassification === 'No Selection' ? classification.autoClassification : classification.alteredClassification}, saved on {moment(classification.last_modified).format("YYYY MMM DD")}</span>
                                                                            <span> [ <a href={'/provisional-classification/?gdm=' + gdm.uuid}>View Current Approved</a> ]</span>
                                                                        </div>
                                                                        : null}
                                                                    {classification.alteredClassification === 'No Selection' ?
                                                                        <div>
                                                                            <span className="header-classification-item">Last Saved Classification: {classification.classificationPoints.evidencePointsTotal} ({classification.autoClassification}); no modification from calculated value</span>
                                                                        </div>
                                                                        :
                                                                        <div>
                                                                            <span className="header-classification-item">Last Saved Classification: {classification.alteredClassification}; Modified from Calculated = {classification.classificationPoints.evidencePointsTotal} ({classification.autoClassification}); {moment(classification.last_modified).format("YYYY MMM DD, h:mm a")}</span>
                                                                        </div>
                                                                    }
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </td>
                                            </tr>
                                            : null}
                                        <tr style={{height:'10px'}}></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="container curation-data">
                        <div className="row equal-height">
                            <GeneRecordHeader gene={gene} />
                            <DiseaseRecordHeader gdm={gdm} omimId={this.props.omimId} updateOmimId={this.props.updateOmimId} />
                            <CuratorRecordHeader gdm={gdm} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }
});

// Curation data header for Gene:Disease
var ViewRecordHeader = module.exports.ViewRecordHeader = createReactClass({
    propTypes: {
        gdm: PropTypes.object,
        pmid: PropTypes.string
    },
    render: function() {
        return (
            <div>
            {this.props.gdm ?
                <div className="curation-data-title">
                    <div className="container">
                        <div>
                            <h1>{this.props.gdm.gene.symbol} – {this.props.gdm.disease.term}
                                {this.props.gdm ?
                                <span> <a href={"/curation-central/?gdm=" + this.props.gdm.uuid + "&pmid=" + this.props.pmid}>
                                    <i className="icon icon-briefcase"></i>
                                </a></span>
                                : null}
                            </h1>
                            <h2>{this.props.gdm.modeInheritance}</h2>
                        </div>
                    </div>
                </div>
            : null}
            </div>
        );
    }
});

var findGdmPmidFromObj = module.exports.findGdmPmidFromObj = function(obj) {
    var tempGdm, tempPmid;
    if (obj.associatedAnnotations && obj.associatedAnnotations.length > 0) {
        tempGdm = obj.associatedAnnotations[0].associatedGdm[0];
        tempPmid = obj.associatedAnnotations[0].article.pmid;
    } else if (obj.associatedGroups && obj.associatedGroups.length > 0) {
        tempGdm = obj.associatedGroups[0].associatedAnnotations[0].associatedGdm[0];
        tempPmid = obj.associatedGroups[0].associatedAnnotations[0].article.pmid;
    } else if (obj.associatedFamilies && obj.associatedFamilies.length > 0) {
        if (obj.associatedFamilies[0].associatedAnnotations && obj.associatedFamilies[0].associatedAnnotations.length > 0) {
            tempGdm = obj.associatedFamilies[0].associatedAnnotations[0].associatedGdm[0];
            tempPmid = obj.associatedFamilies[0].associatedAnnotations[0].article.pmid;
        } else if (obj.associatedFamilies[0].associatedGroups && obj.associatedFamilies[0].associatedGroups.length > 0) {
            tempGdm = obj.associatedFamilies[0].associatedGroups[0].associatedAnnotations[0].associatedGdm[0];
            tempPmid = obj.associatedFamilies[0].associatedGroups[0].associatedAnnotations[0].article.pmid;
        }
    }
    return [tempGdm, tempPmid];
};

// function to collect variants assessed support by login user
var getUserPathogenicity = function(gdm, session) {
    var supportedVariants = [];
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
        for (var i in gdm.variantPathogenicity) {
            var this_patho = gdm.variantPathogenicity[i];
            if (userMatch(this_patho.submitted_by, session) && this_patho.assessments && this_patho.assessments.length > 0 && this_patho.assessments[0].value === 'Supports') {
                supportedVariants.push(this_patho.variant.uuid);
            }
        }
    }
    return supportedVariants;
};

var all_in = function(individualVariantList, allSupportedlist) {
    for(var i in individualVariantList) {
        var this_in = false;
        for (var j in allSupportedlist) {
            if (individualVariantList[i].uuid === allSupportedlist[j]) {
                this_in = true;
                break;
            }
        }

        if (!this_in) {
            return false;
        }
    }
    return true;
};

// function to find one proband individual with all variants assessed.
var searchProbandIndividual = function(individualList, variantList) {
    //individualList.forEach(individual => {
    //    if (individual.proband && individual.variants && individual.variants.length > 0 && all_in(individual.variants, variantList)) {
    //        return true;
    //    }
    //});
    for (var i in individualList) {
        if (individualList[i].proband && individualList[i].variants && individualList[i].variants.length > 0 && all_in(individualList[i].variants, variantList)) {
            return true;
        }
    }
    return false;
};

// function to get the preferred display title for variants. Current preferential order is clinvar variant title > clinvar variant ID
// > grch38 hgvs term > CA ID
var getVariantTitle = function(variant) {
    let clinvarRepresentation = variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.clinvarVariantId ? variant.clinvarVariantId : null);
    let carRepresentation = variant.hgvsNames && variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.carId ? variant.carId : null);
    let variantTitle = clinvarRepresentation ? clinvarRepresentation : carRepresentation;

    return variantTitle;
};

// Display the header of all variants involved with the current GDM.
var VariantHeader = module.exports.VariantHeader = createReactClass({
    propTypes: {
        gdm: PropTypes.object, // GDM whose collected variants to display
        pmid: PropTypes.string, // PMID of currently selected article
        session: PropTypes.object, // Logged-in session
        affiliation: PropTypes.object
    },

    render() {
        const gdm = this.props.gdm;
        const pmid = this.props.pmid;
        let session = this.props.session && Object.keys(this.props.session).length ? this.props.session : null;
        let collectedVariants = collectGdmVariants(gdm);
        const affiliation = this.props.affiliation;

        return (
            <div>
                {collectedVariants ?
                    <div className="variant-header clearfix">
                        <h2>Gene-Disease Record Variants</h2>
                        <p>Click a variant to View, Curate, or Edit it. The icon indicates curation by one or more curators.</p>
                        {Object.keys(collectedVariants).map(variantId => {
                            var variant = collectedVariants[variantId];
                            var variantName = getVariantTitle(variant);
                            var userPathogenicity = null, affiliatedPathogenicity = null;

                            // See if the variant has a pathogenicity curated in the current GDM
                            var matchingPathogenicity;
                            var inCurrentGdm = _(variant.associatedPathogenicities).find(function(pathogenicity) {
                                var matchingGdm = _(pathogenicity.associatedGdm).find(function(associatedGdm) {
                                    return associatedGdm.uuid === gdm.uuid;
                                });
                                if (matchingGdm) {
                                    matchingPathogenicity = pathogenicity;
                                }
                                return !!matchingGdm;
                            });

                            if (session && inCurrentGdm) {
                                userPathogenicity = getPathogenicityFromVariant(gdm, session.user_properties.uuid, variant.uuid, affiliation);
                            }
                            inCurrentGdm = userPathogenicity ? true : false;

                            let variantCurationUrl = '/variant-curation/?all&gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '') + '&variant=' + variant.uuid;
                            variantCurationUrl += affiliation ? '&affiliation=' + affiliation.affiliation_id : (session ? '&user=' + session.user_properties.uuid : '');
                            variantCurationUrl += userPathogenicity ? '&pathogenicity=' + userPathogenicity.uuid : '';

                            return (
                                <div className="col-sm-6 col-md-6 col-lg-4" key={variant.uuid}>
                                    <a className={"btn btn-primary btn-xs title-ellipsis" + (inCurrentGdm ? ' assessed' : '')}
                                        href={variantCurationUrl}
                                        title={variantName}>
                                        {variantName}
                                        {inCurrentGdm ? <i className="icon icon-sticky-note"></i> : null}
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                    : null}
            </div>
        );
    }
});


// Render the Variant Associations header.
var VariantAssociationsHeader = module.exports.VariantAssociationsHeader = createReactClass({
    propTypes: {
        gdm: PropTypes.object, // GDM containing the PMIDs we're searching
        variant: PropTypes.object // Variant whose associations we're searching for
    },

    render: function() {
        var gdm = this.props.gdm;
        var variant = this.props.variant;
        var annotations = gdm && gdm.annotations;
        var annotationAssociations = [];

        if (annotations && variant) {
            // Search all annotations in the GDM for all associations for the given variant
            annotations.forEach(function(annotation) {
                // Get all associations (families, individuals) for this annotation and variant
                var associations = collectVariantAssociations(annotation, variant);
                if (associations) {
                    // Sort by probands first
                    var sortedAssociations = _(associations).sortBy(function(association) {
                        if (association['@type'][0] === 'individual') {
                            return association.proband ? 0 : 1;
                        }
                        return 1;
                    });
                    var render = (
                        <div key={annotation.uuid} className="pmid-association-header">
                            <span>PMID: <a href={external_url_map['PubMed'] + annotation.article.pmid} target="_blank" title="PubMed article in a new tab">{annotation.article.pmid}</a> &#x2192; </span>
                            {sortedAssociations.map(function(association, i) {
                                var associationType = association['@type'][0];
                                var probandLabel = (associationType === 'individual' && association.proband) ? <i className="icon icon-proband"></i> : null;
                                return (
                                    <span key={association.uuid}>
                                        {i > 0 ? ', ' : ''}
                                        {associationType === 'group' ? <span>Group </span> : null}
                                        {associationType === 'family' ? <span>Family </span> : null}
                                        {associationType === 'individual' ? <span>Individual </span> : null}
                                        {associationType === 'experimental' ? <span>Experimental </span> : null}
                                        <a href={association['@id']} title={'View ' + associationType}>{association.label}</a>{probandLabel}
                                    </span>
                                );
                            })}
                        </div>
                    );
                    annotationAssociations.push(render);
                }
            });
        }

        return (
            <h2>
                {annotationAssociations}
            </h2>
        );
    }
});


// Displays the PM item summary, with authors, title, citation
var PmidSummary = module.exports.PmidSummary = createReactClass({
    propTypes: {
        article: PropTypes.object, // Article object to display
        displayJournal: PropTypes.bool, // T to display article journal
        pmidLinkout: PropTypes.bool, // T to display pmid linkout
        className: PropTypes.string
    },

    render: function() {
        var authors, authorsAll;
        var article = this.props.article;
        if (article && Object.keys(article).length) {
            var date = (/^([\d]{4})(.*?)$/).exec(article.date);

            if (article.authors && article.authors.length) {
                authors = article.authors[0] + (article.authors.length > 1 ? ' et al. ' : '. ');
                authorsAll = article.authors.join(', ') + '. ';
            }

            return (
                <p className={this.props.className}>
                    {this.props.displayJournal ? authorsAll : authors}
                    {article.title + ' '}
                    {this.props.displayJournal ? <i>{article.journal + '. '}</i> : null}
                    <strong>{date[1]}</strong>{date[2]}
                    {this.props.pmidLinkout ? <span>&nbsp;<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID: {article.pmid}</a></span> : null}
                </p>
            );
        } else {
            return null;
        }
    }
});


var CurationPalette = module.exports.CurationPalette = createReactClass({
    propTypes: {
        annotation: PropTypes.object.isRequired, // Current annotation that owns the article
        gdm: PropTypes.object.isRequired, // Current GDM that owns the given annotation
        session: PropTypes.object, // Session object
        affiliation: PropTypes.object // Affiliation object
    },

    render: function() {
        var gdm = this.props.gdm;
        var annotation = this.props.annotation;
        var session = this.props.session && Object.keys(this.props.session).length ? this.props.session : null;
        var curatorMatch = false;
        var groupUrl = '/group-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid;
        var familyUrl = '/family-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid;
        var individualUrl = '/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid;
        var caseControlUrl = '/case-control-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid;
        var experimentalUrl = '/experimental-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid;
        var groupRenders = [], familyRenders = [], individualRenders = [], caseControlRenders = [], experimentalRenders = [];
        let curatorAffiliation = this.props.affiliation;
        let groupAffiliationMatch = false, familyAffiliationMatch = false, individualAffiliationMatch = false,
            caseControlAffiliationMatch = false, experimentalAffiliationMatch = false;

        // Collect up arrays of group, family, and individual curation palette section renders. Start with groups inside the annnotation.
        if (annotation && annotation.groups) {
            var groupAnnotationRenders = annotation.groups.map(group => {
                groupAffiliationMatch = group && affiliationMatch(group, curatorAffiliation);
                curatorMatch = group && userMatch(group.submitted_by, session);
                if (group.familyIncluded) {
                    // Collect up family renders that are associated with the group, and individuals that are associated with those families.
                    var familyGroupRenders = group.familyIncluded.map(family => {
                        familyAffiliationMatch = family && affiliationMatch(family, curatorAffiliation);
                        if (family.individualIncluded) {
                            // Collect up individuals that are direct children of families associated with groups
                            var individualFamilyRenders = family.individualIncluded.map(individual => {
                                individualAffiliationMatch = individual && affiliationMatch(individual, curatorAffiliation);
                                return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch, individualAffiliationMatch, curatorAffiliation)}</div>;
                            });
                            individualRenders = individualRenders.concat(individualFamilyRenders);
                        }
                        return <div key={family.uuid}>{renderFamily(family, gdm, annotation, curatorMatch, familyAffiliationMatch, curatorAffiliation)}</div>;
                    });
                    familyRenders = familyRenders.concat(familyGroupRenders);
                }
                if (group.individualIncluded) {
                    // Collect up family renders that are associated with the group, and individuals that are associated with those families.
                    var individualGroupRenders = group.individualIncluded.map(individual => {
                        individualAffiliationMatch = individual && affiliationMatch(individual, curatorAffiliation);
                        return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch, individualAffiliationMatch, curatorAffiliation)}</div>;
                    });
                    individualRenders = individualRenders.concat(individualGroupRenders);
                }
                return <div key={group.uuid}>{renderGroup(group, gdm, annotation, curatorMatch, groupAffiliationMatch, curatorAffiliation)}</div>;
            });
            groupRenders = groupRenders.concat(groupAnnotationRenders);
        }

        // Add to the array of family renders the unassociated families, and individuals that associate with them.
        if (annotation && annotation.families) {
            var familyAnnotationRenders = annotation.families.map(family => {
                familyAffiliationMatch = family && affiliationMatch(family, curatorAffiliation);
                curatorMatch = family && userMatch(family.submitted_by, session);
                if (family.individualIncluded) {
                    // Add to individual renders the individuals that are associated with this family
                    var individualFamilyRenders = family.individualIncluded.map(individual => {
                        individualAffiliationMatch = individual && affiliationMatch(individual, curatorAffiliation);
                        return <div key={individual.uuid}>{renderIndividual(individual, this.props.gdm, annotation, curatorMatch, individualAffiliationMatch, curatorAffiliation)}</div>;
                    });
                    individualRenders = individualRenders.concat(individualFamilyRenders);
                }
                return <div key={family.uuid}>{renderFamily(family, gdm, annotation, curatorMatch, familyAffiliationMatch, curatorAffiliation)}</div>;
            });
            familyRenders = familyRenders.concat(familyAnnotationRenders);
        }

        // Add to the array of individual renders the unassociated individuals.
        if (annotation && annotation.individuals) {
            var individualAnnotationRenders = annotation.individuals.map(individual => {
                individualAffiliationMatch = individual && affiliationMatch(individual, curatorAffiliation);
                curatorMatch = individual && userMatch(individual.submitted_by, session);
                return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch, individualAffiliationMatch, curatorAffiliation)}</div>;
            });
            individualRenders = individualRenders.concat(individualAnnotationRenders);
        }

        // Add to the array of case-control renders
        if (annotation && annotation.caseControlStudies) {
            let caseControlObj = annotation.caseControlStudies.map(caseControl => {
                caseControlAffiliationMatch = caseControl && affiliationMatch(caseControl, curatorAffiliation);
                curatorMatch = caseControl && userMatch(caseControl.submitted_by, session);
                return <div key={caseControl.uuid}>{renderCaseControl(caseControl, gdm, annotation, curatorMatch, caseControlAffiliationMatch, curatorAffiliation)}</div>;
            });
            caseControlRenders = caseControlRenders.concat(caseControlObj);
        }

        // Add to the array of experiment renders.
        if (annotation && annotation.experimentalData) {
            var experimentalAnnotationRenders = annotation.experimentalData.map(experimental => {
                experimentalAffiliationMatch = experimental && affiliationMatch(experimental, curatorAffiliation);
                curatorMatch = experimental && userMatch(experimental.submitted_by, session);
                return <div key={experimental.uuid}>{renderExperimental(experimental, gdm, annotation, curatorMatch, experimentalAffiliationMatch, curatorAffiliation)}</div>;
            });
            experimentalRenders = experimentalRenders.concat(experimentalAnnotationRenders);
        }

        // Render variants
        var variantRenders;
        var allVariants = collectAnnotationVariants(annotation);
        if (Object.keys(allVariants).length) {
            variantRenders = Object.keys(allVariants).map(function(variantId) {
                return <div key={variantId}>{renderVariant(allVariants[variantId], gdm, annotation, curatorMatch, session, curatorAffiliation)}</div>;
            });
        }

        return (
            <div>
                {annotation ?
                    <Panel panelClassName="panel-evidence-groups" title={'Evidence for PMID:' + annotation.article.pmid}>
                        <Panel panelClassName="genetic-evidence-group" title={<h4><i className="icon icon-user"></i> Genetic Evidence</h4>}>
                            <div className="group-separator"><span className="subhead"><i className="icon icon-chevron-right"></i> Case Level</span></div>
                            <Panel title={<CurationPaletteTitles title="Group" url={groupUrl} />} panelClassName="panel-evidence">
                                {groupRenders}
                            </Panel>
                            <Panel title={<CurationPaletteTitles title="Family" url={familyUrl} />} panelClassName="panel-evidence">
                                {familyRenders}
                            </Panel>
                            <Panel title={<CurationPaletteTitles title="Individual" url={individualUrl} />} panelClassName="panel-evidence">
                                {individualRenders}
                            </Panel>
                            <div className="group-separator"><span className="subhead"><i className="icon icon-chevron-right"></i> Case-Control</span></div>
                            <Panel title={<CurationPaletteTitles title="Case-Control" url={caseControlUrl} />} panelClassName="panel-evidence">
                                {caseControlRenders}
                            </Panel>
                        </Panel>
                        <Panel panelClassName="experimental-group" title={<h4><i className="icon icon-flask"></i> Experimental Evidence</h4>}>
                            <Panel title={<CurationPaletteTitles title="Experimental Data" url={experimentalUrl} />} panelClassName="panel-evidence">
                                {experimentalRenders}
                            </Panel>
                        </Panel>
                        {variantRenders && variantRenders.length ?
                            <Panel title={<CurationPaletteTitles title="Associated Variants" />} panelClassName="panel-evidence">
                                {variantRenders && variantRenders.length ?
                                    <div className="evidence-curation-info">
                                        <p>Curate Variants from the “Gene-Disease Record Variants” section above.</p>
                                    </div>
                                    : null}
                                {variantRenders}
                            </Panel>
                            :
                            <Panel title={<CurationPaletteTitles title="Associated Variants" />} panelClassName="panel-evidence"></Panel>
                        }
                    </Panel>
                    : null}
            </div>
        );
    }
});

// set preferred tile, shorten it wirh ellipses if too long
var setPreferredTitle = function(variants) {
    var showItem = '';
    variants.forEach(variant => {
        if (showItem !== '') {
            showItem += '\t\n\n';
        }
        showItem += variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.clinvarVariantId ? variant.clinvarVariantId : variant.otherDescription);
    });
    return showItem;
};

// Render a family in the curator palette.
var renderGroup = function(group, gdm, annotation, curatorMatch, evidenceAffiliationMatch, curatorAffiliation) {
    var familyUrl = evidenceAffiliationMatch || curatorMatch ? ('/family-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;
    var individualUrl = evidenceAffiliationMatch || curatorMatch ? ('/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;

    return (
        <div className="panel-evidence-group">
            <h5><span className="title-ellipsis dotted" title={group.label}>{group.label}</span></h5>
            <div className="evidence-curation-info">
                {group.submitted_by ?
                    <p className="evidence-curation-info">Last edited by: {group.modified_by ? group.modified_by.title : group.submitted_by.title}</p>
                    : null}
                <p>{moment(group.last_modified).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            <a href={'/group/' + group.uuid} title="View group in a new tab">View</a>
            {(group.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!group.affiliation && !curatorAffiliation && curatorMatch) ? 
                <span> | <a href={'/group-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid} title="Edit this group">Edit</a></span>
                : null}
            {(group.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!group.affiliation && !curatorAffiliation && curatorMatch) ?
                <div><a href={familyUrl + '&group=' + group.uuid} title="Add a new family associated with this group"> Add new Family to this Group</a></div>
                : null}
            {(group.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!group.affiliation && !curatorAffiliation && curatorMatch) ?
                <div><a href={individualUrl + '&group=' + group.uuid} title="Add a new individual associated with this group"> Add new Individual to this Group</a></div>
                : null}
        </div>
    );
};

// Render a family in the curator palette.
var renderFamily = function(family, gdm, annotation, curatorMatch, evidenceAffiliationMatch, curatorAffiliation) {
    var individualUrl = evidenceAffiliationMatch || curatorMatch ? ('/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;
    // if any of these segregation values exist, the family is assessable
    var familyAssessable = (family && family.segregation && (family.segregation.pedigreeDescription || family.segregation.pedigreeSize
        || family.segregation.numberOfGenerationInPedigree || family.segregation.consanguineousFamily || family.segregation.numberOfCases
        || family.segregation.deNovoType || family.segregation.numberOfParentsUnaffectedCarriers || family.segregation.numberOfAffectedAlleles
        || family.segregation.numberOfAffectedWithOneVariant || family.segregation.numberOfAffectedWithTwoVariants || family.segregation.numberOfUnaffectedCarriers
        || family.segregation.numberOfUnaffectedIndividuals || family.segregation.probandAssociatedWithBoth || family.segregation.additionalInformation)) ? true : false;

    return (
        <div className="panel-evidence-group">
            <h5><span className="title-ellipsis dotted" title={family.label}>{family.label}</span></h5>
            <div className="evidence-curation-info">
                {family.submitted_by ?
                    <p className="evidence-curation-info">Last edited by: {family.modified_by ? family.modified_by.title : family.submitted_by.title}</p>
                    : null}
                <p>{moment(family.last_modified).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {family.associatedGroups && family.associatedGroups.length ?
                <div>
                    <span>Associations: </span>
                    {family.associatedGroups.map(function(group, i) {
                        return (
                            <span key={i}>
                                {i > 0 ? ', ' : ''}
                                <a href={group['@id']} title="View group in a new tab" className="title-ellipsis title-ellipsis-short">{group.label}</a>
                            </span>
                        );
                    })}
                </div>
                :
                <div>No associations</div>
            }
            {(family && family.segregation && family.segregation.variants && family.segregation.variants.length) ?
                <div>
                    <span>Variants:&nbsp;
                        <a className="variant-preferred-title" title={setPreferredTitle(family.segregation.variants)}>{family.segregation.variants.length}</a>
                    </span>
                </div>
                : null}
            {familyAssessable ?
                <a href={'/family/' + family.uuid + '/?gdm=' + gdm.uuid} title="View/Assess family in a new tab">View</a>
                : <a href={'/family/' + family.uuid + '/?gdm=' + gdm.uuid} title="View family in a new tab">View</a>}
            {(family.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!family.affiliation && !curatorAffiliation && curatorMatch) ?
                <span> | <a href={'/family-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid} title="Edit this family">Edit</a></span>
                : null}
            {(family.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!family.affiliation && !curatorAffiliation && curatorMatch) ?
                <div><a href={individualUrl + '&family=' + family.uuid} title="Add a new individual associated with this group">Add new Individual to this Family</a></div>
                : null}
        </div>
    );
};

// Render an individual in the curator palette.
var renderIndividual = function(individual, gdm, annotation, curatorMatch, evidenceAffiliationMatch, curatorAffiliation) {
    var i = 0;

    return (
        <div className="panel-evidence-group">
            <h5><span className="title-ellipsis title-ellipsis-short dotted" title={individual.label}>{individual.label}</span>{individual.proband ? <i className="icon icon-proband"></i> : null}</h5>
            <div className="evidence-curation-info">
                {individual.submitted_by ?
                    <p className="evidence-curation-info">Last edited by: {individual.modified_by ? individual.modified_by.title : individual.submitted_by.title}</p>
                    : null}
                <p>{moment(individual.last_modified).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {(individual.associatedGroups && individual.associatedGroups.length) || (individual.associatedFamilies && individual.associatedFamilies.length) ?
                <div>
                    <span>Associations: </span>
                    {individual.associatedGroups.map(function(group) {
                        return (
                            <span key={group.uuid}>
                                {i++ > 0 ? ', ' : ''}
                                <a href={group['@id']} title="View group in a new tab" className="title-ellipsis title-ellipsis-short">{group.label}</a>
                            </span>
                        );
                    })}
                    {individual.associatedFamilies.map(function(family) {
                        return (
                            <span key={family.uuid}>
                                {family.associatedGroups.map(function(group) {
                                    return (
                                        <span key={group.uuid}>
                                            {i++ > 0 ? ', ' : ''}
                                            <a href={group['@id']} title="View group in a new tab" className="title-ellipsis title-ellipsis-short">{group.label}</a>
                                        </span>
                                    );
                                })}
                                <span key={family.uuid}>
                                    {i++ > 0 ? ', ' : ''}
                                    <a href={family['@id'] + '?gdm=' + gdm.uuid} title="View family in a new tab" className="title-ellipsis title-ellipsis-short">{family.label}</a>
                                </span>
                            </span>
                        );
                    })}
                </div>
                :
                <div>No associations</div>
            }
            {(individual.variants && individual.variants.length) ?
                <div>
                    <span>Variants:&nbsp;
                        <a className="variant-preferred-title" title={setPreferredTitle(individual.variants)}>{individual.variants.length}</a>
                    </span>
                </div>
                : null}
            <a href={'/individual/' + individual.uuid + '?gdm=' + gdm.uuid} title="View individual in a new tab">View/Score</a>
            {(individual.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!individual.affiliation && !curatorAffiliation && curatorMatch) ?
                <span> | <a href={'/individual-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + individual.uuid} title="Edit this individual">Edit</a></span>
                : null}
        </div>
    );
};

// Render a case-control in the curator palette.
var renderCaseControl = function(caseControl, gdm, annotation, curatorMatch, evidenceAffiliationMatch, curatorAffiliation) {
    return (
        <div className="panel-evidence-group">
            <h5><span className="title-ellipsis dotted" title={caseControl.label}>{caseControl.label}</span></h5>
            <div className="evidence-curation-info">
                {caseControl.submitted_by ?
                    <p className="evidence-curation-info">Last edited by: {caseControl.modified_by ? caseControl.modified_by.title : caseControl.submitted_by.title}</p>
                    : null}
                <p>{moment(caseControl.last_modified).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            <a href={'/casecontrol/' + caseControl.uuid} title="View group in a new tab">View/Score</a>
            {(caseControl.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!caseControl.affiliation && !curatorAffiliation && curatorMatch) ? <span> | <a href={
                '/case-control-curation/?editsc&gdm=' + gdm.uuid +
                '&evidence=' + annotation.uuid +
                '&casecontrol=' + caseControl.uuid +
                '&casecohort=' + caseControl.caseCohort.uuid +
                '&controlcohort=' + caseControl.controlCohort.uuid
            } title="Edit this case-control">Edit</a></span> : null}
        </div>
    );
};

// Render an experimental data in the curator palette.
var renderExperimental = function(experimental, gdm, annotation, curatorMatch, evidenceAffiliationMatch, curatorAffiliation) {
    var i = 0;
    var subtype = '';
    // determine if the evidence type has a subtype, and determine the subtype
    if (experimental.evidenceType == 'Biochemical function') {
        if (!_.isEmpty(experimental.biochemicalFunction.geneWithSameFunctionSameDisease)) {
            subtype = ' (A)';
        } else if (!_.isEmpty(experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype)) {
            subtype = ' (B)';
        }
    } else if (experimental.evidenceType == 'Expression') {
        if (!_.isEmpty(experimental.expression.normalExpression)) {
            subtype = ' (A)';
        } else if (!_.isEmpty(experimental.expression.alteredExpression)) {
            subtype = ' (B)';
        }
    }

    return (
        <div className="panel-evidence-group" key={experimental.uuid}>
            <h5><span className="title-ellipsis dotted" title={experimental.label}>{experimental.label}</span></h5>
            {experimental.evidenceType}{subtype}
            <div className="evidence-curation-info">
                {experimental.submitted_by ?
                    <p className="evidence-curation-info">Last edited by: {experimental.modified_by ? experimental.modified_by.title : experimental.submitted_by.title}</p>
                    : null}
                <p>{moment(experimental.last_modified).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {(experimental.variants && experimental.variants.length) ?
                <div>
                    <span>Variants:&nbsp;
                        <a className="variant-preferred-title" title={setPreferredTitle(experimental.variants)}>{experimental.variants.length}</a>
                    </span>
                </div>
                : null}
            <a href={'/experimental/' + experimental.uuid + '?gdm=' + gdm.uuid} title="View/Assess experimental data in a new tab">View/Score</a>
            {(experimental.affiliation && curatorAffiliation && evidenceAffiliationMatch) || (!experimental.affiliation && !curatorAffiliation && curatorMatch) ?
                <span> | <a href={'/experimental-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&experimental=' + experimental.uuid} title="Edit experimental data">Edit</a></span>
                : null}
        </div>
    );
};

// Render a variant in the curator palette.
//   variant: variant to display
//   gdm: Currently viewed GDM
//   annotation: Currently selected annotation (paper)
//   curatorMatch: True if annotation owner matches currently logged-in user
var renderVariant = function(variant, gdm, annotation, curatorMatch, session, affiliation) {
    var variantCurated = variant.associatedPathogenicities.length > 0;

    // Get the pathogenicity record with an owner that matches the annotation's owner.
    var associatedPathogenicity = getPathogenicityFromVariant(gdm, annotation.submitted_by.uuid, variant.uuid, affiliation);
    //var associatedPathogenicity = getPathogenicityFromVariant(variant, annotation.submitted_by.uuid);

    // Get all families and individuals that reference this variant into variantAssociations array of families and individuals
    var variantAssociations = collectVariantAssociations(annotation, variant).sort(function(associationA, associationB) {
        var labelA = associationA.label.toLowerCase();
        var labelB = associationB.label.toLowerCase();
        return (labelA < labelB) ? -1 : ((labelA > labelB ? 1 : 0));
    });

    let variantTitle = getVariantTitle(variant);

    return (
        <div className="panel-evidence-group">
            <h5><span className="title-ellipsis dotted" title={variantTitle}>{variantTitle}</span></h5>
            <div className="evidence-curation-info">
                {variant.submitted_by ?
                    <p className="evidence-curation-info">{variant.submitted_by.title}</p>
                    : null}
                <p>{moment(variant.date_created).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {variantAssociations ?
                <div>
                    <span>Associations: </span>
                    {variantAssociations.map(function(association, i) {
                        var associationType = association['@type'][0];
                        var probandIndividual = associationType === 'individual' && association.proband;
                        return (
                            <span key={i}>
                                {i > 0 ? ', ' : ''}
                                <a href={association['@id']} title={'View ' + associationType + ' in a new tab'} className="title-ellipsis title-ellipsis-short">{association.label}</a>
                                {probandIndividual ? <i className="icon icon-proband"></i> : null}
                            </span>
                        );
                    })}
                </div>
                : null}
        </div>
    );
};

// Title for each section of the curation palette. Contains the title and an Add button.
var CurationPaletteTitles = createReactClass({
    propTypes: {
        title: PropTypes.string, // Title to display
        url: PropTypes.string // URL for panel title click to go to.
    },

    render: function() {
        return (
            <div>
                {this.props.url ?
                    <a href={this.props.url} className="curation-palette-title clearfix">
                        <h4 className="pull-left">{this.props.title}</h4>
                        <i className="icon icon-plus-circle pull-right"></i>
                    </a>
                :
                    <span className="curation-palette-title clearfix">
                        <h4 className="pull-left">{this.props.title}</h4>
                    </span>
                }
            </div>
        );
    }
});


// Display the gene section of the curation data
var GeneRecordHeader = createReactClass({
    propTypes: {
        gene: PropTypes.object // Object to display
    },

    render: function() {
        var gene = this.props.gene;

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    {gene ?
                        <dl>
                            <dt>{gene.symbol}</dt>
                            <dd>HGNC Symbol: <a href={external_url_map['HGNC'] + gene.hgncId} target="_blank" title={'HGNC page for ' + gene.symbol + ' in a new window'}>{gene.symbol}</a></dd>
                            <dd>NCBI Gene ID: <a href={external_url_map['Entrez'] + gene.entrezId} target="_blank" title={'NCBI page for gene ' + gene.entrezId + ' in a new window'}>{gene.entrezId}</a></dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});


// Display the disease section of the curation data
var DiseaseRecordHeader = createReactClass({
    propTypes: {
        gdm: PropTypes.object, // Object to display
        omimId: PropTypes.string, // OMIM ID to display
        updateOmimId: PropTypes.func // Function to call when OMIM ID changes
    },

    render: function() {
        var gdm = this.props.gdm;
        var disease = gdm && gdm.disease;
        var addEdit = this.props.omimId ? 'Edit' : 'Add';

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    {disease ?
                        <dl>
                            <dt>
                                {disease.term}
                                {disease.phenotypes && disease.phenotypes.length ?
                                    <PopOverComponent popOverWrapperClass="gdm-disease-phenotypes"
                                        actuatorTitle="View HPO term(s)" popOverRef={ref => (this.popoverPhenotypes = ref)}>
                                        {disease.phenotypes.join(', ')}
                                    </PopOverComponent>
                                : null}
                                {disease.description && disease.description.length ?
                                    <PopOverComponent popOverWrapperClass="gdm-disease-description"
                                        actuatorTitle="View definition" popOverRef={ref => (this.popoverDesc = ref)}>
                                        {disease.description}
                                    </PopOverComponent>
                                : null}
                            </dt>
                            <dd>
                                {!disease.freetext && disease.diseaseId.indexOf('FREETEXT') < 0 ?
                                    <span>
                                        <span>Disease ID: </span>
                                        <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank" title={'Ontology lookup for ' + disease.diseaseId + ' in a new window'}>{disease.diseaseId.replace('_', ':')}</a>
                                    </span>
                                : null}
                            </dd>
                            <dd>
                                <a href="http://omim.org/" target="_blank" title="Online Mendelian Inheritance in Man home page in a new window">OMIM</a> ID: {this.props.omimId ?
                                    <a href={external_url_map['OMIM'] + this.props.omimId} title={'Open Online Mendelian Inheritance in Man page for OMIM ID ' + this.props.omimId + ' in a new window'} target="_blank">
                                        {this.props.omimId}
                                    </a>
                                : null}&nbsp;
                                {this.props.updateOmimId ?
                                    <AddOmimIdModal gdm={gdm} updateOmimId={this.props.updateOmimId} addEdit={addEdit} omimid={this.props.omimId ? this.props.omimId : ''} />
                                : null}
                            </dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});


// The content of the Add PMID(s) modal dialog box
var AddOmimIdModal = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object.isRequired, // GDM being affected
        updateOmimId: PropTypes.func.isRequired, // Function to call when we have a new OMIM ID
        addEdit: PropTypes.string.isRequired,
        omimid: PropTypes.string
    },

    getInitialState() {
        return {
            omimid: this.props.omimid
        };
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.omimid) {
            this.setState({omimid: nextProps.omimid});
        }
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        // Valid if the field has only 10 or fewer digits
        if (valid) {
            valid = this.getFormValue('omimid').match(/^[0-9]{1,10}$/i);
            if (!valid) {
                this.setFormErrors('omimid', 'Only numbers allowed');
            }
        }
        return valid;
    },

    // Called when the modal form’s submit button is clicked. Handles validation and updating the OMIM in the GDM.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.saveFormValue('omimid', this.refs.omimid.getValue());
        if (this.validateForm()) {
            // Form is valid -- we have a good OMIM ID. Close the modal and update the current GDM's OMIM ID
            this.handleModalClose();
            var enteredOmimId = this.getFormValue('omimid');
            this.props.updateOmimId(this.props.gdm.uuid, enteredOmimId);
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.handleModalClose();
    },

    /************************************************************************************************/
    /* Resetting the formErrors for selected input and other states was not needed previously       */
    /* because the previous MixIn implementation allowed the actuator (button to show the modal)    */
    /* to be defined outside of this component and closing the modal would delete this component    */
    /* from virtual DOM, along with the states.                                                     */
    /* The updated/converted implementation (without MixIn) wraps the actuator in the modal         */
    /* component and thus this component always exists in the virtual DOM as long as the actuator   */
    /* needs to be rendered in the UI. As a result, closing the modal does not remove the component */
    /* and the modified states are retained.                                                        */
    /* The MixIn function this.props.closeModal() has been replaced by this.child.closeModal(),     */
    /* which is way to call a function defined in the child component from the parent component.    */
    /* The reference example is at: https://jsfiddle.net/frenzzy/z9c46qtv/                          */
    /************************************************************************************************/
    handleModalClose() {
        let errors = this.state.formErrors;
        errors['omimid'] = '';
        this.setState({formErrors: errors});
        this.child.closeModal();
    },

    render: function() {
        let omimid = this.state.omimid;

        return (
            <ModalComponent modalTitle="Add/Change OMIM ID" modalClass="modal-default" modalWrapperClass="edit-omim-modal"
                actuatorClass="omimid-add-edit-btn" actuatorTitle={this.props.addEdit} onRef={ref => (this.child = ref)}>
                <Form submitHandler={this.submitForm} formClassName="form-std">
                    <div className="modal-body">
                        <Input type="text" ref="omimid" label="Enter an OMIM ID" value={omimid}
                            error={this.getFormError('omimid')} clearError={this.clrFormErrors.bind(null, 'omimid')}
                            labelClassName="control-label" groupClassName="form-group" required />
                    </div>
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                        <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="Add/Change OMIM ID" />
                    </div>
                </Form>
            </ModalComponent>
        );
    }
});


// Display the curator data of the curation data
var CuratorRecordHeader = createReactClass({
    propTypes: {
        gdm: PropTypes.object // GDM with curator data to display
    },

    render: function() {
        var gdm = this.props.gdm;
        var participants = findAllParticipants(gdm);
        var latestRecord = gdm && findLatestRecord(gdm);

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {gdm ?
                        <dl className="inline-dl clearfix">
                            <dt>Creator: </dt><dd><a href={'mailto:' + gdm.submitted_by.email}>{gdm.submitted_by.title}</a> — {moment(gdm.date_created).format('YYYY MMM DD, h:mm a')}</dd>
                            {participants && participants.length && latestRecord ?
                                <div>
                                    <dt>Contributors: </dt>
                                    <dd>
                                        {participants.map(function(participant, i) {
                                            return (
                                                <span key={i}>
                                                    {i > 0 ? ', ' : ''}
                                                    <a href={'mailto:' + participant.email}>{participant.title}</a>
                                                </span>
                                            );
                                        })}
                                    </dd>
                                    <dt>Last edited: </dt>
                                    <dd><a href={'mailto:' + latestRecord.submitted_by.email}>{latestRecord.submitted_by.title}</a> — {moment(latestRecord.last_modified).format('YYYY MMM DD, h:mm a')}</dd>
                                </div>
                            : null}
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});

/**
 * This method is no longer used due to changes in #1341
 */
// Return the latest annotation in the given GDM. This is the internal version; use the memoized version externally.
var findLatestAnnotation = module.exports.findLatestAnnotation = function(gdm) {
    var annotations = gdm && gdm.annotations;
    var latestAnnotation = null;
    var latestTime = 0;
    if (annotations && annotations.length) {
        annotations.forEach(function(annotation) {
            // Get Unix timestamp version of annotation's time and compare against the saved version.
            var time = moment(annotation.date_created).format('x');
            if (latestTime < time) {
                latestAnnotation = annotation;
                latestTime = time;
            }
        });
    }
    return latestAnnotation;
};

// Return an array of (annotations, evidence, scores) submitted_by objects sorted by last name given the GDM.
export function findAllParticipants(gdm) {
    let allObjects = getAllObjects(gdm);

    let submitters = allObjects.map(object => {
        return object.submitted_by;
    });

    let participants = _.chain(submitters).uniq(submitter => {
        return submitter.uuid;
    }).sortBy('last_name').value();

    return participants;
}

/**
 * Return an array of unique GDMs consisting of any affiliated annotations, evidence, scores and classifications
 * @param {array} gdms - An array of gene-disease records
 * @param {string} affiliationId - Affiliation ID associated with the logged-in user
 */
export function findAffiliatedGdms(gdms, affiliationId) {
    // Iterate thru all flattened objects in each GDM.
    // For any objects that have the matching affiliation,
    // add the parent GDM to the array
    let affiliatedGdmList = [];
    gdms.map(gdm => {
        if (gdm.affiliation && gdm.affiliation === affiliationId) {
            affiliatedGdmList.push(gdm);
        }
        let allObjects = getAllObjects(gdm);
        allObjects.forEach(object => {
            if (object.affiliation && object.affiliation === affiliationId) {
                affiliatedGdmList.push(gdm);
            }
        });
    });
    // Filtered array that excludes duplicate GDMs
    let uniqueAffiliatedGdms = _.chain(affiliatedGdmList).uniq(affiliatedGdm => {
        return affiliatedGdm.uuid;
    }).sortBy('last_modified').value();

    return uniqueAffiliatedGdms;
}

// Return the latest added/updated object in the given GDM (e.g. annotation, evidence)
export function findLatestRecord(gdm) {
    let allObjects = getAllObjects(gdm);
    let latestModifiedObject = null;
    let latestModified = 0;
    if (allObjects.length) {
        allObjects.forEach(object => {
            // If object is an annotation, use 'date_created'.
            // Otherwise, use 'last_modified' for evidence object.
            // Logic - a PMID can not be edited after being added
            // while an evidence (group or family) can be edited.
            let lastModified = object['@type'][0] === 'annotation' ? moment(object.date_created).format('x') : moment(object.last_modified).format('x');
            if (latestModified < lastModified) {
                latestModifiedObject = object;
                latestModified = lastModified;
            }
        });
    }

    return latestModifiedObject;
}

// Return all record objects flattened in an array,
// including annotations, evidence, scores
function getAllObjects(gdm) {
    let totalObjects = [];
    // loop through gdms
    let annotations = gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
    annotations.forEach(annotation => {
        // Get annotation records
        totalObjects.push(filteredObject(annotation));
        // loop through groups
        let groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
        if (groups.length) {
            groups.forEach(group => {
                // Get group evidence
                totalObjects.push(filteredObject(group));
                // loop through families within each group
                let groupFamiliesIncluded = group.familyIncluded && group.familyIncluded.length ? group.familyIncluded : [];
                if (groupFamiliesIncluded.length) {
                    groupFamiliesIncluded.forEach(family => {
                        // Get group's family evidence
                        totalObjects.push(filteredObject(family));
                        // loop through individuals within each family of the group
                        let groupFamilyIndividualsIncluded = family.individualIncluded && family.individualIncluded.length ? family.individualIncluded : [];
                        if (groupFamilyIndividualsIncluded.length) {
                            groupFamilyIndividualsIncluded.forEach(individual => {
                                // Get group's family's individual evidence
                                totalObjects.push(filteredObject(individual));
                                // loop through group's family's individual scores
                                let groupFamilyIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
                                if (groupFamilyIndividualScores.length) {
                                    groupFamilyIndividualScores.forEach(score => {
                                        // Get scores
                                        totalObjects.push(filteredObject(score));
                                    });
                                }
                            });
                        }
                    });
                }
                // loop through individuals of group
                let groupIndividualsIncluded = group.individualIncluded && group.individualIncluded.length ? group.individualIncluded : [];
                if (groupIndividualsIncluded.length) {
                    groupIndividualsIncluded.forEach(individual => {
                        // Get group's individual evidence
                        totalObjects.push(filteredObject(individual));
                        // loop through group's individual scores
                        let groupIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
                        if (groupIndividualScores.length) {
                            groupIndividualScores.forEach(score => {
                                // Get scores
                                totalObjects.push(filteredObject(score));
                            });
                        }
                    });
                }
            });
        }

        // loop through families
        let families = annotation.families && annotation.families.length ? annotation.families : [];
        if (families.length) {
            families.forEach(family => {
                // Get family evidence
                totalObjects.push(filteredObject(family));
                // loop through individuals with each family
                let familyIndividualsIncluded = family.individualIncluded && family.individualIncluded.length ? family.individualIncluded : [];
                if (familyIndividualsIncluded.length) {
                    familyIndividualsIncluded.forEach(individual => {
                        // Get family's individual evidence
                        totalObjects.push(filteredObject(individual));
                        // loop through family's individual scores
                        let familyIndividualScores = individual.scores && individual.scores.length ? individual.scores : [];
                        if (familyIndividualScores.length) {
                            familyIndividualScores.forEach(score => {
                                // Get scores
                                totalObjects.push(filteredObject(score));
                            });
                        }
                    });
                }
            });
        }

        // loop through individuals
        let individuals = annotation.individuals && annotation.individuals.length ? annotation.individuals : [];
        if (individuals.length) {
            individuals.forEach(individual => {
                // Get individual evidence
                totalObjects.push(filteredObject(individual));
                // loop through individual scores
                let individualScores = individual.scores && individual.scores.length ? individual.scores : [];
                if (individualScores.length) {
                    individualScores.forEach(score => {
                        // Get scores
                        totalObjects.push(filteredObject(score));
                    });
                }
            });
        }

        // loop through experimentals
        let experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
        if (experimentals.length) {
            experimentals.forEach(experimental => {
                // Get individual evidence
                totalObjects.push(filteredObject(experimental));
                // loop through experimental scores
                let experimentalScores = experimental.scores && experimental.scores.length ? experimental.scores : [];
                if (experimentalScores.length) {
                    experimentalScores.forEach(score => {
                        // Get scores
                        totalObjects.push(filteredObject(score));
                    });
                }
            });
        }

        // loop through case-controls
        let caseControls = annotation.caseControlStudies && annotation.caseControlStudies.length ? annotation.caseControlStudies : [];
        if (caseControls.length) {
            caseControls.forEach(caseControl => {
                // Get case-control evidence
                totalObjects.push(filteredObject(caseControl));
                // loop through case-control scores
                let caseControlScores = caseControl.scores && caseControl.scores.length ? caseControl.scores : [];
                if (caseControlScores.length) {
                    caseControlScores.forEach(score => {
                        // Get scores
                        totalObjects.push(filteredObject(score));
                    });
                }
            });
        }
    });
    // Get provisionalClassifications objects
    let classifications = gdm.provisionalClassifications && gdm.provisionalClassifications.length ? gdm.provisionalClassifications : [];
    classifications.forEach(classification => {
        totalObjects.push(filteredObject(classification));
    });

    return totalObjects;
}

// Method to filter object keys
function filteredObject(record) {
    const allowed = ['date_created', 'last_modified', 'submitted_by', '@type', 'affiliation'];

    const filtered = Object.keys(record)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = record[key];
            return obj;
        }, {});

    return filtered;
}


// Display buttons to bring up the PubMed and doi-specified web pages.
// For now, no doi is available
var PmidDoiButtons = module.exports.PmidDoiButtons = createReactClass({
    propTypes: {
        pmid: PropTypes.string // Numeric string PMID for PubMed page
    },

    render: function() {
        var pmid = this.props.pmid;

        return (
            <div className="pmid-doi-btns">
                {pmid ? <a className="btn btn-primary" target="_blank" href={external_url_map['PubMed'] + pmid}>PubMed</a> : null}
            </div>
        );
    }
});


// Get the pathogenicity made by the curator with the given user UUID from the given variant
export function getPathogenicityFromVariant(gdm, curatorUuid, variantUuid, affiliation) {
    var pathogenicity = null;
    if (gdm && gdm.variantPathogenicity && gdm.variantPathogenicity.length) {
        for (let object of gdm.variantPathogenicity) {
            if (affiliation && object.affiliation && object.affiliation === affiliation.affiliation_id && object.variant.uuid === variantUuid) {
                pathogenicity = object;
            } else if (!affiliation && !object.affiliation && object.submitted_by.uuid === curatorUuid && object.variant.uuid === variantUuid) {
                pathogenicity = object;
            }
        }
    }
    return pathogenicity;
}


// Collect references to all families and individuals within an annotation that reference the given variant
var collectVariantAssociations = function(annotation, targetVariant) {
    var allAssociations = [];

    // Find any variants matching the target variant in the given individual.
    // Any matching variant pushes its individual onto the associations array as a side effect
    function surveyIndividual(individual, targetVariant, associations) {
        // Search for variant in individual matching variant we're looking for
        var matchingVariant = _(individual.variants).find(function(variant) {
            return variant.uuid === targetVariant.uuid;
        });

        // Found a matching variant; push its parent individual
        if (matchingVariant) {
            associations.push(individual);
        }
    }

    // Find any variants matching the target variant in the given family's segregation.
    // Any matching variant pushes its family onto the associations array as a side effect
    function surveyFamily(family, targetVariant, associations) {
        if (family.segregation && family.segregation.variants) {
            var matchingVariant = _(family.segregation.variants).find(function(variant) {
                return variant.uuid === targetVariant.uuid;
            });

            // Found a matching variant; push its parent family
            if (matchingVariant) {
                allAssociations.push(family);
            }
        }
    }

    // Find any variants matching the target variant in the given experimental data.
    // Any matching variant pushes its experimental data onto the associations array as a side effect
    function surveyExperimental(experimental, targetVariant, associations) {
        // Search for variant in experimental matching variant we're looking for
        var matchingVariant = _(experimental.variants).find(function(variant) {
            return variant.uuid === targetVariant.uuid;
        });

        // Found a matching variant; push its parent individual
        if (matchingVariant) {
            associations.push(experimental);
        }
    }

    if (annotation && Object.keys(annotation).length) {
        // Search unassociated individuals
        annotation.individuals.forEach(function(individual) {
            // Add any variants matching targetVariant in the individual to allAssociations
            surveyIndividual(individual, targetVariant, allAssociations);
        });

        // Search unassociated families
        annotation.families.forEach(function(family) {
            // Add any variants matching targetVariant in the family to allAssociations
            surveyFamily(family, targetVariant, allAssociations);

            // Search for variant in the family's individuals matching variant we're looking for
            family.individualIncluded.forEach(function(individual) {
                surveyIndividual(individual, targetVariant, allAssociations);
            });
        });

        // Search groups
        annotation.groups.forEach(function(group) {
            // Search variants in group's individuals
            group.individualIncluded.forEach(function(individual) {
                surveyIndividual(individual, targetVariant, allAssociations);
            });

            // Search variants in group's families' segregations
            group.familyIncluded.forEach(function(family) {
                surveyFamily(family, targetVariant, allAssociations);

                // Search for variant in the group's families' individuals matching variant we're looking for
                family.individualIncluded.forEach(function(individual) {
                    surveyIndividual(individual, targetVariant, allAssociations);
                });
            });
        });

        // Search experimental data
        annotation.experimentalData.forEach(function(experimental) {
            surveyExperimental(experimental, targetVariant, allAssociations);
        });
    }

    return allAssociations.length ? allAssociations : null;
};


// Returns object keyed by variant @id, each of which points to each variant in all family segmentations
// and individuals in all annotations in the given GDM. All variants are de-duped in the returned object.
var collectGdmVariants = function(gdm) {
    var allVariants = {};

    if (gdm && gdm.annotations && gdm.annotations.length) {
        gdm.annotations.forEach(function(annotation) {
            // Get all variants in each annotation
            var annotationVariants = collectAnnotationVariants(annotation);

            // Merge them into the collection of all annotations' variants
            Object.keys(annotationVariants).forEach(function(variantId) {
                allVariants[variantId] = annotationVariants[variantId];
            });
        });
    }
    return Object.keys(allVariants).length ? allVariants : null;
};

/**
 * This method is no longer used due to changes in #1341
 */
// Get a de-duped array of annotation submitted_by objects sorted by last name from the given GDM.
var getAnnotationOwners = module.exports.getAnnotationOwners = function(gdm) {
    var owners = gdm && gdm.annotations.map(function(annotation) {
        return annotation.submitted_by;
    });
    var annotationOwners = _.chain(owners).uniq(function(owner) {
        return owner.uuid;
    }).sortBy('last_name').value();
    return annotationOwners;
};


// Returns object keyed by variant @id that points to each variant in all family segmentations
// and individuals related to the given annotation (evidence/article). There's plenty of opportunity
// for duplicate variants, but all variants are de-duped in the returned object.
// returnvalue.a -> a{}.
var collectAnnotationVariants = function(annotation) {
    var allVariants = {};

    if (annotation && Object.keys(annotation).length) {
        // Search unassociated individuals
        annotation.individuals.forEach(function(individual) {
            if (individual.variants && individual.variants.length) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }
        });

        // Search unassociated families
        annotation.families.forEach(function(family) {
            // Collect variants in the family's segregation
            if (family.segregation && family.segregation.variants && family.segregation.variants.length) {
                family.segregation.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }

            // Collect variants in the family's individuals
            family.individualIncluded.forEach(function(individual) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            });
        });

        // Search groups
        annotation.groups.forEach(function(group) {
            // Collect variants in group's individuals
            group.individualIncluded.forEach(function(individual) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            });

            // Collect variants in associated families' segregations
            group.familyIncluded.forEach(function(family) {
                // Collect variants in the family's segregation
                if (family.segregation && family.segregation.variants) {
                    family.segregation.variants.forEach(function(variant) {
                        allVariants[variant['@id']] = variant;
                    });
                }

                // Collect variants in the family's individual's
                family.individualIncluded.forEach(function(individual) {
                    individual.variants.forEach(function(variant) {
                        allVariants[variant['@id']] = variant;
                    });
                });
            });
        });

        // Search experimental data
        annotation.experimentalData.forEach(function(experimental) {
            // Collect variants in experimental data, if available
            if (experimental.variants) {
                experimental.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }
        });
    }
    return allVariants;
};


// Convert a boolean value to a Yes/No dropdown value
var booleanToDropdown = module.exports.booleanToDropdown = function booleanToDropdown(boolVal) {
    return boolVal === true ? 'Yes' : (boolVal === false ? 'No' : 'none');
};


// Pull values from 's' (a list of comma-separated values) that match the regular expression given in 're'.
// If resulting values should be converted to uppercase, pass true in 'uppercase'.
function captureBase(s, re, uppercase) {
    if (s) {
        var list;
        var rawList = s.split(','); // Break input into array of raw strings
        if (rawList && rawList.length) {
            list = rawList.map(function(item) {
                var m = re.exec(item);
                return m ? (uppercase ? m[1].toUpperCase() : m[1]) : null;
            });
        }
        return list;
    }
    return null;
}

// Given a string of comma-separated values, these functions break them into an array, but only
// for values that satisfy the regex pattern. Any items that don't result in a null array entry
// for that item.
module.exports.capture = {
    // Find all the comma-separated 'orphaXX' occurrences. Return all valid orpha IDs in an array.
    orphas: function(s) {
        return captureBase(s, /^\s*orpha:?(\d+)\s*$/i);
    },

    // Find all the comma-separated gene-symbol occurrences. Return all valid symbols in an array.
    genes: function(s) {
        return captureBase(s, /^\s*(\w+)\s*$/, true);
    },

    // Find all the comma-separated PMID occurrences. Return all valid PMIDs in an array.
    pmids: function(s) {
        return captureBase(s, /^\s*([1-9]{1}\d*)\s*$/);
    },

    // Find all the comma-separated HPO ID occurrences. Return all valid HPO ID in an array.
    hpoids: function(s) {
        return captureBase(s, /^\s*(HP:\d{7})\s*$/i, true);
    },

    // Find all the comma-separated GO_Slim ID occurrences. Return all valid GO_Slim ID in an array.
    goslims: function(s) {
        return captureBase(s, /^\s*(GO:\d{7})\s*$/i, true);
    },

    // Find all the comma-separated Uberon ID occurrences. Return all valid Uberon ID in an array.
    uberonids: function(s) {
        return captureBase(s, /^\s*(UBERON:\d{7})\s*$/i, true);
    },

    // Find all the comma-separated EFO ID occurrences. Return all valid EFO IDs in an array.
    efoids: function(s) {
        return captureBase(s, /^\s*(EFO_\d{7})\s*$/i, true);
    },

    // Find all the comma-separated CL Ontology ID occurrences. Return all valid Uberon ID in an array.
    clids: function(s) {
        return captureBase(s, /^\s*(CL_\d{7})\s*$/i, true);
    },

    // Find all the comma-separated EFO/CLO ID occurrences. Return all valid EFO/CLO IDs in an array.
    efoclids: function(s) {
        return captureBase(s, /^\s*((EFO_|CL_)\d{7})\s*$/i, true);
    }
};


// Given a PMID for a paper in a GDM, find its annotation object.
module.exports.pmidToAnnotation = function(gdm, pmid) {
    return _(gdm.annotations).find(annotation => {
        return annotation.article.pmid === pmid;
    });
};


// Take an object and make a flattened version ready for writing.
// SCHEMA: This might need to change when the schema changes.
var flatten = module.exports.flatten = function(obj, type) {
    var flat = null;

    // Normally don't pass in a type; we'll get it from the object itself. Pass in a type only
    // if there might not be one -- rare but possible.
    if (!type) {
        type = obj['@type'][0];
    }

    if (obj) {
        switch(type) {
            case 'gdm':
                flat = flattenGdm(obj);
                break;

            case 'annotation':
                flat = flattenAnnotation(obj);
                break;

            case 'group':
                flat = flattenGroup(obj);
                break;

            case 'family':
                flat = flattenFamily(obj);
                break;

            case 'individual':
                flat = flattenIndividual(obj);
                break;

            case 'pathogenicity':
                flat = flattenPathogenicity(obj);
                break;

            case 'experimental':
                flat = flattenExperimental(obj);
                break;

            case 'assessment':
                flat = flattenAssessment(obj);
                break;

            case 'provisionalClassification':
                flat = flattenProvisional(obj);
                break;

            case 'provisional_variant':
                flat = flattenProvisionalVariant(obj);
                break;

            case 'evidenceScore':
                flat = flattenEvidenceScore(obj);
                break;

            case 'caseControl':
                flat = flattenCaseControl(obj);
                break;

            case 'interpretation':
                flat = flattenInterpretation(obj);
                break;

            case 'disease':
                flat = flattenDisease(obj);
                break;

            default:
                break;
        }

        // Flatten submitted_by
        if (obj.submitted_by) {
            flat.submitted_by = obj.submitted_by['@id'];
        }
    }

    return flat;
};


// Clone the simple properties of the given object and return them in a new object.
// An array of the names of the properties to copy in the 'props' parameter.
// Simple properties include strings, booleans, integers, arrays of those things,
// and objects comprising simple properties.

function cloneSimpleProps(obj, props) {
    var dup = {};

    props.forEach(function(prop) {
        if (obj.hasOwnProperty(prop)) {
            dup[prop] = obj[prop];
        }
    });
    return dup;
}


var annotationSimpleProps = ["active", "date_created", "affiliation"];

function flattenAnnotation(annotation) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(annotation, annotationSimpleProps);

    flat.article = annotation.article['@id'];

    // Flatten groups
    if (annotation.groups && annotation.groups.length) {
        flat.groups = annotation.groups.map(function(group) {
            return group['@id'];
        });
    }

    // Flatten families
    if (annotation.families && annotation.families.length) {
        flat.families = annotation.families.map(function(family) {
            return family['@id'];
        });
    }

    // Flatten individuals
    if (annotation.individuals && annotation.individuals.length) {
        flat.individuals = annotation.individuals.map(function(individual) {
            return individual['@id'];
        });
    }

    // Flatten experimentalData
    if (annotation.experimentalData && annotation.experimentalData.length) {
        flat.experimentalData = annotation.experimentalData.map(function(data) {
            return data['@id'];
        });
    }

    // Flatten caseControlStudies
    if (annotation.caseControlStudies && annotation.caseControlStudies.length) {
        flat.caseControlStudies = annotation.caseControlStudies.map(function(data) {
            return data['@id'];
        });
    }

    return flat;
}


var groupSimpleProps = ["label", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "numberOfMale", "numberOfFemale", "countryOfOrigin",
    "ethnicity", "race", "ageRangeType", "ageRangeFrom", "ageRangeTo", "ageRangeUnit", "totalNumberIndividuals", "numberOfIndividualsWithFamilyInformation",
    "numberOfIndividualsWithoutFamilyInformation", "numberOfIndividualsWithVariantInCuratedGene", "numberOfIndividualsWithoutVariantInCuratedGene",
    "numberOfIndividualsWithVariantInOtherGene", "method", "additionalInformation", "date_created", "numberWithVariant", "numberAllGenotypedSequenced",
    "alleleFrequency", "affiliation"
];

function flattenGroup(group) {
    // First copy simple properties before fixing the special properties
    var flat = cloneSimpleProps(group, groupSimpleProps);

    if (group.commonDiagnosis && group.commonDiagnosis.length) {
        flat.commonDiagnosis = group.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

    if (group.otherGenes && group.otherGenes.length) {
        flat.otherGenes = group.otherGenes.map(function(gene) {
            return gene['@id'];
        });
    }

    if (group.otherPMIDs && group.otherPMIDs.length) {
        flat.otherPMIDs = group.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    if (group.statistic) {
        flat.statistic = group.statistic['@id'];
    }

    if (group.familyIncluded && group.familyIncluded.length) {
        flat.familyIncluded = group.familyIncluded.map(function(family) {
            return family['@id'];
        });
    }

    if (group.individualIncluded && group.individualIncluded.length) {
        flat.individualIncluded = group.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    }

    if (group.control) {
        flat.control = group.control['@id'];
    }

    if (group.groupType) {
        flat.groupType = group.groupType;
    }

    return flat;
}


var familySimpleProps = ["label", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "numberOfMale", "numberOfFemale", "countryOfOrigin",
    "ethnicity", "race", "ageRangeType", "ageRangeFrom", "ageRangeTo", "ageRangeUnit", "method", "additionalInformation", "date_created", "affiliation"
];

function flattenFamily(family) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(family, familySimpleProps);

    // Flatten diseases
    if (family.commonDiagnosis && family.commonDiagnosis.length > 0) {
        flat.commonDiagnosis = family.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

    // Flatten segregation variants
    if (family.segregation) {
        flat.segregation = flattenSegregation(family.segregation);
    }

    // Flatten other PMIDs
    if (family.otherPMIDs && family.otherPMIDs.length) {
        flat.otherPMIDs = family.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    // Flatten included individuals
    if (family.individualIncluded && family.individualIncluded.length) {
        flat.individualIncluded = family.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    }

    return flat;
}


var segregationSimpleProps = ["pedigreeDescription", "pedigreeSize", "numberOfGenerationInPedigree", "consanguineousFamily", "numberOfCases", "deNovoType",
    "numberOfParentsUnaffectedCarriers", "numberOfAffectedAlleles", "numberOfAffectedWithOneVariant", "numberOfAffectedWithTwoVariants", "numberOfUnaffectedCarriers",
    "numberOfUnaffectedIndividuals", "probandAssociatedWithBoth", "additionalInformation", "numberOfAffectedWithGenotype", "numberOfUnaffectedWithoutBiallelicGenotype",
    "numberOfSegregationsForThisFamily", "inconsistentSegregationAmongstTestedIndividuals", "explanationForInconsistent", "familyConsanguineous", "pedigreeLocation",
    "lodPublished", "publishedLodScore", "estimatedLodScore", "includeLodScoreInAggregateCalculation", "reasonExplanation"];

var flattenSegregation = module.exports.flattenSegregation = function(segregation) {
    var flat = cloneSimpleProps(segregation, segregationSimpleProps);

    if (segregation.variants && segregation.variants.length) {
        flat.variants = segregation.variants.map(function(variant) {
            return variant['@id'];
        });
    }
    if (segregation.assessments && segregation.assessments.length) {
        flat.assessments = segregation.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }

    return flat;
};


var individualSimpleProps = ["label", "sex", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "countryOfOrigin", "ethnicity",
    "race", "ageType", "ageValue", "ageUnit", "method", "additionalInformation", "proband", "date_created", "bothVariantsInTrans", "denovo", "maternityPaternityConfirmed",
    "recessiveZygosity", "affiliation"
];

function flattenIndividual(individual) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(individual, individualSimpleProps);

    // Flatten diseases
    if (individual.diagnosis && individual.diagnosis.length > 0) {
        flat.diagnosis = individual.diagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

    // Flatten other PMIDs
    if (individual.otherPMIDs && individual.otherPMIDs.length) {
        flat.otherPMIDs = individual.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    // Flatten variants
    if (individual.variants && individual.variants.length) {
        flat.variants = individual.variants.map(function(variant) {
            return variant['@id'];
        });
    }

    // Flatten evidence scores
    if (individual.scores && individual.scores.length) {
        flat.scores = individual.scores.map(function(score) {
            return score['@id'];
        });
    }

    return flat;
}


var experimentalSimpleProps = ["label", "evidenceType", "biochemicalFunction", "proteinInteractions", "expression",
    "functionalAlteration", "modelSystems", "rescue", "date_created", "affiliation"
];

function flattenExperimental(experimental) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(experimental, experimentalSimpleProps);

    // Flatten genes
    if (experimental.biochemicalFunction && experimental.biochemicalFunction.geneWithSameFunctionSameDisease
        && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes
        && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.length) {
        flat.biochemicalFunction.geneWithSameFunctionSameDisease.genes = experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(function(gene) {
            return gene['@id'];
        });
    }
    if (experimental.proteinInteractions && experimental.proteinInteractions.interactingGenes
        && experimental.proteinInteractions.interactingGenes.length) {
        flat.proteinInteractions.interactingGenes = experimental.proteinInteractions.interactingGenes.map(function(gene) {
            return gene['@id'];
        });
    }
    // Flatten assessments
    if (experimental.assessments && experimental.assessments.length) {
        flat.assessments = experimental.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }
    // Flatten variants
    if (experimental.variants && experimental.variants.length) {
        flat.variants = experimental.variants.map(function(variant) {
            return variant['@id'];
        });
    }

    // Flatten evidence scores
    if (experimental.scores && experimental.scores.length) {
        flat.scores = experimental.scores.map(function(score) {
            return score['@id'];
        });
    }

    return flat;
}


var gdmSimpleProps = [
    "date_created", "modeInheritance", "omimId", "draftClassification", "finalClassification", "active",
    "modeInheritanceAdjective", "affiliation"
];

function flattenGdm(gdm) {
    // First copy all the simple properties
    var flat = cloneSimpleProps(gdm, gdmSimpleProps);

    // Flatten genes
    if (gdm.gene) {
        flat.gene = gdm.gene['@id'];
    }

    // Flatten diseases
    if (gdm.disease) {
        flat.disease = gdm.disease['@id'];
    }

    // Flatten annotations
    if (gdm.annotations && gdm.annotations.length) {
        flat.annotations = gdm.annotations.map(function(annotation) {
            return annotation['@id'];
        });
    }

    // Flatten variant pathogenicities
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length) {
        flat.variantPathogenicity = gdm.variantPathogenicity.map(function(vp) {
            return vp['@id'];
        });
    }

    // Flatten provisional classifications
    if (gdm.provisionalClassifications && gdm.provisionalClassifications.length) {
        flat.provisionalClassifications = gdm.provisionalClassifications.map(function(classification) {
            return classification['@id'];
        });
    }

    return flat;
}


var pathogenicitySimpleProps = [
    "date_created", "consistentWithDiseaseMechanism", "withinFunctionalDomain", "frequencySupportPathogenicity", "previouslyReported",
    "denovoType", "intransWithAnotherVariant", "supportingSegregation", "supportingStatistic", "supportingExperimental", "comment",
    "geneImpactType", "allelicSupportGeneImpact", "computationalSupportGeneImpact", "affiliation"
];

function flattenPathogenicity(pathogenicity) {
    // First copy all the simple properties
    var flat = cloneSimpleProps(pathogenicity, pathogenicitySimpleProps);

    // Flatten variant
    flat.variant = pathogenicity.variant['@id'];

    // Flatten assessments
    if (pathogenicity.assessments && pathogenicity.assessments.length) {
        flat.assessments = pathogenicity.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }

    return flat;
}


var assessmentSimpleProps = [
    "date_created", "value", "evidence_type", "evidence_id", "evidence_gdm", "active"
];

function flattenAssessment(assessment) {
    var flat = cloneSimpleProps(assessment, assessmentSimpleProps);

    return flat;
}


var provisionalSimpleProps = [
    "date_created", "classificationPoints", "replicatedOverTime", "contradictingEvidence", "autoClassification", "alteredClassification",
    "classificationStatus", "evidenceSummary", "reasons", "active", "affiliation", "approvalSubmitter", "classificationApprover",
    "approvalReviewDate", "approvalComment", "provisionalSubmitter", "provisionalDate", "provisionalComment", "provisionedClassification",
    "approvedClassification", "publishClassification"
];

function flattenProvisional(provisional) {
    var flat = cloneSimpleProps(provisional, provisionalSimpleProps);

    return flat;
}


var provisionalVariantSimpleProps = [
    "autoClassification", "alteredClassification", "reasons", "evidenceSummary", "affiliation", "classificationStatus",
    "approvalSubmitter", "classificationApprover", "approvalReviewDate", "approvalComment", "provisionalSubmitter",
    "provisionalDate", "provisionalComment", "provisionedClassification", "approvedClassification", "publishClassification"
];

function flattenProvisionalVariant(provisional_variant) {
    var flat = cloneSimpleProps(provisional_variant, provisionalVariantSimpleProps);

    return flat;
}


var evidenceScoreSimpleProps = [
    "score", "evidenceType", "scoreStatus", "evidenceScored", "gdmId", "calculatedScore",
    "caseInfoType", "scoreExplanation", "date_created", "affiliation"
];

function flattenEvidenceScore(evidencescore) {
    var flat = cloneSimpleProps(evidencescore, evidenceScoreSimpleProps);

    return flat;
}

const diseaseSimpleProps = [
    "diseaseId", "term", "description", "ontology", "phenotypes", "synonyms", "freetext"
];

function flattenDisease(disease) {
    var flat = cloneSimpleProps(disease, diseaseSimpleProps);

    return flat;
}


var caseControlSimpleProps = [
    "label", "studyType", "detectionMethod", "statisticalValues", "pValue", "confidenceIntervalFrom", "confidenceIntervalTo",
    "diseaseHistoryEvaluated", "demographicInfoMatched", "geneticAncestryMatched", "factorOfGeneticAncestryNotMatched",
    "factorOfDemographicInfoMatched", "differInVariables", "explanationForDemographicMatched", "explanationForDiseaseHistoryEvaluation",
    "explanationForGeneticAncestryNotMatched", "comments", "date_created", "affiliation"
];

function flattenCaseControl(casecontrol) {
    var flat = cloneSimpleProps(casecontrol, caseControlSimpleProps);

    if (casecontrol.caseCohort) {
        flat.caseCohort = casecontrol.caseCohort['@id'];
    }

    if (casecontrol.controlCohort) {
        flat.controlCohort = casecontrol.controlCohort['@id'];
    }

    if (casecontrol.scores && casecontrol.scores.length) {
        flat.scores = casecontrol.scores.map(function(score) {
            return score['@id'];
        });
    }

    return flat;
}


var interpretationSimpleProps = ["modeInheritance", "active", "date_created", "completed_sections", "modeInheritanceAdjective", "affiliation"];

function flattenInterpretation(interpretation) {
    // First copy simple properties before fixing the special properties
    var flat = cloneSimpleProps(interpretation, interpretationSimpleProps);

    if (interpretation.variant) {
        flat.variant = interpretation.variant['@id'];
    }

    if (interpretation.genes && interpretation.genes.length) {
        flat.genes = interpretation.genes.map(function(gene) {
            return gene['@id'];
        });
    }

    if (interpretation.disease) {
        flat.disease = interpretation.disease['@id'];
    }

    if (interpretation.interpretationTranscript) {
        flat.interpretationTranscript = interpretation.interpretationTranscript['@id'];
    }

    if (interpretation.transcripts && interpretation.transcripts.length) {
        flat.transcripts = interpretation.transcripts.map(function(transcript) {
            return transcript['@id'];
        });
    }

    if (interpretation.proteins && interpretation.proteins.length) {
        flat.proteins = interpretation.proteins.map(function(protein) {
            return protein['@id'];
        });
    }

    if (interpretation.evaluations && interpretation.evaluations.length) {
        flat.evaluations = interpretation.evaluations.map(function(evaluation) {
            return evaluation['@id'];
        });
    }

    if (interpretation.provisional_variant && interpretation.provisional_variant.length) {
        flat.provisional_variant = interpretation.provisional_variant.map(function(provisional) {
            return provisional['@id'];
        });
    }

    if (interpretation.extra_evidence_list && interpretation.extra_evidence_list.length) {
        flat.extra_evidence_list = interpretation.extra_evidence_list.map(function(extra_evidence) {
            return extra_evidence['@id'];
        });
    }

    return flat;
}


// Given an array of group or families in 'objList', render a list of IDs for all diseases in those
// groups or families.
var renderDiseaseList = module.exports.renderDiseaseList = function(objList, title) {
    return (
        <div>
            {objList && objList.length ?
                <div>
                    {objList.map(function(obj) {
                        return (
                            <div key={obj.uuid} className="form-group">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Disease(s) Associated with {title}:</strong>
                                </div>
                                <div className="col-sm-7">
                                    <strong>
                                        { (obj.commonDiagnosis && obj.commonDiagnosis.length > 0) ?
                                            obj.commonDiagnosis.map(function(disease, i) {
                                                return (
                                                    <span key={disease.diseaseId}>
                                                        {i > 0 ? ', ' : ''}
                                                        {disease.term}
                                                    </span>
                                                );
                                            })
                                            :
                                            <span>&nbsp;</span>
                                        }
                                    </strong>
                                </div>
                            </div>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

// Given an array of group or families in 'objList', render a list of HPO IDs and/or Phenotype free text in those groups and familes.
var renderPhenotype = module.exports.renderPhenotype = function(objList, title, type, parentObjName) {
    if (typeof type === 'undefined') {
        type = '';
    }

    return (
        <div>
            { type === 'hpo' || type === '' ? <div className="col-sm-5">&nbsp;</div> : null}
            { title === 'Experimental' && (type === 'hpo' || type === '') ?
                <div className="col-sm-7 alert alert-warning">
                    <p style={{'marginBottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) <strong>(required)</strong> using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300). If you are unable to find an appropriate HPO term, use the free text box instead.
                        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
                    </p>
                </div>
            : null }
            { title === 'Family' && (type === 'hpo' || type === '') ?
                <div className="col-sm-7">
                    <p style={{'marginBottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) of the Family using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300).
                        If no HPO code exists for a particular feature, please describe it in the free text box instead.
                    </p>
                </div>
            : null}
            { title === 'Individual' && (type === 'hpo' || type === '') ?
                <div className="col-sm-7">
                    <p style={{'marginBottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) of the Individual using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300).
                        If no HPO code exists for a particular feature, please describe it in the free text box instead.
                    </p>
                </div>
            : null}
            {objList && objList.length ?
                <div>
                    {objList.map(function(obj) {
                        return (
                            <div key={obj.uuid} className="form-group">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Phenotype(s) Associated with {parentObjName ? parentObjName : title}
                                    {type === 'hpo' ? <span style={{fontWeight: 'normal'}}> (<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span> : null}
                                    {type === 'ft' ? <span style={{fontWeight: 'normal'}}> (free text)</span> : null}
                                    :</strong>
                                </div>
                                <div className="col-sm-7">
                                    { (type === 'hpo' || type === '') && (obj.hpoIdInDiagnosis && obj.hpoIdInDiagnosis.length > 0) ?
                                        obj.hpoIdInDiagnosis.map(function(hpoid, i) {
                                            return (
                                                <span key={hpoid}>
                                                    {hpoid}
                                                    {i < obj.hpoIdInDiagnosis.length-1 ? ', ' : ''}
                                                    {i === obj.hpoIdInDiagnosis.length-1 && obj.termsInDiagnosis && type === '' ? '; ' : null}
                                                </span>
                                            );
                                        })
                                        : null
                                    }
                                    { type === 'ft' && obj.termsInDiagnosis ?
                                        <span>{obj.termsInDiagnosis}</span>
                                        :
                                        null
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

// Render a single item of evidence data (demographics, methods, etc.) from a "parent" group or family
export function renderParentEvidence(label, value) {
    return (
        <div>
            <div className="form-group parent-evidence">
                <div className="col-sm-5">
                    <span>{label}</span>
                </div>
                <div className="col-sm-7">
                    {value ? <span>{value}</span> : null}
                </div>
            </div>
        </div>
    );
}

// Generic render method for the yellow warning message box
export function renderWarning(context) {
    return (
        <div>
            { context === 'GO' ?
                <div className="col-sm-7 col-sm-offset-5 alert alert-warning">
                    <p>
                        Please enter the gene's molecular function or biological process term  <strong>(required)</strong> using the Gene Ontology (GO)
                        term wherever possible (e.g. GO:2001284). If you are unable to find an appropriate GO term, use the free text box instead.
                        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
                    </p>
                </div>
            : null }
            { context === 'UBERON' ?
                <div className="col-sm-7 col-sm-offset-5 alert alert-warning">
                    <p>
                        Please enter the relevant Uberon term for the organ of the tissue relevant to disease whenever possible
                        (e.g. UBERON:0015228). If you are unable to find an appropriate Uberon term, use the free text box instead.
                        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
                    </p>
                </div>
            : null}
            { context === 'CL' ?
                <div className="col-sm-7 col-sm-offset-5 alert alert-warning">
                    <p>
                        Please enter the relevant Cell Ontology (CL) term for the cell type whenever possible (e.g. CL_0000057).
                        If you are unable to find an appropriate CL term, use the free text box instead.
                        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
                    </p>
                </div>
            : null}
            { context === 'CL_EFO' ?
                <div className="col-sm-7 col-sm-offset-5 alert alert-warning">
                    <p>
                        Please enter the relevant EFO or Cell Ontology (CL) term for the cell line/cell type whenever possible
                        (e.g. EFO_0001187, CL_0000057). If you are unable to find an appropriate EFO or CL term, use the free text box instead.
                        Please email <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> for any ontology support.
                    </p>
                </div>
            : null}
        </div>
    );
}

// A link to Mutalyzer to check HGVC terms
var renderMutalyzerLink = module.exports.renderMutalyzerLink = function() {
    return (
        <p className="col-sm-7 col-sm-offset-5 mutalyzer-link">
            (e.g. CA ID whenever possible; otherwise RCV, rs ID, or HGVS)<br />For help in verifying, generating or converting to HGVS nomenclature, please visit <a href='https://mutalyzer.nl/' target='_blank'>Mutalyzer</a>
        </p>
    );
};

// A note underneath the Group/Family/Individual label input field
var renderLabelNote = module.exports.renderLabelNote = function(label) {
    return (
        <span className="curation-label-note">Please enter a label to help you keep track of this {label} within the interface - if possible, please use the label described in the paper.</span>
    );
};

// Global function for handling the ordering and rendering of HGVS names.
// Passed variable should be the hgvsNames object of the variant object.
// Bumps up rendering order of GRCh38 and GRCh37
var variantHgvsRender = module.exports.variantHgvsRender = function(hgvsNames) {
    return (
        <div>
            {hgvsNames.GRCh38 ?
                <span><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh38}>{hgvsNames.GRCh38}</span> (GRCh38)<br /></span>
            : null}
            {hgvsNames.GRCh37 ?
                <span><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvsNames.GRCh37}>{hgvsNames.GRCh37}</span> (GRCh37)<br /></span>
            : null}
            {hgvsNames.others && hgvsNames.others.length > 0 ?
            <span>
                {hgvsNames.others.map(function(hgvs, i) {
                    return <span key={hgvs}><span className="title-ellipsis title-ellipsis-shorter dotted" title={hgvs}>{hgvs}</span><br /></span>;
                })}
            </span>
            : null}
        </div>
    );
};

// Class for delete button (and associated modal) of Group, Family, Individual, and Experimental
// Data objects. This class only renderes the button; please see DeleteButtonModal for bulk of
// functionality
var DeleteButton = module.exports.DeleteButton = createReactClass({
    propTypes: {
        gdm: PropTypes.object,
        parent: PropTypes.object,
        item: PropTypes.object,
        pmid: PropTypes.string,
        disabled: PropTypes.bool
    },

    getInitialState: function() {
        return {
            noticeVisible: false // True while form is submitting
        };
    },

    showNotice: function() {
        this.setState({noticeVisible: true});
    },

    hideNotice: function() {
        this.setState({noticeVisible: false});
    },

    render: function() {
        return (
            <span>
                {this.props.disabled ?
                <div className="inline-button-wrapper delete-button-push pull-right" onMouseEnter={this.showNotice} onMouseLeave={this.hideNotice}>
                    <a className="btn btn-danger" disabled="disabled">
                        Delete
                    </a>
                </div>
                :
                <div className="inline-button-wrapper delete-button-push pull-right">
                    <DeleteButtonModal gdm={this.props.gdm} parent={this.props.parent} item={this.props.item} pmid={this.props.pmid} />
                </div>
                }
                {this.state.noticeVisible ? <span className="delete-notice pull-right">This item cannot be deleted because it has been assessed by another user.</span> : <span></span>}
            </span>
        );
    }
});

// Delete Button confirmation modal. Sets target item to have status of 'deleted', and removes
// the 'deleted' entry from its parent object. Forwards user back to curation central on delete
// success
var DeleteButtonModal = createReactClass({
    mixins: [RestMixin, CuratorHistory],
    propTypes: {
        gdm: PropTypes.object,
        parent: PropTypes.object,
        item: PropTypes.object,
        pmid: PropTypes.string
    },

    getInitialState: function() {
        return {
            submitBusy: false // True while form is submitting
        };
    },

    // main recursive function that finds any child items, and generates and returns either the promises
    // for delete and history recording, the display strings, or the @ids of the items and its children,
    // depending on the mode (delete, display, id, respectively). The depth specifies the 'depth' of the
    // loop; should always be called at 0 when called outside of the function.
    recurseItem: function(item, depth, mode) {
        var returnPayload = [];
        var hasChildren = false;

        // check possible child objects
        if (item.group) {
            if (item.group.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.group, depth, mode, 'groups'));
        }
        if (item.family) {
            if (item.family.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.family, depth, mode, 'families'));
        }
        if (item.individual) {
            if (item.individual.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individual, depth, mode, 'individuals'));
        }
        if (item.familyIncluded) {
            if (item.familyIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.familyIncluded, depth, mode, 'families'));
        }
        if (item.individualIncluded) {
            if (item.individualIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individualIncluded, depth, mode, 'individuals'));
        }
        if (item.experimentalData) {
            if (item.experimentalData.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.experimentalData, depth, mode, 'experimental datas'));
        }
        if (item.caseControlStudies) {
            if (item.caseControlStudies.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.caseControlStudies, depth, mode, 'case control'));
        }
        if (item.caseCohort) {
            hasChildren = false;
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.caseCohort, depth, mode, 'case cohort'));
        }
        if (item.controlCohort) {
            hasChildren = false;
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.controlCohort, depth, mode, 'control cohort'));
        }

        // if the mode is 'delete', get the items' parents' info if needed, flatten the current item, set it as deleted
        // and inactive, and load the PUT and history record promises into the payload
        if (mode == 'delete') {
            var parentInfo;
            // if this is the target item being deleted, get its parent item information to store in the history object
            if (depth == 0) {
                parentInfo = {};
                if (item.associatedGdm && item.associatedGdm.length > 0) {
                    parentInfo.id = item.associatedGdm[0]['@id'];
                    parentInfo.name = item.associatedGdm[0].gdm_title;
                } else if (item.associatedAnnotations && item.associatedAnnotations.length > 0) {
                    parentInfo.id = item.associatedAnnotations[0]['@id'];
                    parentInfo.name = item.associatedAnnotations[0].associatedGdm[0].gdm_title + ':' + item.associatedAnnotations[0].article.pmid;
                } else if (item.associatedGroups && item.associatedGroups.length > 0) {
                    parentInfo.id = item.associatedGroups[0]['@id'];
                    parentInfo.name = item.associatedGroups[0].label;
                } else if (item.associatedFamilies && item.associatedFamilies.length > 0) {
                    parentInfo.id = item.associatedFamilies[0]['@id'];
                    parentInfo.name = item.associatedFamilies[0].label;
                }
            }
            // flatten the target item and set its status to deleted
            var deletedItem = flatten(item);
            deletedItem.status = 'deleted';

            // When delete case control
            if (item['@type'][0] === 'caseControl') {
                // Set status 'deleted' to case cohort
                let uuid = item.caseCohort['@id'];
                let deletedItem = flatten(item.caseCohort, 'group');
                deletedItem.status = 'deleted';
                this.putRestData(uuid + '?render=false', deletedItem);

                // Set status 'deleted' to control cohort
                uuid = item.controlCohort['@id'];
                deletedItem = flatten(item.controlCohort, 'group');
                deletedItem.status = 'deleted';
                this.putRestData(uuid + '?render=false', deletedItem);
            }

            // define operationType and add flags as needed
            var operationType = 'delete';
            if (depth > 0) {
                operationType += '-hide';
            }
            if (hasChildren) {
                operationType += '-hadChildren';
            }
            // push promises to payload
            returnPayload.push(this.putRestData(item['@id'] + '?render=false', deletedItem));
            returnPayload.push(this.recordHistory(operationType, item, null, parentInfo));
        }

        // return the payload, whether it's promises, display texts, or @ids
        return returnPayload;
    },

    // function for looping through a parent item's list of child items
    // of a specific type
    recurseItemLoop: function(tempSubItem, depth, mode, type) {
        var tempDisplayString;
        var returnPayload = [];
        if (tempSubItem) {
            if (tempSubItem.length > 0) {
                for (var i = 0; i < tempSubItem.length; i++) {
                    if (mode == 'display') {
                        // if the mode is 'display', generate the display string
                        tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; <a href={tempSubItem[i]['@id']} onClick={this.linkout}>{tempSubItem[i]['@type'][0]} {tempSubItem[i].label}</a></span>;
                        returnPayload.push(tempDisplayString);
                    } else if (mode == 'id') {
                        // if the mode is 'id', grab the @ids of the child items
                        returnPayload.push(tempSubItem[i]['@id']);
                    }
                    // call recurseItem on child item
                    returnPayload = returnPayload.concat(this.recurseItem(tempSubItem[i], depth + 1, mode));
                }
            } else {
                if (mode == 'display') {
                    // if childspace is empty, add a display line indicating the fact
                    tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; no associated {type}</span>;
                    returnPayload.push(tempDisplayString);
                }
            }
        }
        return returnPayload;
    },

    // parent function when deleting an item. Re-grabs the latest versions of the target and parent items,
    // finds and deletes all children of the target item, deletes the target item, removes the target item's
    // entry from the parent item, and saves the updated target item. Forwards user to curation central
    // upon completion.
    deleteItem: function(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({submitBusy: true});
        var itemUuid = this.props.item['@id'];
        var parentUuid = this.props.parent['@id'];
        var deletedItemType, deletedItem, deletedParent;

        this.getRestData(itemUuid, null, true).then(item => {
            // get up-to-date target object, then get the promises for deleting it and
            // all its children, along with the promises for any related history items
            deletedItemType = item['@type'][0];
            var deletePromises = this.recurseItem(item, 0, 'delete');
            return Promise.all(deletePromises); // wait for ALL promises to resolve
        }).then(rawData => {
            // get up-to-date parent object; also bypass issue of certain certain embedded parent
            // items in edit pages being un-flattenable
            return this.getRestData(parentUuid, null, true).then(parent => {
                // flatten parent object and remove link to deleted item as appropriate
                deletedParent = flatten(parent);
                if (parent['@type'][0] == 'annotation') {
                    if (deletedItemType == 'group') {
                        deletedParent.groups = _.without(deletedParent.groups, itemUuid);
                    } else if (deletedItemType == 'family') {
                        deletedParent.families = _.without(deletedParent.families, itemUuid);
                    } else if (deletedItemType == 'individual') {
                        deletedParent.individuals = _.without(deletedParent.individuals, itemUuid);
                    } else if (deletedItemType == 'experimental') {
                        deletedParent.experimentalData = _.without(deletedParent.experimentalData, itemUuid);
                    } else if (deletedItemType == 'caseControl') {
                        deletedParent.caseControlStudies = _.without(deletedParent.caseControlStudies, itemUuid);
                    }
                } else {
                    if (deletedItemType == 'family') {
                        deletedParent.familyIncluded = _.without(deletedParent.familyIncluded, itemUuid);
                    } else if (deletedItemType == 'individual') {
                        deletedParent.individualIncluded = _.without(deletedParent.individualIncluded, itemUuid);
                        if (parent['@type'][0] == 'family') {
                            // Empty variants of parent object if target item is individual and parent is family
                            deletedParent.segregation.variants = [];
                        }
                    }
                }
                // PUT updated parent object w/ removed link to deleted item
                return this.putRestData(parentUuid, deletedParent).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            });
        }).then(data => {
            // forward user to curation central
            window.location.href = '/curation-central/?gdm=' + this.props.gdm.uuid + '&pmid=' + this.props.pmid;
        }).catch(function(e) {
            console.log('DELETE ERROR: %o', e);
        });
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.handleModalClose();
    },

    // Called when user clicks a link in the delete confirmation modal to view another object.
    // Allows for scrolling in subsequent pages, as the initial modal rendering disabled scrolling.
    linkout: function(e) {
        this.handleModalClose();
    },

    /************************************************************************************************/
    /* The MixIn function this.props.closeModal() has been replaced by this.child.closeModal(),     */
    /* which is way to call a function defined in the child component from the parent component.    */
    /* The reference example is at: https://jsfiddle.net/frenzzy/z9c46qtv/                          */
    /************************************************************************************************/
    handleModalClose() {
        if (!this.state.submitBusy) {
            this.child.closeModal();
        }
    },

    render: function() {
        var tree;
        var message;
        var itemLabel;
        // generate custom messages and generate display tree for group and family delete confirm modals.
        // generic message for everything else.
        if (this.props.item['@type'][0] == 'group') {
            message = <p><strong>Warning</strong>: Deleting this Group will also delete any associated families and individuals (see any Families or Individuals associated with the Group under its name, bolded below).</p>;
            tree = this.recurseItem(this.props.item, 0, 'display');
        } else if (this.props.item['@type'][0] == 'family') {
            message = <p><strong>Warning</strong>: Deleting this Family will also delete any associated individuals (see any Individuals associated with the Family under its name, bolded below).</p>;
            tree = this.recurseItem(this.props.item, 0, 'display');
        } else if (this.props.item['@type'][0] == 'individual') {
            let individual = this.props.item;
            if (individual.variants.length && individual.associatedFamilies.length) {
                message = <p><strong>Warning</strong>: Deleting this individual will remove the association between its variants and the Family with which the Individual is associated.</p>;
            }
        } else if (this.props.item['@type'][0] == 'caseControl') {
            itemLabel = this.props.item.label;
        }
        return (
            <ModalComponent modalTitle="Delete Item" modalClass="modal-danger" modalWrapperClass="delete-modal"
                actuatorClass="btn-danger" actuatorTitle="Delete" onRef={ref => (this.child = ref)}>
                <div className="modal-body">
                    {message}
                    <p>Are you sure you want to delete {itemLabel ? <span>Case-Control <strong>{itemLabel}</strong></span> : <span>this item</span>}?</p>
                    {tree ?
                    <div><strong>{this.props.item['@type'][0]} {this.props.item.label}</strong><br />
                    {tree.map(function(treeItem, i) {
                        return <span key={i}>&nbsp;&nbsp;{treeItem}<br /></span>;
                    })}
                    <br /></div>
                    : null}
                    </div>
                <div className="modal-footer">
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="button-button" inputClassName="btn-danger btn-inline-spacer" clickHandler={this.deleteItem} title="Confirm Delete" submitBusy={this.state.submitBusy} />
                </div>
            </ModalComponent>
        );
    }
});
