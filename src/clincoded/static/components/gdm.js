'use strict';
var React = require('react');
var moment = require('moment');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var truncateString = globals.truncateString;


// Map GDM statuses from
var statusMappings = {
//  Status from GDM                         CSS class                Short name for screen display
    'Created':                             {cssClass: 'created',     shortName: 'Created'},
    'In Progress':                         {cssClass: 'in-progress', shortName: 'In Progress'},
    'Summary/Provisional Classifications': {cssClass: 'provisional', shortName: 'Provisional'},
    'Draft Classification':                {cssClass: 'draft',       shortName: 'Draft'},
    'Final Classification':                {cssClass: 'final',       shortName: 'Final'}
};

var GdmCollection = module.exports.GdmCollection = React.createClass({
    mixins: [FormMixin],

    getInitialState: function() {
        return {
            sortCol: 'gdm',
            reversed: false,
            searchTerm: 'agtr2',
            filteredGdms: []
        };
    },

    componentWillMount() {
        let gdms = this.props.context['@graph'];
        let searchTerm = this.state.searchTerm;
        if (searchTerm && searchTerm.length) {
            let filteredGdms = gdms.filter(function(gdm) {
                return gdm.gene.symbol.toLowerCase().indexOf(searchTerm) !== -1 || gdm.disease.term.toLowerCase().indexOf(searchTerm) !== -1;
            });
            this.setState({filteredGdms: filteredGdms});
        } else {
            this.setState({filteredGdms: gdms});
        }
    },

    // Handle clicks in the table header for sorting
    sortDir: function(colName) {
        var reversed = colName === this.state.sortCol ? !this.state.reversed : false;
        var sortCol = colName;
        this.setState({sortCol: sortCol, reversed: reversed});
    },

    // Call-back for the JS sorting function. Expects GDMs to compare in a and b. Depending on the column currently selected
    // for sorting, this function sorts on the relevant parts of the GDM.
    sortCol: function(a, b) {
        var diff;

        switch (this.state.sortCol) {
            case 'status':
                var statuses = Object.keys(statusMappings);
                var statusIndexA = statuses.indexOf(a.gdm_status);
                var statusIndexB = statuses.indexOf(b.gdm_status);
                diff = statusIndexA - statusIndexB;
                break;
            case 'gdm':
                diff = a.gene.symbol > b.gene.symbol ? 1 : -1;
                break;
            case 'last':
                var aAnnotation = curator.findLatestAnnotation(a);
                var bAnnotation = curator.findLatestAnnotation(b);
                diff = aAnnotation && bAnnotation ? Date.parse(aAnnotation.date_created) - Date.parse(bAnnotation.date_created) : (aAnnotation ? 1 : -1);
                break;
            case 'creator':
                var aLower = a.submitted_by.last_name.toLowerCase();
                var bLower = b.submitted_by.last_name.toLowerCase();
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

    searchChange(e) {
        // let searchVal = this.q.getValue().toLowerCase();
        this.setState({searchTerm: e.target.value.toLowerCase()}, () => {
            // Filter GDMs
            let gdms = this.props.context['@graph'];
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredGdms = gdms.filter(function(gdm) {
                    return gdm.gene.symbol.toLowerCase().indexOf(searchTerm) !== -1 || gdm.disease.term.toLowerCase().indexOf(searchTerm) !== -1;
                });
                this.setState({filteredGdms: filteredGdms});
            } else {
                this.setState({filteredGdms: gdms});
            }
        });
    },

    render() {
        let filteredGdms = this.state.filteredGdms;
        var sortIconClass = {status: 'tcell-sort', gdm: 'tcell-sort', last: 'tcell-sort', creator: 'tcell-sort', created: 'tcell-sort'};
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="container">
                <div className="row gdm-header">
                    <div className="col-sm-12 col-md-8">
                        <h1>All Gene-Disease Records</h1>
                    </div>
                    <div className="col-md-1"></div>
                    <div className="col-sm-12 col-md-3">
                        <input type="text" name="filterTerm" id="filterTerm" placeholder="Filter by Gene or Disease"
                            value={this.state.searchTerm} onChange={this.searchChange} className="form-control" />
                    </div>
                </div>
                <GdmStatusLegend />
                <div className="table-responsive">
                    <div className="table-gdm">
                        <div className="table-header-gdm">
                            <div className="table-cell-gdm-status tcell-sortable" onClick={this.sortDir.bind(null, 'status')}>
                                <span className="icon gdm-status-icon-header"></span><span className={sortIconClass.status}></span>
                            </div>
                            <div className="table-cell-gdm-main tcell-sortable" onClick={this.sortDir.bind(null, 'gdm')}>
                                <div>Gene — Disease<span className={sortIconClass.gdm}></span></div>
                                <div>Mode</div>
                            </div>
                            <div className="table-cell-gdm">
                                Participants
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'last')}>
                                Last Edited<span className={sortIconClass.last}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'creator')}>
                                Creator<span className={sortIconClass.creator}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'created')}>
                                Created<span className={sortIconClass.created}></span>
                            </div>
                        </div>
                        {filteredGdms.sort(this.sortCol).map(function(gdm) {
                            var annotationOwners = curator.getAnnotationOwners(gdm);
                            var latestAnnotation = gdm && curator.findLatestAnnotation(gdm);
                            var mode = gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];
                            var term = truncateString(gdm.disease.term, 30);
                            var createdTime = moment(gdm.date_created);
                            var latestTime = latestAnnotation ? moment(latestAnnotation.date_created) : '';
                            var participants = annotationOwners.map(function(owner) { return owner.title; }).join(', ');
                            var statusString = statusMappings[gdm.gdm_status].cssClass; // Convert status string to CSS class
                            var iconClass = 'icon gdm-status-icon-' + statusString;

                            return (
                                <a className="table-row-gdm" href={'/curation-central/?gdm=' + gdm.uuid} key={gdm.uuid}>
                                    <div className="table-cell-gdm-status">
                                        <span className={iconClass} title={gdm.gdm_status}></span>
                                    </div>

                                    <div className="table-cell-gdm-main">
                                        <div>{gdm.gene.symbol} – {gdm.disease.term}</div>
                                        <div>{mode}</div>
                                    </div>

                                    <div className="table-cell-gdm">
                                        {participants}
                                    </div>

                                    <div className="table-cell-gdm">
                                        {latestTime ?
                                            <div>
                                                <div>{latestTime.format("YYYY MMM DD")}</div>
                                                <div>{latestTime.format("h:mm a")}</div>
                                            </div>
                                        : null}
                                    </div>

                                    <div className="table-cell-gdm">
                                        <div>{gdm.submitted_by.last_name}, {gdm.submitted_by.first_name}</div>
                                    </div>

                                    <div className="table-cell-gdm">
                                        <div>{createdTime.format("YYYY MMM DD")}</div>
                                        <div>{createdTime.format("h:mm a")}</div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(GdmCollection, 'gdm_collection');


// Render the GDM status legend
var GdmStatusLegend = React.createClass({
    render: function() {
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
});
