'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { external_url_map } from '../globals';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { renderSimpleStatusLabel } from '../../libs/render_simple_status_label';
import { getClassificationSavedDate } from '../../libs/get_saved_date';
import { sopVersionByScoring } from '../../libs/sop';

class GeneDiseaseEvidenceSummaryHeader extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { gdm, provisional, snapshotPublishDate } = this.props;
        // Expecting the required fields of a GDM to always have values:
        // e.g. gene, disease, mode of inheritance
        const gene = gdm && gdm.gene, disease = gdm && gdm.disease;
        const modeInheritance = gdm && gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];
        const modeInheritanceAdjective = gdm && gdm.modeInheritanceAdjective ? gdm.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        const publishStatus = provisional.publishClassification || snapshotPublishDate ? true : false;
        const publishDate = provisional.publishDate ? provisional.publishDate : snapshotPublishDate;
        const curationApprovers = provisional.curationApprovers ? provisional.curationApprovers.sort() : null;
        const curationContributors = provisional.curationContributors ? provisional.curationContributors.sort() : null;

        return (
            <div className="evidence-summary panel-header">
                <h1>Evidence Summary</h1>
                <div className="panel panel-primary">
                    <div className="panel-heading">
                        <h3 className="panel-title">
                            {gene && gene.symbol ? gene.symbol : null} – {disease && disease.term ? disease.term : null} – <i>{modeInheritanceAdjective ? modeInheritance + ' (' + modeInheritanceAdjective + ')' : modeInheritance}</i>
                        </h3>
                    </div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix col-sm-6">
                            <dt>Classification owner:</dt>
                            <dd className="summaryOwnerName">
                                {provisional.affiliation ?
                                    getAffiliationName(provisional.affiliation)
                                    :
                                    (provisional && provisional.submitted_by ? provisional.submitted_by.title : null)
                                }
                            </dd>
                            {curationApprovers && curationApprovers.length ? 
                                <div>
                                    <dt>Curation approvers:</dt>
                                    <dd>{curationApprovers.join(', ')}</dd>
                                </div>
                            : null}
                            {curationContributors && curationContributors.length ? 
                                <div>
                                    <dt>Curation contributors:</dt>
                                    <dd>{curationContributors.join(', ')}</dd>
                                </div>
                            : null}
                            <dt>Calculated classification:</dt>
                            <dd className="classificationSaved">{provisional ? provisional.autoClassification : null}</dd>
                            <dt>Modified classification:</dt>
                            <dd className="classificationModified">
                                {provisional && provisional.alteredClassification ? (provisional.alteredClassification === 'No Selection' ? 'None' : provisional.alteredClassification) : null}
                            </dd>
                            <dt>Reason for modified classification:</dt>
                            <dd className="classificationModifiedReason">
                                {provisional && provisional.reasons ? provisional.reasons : 'None'}
                            </dd>
                            <dt>SOP:</dt>
                            <dd className="classificationSOP">
                                <a href="https://www.clinicalgenome.org/curation-activities/gene-disease-validity/educational-and-training-materials/standard-operating-procedures/" target="_blank"
                                    >Gene Clinical Validity Standard Operating Procedures (SOP), Version {sopVersionByScoring(provisional.classificationPoints)}</a>
                            </dd>
                        </dl>
                        <dl className="inline-dl clearfix col-sm-6">
                            <dt>Classification status:</dt>
                            <dd className="classificationStatus">{provisional && provisional.classificationStatus ? renderSimpleStatusLabel(provisional.classificationStatus, publishStatus) : null}</dd>
                            {provisional ?
                                <div>
                                    <dt>Date classification saved:</dt>
                                    <dd className="classificationSaved">{provisional.last_modified ? moment(getClassificationSavedDate(provisional)).format("YYYY MMM DD, h:mm a") : null}</dd>
                                </div>
                                : null}
                            {publishStatus && publishDate ?
                                <div>
                                    <dt>Date classification published:</dt>
                                    <dd className="classificationPublished">{moment(publishDate).format("YYYY MMM DD, h:mm a")}</dd>
                                </div>
                                : null}
                            <dt>Replication Over Time:</dt>
                            <dd className="classification-replicated-over-time">{provisional && provisional.replicatedOverTime ? <span>Yes</span> : <span>No</span>}</dd>
                            <dt>Contradictory Evidence?</dt>
                            <dd className="contradictory-evidence">
                                Proband: <strong>{provisional && provisional.contradictingEvidence && provisional.contradictingEvidence.proband ? <span className='emphasis'>Yes</span> : <span>No</span>}</strong>,&nbsp;
                                Experimental: <strong>{provisional && provisional.contradictingEvidence && provisional.contradictingEvidence.experimental ? <span className='emphasis'>Yes</span> : <span>No</span>}</strong>
                            </dd>
                            <dt>Disease:</dt>
                            <dd className="disease-term">{disease && disease.term ? <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank">{disease.term}</a> : null}</dd>
                        </dl>
                    </div>
                </div>
                <div className="panel panel-primary record-summary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Evidence Summary</h3>
                    </div>
                    <div className="panel-body">
                        <p>
                            {provisional && provisional.evidenceSummary && provisional.evidenceSummary.length ?
                                provisional.evidenceSummary : 'No summary is provided.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryHeader.propTypes = {
    gdm: PropTypes.object,
    provisional: PropTypes.object,
    snapshotPublishDate: PropTypes.string
};

export default GeneDiseaseEvidenceSummaryHeader;