'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { getApproverNames, getContributorNames } from '../../libs/get_approver_names';
import AlertMessage from '../../libs/bootstrap/alert';
import * as CuratorHistory from '../curator_history';
import * as curator from '../curator';
const CurationMixin = curator.CurationMixin;

const PublishApproval = module.exports.PublishApproval = createReactClass({
    mixins: [RestMixin, FormMixin, CurationMixin, CuratorHistory],

    propTypes: {
        gdm: PropTypes.object,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        provisional: PropTypes.object,
        classification: PropTypes.string,
        classificationStatus: PropTypes.string,
        affiliation: PropTypes.object,
        snapshots: PropTypes.array, // assumed to be sorted
        selectedSnapshotUUID: PropTypes.string,
        updateSnapshotList: PropTypes.func,
        updateProvisionalObj: PropTypes.func,
        postTrackData: PropTypes.func,
        getContributors: PropTypes.func,
        setUNCData: PropTypes.func,
        triggerPublishLinkAlert: PropTypes.func,
        clearPublishState: PropTypes.func
    },

    getInitialState() {
        let selectedSnapshot = {};

        // Determine which type of resource (GCI GDM or VCI interpretation) is being published
        const selectedResourceType = this.props.gdm && this.props.gdm.uuid ? 'gdm' : this.props.interpretation && this.props.interpretation.uuid ? 'interpretation' : null;

        // If both the data to identify a "selected" snapshot (this.props.selectedSnapshotUUID and this.props[selectedResourceType].uuid) and a list of
        // snapshots to search (this.props.snapshots) exist, then try to find the specified snapshot
        if (this.props.selectedSnapshotUUID && selectedResourceType && this.props.snapshots) {
            selectedSnapshot = this.props.snapshots.find(snapshot => (snapshot['@id'] &&
                snapshot['@id'].split('/', 3)[2] === this.props.selectedSnapshotUUID &&
                snapshot.resourceParent && snapshot.resourceParent[selectedResourceType] &&
                snapshot.resourceParent[selectedResourceType].uuid === this.props[selectedResourceType].uuid));

        // Otherwise, find the current approved snapshot (this.props.snapshots is assumed to be sorted)
        } else if (this.props.snapshots) {
            selectedSnapshot = this.props.snapshots.find(snapshot => snapshot.approvalStatus === 'Approved');
        }

        // If a "selected" snapshot exists, retrieve the "selected" provisional from it
        const selectedProvisional = selectedSnapshot && selectedSnapshot.resource ? selectedSnapshot.resource : {};

        // Check if the "selected" provisional is also the current one (using data other than the shared UUID)
        const isSelectedProvisionalCurrent = this.props.provisional &&
            selectedProvisional.provisionalDate === this.props.provisional.provisionalDate &&
            selectedProvisional.provisionalSubmitter === this.props.provisional.provisionalSubmitter &&
            selectedProvisional.approvalDate === this.props.provisional.approvalDate &&
            selectedProvisional.approvalSubmitter === this.props.provisional.approvalSubmitter &&
            selectedProvisional.affiliation === this.props.provisional.affiliation;

        return {
            selectedResourceType: selectedResourceType,
            selectedSnapshot: selectedSnapshot,
            selectedProvisional: selectedProvisional,
            isSelectedProvisionalCurrent: isSelectedProvisionalCurrent,
            publishDate: undefined,
            publishComment: undefined,
            publishSubmitter: undefined,
            publishAffiliation: undefined,
            isPublishPreview: false,
            showAlertMessage: false,
            alertType: null,
            alertClass: null,
            alertMsg: null,
            submitBusy: false // Flag to indicate that the submit button is in a 'busy' state
        };
    },

    /**
     * Method to handle previewing publish form
     */
    handlePreviewPublish() {
        let affiliationSubgroup;
        const selectedResourceType = this.state.selectedResourceType;
        const affiliation = this.props.affiliation;

        // Set variables based on the (parent) resource type
        if (selectedResourceType === 'gdm') {
            affiliationSubgroup = 'gcep';
        } else if (selectedResourceType === 'interpretation') {
            affiliationSubgroup = 'vcep';
        }

        const publishComment = this.publishCommentInput.getValue();
        const publishAffiliation = affiliation && affiliation.subgroups && affiliation.subgroups[affiliationSubgroup] &&
            affiliation.subgroups[affiliationSubgroup].id ? affiliation.subgroups[affiliationSubgroup].id : undefined;
        this.setState({
            publishSubmitter: this.props.session.user_properties.title,
            publishAffiliation: publishAffiliation,
            publishComment: publishComment.length ? publishComment : undefined,
            isPublishPreview: true
        });
    },

    /**
     * Method to handle resetting the publish form data
     */
    handleCancelPublish() {
        this.setState({
            publishSubmitter: undefined,
            publishAffiliation: undefined,
            publishComment: undefined,
            isPublishPreview: false
        });
    },

    /**
     * Method to handle editing the publish form data
     */
    handleEditPublish() {
        this.setState({ isPublishPreview: false });
    },

    /**
     * Method to show error alert
     * @param {string} alertType - The type of alert (added to class)
     * @param {string} alertClass - Custom classes for the alert
     * @param {object} alertMsg - The alert message
     */
    showAlert(alertType, alertClass, alertMsg) {
        this.setState({
            showAlertMessage: true,
            alertType: alertType,
            alertClass: alertClass,
            alertMsg: alertMsg
        }, () => {
            setTimeout(this.hideAlert, 10000);
        });
    },

    /**
     * Method to hide error alert
     */
    hideAlert() {
        this.setState({ showAlertMessage: false });
    },

    /**
     * Method to publish data to the Data Exchange
     * @param {string} objType - The type of the data's source object (e.g. snapshot)
     * @param {string} objUUID - The UUID of the data's source object
     */
    publishToDataExchange(objType, objUUID) {
        let alertType = 'alert-danger';
        let alertClass = 'publish-error';
        let alertMsg = (<span>Request failed; please try again in a few minutes or contact helpdesk: <a
            href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a></span>);

        return new Promise((resolve, reject) => {
            if (objType && objUUID) {
                this.getRestData('/publish?type=' + objType + '&uuid=' + objUUID, null, false).then(result => {
                    if (result.status === 'Success') {
                        resolve(result);
                    } else {
                        console.log('Message delivery failure: %s', result.message);
                        this.setState({ submitBusy: false });
                        this.showAlert(alertType, alertClass, alertMsg);
                        reject(result);
                    }
                }).catch(error => {
                    console.log('Internal data retrieval error: %o', error);
                    this.setState({ submitBusy: false });
                    this.showAlert(alertType, alertClass, alertMsg);
                    reject(error);
                });
            } else {
                this.setState({ submitBusy: false });
                this.showAlert(alertType, alertClass, alertMsg);
                reject(null);
            }
        });
    },

    /**
     * Method to send GDM publish/unpublish provisional data to Data Exchange
     * @param {object} provisional - provisional classification object
     * @param {string} publishSnapshotId - current publish/unpublish snapshot Id
     */
    sendToDataExchange(provisional, publishSnapshotId) {
        const publishSubmitter = this.props.session && this.props.session.user_properties ? this.props.session.user_properties : null;
        const status = provisional.publishClassification ? 'published' : 'unpublished';
        const publishRole = provisional.publishClassification ? ['publisher'] : ['unpublisher'];
        // Get all contributors
        const contributors = this.props.getContributors(publishSnapshotId);

        // Add this provisional publisher/unpublisher to contributors list
        if (publishSubmitter) {
            contributors.push({ 
                name: publishSubmitter.title ? publishSubmitter.title : '',
                id: publishSubmitter.uuid ? publishSubmitter.uuid : '',
                email: publishSubmitter.email ? publishSubmitter.email : '',
                roles: publishRole
            });
        }

        // Create data object to be sent to Data Exchange
        const publishDate = provisional.publishDate ? provisional.publishDate : '';
        let uncData = this.props.setUNCData(provisional, status, publishDate, publishDate, publishSubmitter, contributors);

        // Post published/unpublished data to Data Exchange
        this.props.postTrackData(uncData).then(response => {
            console.log('Successfully sent %s data to Data Exchange for provisional %s at %s', status, provisional.uuid, moment(publishDate).toISOString());
        }).catch(error => {
            console.log('Error sending %s data to Data Exchange for provisional %s at %s - Error: %o', status, provisional.uuid, moment(publishDate).toISOString(), error);
        });
    },

    /**
     * Method to send full GDM data snapshot to Data Exchange when provisional classification is published
     */
    publishGDMToDataExchange(snapshot) {
        // Post published GDM data snapshot to Data Exchange
        return new Promise((resolve, reject) => {
            // Check if snapshot has necessary data
            if (snapshot && snapshot.resource && snapshot.resourceParent) {
                this.postRestData('/publish-gdm', snapshot).then(result => {
                    if (result.status === 'Success') {
                        console.log('Post full gdm succeeded: %o', result);
                        resolve(result);
                    } else {
                        console.log('Post full gdm failed: %o', result);
                        reject(result);
                    }
                }).catch(error => {
                    console.log('Post full gdm internal data retrieval error: %o', error);
                    reject(error);
                });
            } else {
                console.log('Post full gdm Error: Missing expected data');
                reject({'message': 'Missing expected data'});
            }
        });
    },

    /**
     * Method to handle submitting the publish form
     * @param {object} e - The submitted event object
     */
    submitForm(e) {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ submitBusy: true });
        if (this.state.selectedSnapshot && this.state.selectedSnapshot['@type'] && this.state.selectedSnapshot['@id']) {
            let associatedResourceSnapshots, resourceProperName, resourceName;
            const selectedResourceType = this.state.selectedResourceType;

            // Set variables based on the (parent) resource type
            if (selectedResourceType === 'gdm') {
                associatedResourceSnapshots = 'associatedClassificationSnapshots';
                resourceProperName = 'Classification';
                resourceName = 'classification';
            } else if (selectedResourceType === 'interpretation') {
                associatedResourceSnapshots = 'associatedInterpretationSnapshots';
                resourceProperName = 'Interpretation';
                resourceName = 'interpretation';
            }

            this.publishToDataExchange(this.state.selectedSnapshot['@type'][0], this.state.selectedSnapshot['@id'].split('/', 3)[2]).then(response => {
                let publishProvisional = this.state.selectedProvisional && this.state.selectedProvisional.uuid ? this.state.selectedProvisional : {};
                let currentProvisional = this.props.provisional && this.props.provisional['@id'] ? curator.flatten(this.props.provisional) : {};
                const submissionTimestamp = new Date();

                // Update published (or unpublished) provisional with form data (to be included when selected/published snapshot object is sent to the DB)
                publishProvisional.publishClassification = !this.state.selectedProvisional.publishClassification;
                publishProvisional.publishSubmitter = this.state.publishSubmitter;
                publishProvisional.publishAffiliation = this.state.publishAffiliation;
                publishProvisional.publishDate = moment(submissionTimestamp).toISOString();

                if (this.state.publishComment && this.state.publishComment.length) {
                    publishProvisional.publishComment = this.state.publishComment;
                } else if (publishProvisional.publishComment) {
                    delete publishProvisional['publishComment'];
                }

                // Additional provisional data that would otherwise be lost (when snapshot object is sent to the DB)
                publishProvisional.last_modified = moment(submissionTimestamp).utc().format('Y-MM-DDTHH:mm:ss.SSSZ');
                publishProvisional.modified_by = this.props.session.user_properties ? this.props.session.user_properties['@id'] : '';

                // Only update current provisional object with form data when publish event is on current approved snapshot
                if (this.state.isSelectedProvisionalCurrent) {
                    currentProvisional.publishClassification = !this.props.provisional.publishClassification;
                    currentProvisional.publishSubmitter = this.state.publishSubmitter;
                    currentProvisional.publishAffiliation = this.state.publishAffiliation;
                    currentProvisional.publishDate = moment(submissionTimestamp).toISOString();

                    if (this.state.publishComment && this.state.publishComment.length) {
                        currentProvisional.publishComment = this.state.publishComment;
                    } else if (currentProvisional.publishComment) {
                        delete currentProvisional['publishComment'];
                    }
                }

                // Always update the "publishStatus" field (set to "true" for published snapshot, deleted for unpublished)
                // within current provisional object's associated snapshots array (e.g. associatedClassificationSnapshots)
                // If publishing, for previous published snapshot, delete publishStatus and related published data
                if (currentProvisional[associatedResourceSnapshots] && currentProvisional[associatedResourceSnapshots].length) {
                    for (let snapshot of currentProvisional[associatedResourceSnapshots]) {
                        if (snapshot.approvalStatus === 'Approved') {
                            if (snapshot.uuid === this.state.selectedSnapshot['@id'].split('/', 3)[2]) {
                                if (publishProvisional.publishClassification) {
                                    snapshot.publishStatus = true;
                                } else if (snapshot.publishStatus) {
                                    delete snapshot['publishStatus'];
                                }

                                if (snapshot.resource) {
                                    snapshot.resource.publishClassification = publishProvisional.publishClassification;
                                    snapshot.resource.publishSubmitter = publishProvisional.publishSubmitter;
                                    snapshot.resource.publishAffiliation = publishProvisional.publishAffiliation;
                                    snapshot.resource.publishDate = publishProvisional.publishDate;

                                    if (publishProvisional.publishComment) {
                                        snapshot.resource.publishComment = publishProvisional.publishComment;
                                    } else if (snapshot.resource.publishComment) {
                                        delete snapshot.resource['publishComment'];
                                    }
                                }
                            } else if (publishProvisional.publishClassification && snapshot.publishStatus) {
                                delete snapshot['publishStatus'];

                                if (snapshot.resource) {
                                    snapshot.resource.publishClassification = !publishProvisional.publishClassification;
                                    delete snapshot.resource['publishSubmitter'];
                                    delete snapshot.resource['publishAffiliation'];
                                    delete snapshot.resource['publishDate'];
                                    delete snapshot.resource['publishComment'];
                                }
                            }
                        }
                    }
                }

                // Send updated current provisional object to the DB
                return this.putRestData(this.props.provisional['@id'], currentProvisional).then(responseProvisional => {
                    if (responseProvisional.status === 'success' && responseProvisional['@graph'] && responseProvisional['@graph'].length) {
                        return Promise.resolve(responseProvisional['@graph'][0]);
                    } else {
                        return Promise.reject(responseProvisional);
                    }
                }).then(resultProvisional => {
                    // Send publish GDM provisional data to Data Exchange
                    if (selectedResourceType === 'gdm' && this.props.gdm && Object.keys(this.props.gdm).length) {
                        this.sendToDataExchange(resultProvisional, this.state.selectedSnapshot['@id']);
                    }

                    // Create selected/published snapshot object, updated with publish event data
                    const publishSnapshot = {
                        resourceId: publishProvisional.uuid,
                        resourceType: this.state.selectedSnapshot.resourceType,
                        approvalStatus: this.state.selectedSnapshot.approvalStatus,
                        resource: publishProvisional,
                        resourceParent: this.state.selectedSnapshot.resourceParent,
                        associatedSnapshot: this.state.selectedSnapshot.associatedSnapshot,
                        date_created: this.state.selectedSnapshot.date_created
                    };

                    // Send updated selected/published snapshot object to the DB
                    this.putRestData(this.state.selectedSnapshot['@id'], publishSnapshot).then(responseSnapshot => {
                        if (responseSnapshot.status === 'success' && responseSnapshot['@graph'] && responseSnapshot['@graph'].length) {
                            this.props.updateSnapshotList(responseSnapshot['@graph'][0]['@id']);
                            return Promise.resolve(responseSnapshot['@graph'][0]);
                        } else {
                            return Promise.reject(responseSnapshot);
                        }
                    }).then(resultSnapshot => {

                        // Only update provisional state object when publish event is on current approved snapshot
                        if (this.state.isSelectedProvisionalCurrent) {
                            this.props.updateProvisionalObj(resultProvisional['@id']);
                        }

                        // Send published GDM data (snapshot) to Data Exchange
                        if (selectedResourceType === 'gdm') {
                            this.publishGDMToDataExchange(resultSnapshot);
                        }

                        // When publish event is a publish, automatically unpublish a previously-published snapshot (if one exists)
                        if (publishProvisional.publishClassification) {
                            const previouslyPublishedSnapshot = this.props.snapshots ? this.props.snapshots.find(snapshot => (snapshot.resource &&
                                snapshot.resource.publishClassification && snapshot['@id'] !== this.state.selectedSnapshot['@id'])) : {};

                            if (previouslyPublishedSnapshot && previouslyPublishedSnapshot.resource) {
                                // Update previously-published snapshot with automatic unpublish data
                                previouslyPublishedSnapshot.resource.publishComment = resourceProperName + ' previously published by ' +
                                    previouslyPublishedSnapshot.resource.publishSubmitter + ' on ' +
                                    moment(previouslyPublishedSnapshot.resource.publishDate).format('YYYY MMM DD') +
                                    (previouslyPublishedSnapshot.resource.publishComment ? ' with the following comment: ' +
                                        previouslyPublishedSnapshot.resource.publishComment : '');
                                previouslyPublishedSnapshot.resource.publishClassification = false;
                                previouslyPublishedSnapshot.resource.publishSubmitter = publishProvisional.publishSubmitter +
                                    ' (automatic due to publication of another ' + resourceName + ')';
                                previouslyPublishedSnapshot.resource.publishAffiliation = publishProvisional.publishAffiliation;
                                previouslyPublishedSnapshot.resource.publishDate = publishProvisional.publishDate;
                                previouslyPublishedSnapshot.resource.last_modified = publishProvisional.last_modified;
                                previouslyPublishedSnapshot.resource.modified_by = publishProvisional.modified_by;

                                const autoUnpublishSnapshot = {
                                    resourceId: previouslyPublishedSnapshot.resource.uuid,
                                    resourceType: previouslyPublishedSnapshot.resourceType,
                                    approvalStatus: previouslyPublishedSnapshot.approvalStatus,
                                    resource: previouslyPublishedSnapshot.resource,
                                    resourceParent: previouslyPublishedSnapshot.resourceParent,
                                    associatedSnapshot: previouslyPublishedSnapshot.associatedSnapshot,
                                    date_created: previouslyPublishedSnapshot.date_created
                                };

                                // Send updated (unpublished) previously-published snapshot object to the DB
                                this.putRestData(previouslyPublishedSnapshot['@id'], autoUnpublishSnapshot).then(responseSnapshot => {
                                    if (responseSnapshot.status === 'success' && responseSnapshot['@graph'] && responseSnapshot['@graph'].length) {
                                        this.props.updateSnapshotList(responseSnapshot['@graph'][0]['@id']);
                                        return Promise.resolve(responseSnapshot['@graph'][0]);
                                    } else {
                                        return Promise.reject(responseSnapshot);
                                    }
                                }).then(resultSnapshot => {
                                    // Send unpublish GDM provisional data to Data Exchange
                                    if (selectedResourceType === 'gdm' && resultSnapshot && resultSnapshot.resource && this.props.gdm && Object.keys(this.props.gdm).length) {
                                        this.sendToDataExchange(resultSnapshot.resource, resultSnapshot['@id']);
                                    }
                                }).catch(error => {
                                    console.log('Automatic unpublishing snapshot error = : %o', error);
                                });
                            }

                            // When publishing an interpretation (to the Evidence Repository), display a temporary "link may not work immediately" alert
                            if (selectedResourceType === 'interpretation') {
                                this.props.triggerPublishLinkAlert();
                            }
                        }

                        // Clear publish-related URL query parameters and state data
                        this.props.clearPublishState();
                    }).catch(error => {
                        console.log('Publishing snapshot error = : %o', error);
                    });
                }).catch(error => {
                    console.log('Updating provisional error = : %o', error);
                });
            }).catch(error => {
                console.log('%s publication error = : %o', resourceProperName, error);
            });
        }
    },

    render() {
        const publishSubmitter = this.state.publishSubmitter;
        const publishDate = this.state.publishDate ? moment(this.state.publishDate).format('YYYY MMM DD, h:mm a') : moment().format('YYYY MMM DD, h:mm a');
        const publishComment = this.state.publishComment && this.state.publishComment.length ? this.state.publishComment : '';
        const session = this.props.session;
        const provisional = this.state.selectedProvisional;
        const additionalApprover = provisional ? provisional.additionalApprover : null;
        const classificationContributors = provisional ? provisional.classificationContributors : null;
        const classification = this.props.classification;
        const affiliation = provisional.affiliation ? provisional.affiliation : (this.props.affiliation ? this.props.affiliation : null);
        const interpretation = this.props.interpretation;
        const publishEvent = provisional.publishClassification ? 'Unpublish' : 'Publish';
        const publishEventLower = provisional.publishClassification ? 'unpublished' : 'published';
        const publicationEventLower = provisional.publishClassification ? 'unpublication' : 'publication';
        const selectedResourceType = this.state.selectedResourceType;
        const submitBusy = this.state.submitBusy;
        let affiliationSubgroup;

        // Set variables based on the (parent) resource type
        if (selectedResourceType === 'gdm') {
            affiliationSubgroup = 'gcep';
        } else if (selectedResourceType === 'interpretation') {
            affiliationSubgroup = 'vcep';
        }

        return (
            <div className="publish-approval-panel-content">
                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                    {this.state.isPublishPreview ?
                        <div className="publish-preview">
                            <div className="col-md-12 publish-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="publish-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation, affiliationSubgroup) : null}</dd>
                                        </dl>
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification Approver:</span></dt>
                                            <dd>{additionalApprover ? getApproverNames(additionalApprover) : null}</dd>
                                        </dl>
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification Contributor(s):</span></dt>
                                            <dd>{classificationContributors ? getContributorNames(classificationContributors).join(', ') : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="publish-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification {publishEventLower} by:</span></dt>
                                            <dd>{publishSubmitter ? publishSubmitter : null}</dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <div className="publish-date">
                                        <dl className="inline-dl clearfix preview-publish-date">
                                            <dt><span>Date {publishEventLower}:</span></dt>
                                            <dd><span>{publishDate}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="publish-comments">
                                        <dl className="inline-dl clearfix preview-publish-comment">
                                            <dt><span>Additional comments:</span></dt>
                                            <dd><span>{publishComment ? publishComment : null}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-12 alert alert-warning publish-preview-note">
                                <i className="icon icon-exclamation-circle"></i> This is a Preview only; you must still {publishEvent} this
                                {interpretation && Object.keys(interpretation).length ? ' Interpretation' : ' Classification'}.
                            </div>
                        </div>
                        :
                        <div className="publish-edit">
                            <div className="col-md-12 publish-form-content-wrapper">
                                <div className="col-xs-12 col-sm-4">
                                    <div className="publish-affiliation">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{affiliation ? getAffiliationName(affiliation, affiliationSubgroup) : null}</dd>
                                        </dl>
                                    </div>
                                    <div className="publish-submitter">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Entered by:</span></dt>
                                            <dd><span className="publish-placeholder-text">Current curator's name will be entered upon {publicationEventLower}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-3">
                                    <div className="publish-date">
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Date {publishEventLower}:</span></dt>
                                            <dd><span className="publish-placeholder-text">Current date and time will be entered upon {publicationEventLower}</span></dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="col-xs-12 col-sm-5">
                                    <div className="publish-comments">
                                        <Input type="textarea" ref={(input) => { this.publishCommentInput = input; }}
                                            label="Additional comments:" value={publishComment} rows="5" giveFocus={true}
                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                    <div className="col-md-12 publish-form-buttons-wrapper">
                        {this.state.isPublishPreview ?
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer"
                                    onClick={this.handleCancelPublish} disabled={submitBusy}>
                                    Cancel {publishEvent}
                                </button>
                                <button type="button" className="btn btn-info btn-inline-spacer"
                                    onClick={this.handleEditPublish} disabled={submitBusy}>
                                    Edit <i className="icon icon-pencil"></i>
                                </button>
                                <button type="submit" className="btn btn-primary btn-inline-spacer pull-right" disabled={submitBusy}>
                                    {submitBusy ? <span className="submit-spinner"><i className="icon icon-spin icon-cog"></i></span> : null}
                                    {publishEvent} <i className="icon icon-check-square-o"></i>
                                </button>
                                <AlertMessage visible={this.state.showAlertMessage} type={this.state.alertType}
                                    customClasses={this.state.alertClass} message={this.state.alertMsg} />
                            </div>
                            :
                            <div className="button-group">
                                <button type="button" className="btn btn-default btn-inline-spacer pull-right"
                                    onClick={this.handlePreviewPublish}>
                                    Preview {publishEvent}
                                </button>
                            </div>
                        }
                    </div>
                </Form>
            </div>
        );
    }
});
