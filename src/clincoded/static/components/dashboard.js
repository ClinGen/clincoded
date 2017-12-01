'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { curator_page, userMatch, external_url_map } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';
import * as CuratorHistory from './curator_history';
import { showActivityIndicator } from './activity_indicator';
import { findNonEmptyArray } from '../libs/helpers/find_array';

var fetched = require('./fetched');

var Dashboard = createReactClass({
    mixins: [RestMixin, CuratorHistory],

    propTypes: {
        session: PropTypes.object,
        href: PropTypes.string,
        affiliation: PropTypes.object
    },

    getInitialState: function() {
        return {
            userName: '',
            userStatus: '',
            lastLogin: '',
            gdmListLoading: true,
            vciInterpListLoading: true,
            historiesLoading: true,
            gdmList: [],
            vciInterpList: [],
            histories: [],
            affiliatedGroupEvidence: [],
            affiliatedFamilyEvidence: [],
            affiliatedIndividualEvidence: [],
            affiliatedCaseControlEvidence: [],
            affiliatedExperimentalEvidence: [],
            affiliatedInterpretations: []
        };
    },

    cleanGdmGeneDiseaseName: function(gene, disease) {
        return gene + "–" + disease;
    },

    cleanHpoName: function(term) {
        // remove (HP:#######) from model name
        return term.indexOf('(') > -1 ? term.substring(0, term.indexOf('(') - 1) : term;
    },

    setUserData: function(props) {
        // sets the display name and curator status
        this.setState({
            userName: props.first_name,
            userStatus: props.job_title,
            lastLogin: ''
        });
    },

    getData: function(session) {
        // get 10 gdms and VCI interpretations created by user
        this.getRestDatas([
            '/search/?type=gdm&submitted_by.uuid=' + session.user_properties.uuid,
            '/search/?type=interpretation&submitted_by.uuid=' + session.user_properties.uuid
        ], null).then(data => {
            var gdmURLs = [], gdmList = [],
                vciInterpURLs = [], vciInterpList = [];
            // go through GDM results and get their data
            gdmURLs = data[0]['@graph'].map(res => { return res['@id']; });
            if (gdmURLs.length > 0) {
                this.getRestDatas(gdmURLs, null, true).then(gdmResults => {
                    gdmResults.map(gdmResult => {
                        gdmList.push({
                            uuid: gdmResult.uuid,
                            gdmGeneDisease: this.cleanGdmGeneDiseaseName(gdmResult.gene.symbol, gdmResult.disease.term),
                            gdmModel: this.cleanHpoName(gdmResult.modeInheritance),
                            status: gdmResult.gdm_status,
                            date_created: gdmResult.date_created
                        });
                    });
                    this.setState({gdmList: gdmList, gdmListLoading: false});
                });
            } else {
                this.setState({gdmListLoading: false});
            }
            // go through VCI interpretation results and get their data
            vciInterpURLs = data[1]['@graph'].map(res => { return res['@id']; });
            if (vciInterpURLs.length > 0) {
                this.getRestDatas(vciInterpURLs, null, true).then(vciInterpResults => {
                    vciInterpResults.map(vciInterpResult => {
                        vciInterpList.push({
                            uuid: vciInterpResult.uuid,
                            variantUuid: vciInterpResult.variant.uuid,
                            clinvarVariantTitle: vciInterpResult.variant.clinvarVariantTitle,
                            hgvsName37: vciInterpResult.variant.hgvsNames && vciInterpResult.variant.hgvsNames.GRCh37 ? vciInterpResult.variant.hgvsNames.GRCh37 : null,
                            hgvsName38: vciInterpResult.variant.hgvsNames && vciInterpResult.variant.hgvsNames.GRCh38 ? vciInterpResult.variant.hgvsNames.GRCh38 : null,
                            diseaseTerm: vciInterpResult.disease ? vciInterpResult.disease.term : null,
                            modeInheritance: vciInterpResult.modeInheritance ? this.cleanHpoName(vciInterpResult.modeInheritance) : null,
                            status: vciInterpResult.interpretation_status,
                            date_created: vciInterpResult.date_created
                        });
                    });
                    this.setState({vciInterpList: vciInterpList, vciInterpListLoading: false});
                });
            } else {
                this.setState({vciInterpListLoading: false});
            }
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    /**
     * Find all evidence (e.g. group, family, individual, case-control, experimental) and
     * variant interpretations associated with the affiliation and group them to different arrays
     * @param {object} affiliation - User-selected affiliation data
     */
    getAffiliatedData(affiliation) {
        this.getRestDatas([
            '/search/?type=group&affiliation=' + affiliation.affiliation_id,
            '/search/?type=family&affiliation=' + affiliation.affiliation_id,
            '/search/?type=individual&affiliation=' + affiliation.affiliation_id,
            '/search/?type=caseControl&affiliation=' + affiliation.affiliation_id,
            '/search/?type=experimental&affiliation=' + affiliation.affiliation_id,
            '/search/?type=interpretation&affiliation=' + affiliation.affiliation_id
        ], null).then(data => {
            let groupEvidenceURLs = [], affiliatedGroupEvidence = [],
                familyEvidenceURLs = [], affiliatedFamilyEvidence = [],
                individualEvidenceURLs = [], affiliatedIndividualEvidence = [],
                casecontrolEvidenceURLs = [], affiliatedCaseControlEvidence = [],
                experimentalEvidenceURLs = [], affiliatedExperimentalEvidence = [],
                interpretationURLs = [], affiliatedInterpretations = [];
            // Handle group evidence result
            groupEvidenceURLs = data[0]['@graph'].map(result => { return result['@id']; });
            if (groupEvidenceURLs.length > 0) {
                this.getRestDatas(groupEvidenceURLs, null, true).then(evidenceRecords => {
                    evidenceRecords.map(evidence => {
                        let annotation = findNonEmptyArray(evidence, 'associatedAnnotations'),
                            gdm = annotation.associatedGdm[0];
                        affiliatedGroupEvidence.push({
                            uuid: evidence.uuid,
                            annotationUuid: annotation.uuid,
                            gdmUuid: gdm.uuid,
                            geneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                            modeOfInheritance: this.cleanHpoName(gdm.modeInheritance),
                            label: evidence.label,
                            submitted_by: evidence.submitted_by.title,
                            date_created: evidence.date_created
                        });
                    });
                    this.setState({affiliatedGroupEvidence: affiliatedGroupEvidence});
                });
            }
            // Handle family evidence result
            familyEvidenceURLs = data[1]['@graph'].map(result => { return result['@id']; });
            if (familyEvidenceURLs.length > 0) {
                this.getRestDatas(familyEvidenceURLs, null, true).then(evidenceRecords => {
                    evidenceRecords.map(evidence => {
                        let annotation = findNonEmptyArray(evidence, 'associatedAnnotations'),
                            gdm = annotation.associatedGdm[0];
                        affiliatedFamilyEvidence.push({
                            uuid: evidence.uuid,
                            annotationUuid: annotation.uuid,
                            gdmUuid: gdm.uuid,
                            geneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                            modeOfInheritance: this.cleanHpoName(gdm.modeInheritance),
                            label: evidence.label,
                            submitted_by: evidence.submitted_by.title,
                            date_created: evidence.date_created
                        });
                    });
                    this.setState({affiliatedFamilyEvidence: affiliatedFamilyEvidence});
                });
            }
            // Handle individual evidence result
            individualEvidenceURLs = data[2]['@graph'].map(result => { return result['@id']; });
            if (individualEvidenceURLs.length > 0) {
                this.getRestDatas(individualEvidenceURLs, null, true).then(evidenceRecords => {
                    evidenceRecords.map(evidence => {
                        let annotation = findNonEmptyArray(evidence, 'associatedAnnotations'),
                            gdm = annotation.associatedGdm[0];
                        affiliatedIndividualEvidence.push({
                            uuid: evidence.uuid,
                            annotationUuid: annotation.uuid,
                            gdmUuid: gdm.uuid,
                            geneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                            modeOfInheritance: this.cleanHpoName(gdm.modeInheritance),
                            label: evidence.label,
                            submitted_by: evidence.submitted_by.title,
                            date_created: evidence.date_created
                        });
                    });
                    this.setState({affiliatedIndividualEvidence: affiliatedIndividualEvidence});
                });
            }
            // Handle case-control evidence result
            casecontrolEvidenceURLs = data[3]['@graph'].map(result => { return result['@id']; });
            if (casecontrolEvidenceURLs.length > 0) {
                this.getRestDatas(casecontrolEvidenceURLs, null, true).then(evidenceRecords => {
                    evidenceRecords.map(evidence => {
                        let annotation = findNonEmptyArray(evidence, 'associatedAnnotations'),
                            gdm = annotation.associatedGdm[0];
                        affiliatedCaseControlEvidence.push({
                            uuid: evidence.uuid,
                            caseCohortUuid: evidence.caseCohort.uuid,
                            controlCohortUuid: evidence.controlCohort.uuid,
                            annotationUuid: annotation.uuid,
                            gdmUuid: gdm.uuid,
                            geneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                            modeOfInheritance: this.cleanHpoName(gdm.modeInheritance),
                            label: evidence.label,
                            submitted_by: evidence.submitted_by.title,
                            date_created: evidence.date_created
                        });
                    });
                    this.setState({affiliatedCaseControlEvidence: affiliatedCaseControlEvidence});
                });
            }
            // Handle experimental evidence result
            experimentalEvidenceURLs = data[4]['@graph'].map(result => { return result['@id']; });
            if (experimentalEvidenceURLs.length > 0) {
                this.getRestDatas(experimentalEvidenceURLs, null, true).then(evidenceRecords => {
                    evidenceRecords.map(evidence => {
                        let annotation = findNonEmptyArray(evidence, 'associatedAnnotations'),
                            gdm = annotation.associatedGdm[0];
                        affiliatedExperimentalEvidence.push({
                            uuid: evidence.uuid,
                            annotationUuid: annotation.uuid,
                            gdmUuid: gdm.uuid,
                            geneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                            modeOfInheritance: this.cleanHpoName(gdm.modeInheritance),
                            label: evidence.label,
                            submitted_by: evidence.submitted_by.title,
                            date_created: evidence.date_created
                        });
                    });
                    this.setState({affiliatedExperimentalEvidence: affiliatedExperimentalEvidence});
                });
            }
            // Handle interpretations result
            interpretationURLs = data[5]['@graph'].map(result => { return result['@id']; });
            if (interpretationURLs.length > 0) {
                this.getRestDatas(interpretationURLs, null, true).then(interpretationRecords => {
                    interpretationRecords.map(interpretation => {
                        affiliatedInterpretations.push({
                            uuid: interpretation.uuid,
                            variantUuid: interpretation.variant.uuid,
                            clinvarVariantTitle: interpretation.variant.clinvarVariantTitle,
                            hgvsName37: interpretation.variant.hgvsNames && interpretation.variant.hgvsNames.GRCh37 ? interpretation.variant.hgvsNames.GRCh37 : null,
                            hgvsName38: interpretation.variant.hgvsNames && interpretation.variant.hgvsNames.GRCh38 ? interpretation.variant.hgvsNames.GRCh38 : null,
                            diseaseTerm: interpretation.disease ? interpretation.disease.term : null,
                            modeInheritance: interpretation.modeInheritance ? this.cleanHpoName(interpretation.modeInheritance) : null,
                            status: interpretation.interpretation_status,
                            submitted_by: interpretation.submitted_by.title,
                            date_created: interpretation.date_created
                        });
                    });
                    this.setState({affiliatedInterpretations: affiliatedInterpretations});
                });
            }
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    componentDidMount: function() {
        if (this.props.session.user_properties) {
            this.setUserData(this.props.session.user_properties);
            this.getData(this.props.session);
        }
        // Invoke getAffiliatedData() if there is affiliation data
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            this.getAffiliatedData(this.props.affiliation);
        }
        this.getHistories(this.props.session.user_properties, 10).then(histories => {
            if (histories) {
                this.setState({histories: histories, historiesLoading: false});
            }
        });
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.session.user_properties && nextProps.href.indexOf('dashboard') > -1 && !_.isEqual(nextProps.session.user_properties, this.props.session.user_properties)) {
            this.setUserData(nextProps.session.user_properties);
            this.getData(nextProps.session);
            this.getHistories(nextProps.session.user_properties, 10).then(histories => {
                if (histories) {
                    this.setState({histories: histories, historiesLoading: false});
                }
            });
        }
        // Invoke getAffiliatedData() if there is new affiliation data
        if (nextProps.affiliation && Object.keys(nextProps.affiliation).length && !_.isEqual(nextProps.affiliation, this.props.affiliation)) {
            this.getAffiliatedData(nextProps.affiliation);
        }
    },

    /**
     * Method to render individual evidence table
     * @param {array} records - Individual curation evidence
     */
    renderIndividualRecords(records) {
        return (
            <div className="panel panel-info">
                <div className="panel-heading">
                    <h3 className="panel-title">Your Gene-Disease Records</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.gdmListLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table affiliated-evidence-list">
                            <thead>
                                <tr>
                                    <th className="item-name">Gene-Disease Record</th>
                                    <th className="item-status">Status</th>
                                    <th className="item-timestamp">Creation Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(item => {
                                    return (
                                        <tr key={item.uuid}>
                                            <td>
                                                <a key={item.uuid} className="affiliated-record-link" href={"/curation-central/?gdm=" + item.uuid}>
                                                    <div><span className="block-link-color title-ellipsis"><strong>{item.gdmGeneDisease}</strong>–<i>{item.gdmModel}</i></span></div>
                                                </a>
                                            </td>
                                            <td>{item.status}</td>
                                            <td>{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body"><p>You have not created any Gene-Disease-Mode of Inheritance entries.</p></div>
                    }
                </div>
            </div>
        );
    },

    /**
     * Method to render affiliated evidence table
     * @param {array} records - Affiliated curation evidence
     * @param {string} uri - Page location such as /group-curation or /family-curation
     * @param {string} title - Table title
     * @param {string} type - Param in links to affiliated evidence
     */
    renderAffiliatedRecords(records, uri, title, type) {
        return (
            <div className="panel panel-info">
                <div className="panel-heading">
                    <h3 className="panel-title">{title} evidence associated with your affiliation</h3>
                </div>
                <table className="table affiliated-evidence-list">
                    <thead>
                        <tr>
                            <th className="item-name">Name</th>
                            <th className="item-attribute">Gene-Disease Record</th>
                            <th className="item-author">Submitted By</th>
                            <th className="item-timestamp">Creation Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(item => {
                            return (
                                <tr key={item.uuid}>
                                    <td>
                                        <a key={item.uuid}
                                            className="affiliated-record-link"
                                            href={"/" + uri + "/?editsc&gdm=" + item.gdmUuid + "&evidence=" + item.annotationUuid + "&" + type + "=" + item.uuid + (type === 'casecontrol' ? "&casecohort=" + item.caseCohortUuid + "&controlcohort=" + item.controlCohortUuid : '')}>
                                            <div><span className="block-link-color title-ellipsis"><strong>{item.label}</strong></span></div>
                                        </a>
                                    </td>
                                    <td><strong>{item.geneDisease}</strong>–<i>{item.modeOfInheritance}</i></td>
                                    <td>{item.submitted_by}</td>
                                    <td>{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    },

    /**
     * Method to render individual variant interpretations table
     * @param {array} records - Individual variant interpretations
     */
    renderIndividualInterpretations(records) {
        return (
            <div className="panel panel-info">
                <div className="panel-heading">
                    <h3 className="panel-title">Your Variant Interpretations</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.vciInterpListLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table affiliated-interpretation-list">
                            <thead>
                                <tr>
                                    <th className="item-name">Name</th>
                                    <th className="item-attribute">Disease/Mode of Inheritance</th>
                                    <th className="item-author">Status</th>
                                    <th className="item-timestamp">Creation Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(item => {
                                    return (
                                        <tr key={item.uuid}>
                                            <td>
                                                <a key={item.uuid}
                                                    className="affiliated-record-link"
                                                    href={"/variant-central/?edit=true&variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                                    <div><span className="block-link-color title-ellipsis"><strong>
                                                        {item.clinvarVariantTitle
                                                            ? item.clinvarVariantTitle
                                                            : (item.hgvsName38 ? item.hgvsName38 : item.hgvsName37)
                                                        }
                                                    </strong></span></div>
                                                </a>
                                            </td>
                                            <td>{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                            <td>{item.status}</td>
                                            <td>{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body"><p>You have not created any variant interpretations.</p></div>
                    }
                </div>
            </div>
        );
    },

    /**
     * Method to render affiliated variant interpretations table
     * @param {array} records - affiliated variant interpretations
     */
    renderAffiliatedInterpretations(records) {
        return (
            <div className="panel panel-info">
                <div className="panel-heading">
                    <h3 className="panel-title">Variant interpretations associated with your affiliation</h3>
                </div>
                <table className="table affiliated-interpretation-list">
                    <thead>
                        <tr>
                            <th className="item-name">Name</th>
                            <th className="item-attribute">Disease/Mode of Inheritance</th>
                            <th className="item-author">Submitted By</th>
                            <th className="item-timestamp">Creation Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(item => {
                            return (
                                <tr key={item.uuid}>
                                    <td>
                                        <a key={item.uuid}
                                            className="affiliated-record-link"
                                            href={"/variant-central/?edit=true&variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                            <div><span className="block-link-color title-ellipsis"><strong>
                                                {item.clinvarVariantTitle
                                                    ? item.clinvarVariantTitle
                                                    : (item.hgvsName38 ? item.hgvsName38 : item.hgvsName37)
                                                }
                                            </strong></span></div>
                                        </a>
                                    </td>
                                    <td>{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                    <td>{item.submitted_by}</td>
                                    <td>{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    },

    render: function() {
        return (
            <div className="container">
                {this.props.affiliation && Object.keys(this.props.affiliation).length ? null : <h1>Welcome, {this.state.userName}!</h1>}
                <div className="row affiliated-records-container">
                    {/*/ Left pane /*/}
                    <div className="col-md-4">
                        <div className="panel panel-primary">
                            <div className="panel-heading">
                                <h3 className="panel-title">Tools</h3>
                            </div>
                            <ul className="list-group">
                                <li className="list-group-item">
                                    <a href="/select-variant/">Select Variant for Variant Curation</a>
                                    <a className="help-doc" href="/static/help/clingen-variant-curation-help.pdf" title="Variant Curation Help" target="_blank">
                                        <i className="icon icon-question-circle"></i>
                                    </a>
                                </li>
                                <li className="list-group-item"><a href="/interpretations/">View list of all Variant Interpretations</a></li>
                                <li className="list-group-item">
                                    <a href="/create-gene-disease/">Create Gene-Disease Record</a>
                                    <a className="help-doc" href="/static/help/clingen-gene-curation-help.pdf" title="Gene Curation Help" target="_blank">
                                        <i className="icon icon-question-circle"></i>
                                    </a>
                                </li>
                                <li className="list-group-item"><a href="/gdm/">View list of all Gene-Disease Records</a></li>
                            </ul>
                        </div>
                        <div className="panel panel-info">
                            <div className="panel-heading">
                                <h3 className="panel-title">Your Recent History</h3>
                            </div>
                            <div className="panel-content-wrapper">
                                {this.state.historiesLoading ? showActivityIndicator('Loading... ') : null}
                                {this.state.histories.length ?
                                    <ul className="list-group">
                                        {this.state.histories.map(history => {
                                            // Call the history display view based on the primary object
                                            var HistoryView = this.getHistoryView(history);
                                            return <li key={history.uuid} className="list-group-item"><HistoryView history={history} user={this.props.session && this.props.session.user_properties} /></li>;
                                        })}
                                    </ul>
                                    :
                                    <div className="panel-body"><p>You have no activity to display.</p></div>
                                }
                            </div>
                        </div>
                    </div>
                    {/*/ Right pane /*/}
                    <div className="col-md-8">
                        {this.renderIndividualInterpretations(this.state.vciInterpList)}
                        {this.renderIndividualRecords(this.state.gdmList)}
                        {this.state.affiliatedGroupEvidence.length > 0 ?
                            this.renderAffiliatedRecords(this.state.affiliatedGroupEvidence, 'group-curation', 'Group', 'group')
                            : null}
                        {this.state.affiliatedFamilyEvidence.length > 0 ?
                            this.renderAffiliatedRecords(this.state.affiliatedFamilyEvidence, 'family-curation', 'Family', 'family')
                            : null}
                        {this.state.affiliatedIndividualEvidence.length > 0 ?
                            this.renderAffiliatedRecords(this.state.affiliatedIndividualEvidence, 'individual-curation', 'Individual', 'individual')
                            : null}
                        {this.state.affiliatedCaseControlEvidence.length > 0 ?
                            this.renderAffiliatedRecords(this.state.affiliatedCaseControlEvidence, 'case-control-curation', 'Case-Control', 'casecontrol')
                            : null}
                        {this.state.affiliatedExperimentalEvidence.length > 0 ?
                            this.renderAffiliatedRecords(this.state.affiliatedExperimentalEvidence, 'experimental-curation', 'Experimental', 'experimental')
                            : null}
                        {this.state.affiliatedInterpretations.length > 0 ?
                            this.renderAffiliatedInterpretations(this.state.affiliatedInterpretations)
                            : null}
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(Dashboard, 'curator_page', 'dashboard');
