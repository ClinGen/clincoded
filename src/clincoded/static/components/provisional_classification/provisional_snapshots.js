'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import DayPickerInput from 'react-day-picker/DayPickerInput';
import MomentLocaleUtils, { formatDate, parseDate } from 'react-day-picker/moment';

class ProvisionalSnapshots extends Component {
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
    renderProvisionalSnapshot(snapshot) {
        if (snapshot.approvalStatus === 'Provisioned' && snapshot.resourceType === 'classification') {
            return (
                <tr className="approval-snapshot-item" key={snapshot['@id']}>
                    <td className="approval-snapshot-content">
                        {snapshot.resource && snapshot.resource.affiliation ?
                            <dl className="inline-dl clearfix">
                                <dt><span>ClinGen Affiliation:</span></dt>
                                <dd>{getAffiliationName(snapshot.resource.affiliation)}</dd>
                            </dl>
                            : null}
                        <dl className="inline-dl clearfix snapshot-provisional-approval-submitter">
                            <dt><span>Provisional Classification entered by:</span></dt>
                            <dd>{snapshot.resource.provisionalSubmitter}</dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-approval-date">
                            <dt><span>Date saved as Provisional:</span></dt>
                            <dd><span>{snapshot.resource.provisionalDate ? formatDate(snapshot.resource.provisionalDate, "YYYY MMM DD") : null}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-review-date">
                            <dt><span>Date reviewed:</span></dt>
                            <dd><span>{snapshot.resource.provisionalReviewDate ? formatDate(snapshot.resource.provisionalReviewDate, "YYYY MMM DD") : null}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-approval-classification">
                            <dt><span>Saved Classification:</span></dt>
                            <dd><span>{snapshot.resource.alteredClassification ? <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}</span></dd>
                        </dl>
                        <dl className="inline-dl clearfix snapshot-provisional-approval-comment">
                            <dt><span>Additional comments:</span></dt>
                            <dd><span>{snapshot.resource.provisionalComment ? snapshot.resource.provisionalComment : null}</span></dd>
                        </dl>
                    </td>
                    <td className="approval-snapshot-buttons">
                        <Input type="button" inputClassName="btn-primary" title="Classification Matrix" clickHandler={this.viewSnapshotClassificationMatrix.bind(this, snapshot['@id'])} />
                        <Input type="button" inputClassName="btn-primary" title="Evidence Summary" clickHandler={this.viewSnapshotEvidenceSummary.bind(this, snapshot['@id'])} />
                    </td>
                </tr>
            );
        }
    }

    render() {
        const { snapshots } = this.props;

        return (
            <table className="table provisional-approval-snapshot-list">
                <tbody>
                    {snapshots.map(snapshot => this.renderProvisionalSnapshot(snapshot))}
                </tbody>
            </table>
        );
    }
}

ProvisionalSnapshots.propTypes = {
    snapshots: PropTypes.array
};

export default ProvisionalSnapshots;