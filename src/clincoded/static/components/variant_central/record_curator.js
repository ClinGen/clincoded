'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { queryKeyValue, external_url_map } from '../globals';
import { getAffiliationName } from '../../libs/get_affiliation_name';

var _ = require('underscore');

import PopOverComponent from '../../libs/bootstrap/popover';

// Display in-progress or provisional interpretations associated with variant
var CurationRecordCurator = module.exports.CurationRecordCurator = createReactClass({
    propTypes: {
        calculatedPathogenicity: PropTypes.string,
        data: PropTypes.object, // ClinVar data payload
        interpretationUuid: PropTypes.string,
        interpretation: PropTypes.object,
        session: PropTypes.object,
        affiliation: PropTypes.object,
        classificationSnapshots: PropTypes.array
    },

    getInitialState() {
        return {
            variant: this.props.data,
            calculatedPathogenicity: this.props.calculatedPathogenicity,
            interpretationUuid: this.props.interpretationUuid,
            interpretation: this.props.interpretation ? this.props.interpretation : null, // parent interpretation object
            classificationSnapshots: this.props.classificationSnapshots
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
        if (nextProps.classificationSnapshots) {
            this.setState({classificationSnapshots: nextProps.classificationSnapshots});
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
     * Method to display classification tag/label in the interpretation header
     * @param {string} status - The status of a given classification in an interpretation
     */
    renderClassificationStatusTag(status) {
        let snapshots = this.state.classificationSnapshots;
        let filteredSnapshots = [];
        // Determine whether the classification had been previously approved
        if (snapshots && snapshots.length) {
            filteredSnapshots = snapshots.filter(snapshot => {
                return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === 'interpretation';
            });
        }
        if (status === 'In progress') {
            return <span className="label label-warning">IN PROGRESS</span>;
        } else if (status === 'Provisional') {
            if (filteredSnapshots.length) {
                return (
                    <span><span className="label label-success">APPROVED</span><span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span></span>
                );
            } else {
                return <span className="label label-info">PROVISIONAL</span>;
            }
        } else if (status === 'Approved') {
            return <span className="label label-success">APPROVED</span>;
        }
    },

    /**
     * Method to render the header of a given classification in the interpretation header
     * @param {object} classification - A given classification in an interpretation
     */
    renderClassificationHeader(classification) {
        return (
            <div className="header-classification">
                <strong>Status:</strong>
                <span className="classification-status">
                    {classification && classification[0].classificationStatus ?
                        this.renderClassificationStatusTag(classification[0].classificationStatus)
                        :
                        this.renderClassificationStatusTag('In progress')
                    }
                </span>
            </div>
        );
    },

    render() {
        let variant = this.props.data;
        let session = this.props.session;
        let recordHeader = this.props.recordHeader;
        let interpretationUuid = this.state.interpretationUuid;
        let affiliation = this.props.affiliation;

        let sortedInterpretations = variant && variant.associatedInterpretations && variant.associatedInterpretations.length ? this.getInterpretations(variant, session, affiliation) : null;
        let myInterpretation = this.state.interpretation ? this.state.interpretation
            : (sortedInterpretations && sortedInterpretations.affiliatedInterpretation ? sortedInterpretations.affiliatedInterpretation
                : (sortedInterpretations && sortedInterpretations.myInterpretation ? sortedInterpretations.myInterpretation : null));
        let otherInterpretations = sortedInterpretations && sortedInterpretations.otherInterpretations.length ? sortedInterpretations.otherInterpretations : null;
        let calculatedPathogenicity = this.state.calculatedPathogenicity ? this.state.calculatedPathogenicity
            : (myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length ? myInterpretation.provisional_variant[0].autoClassification : 'None');
        let modifiedPathogenicity = myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length && myInterpretation.provisional_variant[0].alteredClassification ?
            myInterpretation.provisional_variant[0].alteredClassification : 'None';

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {interpretationUuid ?
                        <div className="clearfix">
                            <h4>My Interpretation</h4>
                            {myInterpretation ?
                                <div className="current-user-interpretations">
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
                                            <span>Not associated</span>
                                        }
                                    </div>
                                    <div><strong>Calculated Pathogenicity:</strong> {calculatedPathogenicity}</div>
                                    <div><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity}</div>
                                    {myInterpretation.provisional_variant ? this.renderClassificationHeader(myInterpretation.provisional_variant) : null}
                                    <div><strong>Last Edited:</strong> {moment(myInterpretation.last_modified).format("YYYY MMM DD, h:mm a")}</div>
                                </div>
                                : null}
                        </div>
                        :
                        <div className="clearfix">
                            <h4>All Existing Interpretations</h4>
                            {myInterpretation ?
                                <table className="login-users-interpretations">
                                    <tbody>
                                        <tr>
                                            <td>
                                                {myInterpretation.disease ? <strong>{myInterpretation.disease.term}</strong> : <strong>No disease</strong>}
                                                {myInterpretation.modeInheritance ?
                                                    <span>-
                                                        {myInterpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                                            <i>{myInterpretation.modeInheritance}</i>
                                                            :
                                                            <i>{myInterpretation.modeInheritance.substr(0, myInterpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                                                        }
                                                        ,&nbsp;
                                                    </span>
                                                    :
                                                    <span>, </span>
                                                }
                                                <span className="no-broken-item">{myInterpretation.affiliation ? getAffiliationName(myInterpretation.affiliation) : myInterpretation.submitted_by.title},</span>&nbsp;
                                                <span className="no-broken-item">
                                                    <i>{myInterpretation.provisional_variant && myInterpretation.provisional_variant[0].alteredClassification ?
                                                        ': ' + myInterpretation.provisional_variant[0].alteredClassification : null},&nbsp;</i>
                                                </span>
                                                <span className="no-broken-item">
                                                    last edited: {moment(myInterpretation.last_modified).format("YYYY MMM DD, h:mm a")}
                                                </span>
                                                {myInterpretation.provisional_variant ? this.renderClassificationHeader(myInterpretation.provisional_variant) : null}
                                            </td>
                                            <td className="icon-box">
                                                <a className="continue-interpretation" href="#" onClick={this.goToInterpretationPage} title="Edit interpretation">
                                                    <i className="icon icon-pencil-square large-icon"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                : null}
                            {otherInterpretations && otherInterpretations.length ?
                                <div className="col-lg-12 other-users-interpretations">
                                    {otherInterpretations.map(function(interpretation, i) {
                                        return (
                                            <dl key={i}>
                                                <dd>
                                                    {interpretation.disease ? <strong>{interpretation.disease.term}</strong> : <strong>No disease</strong>}
                                                    {interpretation.modeInheritance ?
                                                        <span>-
                                                            {interpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                                                <i>{interpretation.modeInheritance}</i>
                                                                :
                                                                <i>{interpretation.modeInheritance.substr(0, interpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                                                            }
                                                        , </span>
                                                        :
                                                        ', '
                                                    }
                                                    <span className="no-broken-item">
                                                        {interpretation.affiliation ?
                                                            <span>{getAffiliationName(interpretation.affiliation)}</span>
                                                            :
                                                            <a href={'mailto:' + interpretation.submitted_by.email}>{interpretation.submitted_by.title }</a>
                                                        }
                                                    </span>
                                                    <span>,&nbsp;</span>
                                                    <span className="no-broken-item">
                                                        <i>{interpretation.provisional_variant && interpretation.provisional_variant[0].alteredClassification ?
                                                            ': ' + interpretation.provisional_variant[0].alteredClassification : null},&nbsp;</i>
                                                    </span>
                                                    last edited: {moment(interpretation.last_modified).format("YYYY MMM DD, h:mm a")}
                                                    {interpretation.provisional_variant ? this.renderClassificationHeader(interpretation.provisional_variant) : null}
                                                </dd>
                                            </dl>
                                        );
                                    })}
                                </div>
                                : null}
                        </div>
                    }
                </div>
            </div>
        );
    }
});
