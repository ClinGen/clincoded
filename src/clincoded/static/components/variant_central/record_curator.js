'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { queryKeyValue, external_url_map } from '../globals';
import PopOverComponent from '../../libs/bootstrap/popover';
import { renderInProgressStatus } from '../../libs/render_in_progress_status';
import { renderNewSummaryStatus } from '../../libs/render_new_summary_status';
import { renderProvisionalStatus } from '../../libs/render_provisional_status';
import { renderApprovalStatus } from '../../libs/render_approval_status';
import { renderNewProvisionalStatus } from '../../libs/render_new_provisional_status';
import { renderPublishStatus } from '../../libs/render_publish_status';
import { getClassificationSavedDate } from '../../libs/get_saved_date';

// Display in-progress or provisional interpretations associated with variant
var CurationRecordCurator = module.exports.CurationRecordCurator = createReactClass({
    propTypes: {
        calculatedPathogenicity: PropTypes.string,
        data: PropTypes.object, // ClinVar data payload
        interpretationUuid: PropTypes.string,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        affiliation: PropTypes.object
    },

    getInitialState() {
        return {
            variant: this.props.data,
            calculatedPathogenicity: this.props.calculatedPathogenicity,
            interpretationUuid: this.props.interpretationUuid,
            interpretation: this.props.interpretation ? this.props.interpretation : null // parent interpretation object
        };
    },

    componentWillReceiveProps(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation, interpretationUuid: nextProps.interpretationUuid});
        }
        if (typeof nextProps.calculatedPathogenicity !== undefined && nextProps.calculatedPathogenicity !== this.props.calculatedPathogenicity) {
            this.setState({calculatedPathogenicity: nextProps.calculatedPathogenicity});
        }
    },

    // Sort interpretation array, and move current user's as the first element
    getInterpretations(data, session, affiliation) {
        let myInterpretation = null, affiliatedInterpretation = null;
        let otherInterpretations = [];
        if (data && data.associatedInterpretations && data.associatedInterpretations.length) {
            for (let interpretation of data.associatedInterpretations) {
                if (interpretation.affiliation && affiliation && interpretation.affiliation === affiliation.affiliation_id) {
                    affiliatedInterpretation = interpretation;
                } else if (!interpretation.affiliation && !affiliation && interpretation.submitted_by.uuid === session.user_properties.uuid) {
                    myInterpretation = interpretation;
                } else {
                    otherInterpretations.push(interpretation);
                }
            }
        }
        return {
            affiliatedInterpretation: affiliatedInterpretation,
            myInterpretation: myInterpretation,
            otherInterpretations: otherInterpretations
        };
    },

    goToInterpretationPage(e) {
        e.preventDefault(); e.stopPropagation();

        let interpretationData = this.getInterpretations(this.props.data, this.props.session, this.props.affiliation);
        let uuid = interpretationData.affiliatedInterpretation ? interpretationData.affiliatedInterpretation.uuid : interpretationData.myInterpretation.uuid;
        let selectedTab = queryKeyValue('tab', window.location.href);
        let selectedSubtab = queryKeyValue('subtab', window.location.href);
        let url = '/variant-central/?edit=true&variant=' + this.props.data.uuid + '&interpretation=' + uuid + (selectedTab ? '&tab=' + selectedTab : '') + (selectedSubtab ? '&subtab=' + selectedSubtab : '');
        window.location.href = url;
    },

    /**
     * Method to render the interpretation status tag/label in the interpretation header
     * @param {object} classification - A given classification associated with an interpretation
     */
    renderClassificationStatusTag(classification) {
        let snapshots = classification.associatedInterpretationSnapshots && classification.associatedInterpretationSnapshots.length ? classification.associatedInterpretationSnapshots : [];
        // Render the status labels given an array of snapshots
        if (snapshots && snapshots.length) {
            return (
                <span className="classification-status-wrapper">
                    {renderProvisionalStatus(snapshots, 'interpretation')}
                    {renderApprovalStatus(snapshots, 'interpretation')}
                    {renderNewProvisionalStatus(snapshots, 'interpretation')}
                    {renderPublishStatus(snapshots)}
                </span>
            );
        } else {
            return (
                <span className="classification-status-wrapper">
                    {renderInProgressStatus(classification)}
                </span>
            );
        }
    },

    /**
     * Method to render the header of a given classification in the interpretation header
     * @param {object} classification - A given classification in an interpretation
     */
    renderMyInterpretationStatus(classification) {
        return (
            <div className="header-classification">
                <strong>Provisional/Approved Status:</strong>
                <span className="classification-status">
                    {classification && classification[0].classificationStatus ?
                        this.renderClassificationStatusTag(classification[0])
                        :
                        <span className="no-classification">None</span>
                    }
                </span>
            </div>
        );
    },

    renderSummaryStatus(classification) {
        if (classification && classification[0].classificationStatus && classification[0].classificationStatus === 'In progress') {
            return <span className="summary-status"><span className="label label-info">NEW SAVED SUMMARY</span></span>;
        }
    },

    render() {
        let variant = this.props.data;
        let session = this.props.session;
        let interpretationUuid = this.state.interpretationUuid;
        let affiliation = this.props.affiliation;

        let sortedInterpretations = variant && variant.associatedInterpretations && variant.associatedInterpretations.length ? this.getInterpretations(variant, session, affiliation) : null;
        let myInterpretation = this.state.interpretation ? this.state.interpretation
            : (sortedInterpretations && sortedInterpretations.affiliatedInterpretation ? sortedInterpretations.affiliatedInterpretation
                : (sortedInterpretations && sortedInterpretations.myInterpretation ? sortedInterpretations.myInterpretation : null));
        let calculatedPathogenicity = this.state.calculatedPathogenicity ? this.state.calculatedPathogenicity
            : (myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length ? myInterpretation.provisional_variant[0].autoClassification : 'None');
        let modifiedPathogenicity = myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length && myInterpretation.provisional_variant[0].alteredClassification ?
            myInterpretation.provisional_variant[0].alteredClassification : 'Not provided';
        let self = this;

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    <div className="clearfix">
                        <h4>My Interpretation</h4>
                        {myInterpretation ?
                            <table className="login-users-interpretations current-user-interpretations">
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="associated-disease"><strong>Disease:</strong>&nbsp;
                                                {myInterpretation && myInterpretation.disease ?
                                                    <span>
                                                        {myInterpretation.disease.term}
                                                        <span>&nbsp;</span>
                                                        {!myInterpretation.disease.freetext ? 
                                                            <span>
                                                                (
                                                                <a href={external_url_map['MondoSearch'] + myInterpretation.disease.diseaseId} target="_blank">{myInterpretation.disease.diseaseId.replace('_', ':')}</a>
                                                                {myInterpretation.disease.description && myInterpretation.disease.description.length ?
                                                                    <span><span>,&nbsp;</span>
                                                                        <PopOverComponent popOverWrapperClass="interpretation-disease-description"
                                                                            actuatorTitle="View definition" popOverRef={ref => (this.popoverDesc = ref)}>
                                                                            {myInterpretation.disease.description}
                                                                        </PopOverComponent>
                                                                    </span>
                                                                    : null}
                                                                )
                                                            </span>
                                                            :
                                                            <span>
                                                                (
                                                                {myInterpretation.disease.phenotypes && myInterpretation.disease.phenotypes.length ?
                                                                    <PopOverComponent popOverWrapperClass="gdm-disease-phenotypes"
                                                                        actuatorTitle="View HPO term(s)" popOverRef={ref => (this.popoverPhenotypes = ref)}>
                                                                        {myInterpretation.disease.phenotypes.join(', ')}
                                                                    </PopOverComponent>
                                                                    : null}
                                                                {myInterpretation.disease.description && myInterpretation.disease.description.length ?
                                                                    <span>{myInterpretation.disease.phenotypes && myInterpretation.disease.phenotypes.length ? <span>,&nbsp;</span> : null}
                                                                        <PopOverComponent popOverWrapperClass="interpretation-disease-description"
                                                                            actuatorTitle="View definition" popOverRef={ref => (this.popoverDesc = ref)}>
                                                                            {myInterpretation.disease.description}
                                                                        </PopOverComponent>
                                                                    </span>
                                                                    : null}
                                                                )
                                                            </span>
                                                        }
                                                    </span>
                                                    :
                                                    <span>Not provided</span>
                                                }
                                            </div>
                                            <div><strong>Calculated Pathogenicity:</strong> {calculatedPathogenicity}</div>
                                            <div><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity}</div>
                                            {myInterpretation.provisional_variant ?
                                                this.renderMyInterpretationStatus(myInterpretation.provisional_variant)
                                                :
                                                <div className="header-classification"><strong>Provisional/Approved Status:</strong><span>&nbsp;{renderInProgressStatus()}</span></div>
                                            }
                                            <div>
                                                {myInterpretation.provisional_variant && myInterpretation.provisional_variant.length ?
                                                    <span>
                                                        <span><strong>Interpretation Last Saved:</strong> {moment(getClassificationSavedDate(myInterpretation.provisional_variant[0])).format("YYYY MMM DD, h:mm a")}</span>
                                                        {renderNewSummaryStatus(myInterpretation.provisional_variant[0])}
                                                    </span>
                                                    : null}
                                            </div>
                                        </td>
                                        {!interpretationUuid ?
                                            <td className="icon-box">
                                                <a className="continue-interpretation" href="#" onClick={this.goToInterpretationPage} title="Edit interpretation">
                                                    <i className="icon icon-pencil-square large-icon"></i>
                                                </a>
                                            </td>
                                            : null}
                                    </tr>
                                </tbody>
                            </table>
                            : null}
                    </div>
                </div>
            </div>
        );
    }
});
