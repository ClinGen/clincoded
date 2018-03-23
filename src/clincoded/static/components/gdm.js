'use strict';
import React, { Component } from 'react';
import createReactClass from 'create-react-class';
import moment from 'moment';
import * as curator from './curator';
import { content_views, truncateString } from './globals';
import { getAffiliationName } from '../libs/get_affiliation_name';

// Map GDM statuses from
var statusMappings = {
//  Status from GDM                         CSS class                Short name for screen display
    'Created':                             {cssClass: 'created',     shortName: 'Created'},
    'In Progress':                         {cssClass: 'in-progress', shortName: 'In Progress'},
    'Summary/Provisional Classifications': {cssClass: 'provisional', shortName: 'Provisional'},
    'Draft Classification':                {cssClass: 'draft',       shortName: 'Draft'},
    'Final Classification':                {cssClass: 'final',       shortName: 'Final'}
};

var GdmCollection = module.exports.GdmCollection = createReactClass({
    getInitialState() {
        return {
            sortCol: 'gdm',
            reversed: false,
            searchTerm: '', // User input to filter GDMs
            allGdms: [], // Source of complete list of parsed and unfiltered GDMs
            filteredGdms: [] // List of parsed and filtered/unfiltered GDMs
        };
    },

    componentDidMount() {
        this.parseGdms();
    },

    componentDidUpdate(prevProps, prevState) {
        // Remove header and notice bar (if any) from DOM
        let siteHeader = document.querySelector('.site-header');
        siteHeader.setAttribute('style', 'display:none');
        let demoNoticeBar = document.querySelector('.notice-bar');
        if (demoNoticeBar) {
            demoNoticeBar.setAttribute('style', 'display:none');
        }
        let affiliationUtilityBar = document.querySelector('.affiliation-utility-container');
        if (affiliationUtilityBar) {
            affiliationUtilityBar.setAttribute('style', 'display:none');
        }
    },

    // Method to parse GDM and form the shape of the data object containing only the properties needed to
    // render each GDM item in the table. Also as a workaround fix for the failing pytest_bdd assertion on
    // Travis CI, since having the 'moment' date parsing logic in the render() method would still cause
    // the python test to fail in the build.
    parseGdms() {
        let gdmObjList = [];
        let gdmObj = {};
        let gdms = this.props.context['@graph'];
        if (gdms && gdms.length) {
            gdms.forEach(gdm => {
                if (gdm.status !== 'deleted') {
                    let allRecordOwners = curator.findAllParticipants(gdm);
                    let participants = allRecordOwners ? allRecordOwners.map(owner => { return owner.title; }).join(', ') : '';
                    let latestRecord = gdm && curator.findLatestRecord(gdm);
                    let statusString = statusMappings[gdm.gdm_status].cssClass; // Convert status string to CSS class
                    let iconClass = 'icon gdm-status-icon-' + statusString;
                    // Directly passing the date string into the moment() method still cause the test to fail.
                    // The workaround of passing the date string into the 'new Date()' constructor first appears
                    // to be able to fix the failing pytest_bdd assertion on Travis CI.
                    // http://stackoverflow.com/questions/38251763/moment-js-to-convert-date-string-into-date#answers
                    let gdmCreatedDate = new Date(gdm.date_created);
                    let latestRecordDate = latestRecord ? new Date(latestRecord.last_modified) : '';

                    gdmObj = {
                        gdm_uuid: gdm.uuid,
                        gdm_status: gdm.gdm_status,
                        gene_symbol: gdm.gene.symbol,
                        disease_id: gdm.disease.diseaseId,
                        disease_term: gdm.disease.term,
                        modeInheritance: gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1],
                        participants: participants,
                        submitter_last_name: gdm.submitted_by.last_name,
                        submitter_first_name: gdm.submitted_by.first_name,
                        created_date: moment(gdmCreatedDate).format('YYYY MMM DD'),
                        created_time: moment(gdmCreatedDate).format('h:mm a'),
                        latest_date: latestRecordDate ? moment(latestRecordDate).format('YYYY MMM DD') : '',
                        latest_time: latestRecordDate ? moment(latestRecordDate).format('h:mm a') : '',
                        iconClass: iconClass,
                        latestRecord: latestRecord,
                        date_created: gdm.date_created,
                        affiliation: gdm.affiliation ? gdm.affiliation : null
                    };
                    gdmObjList.push(gdmObj);
                }
            });
            // Set the initial states upon component mounted
            this.setState({allGdms: gdmObjList, filteredGdms: gdmObjList});
        }
    },

    // Method to handle user input to filter/unfilter GDMs
    handleChange(e) {
        this.setState({searchTerm: e.target.value}, () => {
            // Filter GDMs
            let gdms = this.state.allGdms; // Get the complete list of GDMs
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredGdms = gdms.filter(function(gdm) {
                    return gdm.gene_symbol.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1 || gdm.disease_term.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
                });
                this.setState({filteredGdms: filteredGdms});
            } else {
                this.setState({filteredGdms: this.state.allGdms});
            }
        });
    },

    // Handle clicks in the table header for sorting
    sortDir(colName) {
        let reversed = colName === this.state.sortCol ? !this.state.reversed : false;
        let sortCol = colName;
        this.setState({sortCol: sortCol, reversed: reversed});
    },

    // Call-back for the JS sorting function. Expects GDMs (the parsed GDM state objects) to compare in a and b.
    // Depending on the column currently selected for sorting, this function sorts on the relevant parts of the GDM.
    sortCol(a, b) {
        var diff;

        switch (this.state.sortCol) {
            case 'status':
                var statuses = Object.keys(statusMappings);
                var statusIndexA = statuses.indexOf(a.gdm_status);
                var statusIndexB = statuses.indexOf(b.gdm_status);
                diff = statusIndexA - statusIndexB;
                break;
            case 'gdm':
                diff = a.gene_symbol > b.gene_symbol ? 1 : -1;
                break;
            case 'last':
                var aRecord = a.latestRecord;
                var bRecord = b.latestRecord;
                diff = aRecord && bRecord ? Date.parse(aRecord.last_modified) - Date.parse(bRecord.last_modified) : (aRecord ? 1 : -1);
                break;
            case 'creator':
                var aLower = a.submitter_last_name.toLowerCase();
                var bLower = b.submitter_last_name.toLowerCase();
                diff = aLower > bLower ? 1 : (aLower === bLower ? 0 : -1);
                break;
            case 'created':
                diff = Date.parse(a.date_created) - Date.parse(b.date_created);
                break;
            default:
                diff = 0;
                break;
        }
        return this.state.reversed ? -diff : diff;
    },

    render() {
        let filteredGdms = this.state.filteredGdms;
        let gdms = filteredGdms && filteredGdms.length ? filteredGdms.sort(this.sortCol) : []; // Pre-sort the GDM list
        let sortIconClass = {status: 'tcell-sort', gdm: 'tcell-sort', last: 'tcell-sort', creator: 'tcell-sort', created: 'tcell-sort'};
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="table-responsive">
                <h2>Gene-Disease Records</h2>
                <div className="table-gdm">
                    <div className="table-header-gdm">
                        <div className="table-cell-gdm">
                            Disease ID
                        </div>
                        <div className="table-cell-gdm">
                            Disease Term
                        </div>
                        <div className="table-cell-gdm">
                            Gene Symbol
                        </div>
                        <div className="table-cell-gdm">
                            Mode of Inheritance
                        </div>
                        <div className="table-cell-gdm">
                            Creator
                        </div>
                        <div className="table-cell-gdm">
                            Participants
                        </div>
                    </div>
                    {gdms && gdms.length ? gdms.map((gdm, i) => {
                        return (
                            <div key={i} className="table-row-gdm">
                                <div className="table-cell-gdm">
                                    <div>{gdm.disease_id.replace('_', ':')}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{gdm.disease_term}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{gdm.gene_symbol}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{gdm.modeInheritance}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{gdm.submitter_last_name}, {gdm.submitter_first_name} {gdm.affiliation ? <span>({getAffiliationName(gdm.affiliation)})</span> : null}</div>
                                </div>
                                <div className="table-cell-gdm">
                                    <div>{gdm.participants}</div>
                                </div>
                            </div>
                        );
                    }) : null}
                </div>
            </div>
        );
    }
});

content_views.register(GdmCollection, 'gdm_collection');

// Render the GDM status legend
class GdmStatusLegend extends Component {
    render() {
        return (
            <div className="row">
                <div className="gdm-status-legend">
                    {Object.keys(statusMappings).map(function(status, i) {
                        var iconClass = 'icon gdm-status-icon-' + statusMappings[status].cssClass;

                        return (
                            <div className={"col-sm-2 gdm-status-item" + (i === 0 ? ' col-sm-offset-1' : '')} key={i}>
                                <span className={iconClass}></span>
                                <span className="gdm-status-text">{statusMappings[status].shortName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
