'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { getAffiliationName, getAllAffliations, getAffiliationSubgroups, getAffiliationNameBySubgroupID } from '../../libs/get_affiliation_name';
import { getAffiliationApprover } from '../../libs/get_affiliation_approver';
import { getApproverNames, getContributorNames } from '../../libs/get_approver_names';
import { sopVersions } from '../../libs/sop';
import Select from 'react-select';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';
import * as CuratorHistory from '../curator_history';
import * as curator from '../curator';
import { removeListener } from 'cluster';
const CurationMixin = curator.CurationMixin;

const ClassificationApproval = module.exports.ClassificationApproval = createReactClass({
    mixins: [RestMixin, FormMixin, CurationMixin, CuratorHistory],

    propTypes: {
        gdm: PropTypes.object,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        provisional: PropTypes.object,
        classification: PropTypes.string,
        classificationStatus: PropTypes.string,
        affiliation: PropTypes.object, // User's affiliation
        updateSnapshotList: PropTypes.func,
        updateProvisionalObj: PropTypes.func,
        trackData: PropTypes.func,
        getContributors: PropTypes.func,
        getGDMInfo: PropTypes.func,
        snapshots: PropTypes.array
    },

    getInitialState() {
        return {
            affiliationsList: [],
            approversList: [],
            classificationContributors: this.props.provisional && this.props.provisional.classificationContributors ? this.props.provisional.classificationContributors : [],
            additionalApprover: this.props.provisional && this.props.provisional.additionalApprover ? this.props.provisional.additionalApprover : '',
            retainSelectedApprover: this.props.provisional && this.props.provisional.retainSelectedApprover ? this.props.provisional.retainSelectedApprover : [],
            retainSelectedContributor: this.props.provisional && this.props.provisional.retainSelectedContributor ? this.props.provisional.retainSelectedContributor : [],
            contributorComment: this.props.provisional && this.props.provisional.contributorComment ? this.props.provisional.contributorComment : '',
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalDate: this.props.provisional && this.props.provisional.approvalDate ? this.props.provisional.approvalDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            approvalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            affiliationApprovers: undefined,
            isApprovalPreview: this.props.provisional && this.props.provisional.classificationStatus === 'Approved' ? true : false,
            isApprovalEdit: false,
            showAttributionForm: false,
            sopVersion: this.props.provisional && this.props.provisional.sopVersion ? this.props.provisional.sopVersion : '',
            submitBusy: false // Flag to indicate that the submit button is in a 'busy' state
        };
    },

    componentDidMount() {
        this.getAffiliationApprovers();
        this.parseAffiliationsList();
        this.parseApproversList();
    },

    // Method to get full affiliations list and reformat obj so it's compatible w/ react-select
    parseAffiliationsList() {
        const affiliationsList = getAllAffliations();
        if (affiliationsList) {
            const parsedAffiliations = affiliationsList.map(affiliation => {
                return {
                    value: affiliation.id,
                    label: `${affiliation.fullName} (${affiliation.id})`
                };
            });
            this.setState({ affiliationsList: parsedAffiliations });
        }
    },

    // Method to get affiliation subgroups and pass to react-select
    parseApproversList() {
        const parsedApprovers = [];
        const approverList = getAffiliationSubgroups();
        if (approverList) {
            approverList.forEach(approver => {
                if (approver.gcep) {
                    parsedApprovers.push({
                        value: approver.gcep.id,
                        label: approver.gcep.fullname
                    });
                }
                if (approver.vcep) {
                    parsedApprovers.push({
                        value: approver.vcep.id,
                        label: approver.vcep.fullname
                    });
                }
            });
            this.setState({ approversList: parsedApprovers });
        }
    },

    componentWillReceiveProps(nextProps) {
        if (this.props.interpretation && Object.keys(this.props.interpretation).length) {
            if (nextProps.provisional) {
                this.setState({
                    approvalDate: nextProps.provisional.approvalDate,
                    approvalReviewDate: nextProps.provisional.approvalReviewDate,
                    approvalComment: nextProps.provisional.approvalComment,
                    approvalSubmitter: nextProps.provisional.approvalSubmitter,
                    classificationApprover: nextProps.provisional.classificationApprover,
                    classificationContributors: nextProps.provisional.classificationContributors,
                    additionalApprover: nextProps.provisional.additionalApprover,
                    contributorComment: nextProps.provisional.contributorComment,
                    sopVersion: nextProps.provisional.sopVersion
                });
            }
        }
    },

    getAffiliationApprovers() {
        const provisional = this.props.provisional;
        let provisionalAffiliation = provisional && provisional.affiliation ? provisional.affiliation : null;
        let userAffiliation = this.props.affiliation ? this.props.affiliation.affiliation_id : null;
        if ((provisionalAffiliation || userAffiliation) && !provisional.approvedClassification) {
            let affiliationId = provisionalAffiliation ? provisionalAffiliation : userAffiliation;
            let approvers = getAffiliationApprover(affiliationId);
            if (approvers.length > 0) {
                this.setState({ affiliationApprovers: approvers.sort() }, () => {
                    if (provisional && provisional.classificationApprover) {
                        this.setState({ classificationApprover: provisional.classificationApprover }, () => {
                            this.approverInput.setValue(this.state.classificationApprover && this.state.affiliationApprovers ? this.state.classificationApprover : 'none');
                        });
                    }
                });
            } else {
                if (provisional && provisional.classificationApprover) {
                    this.setState({ classificationApprover: provisional.classificationApprover });
                } else {
                    this.setState({ classificationApprover: getAffiliationName(affiliationId) });
                }
            }
        }
    },

    handleReviewDateChange(approvalReviewDate) {
        this.setState({ approvalReviewDate });
    },

    openAttributionForm(e) {
        e.preventDefault();
        this.setState({ showAttributionForm: true });
    },

    // Only saves affiliation IDs from react-select
    handleContributorSelect(selectedContributor) {
        const contributors = [];
        selectedContributor.forEach(contributor => {
            contributors.push(contributor.value);
        });
        this.setState({ classificationContributors: contributors, retainSelectedContributor: selectedContributor });
    },

    // Only saves affiliation subgroup IDs from react-select
    handleApproverSelect(selectedApprover) {
        let approver = selectedApprover.value;
        this.setState({ additionalApprover: approver, retainSelectedApprover: selectedApprover });
    },

    /**
     * Method to handle previewing classification approval form
     */
    handlePreviewApproval() {
        const affiliation = this.props.affiliation;
        let approver = this.approverInput ? this.approverInput.getValue() : (affiliation ? getAffiliationName(affiliation.affiliation_id) : this.props.session.user_properties.title);
        let formErr = false;

        if (approver && approver !== 'none') {
            const contributorComment = this.contributorCommentInput ? this.contributorCommentInput.getValue() : '';
            const approvalComment = this.approvalCommentInput ? this.approvalCommentInput.getValue() : '';
            const sopVersion = this.sopVersionInput ? this.sopVersionInput.getValue() : '';
            this.setState({
                approvalSubmitter: this.props.session.user_properties.title,
                approvalComment: approvalComment.length ? approvalComment : undefined,
                contributorComment: contributorComment.length ? contributorComment : null,
                sopVersion: sopVersion ? sopVersion : '',
                classificationApprover: approver
            }, () => {
                this.setState({ isApprovalPreview: true });
                formErr = false;
            });
        } else {
            formErr = true;
            this.setFormErrors(this.approverInput, 'Select an approver');
            return false;
        }
    },

    /**
     * Method to handle resetting the approval form data
     */
    handleCancelApproval() {
        this.setState({
            approvalSubmitter: this.props.provisional && this.props.provisional.approvalSubmitter ? this.props.provisional.approvalSubmitter : undefined,
            approvalReviewDate: this.props.provisional && this.props.provisional.approvalReviewDate ? this.props.provisional.approvalReviewDate : undefined,
            approvalComment: this.props.provisional && this.props.provisional.approvalComment ? this.props.provisional.approvalComment : undefined,
            classificationApprover: this.props.provisional && this.props.provisional.classificationApprover ? this.props.provisional.classificationApprover : undefined,
            retainSelectedApprover: this.props.provisional && this.props.provisional.retainSelectedApprover ? this.props.provisional.retainSelectedApprover : null,
            retainSelectedContributor: this.props.provisional && this.props.provisional.retainSelectedContributor ? this.props.provisional.retainSelectedContributor : null,
            classificationContributors: this.props.provisional && this.props.provisional.classificationContributors ? this.props.provisional.classificationContributors : null,
            additionalApprover: this.props.provisional && this.props.provisional.additionalApprover ? this.props.provisional.additionalApprover : null,
            contributorComment: this.props.provisional && this.props.provisional.contributorComment ? this.props.provisional.contributorComment : null,
            sopVersion: this.props.provisional && this.props.provisional.sopVersion ? this.props.provisional.sopVersion : null,
            isApprovalPreview: false
        });
    },

    /**
     * Method to handle editing classification approval form
     */
    handleEditApproval() {
        this.setState({ isApprovalPreview: false });
    },

    /**
     * Method to send GDM provisional data to UNC
     * @param {object} provisional - provisional classification object
     * @param {object} gdm - gdm object
     */
    sendToUNC(provisional, gdm) {
        const approvalSubmitter = this.props.session && this.props.session.user_properties ? this.props.session.user_properties : null;
        // Get all contributors
        const contributors = this.props.getContributors();

        // Add this approval submitter to contributors list
        if (approvalSubmitter) {
            contributors.push({   
                name: approvalSubmitter.title ? approvalSubmitter.title : '',
                id: approvalSubmitter.uuid ? approvalSubmitter.uuid : '',
                email: approvalSubmitter.email ? approvalSubmitter.email : '',
                roles: ['approver']
            });
        }
        // ??? Add secondary approvers to contributors list
        if (provisional.classificationApprover) {
            contributors.push({   
                name: provisional.classificationApprover,
                roles: ['secondary approver']
            });
        }
        if (provisional.curationApprovers) {
            provisional.curationApprovers.forEach(approverId => {
                contributors.push({
                    'id': approverId,
                    'name': getAffiliationNameBySubgroupID('gcep', approverId),
                    'roles': ['secondary approver']
                });
            });
        }
        if (provisional.curationContributors) {
            provisional.curationContributors.forEach(contributorId => {
                contributors.push({
                    'id': contributorId,
                    'name': getAffiliationName(contributorId),
                    'roles': ['secondary approver']
                });
            });
        }

        let uncData = {
            report_id: gdm.uuid,
            gene_validity_evidence_level: {
                genetic_condition: this.props.getGDMInfo(),
                evidence_level: provisional.alteredClassification && provisional.alteredClassification !== 'No Modification' ? provisional.alteredClassification : provisional.autoClassification,
                gene_validity_sop: provisional.sopVersion ? 'cg:gene_validity_sop_' + provisional.sopVersion : ''
            },
            date: provisional.approvalDate ? provisional.approvalDate : '',
            status: 'approved',
            performed_by: {
                name: approvalSubmitter && approvalSubmitter.title ? approvalSubmitter.title : '',
                id: approvalSubmitter && approvalSubmitter.uuid ? approvalSubmitter.uuid : '',
                email: approvalSubmitter && approvalSubmitter.email ? approvalSubmitter.email : '',
                on_behalf_of: {
                    id: this.props.affiliation && this.props.affiliation.affiliation_id ? this.props.affiliation.affiliation_id : '',
                    name: this.props.affiliation && this.props.affiliation.affiliation_fullname ? this.props.affiliation.affiliation_fullname : ''
                }
            },
            contributors: contributors
        };

        // ??? testing
        console.log(uncData);
        // Post UNC data
        this.props.trackData(uncData).then(response => {
            if (response && response.message) {
                const error = response.message.status && response.message.status.errorCount > 0 ?
                    '' : 'track-data';
            }
        }).catch(error => {
            console.log('Track Approval Data error: %o', error);
        });
        // ??? testing
        console.log("Just %s uuid = %s", provisional.classificationStatus, gdm.uuid);
    },

    /**
     * Method to handle submitting classificaiton approval form
     * Method to handle submitting classification approval form
     */
    submitForm(e) {
        e.preventDefault();
        e.stopPropagation();
        let newProvisional = this.props.provisional.uuid ? curator.flatten(this.props.provisional) : {};
        newProvisional.classificationStatus = 'Approved';
        newProvisional.approvedClassification = true;
        newProvisional.approvalSubmitter = this.state.approvalSubmitter;
        newProvisional.approvalDate = moment().toISOString();
        newProvisional.approvalReviewDate = this.state.approvalReviewDate;
        newProvisional.classificationApprover = this.state.classificationApprover;
        if (this.props.gdm) {
            newProvisional.additionalApprover = this.state.additionalApprover;
            newProvisional.classificationContributors = this.state.classificationContributors;
            newProvisional.sopVersion = this.state.sopVersion;
        }
        if (this.state.contributorComment && this.state.contributorComment.length) {
            newProvisional.contributorComment = this.state.contributorComment;
        } else {
            if (newProvisional.contributorComment) {
                delete newProvisional['contributorComment'];
            }
        }
        if (this.state.approvalComment && this.state.approvalComment.length) {
            newProvisional.approvalComment = this.state.approvalComment;
        } else {
            if (newProvisional.approvalComment) {
                delete newProvisional['approvalComment'];
            }
        }

        let provisionalSnapshots = this.props.snapshots && this.props.snapshots.length ? this.props.snapshots.filter(snapshot => snapshot.approvalStatus === 'Provisioned') : [];
        // Prevent users from incurring multiple submissions
        this.setState({ submitBusy: true });
        if (this.props.gdm && Object.keys(this.props.gdm).length) {
            // Update existing provisional data object
            return this.putRestData('/provisional/' + this.props.provisional.uuid, newProvisional).then(data => {
                let provisionalClassification = data['@graph'][0];
                // this.props.updateProvisionalObj(provisionalClassification['@id']);
                // Record classification approval history
                let meta = {
                    provisionalClassification: {
                        gdm: this.props.gdm['@id'],
                        alteredClassification: provisionalClassification.alteredClassification,
                        classificationStatus: provisionalClassification.classificationStatus
                    }
                };
                // this.recordHistory('modify', provisionalClassification, meta);
                return Promise.resolve(provisionalClassification);
            }).then(result => {
                // get a fresh copy of the gdm object
                this.getRestData('/gdm/' + this.props.gdm.uuid).then(newGdm => {
                    // Send data to UNC
                    this.sendToUNC(result, newGdm);

                    let parentSnapshot = { gdm: newGdm };
                    let newSnapshot = {
                        resourceId: result.uuid,
                        resourceType: 'classification',
                        approvalStatus: 'Approved',
                        resource: result,
                        resourceParent: parentSnapshot,
                        associatedSnapshot: provisionalSnapshots && provisionalSnapshots[0] ? provisionalSnapshots[0]['@id'] : undefined
                    };
                    this.postRestData('/snapshot/', newSnapshot).then(response => {
                        let approvalSnapshot = response['@graph'][0];
                        this.props.updateSnapshotList(approvalSnapshot['@id'], true);
                        return Promise.resolve(approvalSnapshot);
                    }).then(snapshot => {
                        let newClassification = curator.flatten(result);
                        let newSnapshot = curator.flatten(snapshot);
                        if ('associatedClassificationSnapshots' in newClassification) {
                            newClassification.associatedClassificationSnapshots.push(newSnapshot);
                        } else {
                            newClassification.associatedClassificationSnapshots = [];
                            newClassification.associatedClassificationSnapshots.push(newSnapshot);
                        }
                        this.putRestData(this.props.provisional['@id'], newClassification).then(provisionalObj => {
                            this.props.updateProvisionalObj(provisionalObj['@graph'][0]['@id'], true);
                        });
                    }).catch(err => {
                        console.log('Saving approval snapshot error = : %o', err);
                    });
                });
            }).catch(err => {
                console.log('Classification approval submission error = : %o', err);
            });
        } else if (this.props.interpretation && Object.keys(this.props.interpretation).length) {
            // Update existing classification data and its parent interpretation
            return this.putRestData('/provisional-variant/' + this.props.provisional.uuid, newProvisional).then(data => {
                let provisionalClassification = data['@graph'][0];
                // this.props.updateProvisionalObj(provisionalClassification['@id']);
                // Record classification approval history
                let meta = {
                    provisionalClassification: {
                        interpretation: this.props.interpretation['@id'],
                        alteredClassification: provisionalClassification.alteredClassification,
                        classificationStatus: provisionalClassification.classificationStatus
                    }
                };
                // this.recordHistory('modify', provisionalClassification, meta);
                return Promise.resolve(provisionalClassification);
            }).then(result => {
                // get a fresh copy of the interpretation object
                this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(newInterpretation => {
                    let parentSnapshot = { interpretation: newInterpretation };
                    let newSnapshot = {
                        resourceId: result.uuid,
                        resourceType: 'interpretation',
                        approvalStatus: 'Approved',
                        resource: result,
                        resourceParent: parentSnapshot,
                        associatedSnapshot: provisionalSnapshots && provisionalSnapshots[0] ? provisionalSnapshots[0]['@id'] : undefined
                    };
                    this.postRestData('/snapshot/', newSnapshot).then(response => {
                        let approvalSnapshot = response['@graph'][0];
                        this.props.updateSnapshotList(approvalSnapshot['@id'], true);
                        return Promise.resolve(approvalSnapshot);
                    }).then(snapshot => {
                        let newClassification = curator.flatten(result);
                        let newSnapshot = curator.flatten(snapshot);
                        if ('associatedInterpretationSnapshots' in newClassification) {
                            newClassification.associatedInterpretationSnapshots.push(newSnapshot);
                        } else {
                            newClassification.associatedInterpretationSnapshots = [];
                            newClassification.associatedInterpretationSnapshots.push(newSnapshot);
                        }
                        this.putRestData(this.props.provisional['@id'], newClassification).then(provisionalObj => {
                            this.props.updateProvisionalObj(provisionalObj['@graph'][0]['@id'], true);
                        });
                    }).catch(err => {
                        console.log('Saving approval snapshot error = : %o', err);
                    });
                });
            }).catch(err => {
                console.log('Classification approval submission error = : %o', err);
            });
        }
    },

    render() {
        const approvalSubmitter = this.state.approvalSubmitter;
        const classificationApprover = this.state.classificationApprover;
        const contributorComment = this.state.contributorComment && this.state.contributorComment.length ? this.state.contributorComment : '';
        const approvalReviewDate = this.state.approvalReviewDate ? moment(this.state.approvalReviewDate).format('MM/DD/YYYY') : '';
        const approvalDate = this.state.approvalDate ? moment(this.state.approvalDate).format('YYYY MM DD, h:mm a') : moment().format('YYYY MM DD, h:mm a');
        const approvalComment = this.state.approvalComment && this.state.approvalComment.length ? this.state.approvalComment : '';
        const classificationContributorsList = this.state.affiliationsList ? this.state.affiliationsList : null;
        const approversList = this.state.approversList ? this.state.approversList : null;
        const classificationContributors = this.state.classificationContributors ? this.state.classificationContributors : null;
        const additionalApprover = this.state.additionalApprover ? this.state.additionalApprover : null;
        const session = this.props.session;
        const sopVersion = this.state.sopVersion;
        const gdm = this.props.gdm;
        const provisional = this.props.provisional;
        const classification = this.props.classification;
        const affiliation = provisional.affiliation ? provisional.affiliation : (this.props.affiliation ? this.props.affiliation : null);
        const affiliationApprovers = this.state.affiliationApprovers;
        const interpretation = this.props.interpretation;
        const submitBusy = this.state.submitBusy;
        const attributionButtonText = 'Acknowledge Other Contributors';
        const formHelpText = 'Acknowledge contributing and approving affiliation(s) for this gene-disease classification. Single or multiple affiliations or entities may be chosen.';
        const contributorHelpText = 'In the event that more than one affiliation or external curation group has contributed to the evidence and/or overall classification of this record, please select each from the dropdown menu.';
        const approverHelpText = 'In the event that another affiliation approved the final approved classification, please select that affiliation from the dropdown menu.';

        return (
            <div className="final-approval-panel-content">
                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                    {this.state.isApprovalPreview ?
                        <div className="approval-preview">
                            <div className="col-md-12 approval-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="approval-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="approval-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Approved Classification entered by:</span></dt>
                                            <dd>{approvalSubmitter ? approvalSubmitter : null}</dd>
                                        </dl>
                                    </div>
                                    {affiliation && affiliation.length ?
                                        <div className="classification-approver">
                                            <dl className="inline-dl clearfix">
                                                <dt><span>Affiliation Approver:</span></dt>
                                                <dd>{classificationApprover}</dd>
                                            </dl>
                                        </div>
                                        : null}
                                    {gdm ?
                                        <div>
                                            <div className="sop-version">
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>SOP Version:</span></dt>
                                                    <dd>{sopVersion}</dd>
                                                </dl>
                                            </div>
                                            <div>
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Classification Contributor(s):</span></dt>
                                                    <dd>{classificationContributors ? getContributorNames(classificationContributors).join(', ') : null}</dd>
                                                </dl>
                                            </div>
                                            <div>
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Contributor Comments:</span></dt>
                                                    <dd><span>{contributorComment}</span></dd>
                                                </dl>
                                            </div>
                                        </div>
                                        : null}
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="approval-date">
                                        <dl className="inline-dl clearfix preview-approval-date">
                                            <dt><span>Date saved as Approved:</span></dt>
                                            <dd><span>{approvalDate ? formatDate(parseDate(approvalDate), "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        </dl>
                                    </div>
                                    <div className="approval-review-date">
                                        <dl className="inline-dl clearfix preview-approval-review-date">
                                            <dt><span>Final Approval Date:</span></dt>
                                            <dd><span>{approvalReviewDate ? formatDate(parseDate(approvalReviewDate), "YYYY MMM DD") : null}</span></dd>
                                        </dl>
                                    </div>
                                    <div className="approval-comments">
                                        <dl className="inline-dl clearfix preview-approval-comment">
                                            <dt><span>Approver Comments:</span></dt>
                                            <dd><span>{approvalComment ? approvalComment : null}</span></dd>
                                        </dl>
                                    </div>
                                    {gdm ?
                                        <div className="additional-approver">
                                            <dl className="inline-dl clearfix">
                                                <dt><span>Classification Approver:</span></dt>
                                                <dd>{additionalApprover ? getApproverNames(additionalApprover) : null}</dd>
                                            </dl>
                                        </div>
                                        : null}
                                </div>
                            </div>
                            <div className="col-md-12 alert alert-warning approval-preview-note">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview only; you must still Submit to save
                                this {interpretation && Object.keys(interpretation).length ? 'Interpretation' : 'Classification'} as Approval.
                                {interpretation && Object.keys(interpretation).length ? <strong> Approving an Interpretation does not submit it to ClinVar.</strong> : null}
                            </div>
                        </div>
                        :
                        <div className="approval-edit">
                            <div className="approval-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="approval-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation) : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="approval-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Entered by:</span></dt>
                                            <dd>
                                                {approvalSubmitter ?
                                                    approvalSubmitter
                                                    :
                                                    <span className="approval-submitter-placeholder-text">Current curator's name will be entered upon submission</span>
                                                }
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    {affiliation && affiliation.length ?
                                        <div className="classification-approver">
                                            {affiliationApprovers && affiliationApprovers.length ?
                                                <Input type="select" ref={(input) => { this.approverInput = input; }} label="Affiliation Approver:"
                                                    error={this.getFormError(this.approverInput)} clearError={this.clrFormErrors.bind(null, this.approverInput)}
                                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-5" groupClassName="form-group"
                                                    defaultValue={classificationApprover}>
                                                    <option value="none">Select Approver</option>
                                                    <option value="" disabled className="divider"></option>
                                                    {affiliationApprovers.map((member, i) => {
                                                        return <option key={i} value={member}>{member}</option>;
                                                    })}
                                                </Input>
                                                :
                                                <dl className="inline-dl clearfix">
                                                    <dt><span>Affiliation Approver:</span></dt>
                                                    <dd>{getAffiliationName(affiliation)}</dd>
                                                </dl>
                                            }
                                        </div>
                                        : null}
                                    <div className="approval-review-date form-group">
                                        <label className="col-sm-4 control-label">Final Approval Date:</label>
                                        <div className="col-sm-3 approval-date">
                                            <DayPickerInput
                                                value={approvalReviewDate}
                                                onDayChange={this.handleReviewDateChange}
                                                formatDate={formatDate}
                                                parseDate={parseDate}
                                                placeholder={`${formatDate(new Date())}`}
                                                dayPickerProps={{
                                                    selectedDays: approvalReviewDate ? parseDate(approvalReviewDate) : undefined
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {gdm ? 
                                    <div className="sop-version">
                                        <Input type="select" ref={(input) => { this.sopVersionInput = input; }} label="SOP Version:"
                                            value={sopVersion} labelClassName="sop-label col-sm-2 control-label" wrapperClassName="col-sm-1" groupClassName="form-group">
                                            {sopVersions.map((version, i) => {
                                                return <option key={i} value={version}>{version}</option>;
                                            })}
                                        </Input>
                                    </div>
                                    : 
                                    <div className="col-xs-12 col-sm-3">
                                        <Input type="textarea" ref={(input) => { this.approvalCommentInput = input; }} label="Approver Comments:" rows="5"
                                            value={approvalComment} labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="additional-comment form-group"/>
                                    </div>
                                }
                                {(classificationContributorsList && classificationContributorsList.length) && this.state.showAttributionForm ?
                                    <div className="col-md-6 contributor-form">
                                        <div className="contributor-form">
                                            <label className="control-label">Classification Contributor(s):</label>
                                            <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={contributorHelpText}>
                                                <i className="icon icon-info-circle secondary-approvers-help"></i>
                                            </span>
                                            <Select isMulti options={classificationContributorsList} placeholder="Select Affiliation(s)" defaultValue={this.state.retainSelectedContributor} onChange={this.handleContributorSelect} />
                                        </div>
                                        <div className="contributor-form">
                                            <Input type="textarea" ref={(input) => { this.contributorCommentInput = input; }}
                                                label="Contributor Comments" value={contributorComment} rows="5" labelClassName="control-label" />
                                        </div>
                                    </div>
                                    : null}
                                {this.state.showAttributionForm ?
                                    <div className="col-md-6 approval-form">
                                        <div className="curation-approvers approval-form">
                                            <label className="control-label">Classification Approver:</label>
                                            <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={approverHelpText}>
                                                <i className="icon icon-info-circle secondary-approvers-help"></i>
                                            </span>
                                            <Select options={approversList} placeholder="Select Classification Approver" defaultValue={this.state.retainSelectedApprover} onChange={this.handleApproverSelect} />
                                        </div>
                                        <div className="approval-form">
                                            <Input type="textarea" ref={(input) => { this.approvalCommentInput = input; }}
                                                label="Approver Comments:" value={approvalComment} rows="5" labelClassName="control-label" />
                                        </div>
                                    </div>
                                    : null}
                            </div>
                            {gdm && !this.state.showAttributionForm ?
                                <div className="col-md-12 contributor-toggle-button">
                                    <button className="btn btn-primary btn-inline-spacer" onClick={this.openAttributionForm}>{attributionButtonText}</button>
                                    <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={formHelpText}>
                                        <i className="secondary-approvers-help icon icon-info-circle"></i>
                                    </span>
                                </div>
                                : null}
                        </div>
                    }
                    <div className="col-md-12 approval-form-buttons-wrapper">
                        {this.state.isApprovalPreview ?
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer"
                                    onClick={this.handleCancelApproval} disabled={submitBusy}>
                                    Cancel Approval
                                </button>
                                <button type="button" className="btn btn-info btn-inline-spacer"
                                    onClick={this.handleEditApproval} disabled={submitBusy}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-inline-spacer pull-right" disabled={submitBusy}>
                                    {submitBusy ? <span className="submit-spinner"><i className="icon icon-spin icon-cog"></i></span> : null}
                                    Submit Approval <i className="icon icon-check-square-o"></i>
                                </button>
                            </div>
                            :
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer pull-right"
                                    onClick={this.handlePreviewApproval}>
                                    Preview Approval
                                </button>
                            </div>
                        }
                    </div>
                </Form>
            </div>
        );
    }
});
