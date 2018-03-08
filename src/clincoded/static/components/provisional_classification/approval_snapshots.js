'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';

class ApprovalSnapshots extends Component {
    constructor(props) {
        super(props);
    }

    viewSnapshotClassificationMatrix(snapshotId, e) {
        e.preventDefault(); e.stopPropagation();
        const snapshotUuid = snapshotId.slice(11, -1);
        window.open('/provisional-classification/?snapshot=' + snapshotUuid, '_blank');
    }

    viewSnapshotEvidenceSummary(snapshotId, e) {
        e.preventDefault(); e.stopPropagation();
        const snapshotUuid = snapshotId.slice(11, -1);
        window.open('/gene-disease-evidence-summary/?snapshot=' + snapshotUuid, '_blank');
    }

    /**
     * Method to render provisioned classification snapshots in table rows
     * @param {object} snapshot - A saved copy of a provisioned classification and its parent GDM
     */
    renderApprovalSnapshot(snapshot) {
        if (snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'classification') {
            return (
                <tr className="approval-snapshot-item" key={snapshot['@id']}>
                    <td className="approval-snapshot-content">
                        {snapshot.resource && snapshot.resource.affiliation ?
                            <dl className="inline-dl clearfix">
                                <dt><span>ClinGen Affiliation:</span></dt>
                                <dd>{getAffiliationName(snapshot.resource.affiliation)}</dd>
                            </dl>
                            : null}
                        <dl className="inline-dl clearfix snapshot-final-approval-submitter">
                            <dt><span>Approved Classification entered by:</span></dt>
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
                            <dd><span>{snapshot.resource.approvalDate ? formatDate(snapshot.resource.approvalDate, "YYYY MMM DD") : null}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-final-review-date">
                            <dt><span>Date reviewed:</span></dt>
                            <dd><span>{snapshot.resource.approvalReviewDate ? formatDate(snapshot.resource.approvalReviewDate, "YYYY MMM DD") : null}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-approval-classification">
                            <dt><span>Saved Classification:</span></dt>
                            <dd><span>{snapshot.resource.alteredClassification ? <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-approval-comment">
                            <dt><span>Additional comments:</span></dt>
                            <dd><span>{snapshot.resource.approvalComment ? snapshot.resource.approvalComment : null}</span></dd>
                        </dl>
                    </td>
                    <td className="approval-snapshot-buttons">
                        <Input type="button" inputClassName="btn-primary" title="Classification Matrix" clickHandler={this.viewSnapshotClassificationMatrix.bind(this, snapshot.uuid)} />
                        <Input type="button" inputClassName="btn-primary" title="Evidence Summary" clickHandler={this.viewSnapshotEvidenceSummary.bind(this, snapshot.uuid)} />
                    </td>
                </tr>
            );
        }
    }

    render() {
        const { snapshots } = this.props;

        return (
            <table className="table final-approval-snapshot-list">
                <tbody>
                    {snapshots.map(snapshot => this.renderApprovalSnapshot(snapshot))}
                </tbody>
            </table>
        );
    }
}

ApprovalSnapshots.propTypes = {
    snapshots: PropTypes.array
};

export default ApprovalSnapshots;