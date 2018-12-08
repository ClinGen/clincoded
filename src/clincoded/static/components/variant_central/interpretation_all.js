'use strict';
import React, { Component } from 'react';
import createReactClass from 'create-react-class';
import moment from 'moment';
import { RestMixin } from '../rest';
import { curator_page } from '../globals';
import { getAffiliationName } from '../../libs/get_affiliation_name';
import { showActivityIndicator } from '../activity_indicator';
import { renderVariantTitle } from '../../libs/render_variant_title';

// Map Interpretation statuses from
var statusMappings = {
//  Status from Interpretation        CSS class                Short name for screen display
    'In Progress':                    {cssClass: 'in-progress', shortName: 'In Progress'},
    'Provisional':                    {cssClass: 'provisional', shortName: 'Provisional'}
};

var InterpretationList = createReactClass({
    mixins: [RestMixin],

    getInitialState() {
        return {
            sortCol: 'variant',
            reversed: false,
            searchTerm: '', // User input to filter interpretations
            allInterpretations: [], // Source of complete list of parsed and unfiltered interpretations
            filteredInterpretations: [], // List of parsed and filtered/unfiltered interpretations
            interpretationListLoading: true,
        };
    },

    componentDidMount() {
        this.filterInterpretations();
        this.parseInterpretations();
    },

    /*
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
    */

    filterInterpretations() {
        let filters = '?type=interpretation&provisional_count=1&affiliation=10014';
        this.getRestData('/search/' + filters).then(data => {
            let vciInterpURLs = [];
            // go through VCI interpretation results and get their data
            vciInterpURLs = data['@graph'].map(res => { return res['@id']; });
            if (vciInterpURLs.length > 0) {
                this.getRestDatas(vciInterpURLs).then(vciInterpResults => {
                    let filteredInterpretations = vciInterpResults.filter(interpretation => {
                        let provisional = interpretation.provisional_variant[0];
                        return provisional && provisional.approvedClassification && provisional.classificationStatus === 'Approved' && interpretation.status !== 'deleted';
                    });
                    console.log('filteredInterpretations === ' + JSON.stringify(filteredInterpretations));
                });
            }
        }).catch(err => {
            console.log('Filter interpretation error = %', err);
        });
    },

    // Method to parse interpretation and form the shape of the data object containing only the properties needed to
    // render each interpretation item in the table. Also as a workaround fix for the failing pytest_bdd assertion on
    // Travis CI, since having the 'moment' date parsing logic in the render() method would still cause
    // the python test to fail in the build.
    parseInterpretations() {
        let interpretationObjList = [];
        let interpretationObj = {};
        let filters = '?type=interpretation&field=variant&field=disease&field=modeInheritance&field=date_created&field=affiliation&field=submitted_by';
        this.getRestData('/search/' + filters).then(data => {
            let interpretations = data['@graph'];

            if (interpretations && interpretations.length) {
                interpretations.forEach(interpretation => {
                    // Directly passing the date string into the moment() method still cause the test to fail.
                    // The workaround of passing the date string into the 'new Date()' constructor first appears
                    // to be able to fix the failing pytest_bdd assertion on Travis CI.
                    // http://stackoverflow.com/questions/38251763/moment-js-to-convert-date-string-into-date#answers
                    let interpretationCreatedDate = new Date(interpretation.date_created);
    
                    interpretationObj = {
                        interpretation_uuid: interpretation['@id'].slice(17, -1),
                        variantUuid: interpretation.variant.uuid,
                        variant: interpretation.variant,
                        clinvarVariantId: interpretation.variant.clinvarVariantId ? interpretation.variant.clinvarVariantId : null,
                        carId: interpretation.variant.carId ? interpretation.variant.carId : null,
                        variantTitle: renderVariantTitle(interpretation.variant, true),
                        diseaseId: interpretation.disease && interpretation.disease.diseaseId ? interpretation.disease.diseaseId : null,
                        disease_term: interpretation.disease && interpretation.disease.term ? interpretation.disease.term : null,
                        modeInheritance: interpretation.modeInheritance ? interpretation.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1] : null,
                        submitter_last_name: interpretation.submitted_by.last_name,
                        submitter_first_name: interpretation.submitted_by.first_name,
                        created_date: moment(interpretationCreatedDate).format('YYYY MMM DD'),
                        created_time: moment(interpretationCreatedDate).format('h:mm a'),
                        date_created: interpretation.date_created,
                        affiliation: interpretation.affiliation ? getAffiliationName(interpretation.affiliation) : null
                    };
                    interpretationObjList.push(interpretationObj);
                });
                // Set the initial states upon component mounted
                this.setState({allInterpretations: interpretationObjList, filteredInterpretations: interpretationObjList, interpretationListLoading: false});
            } else {
                this.setState({interpretationListLoading: false});
            }
        }).catch(err => {
            console.log('Error in fetching interpretation data =: %o', err);
        });
    },

    // Method to handle user input to filter/unfilter interpretations
    handleChange(e) {
        this.setState({searchTerm: e.target.value}, () => {
            // Filter Interpretations
            let interpretations = this.state.allInterpretations;
            let searchTerm = this.state.searchTerm;
            if (searchTerm && searchTerm.length) {
                let filteredInterpretations = interpretations.filter(function(interpretation) {
                    return (
                        (interpretation.clinvarVariantId && interpretation.clinvarVariantId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.variantTitle && interpretation.variantTitle.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.carId && interpretation.carId.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.diseaseId && interpretation.diseaseId.indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.disease_term && interpretation.disease_term.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.affiliation && interpretation.affiliation.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) ||
                        (interpretation.submitter_last_name && interpretation.submitter_last_name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1)
                    );
                });
                this.setState({filteredInterpretations: filteredInterpretations});
            } else {
                this.setState({filteredInterpretations: this.state.allInterpretations});
            }
        });
    },

    // Handle clicks in the table header for sorting
    sortDir(colName) {
        let reversed = colName === this.state.sortCol ? !this.state.reversed : false;
        let sortCol = colName;
        this.setState({sortCol: sortCol, reversed: reversed});
    },

    // Call-back for the JS sorting function. Expects Interpretations (the parsed interpretation state objects) to compare in a and b.
    // Depending on the column currently selected for sorting, this function sorts on the relevant parts of the Interpretation.
    sortCol(a, b) {
        var diff;

        switch (this.state.sortCol) {
            case 'status':
                var statuses = Object.keys(statusMappings);
                var statusIndexA = statuses.indexOf(a.interpretation_status);
                var statusIndexB = statuses.indexOf(b.interpretation_status);
                diff = statusIndexA - statusIndexB;
                break;
            case 'variant':
                diff = (a.clinvarVariantId ? a.clinvarVariantId : a.carId) > (b.clinvarVariantId ? b.clinvarVariantId : b.carId) ? 1 : -1;
                break;
            case 'disease':
                diff = (a.disease_term ? a.disease_term : "") > (b.disease_term ? b.disease_term : "") ? 1 : -1;
                break;
            case 'moi':
                diff = (a.modeInheritance ? a.modeInheritance : "") > (b.modeInheritance ? b.modeInheritance : "") ? 1 : -1;
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
        let filteredInterpretations = this.state.filteredInterpretations;
        // Pre-sort the interpretation list
        let interpretations = filteredInterpretations && filteredInterpretations.length ? filteredInterpretations.sort(this.sortCol) : [];
        let sortIconClass = {
            status: 'tcell-sort', variant: 'tcell-sort', disease: 'tcell-sort', moi: 'tcell-sort',
            last: 'tcell-sort', creator: 'tcell-sort', created: 'tcell-sort'
        };
        sortIconClass[this.state.sortCol] = this.state.reversed ? 'tcell-desc' : 'tcell-asc';

        return (
            <div className="container">
                <div className="row gdm-header">
                    <div className="col-sm-12 col-md-8">
                        <h1>All Interpretations</h1>
                    </div>
                    <div className="col-md-1"></div>
                    <div className="col-sm-12 col-md-3">
                        <input type="text" name="filterTerm" id="filterTerm" placeholder="Filter by Variant, Disease, or Creator"
                            value={this.state.searchTerm} onChange={this.handleChange} className="form-control" />
                    </div>
                </div>
                <div className="table-responsive">
                    <div className="table-gdm">
                        <div className="table-header-gdm">
                            <div className="table-cell-gdm-main tcell-sortable" onClick={this.sortDir.bind(null, 'variant')}>
                                <div>Variant Preferred Title<span className={sortIconClass.variant}></span></div>
                                <div>Variant ID(s)</div>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'disease')}>
                                Disease<span className={sortIconClass.disease}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'moi')}>
                                Mode of Inheritance<span className={sortIconClass.moi}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'creator')}>
                                Creator<span className={sortIconClass.creator}></span>
                            </div>
                            <div className="table-cell-gdm tcell-sortable" onClick={this.sortDir.bind(null, 'created')}>
                                Created<span className={sortIconClass.created}></span>
                            </div>
                        </div>
                        {this.state.interpretationListLoading ? showActivityIndicator('Loading... ') : null}
                        {interpretations && interpretations.length ? interpretations.map(interpretation => {
                            return (
                                <a className="table-row-gdm" href={'/variant-central/?variant=' + interpretation.variantUuid} key={interpretation.interpretation_uuid}>
                                    <div className="table-cell-gdm-main">
                                        <div>{renderVariantTitle(interpretation.variant)}</div>
                                        <div>
                                            {interpretation.clinvarVariantId ? <span>ClinVar Variation ID: <strong>{interpretation.clinvarVariantId}</strong></span> : null}
                                            {interpretation.clinvarVariantId && interpretation.carId ? " // " : null}
                                            {interpretation.carId ? <span>ClinGen Allele Registry ID: <strong>{interpretation.carId}</strong></span> : null}
                                        </div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.disease_term ? <span>{interpretation.disease_term} ({interpretation.diseaseId.replace('_', ':')})</span> : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.modeInheritance ? interpretation.modeInheritance : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>{interpretation.submitter_last_name}, {interpretation.submitter_first_name} {interpretation.affiliation ? <span>({interpretation.affiliation})</span> : null}</div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>{interpretation.created_date}</div>
                                        <div>{interpretation.created_time}</div>
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

curator_page.register(InterpretationList, 'curator_page', 'interpretation-all');


// Return an array of (evaluations, extra_evidence, classification aka provisional_variant)
// submitted_by objects sorted by last name given the interpretation.
function findAllParticipants(interpreatation) {
    let allObjects = getAllObjects(interpreatation);

    let submitters = allObjects.map(object => {
        return object.submitted_by;
    });

    let participants = _.chain(submitters).uniq(submitter => {
        return submitter.uuid;
    }).sortBy('last_name').value();

    return participants;
}

// Method to filter object keys
function filteredObject(record) {
    const allowed = ['date_created', 'last_modified', 'submitted_by', '@type', 'affiliation'];

    const filtered = Object.keys(record)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = record[key];
            return obj;
        }, {});

    return filtered;
}

// Return all record objects flattened in an array,
// including annotations, evidence, scores
function getAllObjects(interpretation) {
    let totalObjects = [];
    // loop through gdms
    let evaluations = interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [];
    evaluations.forEach(evaluation => {
        totalObjects.push(filteredObject(evaluation));
    });
    let extraEvidenceList = interpretation.extra_evidence_list && interpretation.extra_evidence_list.length ? interpretation.extra_evidence_list : [];
    extraEvidenceList.forEach(evidence => {
        totalObjects.push(filteredObject(evidence));
    });
    // Get provisionalClassifications objects
    let classifications = interpretation.provisional_variant && interpretation.provisional_variant.length ? interpretation.provisional_variant : [];
    classifications.forEach(classification => {
        totalObjects.push(filteredObject(classification));
    });

    return totalObjects;
}
