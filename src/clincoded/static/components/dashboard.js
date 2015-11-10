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

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var Panel = panel.Panel;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;

var Dashboard = React.createClass({
    mixins: [RestMixin],

    getInitialState: function() {
        return {
            userName: '',
            userStatus: '',
            lastLogin: '',
            recentHistory: [],
            gdmList: []
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
        this.getRestDatas(['/gdm/', '/search/?type=gdm&type=annotation&type=group&type=family&type=individual&type=experimental&limit=10&submitted_by.uuid=' +
            session.user_properties.uuid], [function() {}, function() {}]).then(data => {
            // Search objects successfully retrieved; process results
            // GDM results; finds GDMs created by user, and also creates PMID-GDM mapping table
            // (stopgap measure until article -> GDM mapping ability is incorporated)
            var tempGdmList = [], tempRecentHistory = [];
            var gdmMapping = {};
            for (var i = 0; i < data[0]['@graph'].length; i++) {
                // loop through GDMs
                var gdm = data[0]['@graph'][i];
                if (userMatch(gdm.submitted_by, session)) {
                    tempGdmList.push({
                        uuid: gdm.uuid,
                        gdmGeneDisease: this.cleanGdmGeneDiseaseName(gdm.gene.symbol, gdm.disease.term),
                        gdmModel: this.cleanGdmModelName(gdm.modeInheritance),
                        status: gdm.status,
                        date_created: gdm.date_created
                    });
                }
                // loop through annotations, if they exist, and map annotation UUIDs to GDMs
                if (gdm.annotations) gdmMapping = this.gdmMappingLoop(gdmMapping, gdm.annotations, gdm.uuid,
                    gdm.gene.symbol, gdm.disease.term, gdm.modeInheritance, null);
            }
            // Recent History panel results
            for (var i = 0; i < data[1]['@graph'].length; i++) {
                // loop through search results for history panel results
                var display = false;
                var result = data[1]['@graph'][i];
                var tempDisplayText = '';
                var tempUrl = '';
                var tempTimestamp = '';
                var tempDateTime = moment(result.date_created).format("YYYY MMM DD, h:mm a");
                switch (result['@type'][0]) {
                    case 'annotation':
                        if (result.uuid in gdmMapping) {
                            tempUrl = "/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + result.article.pmid;
                            tempDisplayText = <span><a href={tempUrl}>PMID:{result.article.pmid}</a> added to <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i></span>;
                            tempTimestamp = "added " + tempDateTime;
                            display = true;
                        }
                        break;
                    case 'experimental':
                        if (result.uuid in gdmMapping) {
                            tempUrl = "/experimental/" + result.uuid + "/";
                            tempDisplayText = <span><a href={tempUrl}>{result.label}</a> ({result.evidenceType}) added to <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            tempTimestamp = "added " + tempDateTime;
                            display = true;
                        }
                        break;
                    case 'family':
                        if (result.uuid in gdmMapping) {
                            tempUrl = "/families/" + result.uuid + "/";
                            tempTimestamp = "added " + tempDateTime;
                            display = true;
                            if (gdmMapping[result.uuid].extraInfo.parent) {
                                // for families associated with a group
                                tempDisplayText = <span><a href={tempUrl}>{result.label}</a> associated with <a href={gdmMapping[result.uuid].extraInfo.parentUrl}>{gdmMapping[result.uuid].extraInfo.parent}</a> in <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            }
                            else {
                                // for families not associated with a group
                                tempDisplayText = <span><a href={tempUrl}>{result.label}</a> added to <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            }
                        }
                        break;
                    case 'gdm':
                        tempUrl = "/curation-central/?gdm=" + result.uuid;
                        tempDisplayText = <span><a href={tempUrl}><strong>{this.cleanGdmGeneDiseaseName(result.gene.symbol, result.disease.term)}</strong>–<i>{this.cleanGdmModelName(result.modeInheritance)}</i></a></span>;
                        tempTimestamp = "created " + tempDateTime;
                        display = true;
                        break;
                    case 'group':
                        if (result.uuid in gdmMapping) {
                            tempUrl = "/groups/" + result.uuid + "/";
                            tempDisplayText = <span><a href={tempUrl}>{result.label}</a> added to <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            tempTimestamp = "added " + tempDateTime;
                            display = true;
                        }
                        break;
                    case 'individual':
                        if (result.uuid in gdmMapping) {
                            tempUrl = "/individual/" + result.uuid + "/";
                            tempTimestamp = "added " + tempDateTime;
                            display = true;
                            if (gdmMapping[result.uuid].extraInfo.parent) {
                                tempDisplayText = <span><a href={tempUrl}>{result.label}</a> associated with <a href={gdmMapping[result.uuid].extraInfo.parentUrl}>{gdmMapping[result.uuid].extraInfo.parent}</a> in <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            }
                            else {
                                // for individuals not associated with a group or family
                                tempDisplayText = <span><a href={tempUrl}>{result.label}</a> added to <strong>{gdmMapping[result.uuid].displayName}</strong>–<i>{gdmMapping[result.uuid].displayName2}</i> for <a href={"/curation-central/?gdm=" + gdmMapping[result.uuid].uuid + "&pmid=" + gdmMapping[result.uuid].extraInfo.pmid}>PMID:{gdmMapping[result.uuid].extraInfo.pmid}</a></span>;
                            }
                        }
                        break;
                    default:
                        tempDisplayText = 'Item';
                }
                if (display === true) {
                    tempRecentHistory.push({
                        uuid: result.uuid,
                        displayText: tempDisplayText,
                        timestamp: tempTimestamp
                    });
                }
            }
            // Set states for cleaned results
            this.setState({
                recentHistory: tempRecentHistory,
                gdmList: tempGdmList
            });
        }).catch(parseAndLogError.bind(undefined, 'putRequest'));
    },

    componentDidMount: function() {
        if (this.props.session.user_properties) {
            this.setUserData(this.props.session.user_properties);
            this.getData(this.props.session);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.session.user_properties) {
            this.setUserData(nextProps.session.user_properties);
            this.getData(nextProps.session);
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
                                <li><a href="/create-gene-disease/">Create Gene-Disease Record</a></li>
                                <li><span className="disabled-gray">View list of all Gene-Disease Records</span></li>
                            </ul>
                        </Panel>
                        <Panel panelClassName="panel-dashboard">
                            <h3>Your Recent History</h3>
                            {this.state.recentHistory.length > 0 ?
                            <ul>
                                {this.state.recentHistory.map(function(item) {
                                    return <li key={item.uuid}>{item.displayText}; <i>{item.timestamp}</i></li>;
                                })}
                            </ul>
                            : <li>You have no activity to display.</li>}
                        </Panel>
                    </div>
                    <div className="col-md-6">
                        <Panel panelClassName="panel-dashboard">
                            <h3>Your Gene-Disease Records</h3>
                            {this.state.gdmList.length > 0 ?
                            <ul>
                                {this.state.gdmList.map(function(item) {
                                    return (
                                    <a className="block-link" href={"/curation-central/?gdm=" + item.uuid}>
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
