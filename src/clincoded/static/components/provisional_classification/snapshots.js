'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Input } from '../../libs/bootstrap/form';
import { getAffiliationName, getAffiliationNameBySubgroupID } from '../../libs/get_affiliation_name';
import { renderSelectedModeInheritance } from '../../libs/render_mode_inheritance';
import { getApproverNames, getContributorNames } from '../../libs/get_approver_names';
import { sortListByDate } from '../../libs/helpers/sort';
import { isScoringForCurrentSOP, determineSOPVersion } from '../../libs/sop';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';
import { renderSimpleStatusLabel } from '../../libs/render_simple_status_label';
import AlertMessage from '../../libs/bootstrap/alert';
import { ClinVarSubmissionData } from '../variant_central/clinvar_submission';

class CurationSnapshots extends Component {
    constructor(props) {
        super(props);
    }

    viewSnapshotSummary(snapshotId, type, e) {
        e.preventDefault(); e.stopPropagation();
        const snapshotUuid = snapshotId.slice(11, -1);
        if (type === 'classification') {
            window.open('/gene-disease-evidence-summary/?snapshot=' + snapshotUuid, '_blank');
        } else if (type === 'interpretation') {
            window.open('/variant-interpretation-summary/?snapshot=' + snapshotUuid, '_blank');
        }
    }

    renderSnapshotStatusIcon(snapshot, approvalStatus) {
        const snapshots = this.props.snapshots;
        let filteredSnapshots;
        if (approvalStatus === 'Provisioned') {
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Provisioned');
        } else if (approvalStatus === 'Approved') {
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Approved');
        }

        if (filteredSnapshots && filteredSnapshots.length) {
            let sortedSnapshots = sortListByDate(filteredSnapshots, 'date_created');
            if (snapshot['@id'] === sortedSnapshots[0]['@id']) {
                return <div className="snapshot-current-icon"><i className="icon icon-flag"></i></div>;
            } else {
                return <div className="snapshot-archive-icon"><i className="icon icon-archive"></i></div>;
            }
        }
    }

    /**
     * Method to return different Bootstrap button class depending on the index param
     * The 'btn-default' button is changed to have gray background-color instead of white
     * @param {object} snapshot - The snapshot object
     * @param {string} approvalStatus - A string value of either 'Provisioned' or 'Approved'
     */
    renderSnapshotViewSummaryBtn(snapshot, approvalStatus) {
        const snapshots = this.props.snapshots;
        let buttonClass, filteredSnapshots;
        if (approvalStatus === 'Provisioned') {
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Provisioned');
        } else if (approvalStatus === 'Approved') {
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Approved');
        }

        if (filteredSnapshots && filteredSnapshots.length) {
            let sortedSnapshots = sortListByDate(filteredSnapshots, 'date_created');
            if (snapshot['@id'] === sortedSnapshots[0]['@id']) {
                buttonClass = 'btn-primary';
            } else {
                buttonClass = 'btn-default';
            }
        }
        return buttonClass;
    }

    /**
     * Method to render the button that allows users to approval the most recently saved provisional
     * @param {object} resourceParent - The parent object of the classification in a snapshot
     * @param {integer} index - The index of the object in the snapshots array
     */
    renderProvisionalSnapshotApprovalLink(resourceParent, index) {
        const context = this.props.context;
        if (index.toString() === "0") {
            if (context && context.name === 'provisional-curation' && resourceParent['@type'][0] === 'gdm') {
                return (
                    <a className="btn btn-warning approve-provisional-link-item" role="button" href={'/provisional-classification/?gdm=' + resourceParent.uuid + '&approval=yes'}>
                        Approve this Saved Provisional
                    </a>
                );
            } else {
                return (
                    <button type="button" className="btn btn-warning approve-provisional-link-item" role="button" onClick={this.props.approveProvisional}>
                        Approve this Saved Provisional
                    </button>
                );
            }
        }
    }

    /**
     * Method to render the button that allows users to publish/unpublish an approved classification/interpretation
     * @param {object} resourceParent - The parent object of the classification/interpretation in a snapshot
     * @param {string} resourceType - The resource type (classification/interpretation) of the parent object
     * @param {string} snapshotUUID - The UUID of the source snapshot
     * @param {boolean} publishClassification - The published status of the classification/interpretation (per the source snapshot)
     */
    renderPublishLink(resourceParent, resourceType, snapshotUUID, publishClassification) {
        const allowPublishButton = this.props.allowPublishButton;
        const isPublishEventActive = this.props.isPublishEventActive;
        const isApprovalActive = this.props.isApprovalActive;
        const context = this.props.context;

        // Universal criteria to render a publish button/link:
        // User has permission to publish (allowPublishButton) and neither a publish event (!isPublishEventActive) nor the
        //  approval process (!isApprovalActive) is currently in progress
        if (allowPublishButton && !isPublishEventActive && !isApprovalActive) {
            let classData = 'btn btn-default publish-link-item';
            let eventType = 'publish';
            let buttonText = resourceType === 'interpretation' ? 'Publish to Evidence Repository' : 'Publish Summary';

            if (publishClassification) {
                classData += ' unpublish';
                eventType = 'unpublish';
                buttonText = resourceType === 'interpretation' ? 'Unpublish from Evidence Repository' : 'Unpublish Summary';
            }

            // If not within the GCI's approval process, present publish link as a link (that passes along required data in URL query parameters)
            if (context && context.name === 'provisional-curation') {
                if (resourceParent && resourceParent.uuid) {
                    return (
                        <a className={classData} role="button" href={'/provisional-classification/?gdm=' +
                            resourceParent.uuid + '&snapshot=' + snapshotUUID + '&' + eventType + '=yes'}>{buttonText}</a>
                    );
                } else {
                    return null;
                }

            // Otherwise, for the VCI or within the GCI's approval process, present publish link as a button (that triggers a state update in a parent component)
            } else if (this.props.addPublishState) {
                return (
                    <button type="button" className={classData} role="button"
                        onClick={this.props.addPublishState.bind(null, snapshotUUID, eventType)}>{buttonText}</button>
                );
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    /**
     * Method to render publish/unpublish data for a snapshot
     * @param {object} snapshot - The snapshot object
     * @param {object} resourceParent - The parent object of the classification/interpretation in a snapshot
     * @param {boolean} isSnapshotOnCurrentSOP - Indicator that the snapshot is on the current SOP
     * @param {string} currentApprovedSnapshotID - The snapshot ID of the most recently approved classification/interpretation
     */
    renderSnapshotPublishData(snapshot, resourceParent, isSnapshotOnCurrentSOP, currentApprovedSnapshotID) {
        if (snapshot.resource && snapshot.resource.publishDate) {
            const snapshotUUID = snapshot.uuid ? snapshot.uuid : snapshot['@id'].split('/', 3)[2];

            if (snapshot.resource.publishClassification) {
                let publishAffiliation, publishSiteURL, publishSiteLinkName;
                let publishLinkAlert = false, publishLinkAlertType, publishLinkAlertClass, publishLinkAlertMessage;

                if (snapshot.resourceType === 'interpretation') {
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('vcep', snapshot.resource.publishAffiliation) + ')' : '';
                    publishSiteURL = 'https://' + (this.props.demoVersion ? 'genboree.org/evidence-repo' : 'erepo.clinicalgenome.org/evrepo') +
                        '/ui/classification/' + (resourceParent && resourceParent.uuid ? resourceParent.uuid : '');
                    publishSiteLinkName = 'Evidence Repository';

                    if (this.props.showPublishLinkAlert) {
                        publishLinkAlert = true;
                        publishLinkAlertType = 'alert-info'
                        publishLinkAlertClass = 'evidence-repository-info';
                        publishLinkAlertMessage = 'Please allow a minute for Evidence Repository link to return results.';

                        if (this.props.clearPublishLinkAlert) {
                            setTimeout(this.props.clearPublishLinkAlert, 10000);
                        }
                    }
                } else {
                    const publishSiteLinkDate = !isSnapshotOnCurrentSOP ? snapshot.resource.approvalDate :
                        snapshot.resource.approvalReviewDate ? snapshot.resource.approvalReviewDate : snapshot.resource.approvalDate;
                    publishAffiliation = snapshot.resource.publishAffiliation ? ' (' +
                        getAffiliationNameBySubgroupID('gcep', snapshot.resource.publishAffiliation) + ')' : '';
                    publishSiteURL = 'https://search' + (this.props.demoVersion ? '-staging' : '') + '.clinicalgenome.org/kb/gene-validity/' +
                        snapshot.resource.uuid + '--' + moment(publishSiteLinkDate).utc().format('Y-MM-DDTHH:mm:ss');
                    publishSiteLinkName = (resourceParent && resourceParent.gene && resourceParent.gene.symbol ?
                        resourceParent.gene.symbol + ' ' : '') + 'Classification Summary';
                }

                return (
                    <tr className="snapshot-publish-approval">
                        <td className="snapshot-content">
                            <dl className="inline-dl clearfix snapshot-publish-approval-submitter">
                                <dt><span>Published by:</span></dt>
                                <dd>{snapshot.resource.publishSubmitter + publishAffiliation}</dd>
                            </dl>
                            <dl className="inline-dl clearfix snapshot-publish-approval-date">
                                <dt><span>Date published:</span></dt>
                                <dd><span>{formatDate(snapshot.resource.publishDate, 'YYYY MMM DD, h:mm a')}</span></dd>
                                <span className="label publish-background">PUBLISHED</span>
                            </dl>
                            <dl className="inline-dl clearfix snapshot-publish-approval-comment">
                                <dt><span>Additional comments:</span></dt>
                                <dd><span>{snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</span></dd>
                            </dl>
                            <dl className="inline-dl clearfix snapshot-publish-approval-link">
                                <dt><span>Link:</span></dt>
                                <dd><span><a href={publishSiteURL} target="_blank">{publishSiteLinkName}</a></span></dd>
                                {publishLinkAlert ?
                                    <AlertMessage visible={publishLinkAlert} type={publishLinkAlertType}
                                        customClasses={publishLinkAlertClass} message={publishLinkAlertMessage} />
                                    : null}
                            </dl>
                        </td>
                        <td className="approval-snapshot-buttons">
                            {this.renderPublishLink(resourceParent, snapshot.resourceType, snapshotUUID, snapshot.resource.publishClassification)}
                        </td>
                    </tr>
                );
            } else {
                // Special criteria to render a publish link (to the right of unpublish data):
                // Given snapshot is on the current SOP (isSnapshotOnCurrentSOP) and is the current approved (snapshot['@id'] === currentApprovedSnapshotID)
                const allowSnapshotPublish = isSnapshotOnCurrentSOP && snapshot['@id'] === currentApprovedSnapshotID;

                return (
                    <tr className="snapshot-publish-approval">
                        <td className="snapshot-content">
                            <dl className="inline-dl clearfix snapshot-publish-approval-submitter">
                                <dt><span>Unpublished by:</span></dt>
                                <dd>{snapshot.resource.publishSubmitter}</dd>
                            </dl>
                            <dl className="inline-dl clearfix snapshot-publish-approval-date">
                                <dt><span>Date unpublished:</span></dt>
                                <dd><span>{formatDate(snapshot.resource.publishDate, 'YYYY MMM DD, h:mm a')}</span></dd>
                                <span className="label publish-background unpublish">UNPUBLISHED</span>
                            </dl>
                            <dl className="inline-dl clearfix snapshot-publish-approval-comment">
                                <dt><span>Additional comments:</span></dt>
                                <dd><span>{snapshot.resource.publishComment ? snapshot.resource.publishComment : null}</span></dd>
                            </dl>
                        </td>
                        <td className="approval-snapshot-buttons">
                            {allowSnapshotPublish ? this.renderPublishLink(resourceParent, snapshot.resourceType, snapshotUUID, snapshot.resource.publishClassification) : null}
                        </td>
                    </tr>
                );
            }
        } else {
            return null;
        }
    }

    /**
     * Method to render snapshots in table rows
     * @param {object} snapshot - A saved copy of a provisioned/approved classification and its parent GDM/Interpretation
     * @param {string} isApprovalActive - Indicator that the user is at the approval step of the approval process (panel is visible)
     * @param {string} classificationStatus - The status of the classification (in terms of progress through the approval process)
     * @param {string} currentApprovedSnapshotID - The snapshot ID of the most recently approved classification/interpretation
     * @param {integer} index - The index of the object in the snapshots array
     */
    renderSnapshot(snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, index) {
        const type = snapshot.resourceType;
        const snapshotUUID = snapshot.uuid ? snapshot.uuid : snapshot['@id'].split('/', 3)[2];
        const affiliationID = snapshot.resource && snapshot.resource.affiliation ? snapshot.resource.affiliation : '';
        const isPublishEventActive = this.props.isPublishEventActive;
        let resourceParent, isSnapshotOnCurrentSOP;
        let allowClinVarSubmission = false;
        if (snapshot.resourceType === 'classification' && snapshot.resourceParent.gdm) {
            resourceParent = snapshot.resourceParent.gdm;

            // A classification snapshot must be on the current SOP (based on the data model of the evidence scoring) to be published
            isSnapshotOnCurrentSOP = snapshot.resource ? isScoringForCurrentSOP(snapshot.resource.classificationPoints) : false;
        } else if (snapshot.resourceType === 'interpretation' && snapshot.resourceParent.interpretation) {
            resourceParent = snapshot.resourceParent.interpretation;
            isSnapshotOnCurrentSOP = true;
            allowClinVarSubmission = snapshot['@id'] === currentApprovedSnapshotID;
        }

        // Special criteria to render a publish link (above a "View Approved Summary" button):
        // Given snapshot is on the current SOP (isSnapshotOnCurrentSOP), has no publish activity (!snapshot.resource.publishDate) and
        //  is the current approved (snapshot['@id'] === currentApprovedSnapshotID)
        const allowSnapshotPublish = isSnapshotOnCurrentSOP && !snapshot.resource.publishDate && snapshot['@id'] === currentApprovedSnapshotID;

        if (snapshot.approvalStatus === 'Provisioned') {
            return (
                <li className="snapshot-item list-group-item" key={snapshot['@id']} data-key={snapshot['@id']} data-status={snapshot.approvalStatus} data-index={index}>
                    <table>
                        <tbody>
                            <tr>
                                <td className="snapshot-content">
                                    {affiliationID ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{getAffiliationName(affiliationID)}</dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-submitter">
                                        <dt><span>Provisional {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by:</span></dt>
                                        <dd>{snapshot.resource.provisionalSubmitter}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-date">
                                        <dt><span>Date saved as Provisional:</span></dt>
                                        <dd><span>{snapshot.resource.provisionalDate ? formatDate(snapshot.resource.provisionalDate, "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        {renderSimpleStatusLabel(snapshot.approvalStatus)}
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-review-date">
                                        <dt><span>Date reviewed:</span></dt>
                                        <dd><span>{snapshot.resource.provisionalReviewDate ? formatDate(snapshot.resource.provisionalReviewDate, "YYYY MMM DD") : null}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-classification">
                                        <dt><span>{type === 'interpretation' ? 'Saved Pathogenicity:' : 'Saved Classification:'}</span></dt>
                                        <dd><span>
                                            {snapshot.resource.alteredClassification && snapshot.resource.alteredClassification !== 'No Modification' ?
                                                <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}
                                        </span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-disease">
                                        <dt><span>Disease:</span></dt>
                                        <dd className="disease-term">{resourceParent && resourceParent.disease && resourceParent.disease.term ? resourceParent.disease.term : 'None'}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-modeInheritance">
                                        <dt><span>Mode of Inheritance:</span></dt>
                                        <dd className="modeInheritance">{renderSelectedModeInheritance(resourceParent)}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-comment">
                                        <dt><span>Additional comments:</span></dt>
                                        <dd><span>{snapshot.resource.provisionalComment ? snapshot.resource.provisionalComment : null}</span></dd>
                                    </dl>
                                </td>
                                <td className="approval-snapshot-buttons">
                                    {this.renderSnapshotStatusIcon(snapshot, 'Provisioned')}
                                    {resourceParent && !isPublishEventActive && !isApprovalActive && classificationStatus !== 'Approved' ?
                                        this.renderProvisionalSnapshotApprovalLink(resourceParent, index)
                                        : null}
                                    <Input type="button" inputClassName={this.renderSnapshotViewSummaryBtn(snapshot, 'Provisioned')} title="View Provisional Summary" 
                                        clickHandler={this.viewSnapshotSummary.bind(this, snapshot['@id'], type)} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </li>
            );
        } else if (snapshot.approvalStatus === 'Approved') {
            return (
                <li className="snapshot-item list-group-item" key={snapshot['@id']} data-key={snapshot['@id']} data-status={snapshot.approvalStatus} data-index={index}
                    data-associated={snapshot['associatedSnapshot'] ? snapshot['associatedSnapshot'] : null}>
                    <table>
                        <tbody>
                            <tr>
                                <td className="snapshot-content">
                                    {affiliationID ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{getAffiliationName(affiliationID)}</dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-final-approval-submitter">
                                        <dt><span>Approved {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by:</span></dt>
                                        <dd>{snapshot.resource.approvalSubmitter}</dd>
                                    </dl>
                                    {snapshot.resource && snapshot.resource.classificationApprover ?
                                        <dl className="inline-dl clearfix snapshot-final-approval-classification-approver">
                                            <dt><span>Affiliation Approver:</span></dt>
                                            <dd>{snapshot.resource.classificationApprover}</dd>
                                        </dl>
                                        : null}
                                    {snapshot.resource && snapshot.resource.additionalApprover ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification Approver:</span></dt>
                                            <dd><span>{getApproverNames(snapshot.resource.additionalApprover)}</span></dd>
                                        </dl>
                                        : null}
                                    {snapshot.resource && snapshot.resource.classificationContributors ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>Classification Contributors:</span></dt>
                                            <dd><span>{getContributorNames(snapshot.resource.classificationContributors).sort().join(', ')}</span></dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-final-approval-date">
                                        <dt><span>Date saved as Approved:</span></dt>
                                        <dd><span>{snapshot.resource.approvalDate ? formatDate(snapshot.resource.approvalDate, "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        {renderSimpleStatusLabel(snapshot.approvalStatus)}
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-review-date">
                                        <dt><span>Final Approval Date:</span></dt>
                                        <dd><span>{snapshot.resource.approvalReviewDate ? formatDate(snapshot.resource.approvalReviewDate, "YYYY MMM DD") : null}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-sop-version">
                                        <dt><span>SOP Version:</span></dt>
                                        <dd><span>{determineSOPVersion(snapshot.resource)}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-classification">
                                        <dt><span>{type === 'interpretation' ? 'Saved Pathogenicity:' : 'Saved Classification:'}</span></dt>
                                        <dd><span>
                                            {snapshot.resource.alteredClassification && snapshot.resource.alteredClassification !== 'No Modification' ?
                                                <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}
                                        </span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-disease">
                                        <dt><span>Disease:</span></dt>
                                        <dd className="disease-term">{resourceParent && resourceParent.disease && resourceParent.disease.term ? resourceParent.disease.term : 'None'}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-modeInheritance">
                                        <dt><span>Mode of Inheritance:</span></dt>
                                        <dd className="modeInheritance">{renderSelectedModeInheritance(resourceParent)}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-comment">
                                        <dt><span>Approver comments:</span></dt>
                                        <dd><span>{snapshot.resource.approvalComment ? snapshot.resource.approvalComment : null}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix">
                                        <dt><span>Contributor comments:</span></dt>
                                        <dd><span>{snapshot.resource.contributorComment ? snapshot.resource.contributorComment : null}</span></dd>
                                    </dl>
                                </td>
                                <td className="approval-snapshot-buttons">
                                    {this.renderSnapshotStatusIcon(snapshot, 'Approved')}
                                    {allowClinVarSubmission ?
                                        <ClinVarSubmissionData affiliationID={affiliationID} isApprovalActive={isApprovalActive}
                                            isPublishEventActive={isPublishEventActive} resourceUUID={snapshotUUID} />
                                        : null}
                                    {allowSnapshotPublish ? this.renderPublishLink(resourceParent, snapshot.resourceType, snapshotUUID, false) : null}
                                    <Input type="button" inputClassName={this.renderSnapshotViewSummaryBtn(snapshot, 'Approved')} title="View Approved Summary"
                                        clickHandler={this.viewSnapshotSummary.bind(this, snapshot['@id'], type)} />
                                </td>
                            </tr>
                            {this.renderSnapshotPublishData(snapshot, resourceParent, isSnapshotOnCurrentSOP, currentApprovedSnapshotID)}
                        </tbody>
                    </table>
                </li>
            );
        }
    }

    render() {
        const { snapshots, isApprovalActive, classificationStatus } = this.props;
        const currentApprovedSnapshot = snapshots ? snapshots.find(snapshot => snapshot.approvalStatus === 'Approved') : {};
        const currentApprovedSnapshotID = currentApprovedSnapshot ? currentApprovedSnapshot['@id'] : undefined;

        return (
            <div className="snapshot-list panel panel-default">
                <ul className="list-group">
                    {snapshots.map((snapshot, i) => this.renderSnapshot(snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, i))}
                </ul>
            </div>
        );
    }
}

CurationSnapshots.propTypes = {
    snapshots: PropTypes.array,
    approveProvisional: PropTypes.func,
    addPublishState: PropTypes.func,
    isApprovalActive: PropTypes.string,
    isPublishEventActive: PropTypes.bool,
    classificationStatus: PropTypes.string,
    allowPublishButton: PropTypes.bool,
    showPublishLinkAlert: PropTypes.bool,
    clearPublishLinkAlert: PropTypes.func,
    demoVersion: PropTypes.bool,
    context: PropTypes.object
};

export default CurationSnapshots;