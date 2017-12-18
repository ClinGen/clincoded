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
import * as curator from './curator';

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
            affiliatedGdms: [],
            affiliatedGdmsLoading: true,
            affiliatedInterpretations: [],
            affiliatedInterpretationsLoading: true
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
            '/search/?type=gdm',
            '/search/?type=interpretation&affiliation=' + affiliation.affiliation_id
        ], null).then(data => {
            let gdmURLs = [], affiliatedGdms = [],
                interpretationURLs = [], affiliatedInterpretations = [];
            // Handle gdm result
            gdmURLs = data[0]['@graph'].map(result => { return result['@id']; });
            if (gdmURLs.length > 0) {
                this.getRestDatas(gdmURLs, null, true).then(gdms => {
                    let affiliatedGdmList = curator.findAffiliatedGdms(gdms, affiliation.affiliation_id);
                    if (affiliatedGdmList.length) {
                        affiliatedGdmList.map(affiliatedGdm => {
                            affiliatedGdms.push({
                                uuid: affiliatedGdm.uuid,
                                gdmGeneDisease: this.cleanGdmGeneDiseaseName(affiliatedGdm.gene.symbol, affiliatedGdm.disease.term),
                                gdmModel: this.cleanHpoName(affiliatedGdm.modeInheritance),
                                status: affiliatedGdm.gdm_status,
                                date_created: affiliatedGdm.date_created
                            });
                        });
                        this.setState({affiliatedGdms: affiliatedGdms, affiliatedGdmsLoading: false});
                    } else {
                        this.setState({affiliatedGdms: affiliatedGdms, affiliatedGdmsLoading: false});
                    }
                });
            } else {
                this.setState({affiliatedGdms: affiliatedGdms, affiliatedGdmsLoading: false});
            }
            // Handle interpretations result
            interpretationURLs = data[1]['@graph'].map(result => { return result['@id']; });
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
                            modified_by: interpretation.modified_by ? interpretation.modified_by.title : interpretation.submitted_by.title,
                            date_created: interpretation.date_created
                        });
                    });
                    this.setState({affiliatedInterpretations: affiliatedInterpretations, affiliatedInterpretationsLoading: false});
                });
            } else {
                this.setState({affiliatedInterpretations: affiliatedInterpretations, affiliatedInterpretationsLoading: false});
            }
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    componentDidMount: function() {
        let affiliation = this.props.affiliation;
        if (this.props.session.user_properties) {
            this.setUserData(this.props.session.user_properties);
            this.getData(this.props.session);
            this.getHistories(this.props.session.user_properties, 10, null, affiliation).then(histories => {
                if (histories) {
                    let filteredHistories = histories.filter(item => !item.primary.affiliation);
                    this.setState({histories: filteredHistories, historiesLoading: false});
                }
            });
        }
        // Invoke getAffiliatedData() if there is affiliation data
        if (affiliation && Object.keys(affiliation).length) {
            this.getAffiliatedData(affiliation);
            this.getHistories(this.props.session.user_properties, 10, null, affiliation).then(histories => {
                if (histories) {
                    this.setState({histories: histories, historiesLoading: false});
                }
            });
        }
    },

    componentWillReceiveProps: function(nextProps) {
        let affiliation = nextProps && nextProps.affiliation;
        if (nextProps.session.user_properties && nextProps.href.indexOf('dashboard') > -1 && !_.isEqual(nextProps.session.user_properties, this.props.session.user_properties)) {
            this.setUserData(nextProps.session.user_properties);
            this.getData(nextProps.session);
            this.getHistories(nextProps.session.user_properties, 10, null, affiliation).then(histories => {
                if (histories) {
                    let filteredHistories = histories.filter(item => !item.primary.affiliation);
                    this.setState({histories: filteredHistories, historiesLoading: false});
                } else {
                    this.setState({histories: [], historiesLoading: false});
                }
            });
        }
        // Invoke getAffiliatedData() if there is new affiliation data
        if (affiliation && Object.keys(affiliation).length && !_.isEqual(affiliation, this.props.affiliation)) {
            this.getAffiliatedData(affiliation);
            this.getHistories(nextProps.session.user_properties, 10, null, affiliation).then(histories => {
                if (histories) {
                    this.setState({histories: histories, historiesLoading: false});
                } else {
                    this.setState({histories: [], historiesLoading: false});
                }
            });
        }
    },

    /**
     * Method to render individual evidence table
     * @param {array} records - Individual curation evidence
     */
    renderIndividualRecords(records) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Gene-Disease Records</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.gdmListLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table individual-record-list">
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
                                            <td className="item-name">
                                                <a key={item.uuid} className="individual-record-link" href={"/curation-central/?gdm=" + item.uuid}>
                                                    <span className="gdm-record-label"><strong>{item.gdmGeneDisease}</strong>–<i>{item.gdmModel}</i></span>
                                                </a>
                                            </td>
                                            <td className="item-status">{item.status}</td>
                                            <td className="item-timestamp">{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
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
     */
    renderAffiliatedGdms(records) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Affiliation's Gene-Disease Records</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.affiliatedGdmsLoading ? showActivityIndicator('Loading... ') : null}
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
                                            <td className="item-name">
                                                <a key={item.uuid} className="affiliated-record-link" href={"/curation-central/?gdm=" + item.uuid}>
                                                    <span className="gdm-record-label"><strong>{item.gdmGeneDisease}</strong>–<i>{item.gdmModel}</i></span>
                                                </a>
                                            </td>
                                            <td className="item-status">{item.status}</td>
                                            <td className="item-timestamp">{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body"><p>Your affiliation has not created any Gene-Disease-Mode of Inheritance entries.</p></div>
                    }
                </div>
            </div>
        );
    },

    /**
     * Method to render individual variant interpretations table
     * @param {array} records - Individual variant interpretations
     */
    renderIndividualInterpretations(records) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Variant Interpretations</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.vciInterpListLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table individual-interpretation-list">
                            <thead>
                                <tr>
                                    <th className="item-variant">Variant</th>
                                    <th className="item-attribute">Disease/Mode of Inheritance</th>
                                    <th className="item-status">Status</th>
                                    <th className="item-timestamp">Creation Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(item => {
                                    return (
                                        <tr key={item.uuid}>
                                            <td className="item-variant">
                                                <a key={item.uuid}
                                                    className="individual-record-link"
                                                    href={"/variant-central/?edit=true&variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                                    <span className="variant-title"><strong>
                                                        {item.clinvarVariantTitle
                                                            ? item.clinvarVariantTitle
                                                            : (item.hgvsName38 ? item.hgvsName38 : item.hgvsName37)
                                                        }
                                                    </strong></span>
                                                </a>
                                            </td>
                                            <td className="item-attribute">{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                            <td className="item-status">{item.status}</td>
                                            <td className="item-timestamp">{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
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
     * @param {array} records - Affiliated variant interpretations
     */
    renderAffiliatedInterpretations(records) {
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Affiliation's Variant Interpretations</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.affiliatedInterpretationsLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table affiliated-interpretation-list">
                            <thead>
                                <tr>
                                    <th className="item-variant">Variant</th>
                                    <th className="item-attribute">Disease/Mode of Inheritance</th>
                                    <th className="item-status">Status</th>
                                    <th className="item-timestamp">Creation Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(item => {
                                    return (
                                        <tr key={item.uuid}>
                                            <td className="item-variant">
                                                <a key={item.uuid}
                                                    className="affiliated-record-link"
                                                    href={"/variant-central/?edit=true&variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                                    <span className="variant-title"><strong>
                                                        {item.clinvarVariantTitle
                                                            ? item.clinvarVariantTitle
                                                            : (item.hgvsName38 ? item.hgvsName38 : item.hgvsName37)
                                                        }
                                                    </strong></span>
                                                </a>
                                            </td>
                                            <td className="item-attribute">{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                            <td className="item-status">{item.status}</td>
                                            <td className="item-timestamp">{moment(item.date_created).format("YYYY MMM DD, h:mm a")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        :
                        <div className="panel-body"><p>Your affiliation has not created any variant interpretations.</p></div>
                    }
                </div>
            </div>
        );
    },

    render() {
        let affiliation = this.props.affiliation;

        return (
            <div className="container">
                {affiliation && Object.keys(affiliation).length ?
                    <h2>Welcome, {affiliation.affiliation_fullname}!</h2>
                    :
                    <h2>Welcome, {this.state.userName}!</h2>
                }
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
                        <div className="panel panel-primary">
                            <div className="panel-heading">
                                <h3 className="panel-title">Recent History</h3>
                            </div>
                            <div className="panel-content-wrapper">
                                {this.state.historiesLoading ? showActivityIndicator('Loading... ') : null}
                                {this.state.histories.length ?
                                    <ul className="list-group">
                                        {this.state.histories.map(history => {
                                            // Call the history display view based on the primary object
                                            var HistoryView = this.getHistoryView(history);
                                            return (
                                                <li key={history.uuid} className="list-group-item">
                                                    <HistoryView history={history} user={this.props.session && this.props.session.user_properties} />
                                                </li>
                                            );
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
                        {affiliation && Object.keys(affiliation).length ?
                            this.renderAffiliatedInterpretations(this.state.affiliatedInterpretations)
                            : this.renderIndividualInterpretations(this.state.vciInterpList)}
                        {affiliation && Object.keys(affiliation).length ?
                            this.renderAffiliatedGdms(this.state.affiliatedGdms)
                            : this.renderIndividualRecords(this.state.gdmList)}
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(Dashboard, 'curator_page', 'dashboard');
