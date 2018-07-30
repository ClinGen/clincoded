'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { renderSelectedModeInheritance } from '../../libs/render_mode_inheritance';
import { sortListByDate } from '../../libs/helpers/sort';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';

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

    /**
     * Method to display classification tag/label in the interpretation header
     * @param {string} status - The status of a given classification in an interpretation
     */
    renderClassificationStatusTag(status) {
        if (status === 'Provisioned') {
            return <span className="label label-info">PROVISIONAL</span>;
        } else if (status === 'Approved') {
            return <span className="label label-success">APPROVED</span>;
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
        let pathname = window.location.pathname;
        if (index.toString() === "0") {
            if (pathname.indexOf('provisional-curation') > -1 && resourceParent['@type'][0] === 'gdm') {
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
     * Method to render the button that allows users to publish/unpublish an approved classification
     * @param {object} resourceParent - The parent object of the classification in a snapshot
     * @param {string} snapshotUUID - The UUID of the source snapshot
     * @param {boolean} publishClassification - The published status of the classification (per the source snapshot)
     */
    renderPublishLink(resourceParent, snapshotUUID, publishClassification) {
        let classData = 'btn btn-default publish-link-item';
        let eventType = 'publish';
        let buttonText = 'Publish Summary';

        if (publishClassification) {
            classData += ' unpublish';
            eventType = 'unpublish';
            buttonText = 'Unpublish Summary';
        }

        // If already within the approval process, present publish link as a button (that triggers a state update in a parent component)
        if (typeof window !== "undefined" && window.location && window.location.pathname && window.location.pathname.indexOf('provisional-classification') > -1) {
            if (this.props.addPublishState) {
                return (
                    <button type="button" className={classData} role="button"
                        onClick={this.props.addPublishState.bind(null, snapshotUUID, eventType)}>{buttonText}</button>
                );
            } else {
                return null;
            }

        // Otherwise, present publish link as a link (that passes along required data in URL query parameters)
        } else if (resourceParent && resourceParent.uuid) {
            return (
                <a className={classData} role="button" href={'/provisional-classification/?gdm=' +
                    resourceParent.uuid + '&snapshot=' + snapshotUUID + '&' + eventType + '=yes'}>{buttonText}</a>
            );
        } else {
            return null;
        }
    }

    /**
     * Method to render publish/unpublish data for a snapshot
     * @param {object} snapshot - The snapshot object
     * @param {object} resourceParent - The parent object of the classification in a snapshot
     * @param {boolean} isApprovalActive - Indicator that the panel to approve a classification is active/visible
     * @param {string} currentApprovedSnapshotID - The snapshot ID of the most recently approved classification
     */
    renderSnapshotPublishData(snapshot, resourceParent, isApprovalActive, currentApprovedSnapshotID) {
        if (snapshot.resource && snapshot.resource.publishDate) {
            const snapshotUUID = snapshot.uuid ? snapshot.uuid : snapshot['@id'].split('/', 3)[2];

            if (snapshot.resource.publishClassification) {
                const publishSiteURL = 'https://search' + (this.props.demoVersion ? '-staging' : '') + '.clinicalgenome.org/kb/gene-validity/' +
                    snapshot.resource.uuid + '--' + moment(snapshot.resource.approvalDate).utc().format('Y-MM-DDTHH:mm:ss');
                const publishSiteLinkName = (resourceParent && resourceParent.gene && resourceParent.gene.symbol ?
                    resourceParent.gene.symbol + ' ' : '') + 'Classification Summary';

                return (
                    <tr className="snapshot-publish-approval">
                        <td className="snapshot-content">
                            <dl className="inline-dl clearfix snapshot-publish-approval-submitter">
                                <dt><span>Published by:</span></dt>
                                <dd>{snapshot.resource.publishSubmitter}</dd>
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
                            </dl>
                        </td>
                        <td className="approval-snapshot-buttons">
                            {this.props.allowPublishButton && !this.props.isPublishEventActive && !isApprovalActive ?
                                this.renderPublishLink(resourceParent, snapshotUUID, snapshot.resource.publishClassification) : null}
                        </td>
                    </tr>
                );
            } else {
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
                            {this.props.allowPublishButton && !this.props.isPublishEventActive && snapshot['@id'] === currentApprovedSnapshotID && !isApprovalActive ?
                                this.renderPublishLink(resourceParent, snapshotUUID, snapshot.resource.publishClassification) : null}
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
     */
    renderSnapshot(snapshot, isApprovalActive, classificationStatus, currentApprovedSnapshotID, index) {
        const type = snapshot.resourceType;
        const snapshotUUID = snapshot.uuid ? snapshot.uuid : snapshot['@id'].split('/', 3)[2];
        let resourceParent;
        if (snapshot.resourceType === 'classification' && snapshot.resourceParent.gdm) {
            resourceParent = snapshot.resourceParent.gdm;
        } else if (snapshot.resourceType === 'interpretation' && snapshot.resourceParent.interpretation) {
            resourceParent = snapshot.resourceParent.interpretation;
        }

        // Criteria to render a publish link (above a "View Approved Summary" button):
        // User has permission to publish (this.props.allowPublishButton) and a publish event is not currently in progress (!this.props.isPublishEventActive)
        // Given snapshot has no publish activity (!snapshot.resource.publishDate) and is the current approved (snapshot['@id'] === currentApprovedSnapshotID)
        // The approval process is not currently in progress (!isApprovalActive)
        const renderPublishLinkBool = this.props.allowPublishButton && !this.props.isPublishEventActive &&
            (!snapshot.resource || !snapshot.resource.publishDate) && snapshot['@id'] === currentApprovedSnapshotID && !isApprovalActive;

        if (snapshot.approvalStatus === 'Provisioned') {
            return (
                <li className="snapshot-item list-group-item" key={snapshot['@id']} data-key={snapshot['@id']} data-status={snapshot.approvalStatus} data-index={index}>
                    <table>
                        <tbody>
                            <tr>
                                <td className="snapshot-content">
                                    {snapshot.resource && snapshot.resource.affiliation ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{getAffiliationName(snapshot.resource.affiliation)}</dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-submitter">
                                        <dt><span>Provisional {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by:</span></dt>
                                        <dd>{snapshot.resource.provisionalSubmitter}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-date">
                                        <dt><span>Date saved as Provisional:</span></dt>
                                        <dd><span>{snapshot.resource.provisionalDate ? formatDate(snapshot.resource.provisionalDate, "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        {this.renderClassificationStatusTag(snapshot.approvalStatus)}
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
                                    {resourceParent && !this.props.isPublishEventActive && !isApprovalActive && classificationStatus !== 'Approved' ?
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
                                    {snapshot.resource && snapshot.resource.affiliation ?
                                        <dl className="inline-dl clearfix">
                                            <dt><span>ClinGen Affiliation:</span></dt>
                                            <dd>{getAffiliationName(snapshot.resource.affiliation)}</dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-final-approval-submitter">
                                        <dt><span>Approved {snapshot.resourceType === 'classification'? 'Classification' : 'Interpretation'} entered by:</span></dt>
                                        <dd>{snapshot.resource.approvalSubmitter}</dd>
                                    </dl>
                                    {snapshot.resource && snapshot.resource.classificationApprover ?
                                        <dl className="inline-dl clearfix snapshot-final-approval-classification-approver">
                                            <dt><span>Approver:</span></dt>
                                            <dd>{snapshot.resource.classificationApprover}</dd>
                                        </dl>
                                        : null}
                                    <dl className="inline-dl clearfix snapshot-final-approval-date">
                                        <dt><span>Date saved as Approved:</span></dt>
                                        <dd><span>{snapshot.resource.approvalDate ? formatDate(snapshot.resource.approvalDate, "YYYY MMM DD, h:mm a") : null}</span></dd>
                                        {this.renderClassificationStatusTag(snapshot.approvalStatus)}
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-review-date">
                                        <dt><span>Date approved:</span></dt>
                                        <dd><span>{snapshot.resource.approvalReviewDate ? formatDate(snapshot.resource.approvalReviewDate, "YYYY MMM DD") : null}</span></dd>
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
                                        <dt><span>Additional comments:</span></dt>
                                        <dd><span>{snapshot.resource.approvalComment ? snapshot.resource.approvalComment : null}</span></dd>
                                    </dl>
                                </td>
                                <td className="approval-snapshot-buttons">
                                    {this.renderSnapshotStatusIcon(snapshot, 'Approved')}
                                    {renderPublishLinkBool ? this.renderPublishLink(resourceParent, snapshotUUID, false) : null}
                                    <Input type="button" inputClassName={this.renderSnapshotViewSummaryBtn(snapshot, 'Approved')} title="View Approved Summary"
                                        clickHandler={this.viewSnapshotSummary.bind(this, snapshot['@id'], type)} />
                                </td>
                            </tr>
                            {this.renderSnapshotPublishData(snapshot, resourceParent, isApprovalActive, currentApprovedSnapshotID)}
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
    demoVersion: PropTypes.bool
};

export default CurationSnapshots;