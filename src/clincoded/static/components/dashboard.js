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

    gdmMappingLoop: function(gdmMapping, gdmSubItem, gdmUuid, geneSymbol, diseaseTerm, modeInheritance, extraInfo) {
        // loop through an gdmSubItem and map its subitems' UUIDs to the GDM UUID and Disease/Gene/Mode data
        if (gdmSubItem.length > 0) {
            for (var i = 0; i < gdmSubItem.length; i++) {
                // create mapping object
                gdmMapping[gdmSubItem[i].uuid] = {
                    uuid: gdmUuid,
                    displayName: this.cleanGdmGeneDiseaseName(geneSymbol, diseaseTerm),
                    displayName2: this.cleanGdmModelName(modeInheritance),
                    extraInfo: extraInfo
                };
                // recursively loop through the annotations' groups, families, individuals
                if (gdmSubItem[i].individuals) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].individuals,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, {pmid: gdmSubItem[i].article.pmid, pmidUuid: gdmSubItem[i].uuid});
                if (gdmSubItem[i].families) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].families,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, {pmid: gdmSubItem[i].article.pmid, pmidUuid: gdmSubItem[i].uuid});
                if (gdmSubItem[i].groups) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].groups,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, {pmid: gdmSubItem[i].article.pmid, pmidUuid: gdmSubItem[i].uuid});
                if (gdmSubItem[i].experimentalData) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].experimentalData,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, {pmid: gdmSubItem[i].article.pmid, pmidUuid: gdmSubItem[i].uuid});
                if (gdmSubItem[i].familyIncluded) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].familyIncluded,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, _.extend({}, extraInfo, {parent: gdmSubItem[i].label, parentUrl: gdmSubItem[i]['@id'], parentType: gdmSubItem[i]['@type'][0]}));
                if (gdmSubItem[i].individualIncluded) gdmMapping = this.gdmMappingLoop(gdmMapping, gdmSubItem[i].individualIncluded,
                    gdmUuid, geneSymbol, diseaseTerm, modeInheritance, _.extend({}, extraInfo, {parent: gdmSubItem[i].label, parentUrl: gdmSubItem[i]['@id'], parentType: gdmSubItem[i]['@type'][0]}));
            }
        }
        return gdmMapping;
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
            '/gdm/',
            '/search/?type=gdm&limit=10&submitted_by.uuid=' + session.user_properties.uuid,
            '/search/?type=interpretation&limit=10&submitted_by.uuid=' + session.user_properties.uuid
        ],
            [function() {}, function() {}, function() {}])
        .then(data => {
            // Search objects successfully retrieved; process results
            // GDM results; finds GDMs created by user, and also creates PMID-GDM mapping table
            // (stopgap measure until article -> GDM mapping ability is incorporated)
            var tempGdmList = [], tempRecentHistory = [];
            var vciInterpList = [];
            var gdmMapping = {};
            for (var i = 0; i < data[0]['@graph'].length; i++) {
                // loop through GDMs
                var gdm = data[0]['@graph'][i];
                if (userMatch(gdm.submitted_by, session)) {
                    tempGdmList.push({
                        uuid: gdm.uuid,
                        gdmGeneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                        gdmModel: this.cleanGdmModelName(gdm.modeInheritance),
                        status: gdm.gdm_status,
                        date_created: gdm.date_created
                    });
                }
                // loop through annotations, if they exist, and map annotation UUIDs to GDMs
                if (gdm.annotations) gdmMapping = this.gdmMappingLoop(gdmMapping, gdm.annotations, gdm.uuid,
                    gdm.gene.symbol, gdm.disease.term, gdm.modeInheritance, null);
            }
            console.log(data[2]['@graph']);
            var temp = data[2]['@graph'].map(res => { return res['@id']; });
            console.log(temp);
            this.getRestDatas(temp, null, true).then(vciInterpResults => {
                vciInterpResults.map(vciInterpResult => {
                    vciInterpList.push({
                        uuid: vciInterpResult.uuid,
                        variantUuid: vciInterpResult.variant.uuid,
                        carId: vciInterpResult.variant.carId,
                        clinvarVariantId: vciInterpResult.variant.clinvarVariantId,
                        clinvarVariantTitle: vciInterpResult.variant.clinvarVariantTitle,
                        date_created: vciInterpResult.date_created
                    });
                });
                this.setState({vciInterpList: vciInterpList});
            });
            // Set states for cleaned results
            this.setState({gdmList: tempGdmList});
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
                                    <a key={item.uuid} className="block-link" href={"/variant-central/?variant=" + item.variantUuid + "&interpretation=" + item.uuid}>
                                    <li key={item.uuid}>
                                        <span className="block-link-color"><strong>{item.carId}</strong> // <i>{item.clinvarVariantId}</i></span><br />
                                        <span className="block-link-no-color">{item.clinvarVariantTitle}<br />
                                        <strong>Creation Date</strong>: {moment(item.date_created).format("YYYY MMM DD, h:mm a")}</span>
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
                                        <span className="block-link-color"><strong>{item.gdmGeneDisease}</strong>–<i>{item.gdmModel}</i></span><br />
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
