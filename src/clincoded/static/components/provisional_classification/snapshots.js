'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { Input } from '../../libs/bootstrap/form';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { renderSelectedModeInheritance } from '../../libs/render_mode_inheritance';
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
     * Method to render snapshots in table rows
     * @param {object} snapshot - A saved copy of a provisioned/approved classification and its parent GDM/Interpretation
     */
    renderSnapshot(snapshot) {
        const type = snapshot.resourceType;

        if (snapshot.approvalStatus === 'Provisioned') {
            return (
                <li className="snapshot-item list-group-item" key={snapshot['@id']} data-status={snapshot.approvalStatus}>
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
                                        <dt><span>{type === 'interpretation' ? 'Saved Pathogenicity:' : 'Saved Classification:'}</span></dt>
                                        <dd><span>{snapshot.resource.alteredClassification ? <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-disease">
                                        <dt><span>Disease:</span></dt>
                                        <dd className="disease-term">{snapshot.resourceParent && snapshot.resourceParent.disease && snapshot.resourceParent.disease.term ? snapshot.resourceParent.disease.term : 'None'}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-modeInheritance">
                                        <dt><span>Mode of Inheritance:</span></dt>
                                        <dd className="modeInheritance">{renderSelectedModeInheritance(snapshot.resourceParent)}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-provisional-approval-comment">
                                        <dt><span>Additional comments:</span></dt>
                                        <dd><span>{snapshot.resource.provisionalComment ? snapshot.resource.provisionalComment : null}</span></dd>
                                    </dl>
                                </td>
                                <td className="approval-snapshot-buttons">
                                    <Input type="button" inputClassName="btn-primary" title="View Provisional Summary" clickHandler={this.viewSnapshotSummary.bind(this, snapshot['@id'], type)} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </li>
            );
        } else if (snapshot.approvalStatus === 'Approved') {
            return (
                <li className="snapshot-item list-group-item" key={snapshot['@id']} data-status={snapshot.approvalStatus}>
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
                                    <dl className="inline-dl clearfix snapshot-final-approval-classification">
                                        <dt><span>{type === 'interpretation' ? 'Saved Pathogenicity:' : 'Saved Classification:'}</span></dt>
                                        <dd><span>{snapshot.resource.alteredClassification ? <span>{snapshot.resource.alteredClassification} (modified)</span> : snapshot.resource.autoClassification}</span></dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-disease">
                                        <dt><span>Disease:</span></dt>
                                        <dd className="disease-term">{snapshot.resourceParent && snapshot.resourceParent.disease && snapshot.resourceParent.disease.term ? snapshot.resourceParent.disease.term : 'None'}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-modeInheritance">
                                        <dt><span>Mode of Inheritance:</span></dt>
                                        <dd className="modeInheritance">{renderSelectedModeInheritance(snapshot.resourceParent)}</dd>
                                    </dl>
                                    <dl className="inline-dl clearfix snapshot-final-approval-comment">
                                        <dt><span>Additional comments:</span></dt>
                                        <dd><span>{snapshot.resource.approvalComment ? snapshot.resource.approvalComment : null}</span></dd>
                                    </dl>
                                </td>
                                <td className="approval-snapshot-buttons">
                                    <Input type="button" inputClassName="btn-primary" title="View Approved Summary" clickHandler={this.viewSnapshotSummary.bind(this, snapshot['@id'], type)} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </li>
            );
        }
    }

    render() {
        const { snapshots } = this.props;

        return (
            <div className="snapshot-list panel panel-default">
                <ul className="list-group">
                    {snapshots.map(snapshot => this.renderSnapshot(snapshot))}
                </ul>
            </div>
        );
    }
}

CurationSnapshots.propTypes = {
    snapshots: PropTypes.array
};

export default CurationSnapshots;