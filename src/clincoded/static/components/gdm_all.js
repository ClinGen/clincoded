'use strict';
import React, { Component } from 'react';
import createReactClass from 'create-react-class';
import moment from 'moment';
import * as curator from './curator';
import { RestMixin } from './rest';
import { curator_page } from './globals';
import { getAffiliationName } from '../libs/get_affiliation_name';
import { showActivityIndicator } from './activity_indicator';

// Map GDM statuses from
var statusMappings = {
//  Status from GDM                         CSS class                Short name for screen display
    'Created':                             {cssClass: 'created',     shortName: 'Created'},
    'In Progress':                         {cssClass: 'in-progress', shortName: 'In Progress'},
    'Summary/Provisional Classifications': {cssClass: 'provisional', shortName: 'Provisional'},
    'Draft Classification':                {cssClass: 'draft',       shortName: 'Draft'},
    'Final Classification':                {cssClass: 'final',       shortName: 'Final'}
};

var GdmList = createReactClass({
    mixins: [RestMixin],

    getInitialState() {
        return {
            sortCol: 'gdm',
            reversed: false,
            searchTerm: '', // User input to filter GDMs
            allGdms: [], // Source of complete list of parsed and unfiltered GDMs
            filteredGdms: [], // List of parsed and filtered/unfiltered GDMs
            gdmListLoading: true,
        };
    },

    componentDidMount() {
        this.parseGdms();
    },

    // Method to parse GDM and form the shape of the data object containing only the properties needed to
    // render each GDM item in the table. Also as a workaround fix for the failing pytest_bdd assertion on
    // Travis CI, since having the 'moment' date parsing logic in the render() method would still cause
    // the python test to fail in the build.
    parseGdms() {
        let gdmObjList = [];
        let gdmObj = {};
        let filters = '?type=gdm&field=gene&field=disease&field=modeInheritance&field=date_created&field=affiliation&field=submitted_by';
        this.getRestData('/search/' + filters).then(data => {
            let gdms = data['@graph'];

            if (gdms && gdms.length) {
                gdms.forEach(gdm => {
                    // Directly passing the date string into the moment() method still cause the test to fail.
                    // The workaround of passing the date string into the 'new Date()' constructor first appears
                    // to be able to fix the failing pytest_bdd assertion on Travis CI.
                    // http://stackoverflow.com/questions/38251763/moment-js-to-convert-date-string-into-date#answers
                    let gdmCreatedDate = new Date(gdm.date_created);
    
                    gdmObj = {
                        gdm_uuid: gdm['@id'].slice(5, -1),
                        gene_symbol: gdm.gene.symbol,
                        disease_term: gdm.disease.term,
                        modeInheritance: gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1],
                        submitter_last_name: gdm.submitted_by.last_name,
                        submitter_first_name: gdm.submitted_by.first_name,
                        created_date: moment(gdmCreatedDate).format('YYYY MMM DD'),
                        created_time: moment(gdmCreatedDate).format('h:mm a'),
                        date_created: gdm.date_created,
                        affiliation: gdm.affiliation ? getAffiliationName(gdm.affiliation) : null
                    };
                    gdmObjList.push(gdmObj);
                });
                // Set the initial states upon component mounted
                this.setState({allGdms: gdmObjList, filteredGdms: gdmObjList, gdmListLoading: false});
            } else {
                this.setState({gdmListLoading: false});
            }
        }).catch(err => {
            console.log('Error in fetching gdm data =: %o', err);
        });
    },

    // Method to handle user input to filter/unfilter GDMs
    handleChange(e) {
        this.setState({searchTerm: e.target.value}, () => {
            // Filter GDMs
            let gdms = this.state.allGdms; // Get the complete list of GDMs
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredGdms = gdms.filter(function(gdm) {
                    return (
                        (gdm.gene_symbol.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (gdm.disease_term.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (gdm.affiliation && gdm.affiliation.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (gdm.submitter_last_name && gdm.submitter_last_name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1)
                    );
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
            <div className="container">
                <div className="row gdm-header">
                    <div className="col-sm-12 col-md-8">
                        <h1>All Gene-Disease Records</h1>
                    </div>
                    <div className="col-md-1"></div>
                    <div className="col-sm-12 col-md-3">
                        <input type="text" name="filterTerm" id="filterTerm" placeholder="Filter by Gene, Disease, or Creator"
                            value={this.state.searchTerm} onChange={this.handleChange} className="form-control" />
                    </div>
                </div>
                <div className="table-responsive">
                    <div className="table-gdm">
                        <div className="table-header-gdm">
                            <div className="table-cell-gdm-main tcell-sortable" onClick={this.sortDir.bind(null, 'gdm')}>
                                <div>Gene — Disease<span className={sortIconClass.gdm}></span></div>
                                <div>Mode</div>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'creator')}>
                                Creator<span className={sortIconClass.creator}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'created')}>
                                Created<span className={sortIconClass.created}></span>
                            </div>
                        </div>
                        {this.state.gdmListLoading ? showActivityIndicator('Loading... ') : null}
                        {gdms && gdms.length ? gdms.map(gdm => {
                            return (
                                <a className="table-row-gdm" href={'/curation-central/?gdm=' + gdm.gdm_uuid} key={gdm.gdm_uuid}>
                                    <div className="table-cell-gdm-main">
                                        <div>{gdm.gene_symbol} – {gdm.disease_term}</div>
                                        <div>{gdm.modeInheritance}</div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>{gdm.submitter_last_name}, {gdm.submitter_first_name} {gdm.affiliation ? <span>({gdm.affiliation})</span> : null}</div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>{gdm.created_date}</div>
                                        <div>{gdm.created_time}</div>
                                    </div>
                                </a>
                            );
                        }) : null}
                    </div>
                </div>
            </div>
        );
    }
});

curator_page.register(GdmList, 'curator_page', 'gdm-all');
