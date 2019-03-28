'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { external_url_map } from '../globals';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { renderSelectedModeInheritance } from '../../libs/render_mode_inheritance';
import { renderVariantTitle } from '../../libs/render_variant_title';
import { renderSimpleStatusLabel } from '../../libs/render_simple_status_label';
import { getClassificationSavedDate } from '../../libs/get_saved_date';

class VariantInterpretationSummaryHeader extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { interpretation, classification } = this.props;
        const variant = interpretation && interpretation.variant, disease = interpretation && interpretation.disease;
        let clinVarId = variant && variant.clinvarVariantId ? variant.clinvarVariantId : null;
        let carId = variant && variant.carId ? variant.carId : null;
        const publishStatus = classification ? classification.publishClassification : false;
        const publishDate = classification ? classification.publishDate : null;

        return (
            <div className="evidence-summary panel-header">
                <h1>Evaluation Summary</h1>
                <div className="panel panel-primary">
                    <div className="panel-heading">
                        <h3 className="panel-title">{renderVariantTitle(variant)}</h3>
                    </div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix col-sm-6">
                            {clinVarId ?
                                <dd><strong>ClinVar VariationID:</strong>&nbsp;&nbsp;<a href={external_url_map['ClinVarSearch'] + clinVarId} target="_blank">{clinVarId}</a>&nbsp;&nbsp;</dd>
                                : null}
                            {carId ?
                                <dd><strong>ClinGen Allele Registry ID:</strong>&nbsp;&nbsp;<a href={'http://reg.genome.network/allele/' + carId + '.html'} target="_blank">{carId}</a></dd>
                                : null}
                            <dt>Interpretation owner:</dt>
                            <dd className="summaryOwnerName">
                                {interpretation && interpretation.affiliation ?
                                    getAffiliationName(interpretation.affiliation)
                                    :
                                    (interpretation && interpretation.submitted_by ? interpretation.submitted_by.title : null)
                                }
                            </dd>
                            <dt>Calculated Pathogenicity:</dt>
                            <dd className="classificationSaved">{classification ? classification.autoClassification : null}</dd>
                            <dt>Modified Pathogenicity:</dt>
                            <dd className="classificationModified">
                                {classification && classification.alteredClassification ? (classification.alteredClassification === 'No Selection' ? 'None' : classification.alteredClassification) : 'None'}
                            </dd>
                            <dt>Reason for modified pathogenicity:</dt>
                            <dd className="classificationModifiedReason">
                                {classification && classification.reason ? classification.reason : 'None'}
                            </dd>
                        </dl>
                        <dl className="inline-dl clearfix col-sm-6">
                            <dt>Interpretation status:</dt>
                            <dd className="classificationStatus">{classification && classification.classificationStatus ? renderSimpleStatusLabel(classification.classificationStatus, publishStatus) : null}</dd>
                            {classification ?
                                <div>
                                    <dt>Date interpretation saved:</dt>
                                    <dd className="classificationSaved">{moment(getClassificationSavedDate(classification)).format("YYYY MMM DD, h:mm a")}</dd>
                                </div>
                                : null}
                            {publishStatus && publishDate ?
                                <div>
                                    <dt>Date interpretation published:</dt>
                                    <dd className="classificationPublished">{moment(publishDate).format("YYYY MMM DD, h:mm a")}</dd>
                                </div>
                                : null}
                            <dt>Disease:</dt>
                            <dd className="disease-term">{disease && disease.term ? <a href={external_url_map['MondoSearch'] + disease.diseaseId} target="_blank">{disease.term}</a> : 'None'}</dd>
                            <dt>Mode of Inheritance:</dt>
                            <dd className="modeInheritance">{renderSelectedModeInheritance(interpretation)}</dd>
                        </dl>
                    </div>
                </div>
                <div className="panel panel-primary record-summary">
                    <div className="panel-heading">
                        <h3 className="panel-title">Evidence Summary</h3>
                    </div>
                    <div className="panel-body">
                        <p>
                            {classification && classification.evidenceSummary && classification.evidenceSummary.length ?
                                classification.evidenceSummary : 'No summary is provided.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}

VariantInterpretationSummaryHeader.propTypes = {
    interpretation: PropTypes.object,
    classification: PropTypes.object
};

export default VariantInterpretationSummaryHeader;