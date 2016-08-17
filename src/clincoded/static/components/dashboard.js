'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('./globals');
var fetched = require('./fetched');
var form = require('../libs/bootstrap/form');
var panel = require('../libs/bootstrap/panel');
var parseAndLogError = require('./mixins').parseAndLogError;
var RestMixin = require('./rest').RestMixin;
var CuratorHistory = require('./curator_history');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Panel = panel.Panel;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;

var Dashboard = React.createClass({
    mixins: [RestMixin, CuratorHistory],

    getInitialState: function() {
        return {
            userName: '',
            userStatus: '',
            lastLogin: '',
            gdmList: [],
            vciInterpList: [],
            histories: []
        };
    },

    cleanGdmGeneDiseaseName: function(gene, disease) {
        return gene + "–" + disease;
    },

    cleanGdmModelName: function(model) {
        // remove (HP:#######) from model name
        return model.indexOf('(') > -1 ? model.substring(0, model.indexOf('(') - 1) : model;
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
        // Retrieve all GDMs and other objects related to user via search
        this.getRestDatas([
            '/search/?type=gdm&limit=10&submitted_by.uuid=' + session.user_properties.uuid,
            '/search/?type=interpretation&limit=10&submitted_by.uuid=' + session.user_properties.uuid
        ],
            null)
        .then(data => {
            // Search objects successfully retrieved; process results
            // GDM results; finds GDMs created by user, and also creates PMID-GDM mapping table
            // (stopgap measure until article -> GDM mapping ability is incorporated)
            var gdmList = [],
                vciInterpList = [],
                tempRecentHistory = [];
            var gdmURLs = data[0]['@graph'].map(res => { return res['@id']; });
            this.getRestDatas(gdmURLs, null, true).then(gdmResults => {
                gdmResults.map(gdmResult => {
                    gdmList.push({
                        uuid: gdmResult.uuid,
                        gdmGeneDisease: this.cleanGdmGeneDiseaseName(gdmResult.gene.symbol, gdmResult.disease.term),
                        gdmModel: this.cleanGdmModelName(gdmResult.modeInheritance),
                        status: gdmResult.gdm_status,
                        date_created: gdmResult.date_created
                    });
                });
                this.setState({gdmList: gdmList});
            });
            var vciInterpURLs = data[1]['@graph'].map(res => { return res['@id']; });
            this.getRestDatas(vciInterpURLs, null, true).then(vciInterpResults => {
                vciInterpResults.map(vciInterpResult => {
                    vciInterpList.push({
                        uuid: vciInterpResult.uuid,
                        variantUuid: vciInterpResult.variant.uuid,
                        clinvarVariantTitle: vciInterpResult.variant.clinvarVariantTitle,
                        hgvsName37: vciInterpResult.variant.hgvsNames && vciInterpResult.variant.hgvsNames.GRCh37 ? vciInterpResult.variant.hgvsNames.GRCh37 : null,
                        hgvsName38: vciInterpResult.variant.hgvsNames && vciInterpResult.variant.hgvsNames.GRCh38 ? vciInterpResult.variant.hgvsNames.GRCh38 : null,
                        diseaseTerm: vciInterpResult.disease ? vciInterpResult.disease.term : null,
                        date_created: vciInterpResult.date_created
                    });
                });
                this.setState({vciInterpList: vciInterpList});
            });
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    componentDidMount: function() {
        if (this.props.session.user_properties) {
            this.setUserData(this.props.session.user_properties);
            this.getData(this.props.session);
        }
        this.getHistories(this.props.session.user_properties, 10).then(histories => {
            if (histories) {
                this.setState({histories: histories});
            }
        });
    },

    componentWillReceiveProps: function(nextProps) {
        if (typeof nextProps.session.user_properties !== undefined && nextProps.session.user_properties != this.props.session.user_properties) {
            this.setUserData(nextProps.session.user_properties);
            this.getData(nextProps.session);
            this.getHistories(this.props.session.user_properties, 10).then(histories => {
                if (histories) {
                    this.setState({histories: histories});
                }
            });
        }
    },

    render: function() {
        return (
            <div className="container">
                <h1>Welcome, {this.state.userName}!</h1>
                <h4>Your status: {this.state.userStatus}</h4>
                <div className="row">
                    <div className="col-md-6">
                        <Panel panelClassName="panel-dashboard">
                            <h3>Tools</h3>
                            <ul>
                                <li><a href="/select-variant/">Select Variant for Variant Curation</a></li>
                                <li><a href="/create-gene-disease/">Create Gene-Disease Record</a></li>
                                <li><a href="/gdm/">View list of all Gene-Disease Records</a></li>
                            </ul>
                        </Panel>
                        <Panel panelClassName="panel-dashboard">
                            <h3>Your Recent History</h3>
                            {this.state.histories.length ?
                                <ul>
                                    {this.state.histories.map(history => {
                                        // Call the history display view based on the primary object
                                        var HistoryView = this.getHistoryView(history);
                                        return <li key={history.uuid}><HistoryView history={history} user={this.props.session && this.props.session.user_properties} /></li>;
                                    })}
                                </ul>
                            :
                                <li>You have no activity to display.</li>
                            }
                        </Panel>
                    </div>
                    <div className="col-md-6">
                        <Panel panelClassName="panel-dashboard">
                            <h3>Your Variant Interpretations</h3>
                            {this.state.vciInterpList.length > 0 ?
                            <ul>
                                {this.state.vciInterpList.map(function(item) {
                                    return (
                                    <a key={item.uuid} className="block-link" href={"/variant-central/?edit=true&variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                    <li key={item.uuid}>
                                        <div><span className="block-link-color title-ellipsis"><strong>
                                        {item.clinvarVariantTitle
                                            ? item.clinvarVariantTitle
                                            : (item.hgvsName37 ? item.hgvsName37 : item.hgvsName38)
                                        }
                                        </strong></span></div>
                                        <span className="block-link-no-color title-ellipsis">
                                            {item.diseaseTerm ? item.diseaseTerm : "No disease associated"}
                                            <br /><strong>Creation Date</strong>: {moment(item.date_created).format("YYYY MMM DD, h:mm a")}
                                        </span>
                                    </li>
                                    </a>
                                    );
                                })}
                            </ul>
                            : <li>You have not created any variant interpretations.</li>}
                        </Panel>

                        <Panel panelClassName="panel-dashboard">
                            <h3>Your Gene-Disease Records</h3>
                            {this.state.gdmList.length > 0 ?
                            <ul>
                                {this.state.gdmList.map(function(item) {
                                    return (
                                    <a key={item.uuid} className="block-link" href={"/curation-central/?gdm=" + item.uuid}>
                                    <li key={item.uuid}>
                                        <div><span className="block-link-color title-ellipsis"><strong>{item.gdmGeneDisease}</strong>–<i>{item.gdmModel}</i></span></div>
                                        <span className="block-link-no-color"><strong>Status</strong>: {item.status}<br />
                                        <strong>Creation Date</strong>: {moment(item.date_created).format("YYYY MMM DD, h:mm a")}</span>
                                    </li>
                                    </a>
                                    );
                                })}
                            </ul>
                            : <li>You have not created any Gene-Disease-Mode of Inheritance entries.</li>}
                        </Panel>
                    </div>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(Dashboard, 'curator_page', 'dashboard');
