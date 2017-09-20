'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { userMatch } from '../globals';

class GeneDiseaseEvidenceSummaryHeader extends Component {
    constructor(props) {
        super(props);
    }

    /**
     * Method to find the saved classification belonging to the currently logged-in user
     * @param {array} classifications - provisional classifications saved by individual curators
     * @param {object} session - user session in the browser
     */
    findClassification(classifications, session) {
        let provisional;
        if (classifications.length) {
            classifications.forEach(item => {
                if (userMatch(item.submitted_by, session)) {
                    provisional = item;
                }
            });
        }
        return provisional;
    }

    render() {
        const gdm = this.props.gdm, session = this.props.session;
        // Expecting the required fields of a GDM to always have values:
        // e.g. gene, disease, mode of inheritance
        const gene = gdm && gdm.gene,
            disease = gdm && gdm.disease,
            modeInheritance = gdm && gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];
        const modeInheritanceAdjective = gdm && gdm.modeInheritanceAdjective ? gdm.modeInheritanceAdjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null;
        // Provisional classification array may have 0 length
        // if none of the curators have saved their individual summaries
        const provisionalClassifications = gdm && gdm.provisionalClassifications && gdm.provisionalClassifications.length ? gdm.provisionalClassifications : [];
        const provisional = this.findClassification(provisionalClassifications, session);

        return (
            <div className="evidence-summary panel-header">
                <h1>Evidence Summary</h1>
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">
                            {gene && gene.symbol ? gene.symbol : null} – {disease && disease.term ? disease.term : null} – <i>{modeInheritanceAdjective ? modeInheritance + ' (' + modeInheritanceAdjective + ')' : modeInheritance}</i>
                        </h3>
                    </div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix col-sm-6">
                            <dt>Summary owner:</dt>
                            <dd className="summaryOwnerName">{session && session.user_properties ? session.user_properties.title : null}</dd>
                            <dt>Calculated Provisional classification:</dt>
                            <dd className="provisionalClassificationSaved">{provisional ? provisional.autoClassification : null}</dd>
                            <dt>Modified Provisional Classification:</dt>
                            <dd className="provisionalClassificationModified">
                                {provisional && provisional.alteredClassification ? (provisional.alteredClassification === 'No Selection' ? 'None' : provisional.alteredClassification) : null}
                            </dd>
                        </dl>
                        <dl className="inline-dl clearfix col-sm-6">
                            <dt>Date Provisional classification saved:</dt>
                            <dd className="provisionalClassificationSaved">{provisional ? moment(provisional.last_modified).format("YYYY MMM DD, h:mm a") : null}</dd>
                            <dt>Status:</dt>
                            <dd className="provisionalClassificationStatus">{gdm && gdm.status ? gdm.status : null}</dd>
                        </dl>
                    </div>
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryHeader.propTypes = {
    gdm: PropTypes.object,
    session: PropTypes.object
};

export default GeneDiseaseEvidenceSummaryHeader;