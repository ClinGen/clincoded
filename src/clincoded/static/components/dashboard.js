'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { curator_page } from './globals';
import { RestMixin } from './rest';
import { parseAndLogError } from './mixins';
import * as CuratorHistory from './curator_history';
import { showActivityIndicator } from './activity_indicator';
import { sortListByDate } from '../libs/helpers/sort';
import { GetProvisionalClassification } from '../libs/get_provisional_classification';
import { renderVariantTitle } from '../libs/render_variant_title';

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
            userName: props.first_name && props.last_name ? props.first_name + ' ' + props.last_name : '',
            userStatus: props.job_title,
            lastLogin: ''
        });
    },

    /**
     * Method to render status labels/tags for each row of GDMs and Interpretations
     * Called during the rendering of each GDM or Interpretation
     * @param {object} gdm - The GDM object
     * @param {object} interpretation - The Interpretation object
     * @param {object} affiliation - The affiliation object
     * @param {object} session - The session object
     */
    renderClassificationStatusTag(gdm, intepretation, affiliation, session) {
        let status, classification = null, snapshots = [], filteredSnapshots = [];
        if (gdm && Object.keys(gdm).length) {
            // The rendering is for a GDM
            let provisionalClassification = GetProvisionalClassification(gdm, affiliation, session);
            if (provisionalClassification && provisionalClassification.provisionalExist && provisionalClassification.provisional) {
                classification = provisionalClassification.provisional;
                status = classification.classificationStatus;
                snapshots = classification.associatedClassificationSnapshots && classification.associatedClassificationSnapshots.length ? classification.associatedClassificationSnapshots : [];
            }
        } else if (intepretation  && Object.keys(intepretation).length) {
            // The rendering is for an Interpretation
            if (intepretation && intepretation.provisional_variant && intepretation.provisional_variant.length) {
                classification = intepretation.provisional_variant[0];
                status = classification.classificationStatus;
                snapshots = classification.associatedInterpretationSnapshots && classification.associatedInterpretationSnapshots.length ? classification.associatedInterpretationSnapshots : [];
            }
        }
        // Determine whether the classification had been previously approved
        if (snapshots && snapshots.length) {
            // Only interested in knowing the presence of any "Approved" classification
            filteredSnapshots = snapshots.filter(snapshot => snapshot.approvalStatus === 'Approved');
            // The "In progress" label shouldn't be shown after any given number of Provisional/Approval had been saved
            let sortedSnapshots = sortListByDate(snapshots, 'date_created');
            if (status === 'In progress') {
                if (sortedSnapshots[0].approvalStatus === 'Provisioned') {
                    if (filteredSnapshots.length) {
                        return (
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        );
                    } else {
                        return (
                            <span className="classification-status-wrapper">
                                <span className="label label-info">PROVISIONAL</span>
                            </span>
                        );
                    }
                } else if (sortedSnapshots[0].approvalStatus === 'Approved') {
                    return (
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                        </span>
                    );
                }
            } else {
                if (status === 'Provisional') {
                    if (filteredSnapshots.length) {
                        return (
                            <span className="classification-status-wrapper">
                                <span className="label label-success">APPROVED</span>
                                <span className="label label-info"><span className="badge">NEW</span> PROVISIONAL</span>
                            </span>
                        );
                    } else {
                        return (
                            <span className="classification-status-wrapper">
                                <span className="label label-info">PROVISIONAL</span>
                            </span>
                        );
                    }
                } else if (status === 'Approved') {
                    return (
                        <span className="classification-status-wrapper">
                            <span className="label label-success">APPROVED</span>
                        </span>
                    );
                }
            }
        } else {
            if (status && status === 'In progress') {
                return <span className="label label-warning">IN PROGRESS</span>;
            } else {
                return <span className="no-classification">None</span>;
            }
        }
    },

    getData(user) {
        // get 10 gdms and VCI interpretations created by user
        this.getRestDatas([
            '/search/?type=gdm&submitted_by.uuid=' + user.uuid,
            '/search/?type=interpretation&submitted_by.uuid=' + user.uuid
        ], null).then(data => {
            var gdmURLs = [], gdmList = [],
                vciInterpURLs = [], vciInterpList = [];
            // go through GDM results and get their data
            gdmURLs = data[0]['@graph'].map(res => { return res['@id']; });
            if (gdmURLs.length > 0) {
                this.getRestDatas(gdmURLs).then(gdmResults => {
                    gdmResults.map(gdmResult => {
                        if (!gdmResult.affiliation) {
                            gdmList.push({
                                uuid: gdmResult.uuid,
                                gdm: gdmResult,
                                gdmGeneDisease: this.cleanGdmGeneDiseaseName(gdmResult.gene.symbol, gdmResult.disease.term),
                                gdmModel: this.cleanHpoName(gdmResult.modeInheritance),
                                date_created: gdmResult.date_created
                            });
                        }
                    });
                    this.setState({gdmList: gdmList, gdmListLoading: false});
                });
            } else {
                this.setState({gdmListLoading: false});
            }
            // go through VCI interpretation results and get their data
            vciInterpURLs = data[1]['@graph'].map(res => { return res['@id']; });
            if (vciInterpURLs.length > 0) {
                this.getRestDatas(vciInterpURLs).then(vciInterpResults => {
                    vciInterpResults.map(vciInterpResult => {
                        if (!vciInterpResult.affiliation) {
                            vciInterpList.push({
                                uuid: vciInterpResult.uuid,
                                interpretation: vciInterpResult,
                                variantUuid: vciInterpResult.variant.uuid,
                                variant: vciInterpResult.variant,
                                diseaseTerm: vciInterpResult.disease ? vciInterpResult.disease.term : null,
                                modeInheritance: vciInterpResult.modeInheritance ? this.cleanHpoName(vciInterpResult.modeInheritance) : null,
                                date_created: vciInterpResult.date_created
                            });
                        }
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
            '/search/?type=gdm&affiliation=' + affiliation.affiliation_id,
            '/search/?type=interpretation&affiliation=' + affiliation.affiliation_id
        ], null).then(data => {
            let gdmURLs = [], affiliatedGdms = [],
                interpretationURLs = [], affiliatedInterpretations = [];
            // Handle gdm result
            gdmURLs = data[0]['@graph'].map(result => { return result['@id']; });
            if (gdmURLs.length > 0) {
                this.getRestDatas(gdmURLs).then(gdms => {
                    gdms.map(affiliatedGdm => {
                        affiliatedGdms.push({
                            uuid: affiliatedGdm.uuid,
                            gdm: affiliatedGdm,
                            gdmGeneDisease: this.cleanGdmGeneDiseaseName(affiliatedGdm.gene.symbol, affiliatedGdm.disease.term),
                            gdmModel: this.cleanHpoName(affiliatedGdm.modeInheritance),
                            date_created: affiliatedGdm.date_created
                        });
                    });
                    this.setState({affiliatedGdms: affiliatedGdms, affiliatedGdmsLoading: false});
                });
            } else {
                this.setState({affiliatedGdms: affiliatedGdms, affiliatedGdmsLoading: false});
            }
            // Handle interpretations result
            interpretationURLs = data[1]['@graph'].map(result => { return result['@id']; });
            if (interpretationURLs.length > 0) {
                this.getRestDatas(interpretationURLs).then(interpretationRecords => {
                    interpretationRecords.map(interpretation => {
                        affiliatedInterpretations.push({
                            uuid: interpretation.uuid,
                            interpretation: interpretation,
                            variantUuid: interpretation.variant.uuid,
                            variant: interpretation.variant,
                            diseaseTerm: interpretation.disease ? interpretation.disease.term : null,
                            modeInheritance: interpretation.modeInheritance ? this.cleanHpoName(interpretation.modeInheritance) : null,
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

    componentDidMount() {
        let user = this.props.session.user_properties;
        let affiliation = this.props.affiliation;
        if (!affiliation && user) {
            this.setUserData(user);
            this.getData(user);
            this.getHistories(user, 10, null, affiliation).then(histories => {
                if (histories) {
                    let filteredHistories = histories.filter(item => !item.primary.affiliation);
                    this.setState({histories: filteredHistories, historiesLoading: false});
                }
            });
        }
        // Invoke getAffiliatedData() if there is affiliation data
        if (affiliation && Object.keys(affiliation).length) {
            this.getAffiliatedData(affiliation);
            this.getHistories(user, 10, null, affiliation).then(histories => {
                if (histories) {
                    this.setState({histories: histories, historiesLoading: false});
                }
            });
        }
    },

    componentWillReceiveProps(nextProps) {
        let user = nextProps && nextProps.session.user_properties;
        let affiliation = nextProps && nextProps.affiliation;
        // This 'if' condition is true immediately upon user signing-in
        // Fetch data associated with the curator only, especially when the curator is not associated with any affiliations
        if (user && nextProps.href.indexOf('dashboard') > -1 && !_.isEqual(user, this.props.session.user_properties)) {
            this.setUserData(user);
            this.getData(user);
            this.getHistories(user, 10, null, affiliation).then(histories => {
                if (histories) {
                    let filteredHistories = histories.filter(item => !item.primary.affiliation);
                    this.setState({histories: filteredHistories, historiesLoading: false});
                } else {
                    this.setState({histories: [], historiesLoading: false});
                }
            });
        }
        if (affiliation && Object.keys(affiliation).length && !_.isEqual(affiliation, this.props.affiliation)) {
            // Users selects an affiliation, either upon signing-in or from after selecting 'no affiliation'
            // Invoke getAffiliatedData() to fetch data associated with the affiliation
            this.getAffiliatedData(affiliation);
            this.getHistories(user, 10, null, affiliation).then(histories => {
                if (histories) {
                    this.setState({histories: histories, historiesLoading: false});
                } else {
                    this.setState({histories: [], historiesLoading: false});
                }
            });
        } else if (!affiliation && !_.isEqual(affiliation, this.props.affiliation)) {
            // User selects 'no affiliation', either upon signing-in or from  after selecting an affiliation
            // Fetch data associated with the curator only
            this.setUserData(user);
            this.getData(user);
            this.getHistories(user, 10, null, affiliation).then(histories => {
                if (histories) {
                    let filteredHistories = histories.filter(item => !item.primary.affiliation);
                    this.setState({histories: filteredHistories, historiesLoading: false});
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
        const self = this;
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
                                    <th className="item-status">Provisional/Approved Status</th>
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
                                            <td className="item-status">{self.renderClassificationStatusTag(item.gdm, null, this.props.affiliation, this.props.session)}</td>
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
        const self = this;
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Affiliation's Gene-Disease Records *</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.affiliatedGdmsLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table affiliated-evidence-list">
                            <thead>
                                <tr>
                                    <th className="item-name">Gene-Disease Record</th>
                                    <th className="item-status">Provisional/Approved Status</th>
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
                                            <td className="item-status">{self.renderClassificationStatusTag(item.gdm, null, this.props.affiliation, this.props.session)}</td>
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
        const self = this;
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
                                    <th className="item-status">Provisional/Approved Status</th>
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
                                                    <span className="variant-title"><strong>{renderVariantTitle(item.variant)}</strong></span>
                                                </a>
                                            </td>
                                            <td className="item-attribute">{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                            <td className="item-status">{self.renderClassificationStatusTag(null, item.interpretation, this.props.affiliation, this.props.session)}</td>
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
        const self = this;
        return (
            <div className="panel panel-primary">
                <div className="panel-heading">
                    <h3 className="panel-title">My Affiliation's Variant Interpretations *</h3>
                </div>
                <div className="panel-content-wrapper">
                    {this.state.affiliatedInterpretationsLoading ? showActivityIndicator('Loading... ') : null}
                    {records.length > 0 ?
                        <table className="table affiliated-interpretation-list">
                            <thead>
                                <tr>
                                    <th className="item-variant">Variant</th>
                                    <th className="item-attribute">Disease/Mode of Inheritance</th>
                                    <th className="item-status">Provisional/Approved Status</th>
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
                                                    <span className="variant-title"><strong>{renderVariantTitle(item.variant)}</strong></span>
                                                </a>
                                            </td>
                                            <td className="item-attribute">{item.diseaseTerm ? item.diseaseTerm : "--"}/{item.modeInheritance ? item.modeInheritance : "--"}</td>
                                            <td className="item-status">{self.renderClassificationStatusTag(null, item.interpretation, this.props.affiliation, this.props.session)}</td>
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
        // FIXME: Temporarily suppress history items for adding PMIDs or variants as they are affiliation-agnostic
        let filteredHistories = this.state.histories.filter(history => !history.primary['@id'].match(/articles|variants/ig));

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
                                    <a className="help-doc" href="https://github.com/ClinGen/clincoded/wiki/VCI-Curation-Help" title="Variant Curation Help" target="_blank">
                                        <i className="icon icon-question-circle"></i>
                                    </a>
                                </li>
                                <li className="list-group-item"><a href="/interpretations/">View list of all Variant Interpretations</a></li>
                                <li className="list-group-item">
                                    <a href="/create-gene-disease/">Create Gene-Disease Record</a>
                                    <a className="help-doc" href="https://github.com/ClinGen/clincoded/wiki/GCI-Curation-Help" title="Gene Curation Help" target="_blank">
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
                                {filteredHistories.length ?
                                    <ul className="list-group">
                                        {filteredHistories.map(history => {
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
                        {affiliation && Object.keys(affiliation).length ?
                            <div className="alert alert-info">
                                <strong>* Variant interpretations and Gene-Disease records created by this Affiliation.</strong> To create a new
                                Variant Interpretation or Gene-Disease record, use the menu items in the top header. To find an
                                existing Interpretation or Gene-Disease record not created by this Affiliation, use the View All
                                options under "Tools" and filter by desired gene, variant, or disease.
                            </div>
                            : null}
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(Dashboard, 'curator_page', 'dashboard');
