'use strict';

// stdlib
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

// Internal
import { masterTable, extraEvidence } from './segregationData';
import { external_url_map } from '../../../globals';
import { EvidenceModalManager } from './evidenceModalManager';
import { DeleteEvidenceModal} from './deleteEvidenceModal';

let MasterEvidenceTable = createReactClass({
    propTypes: {
        evidence_arr: PropTypes.array,              // All pieces of evidence added to this variant
        affiliation: PropTypes.object,              // User's affiliation
        session: PropTypes.object,                  // Session object
        viewOnly: PropTypes.bool,                   // If the page is in read-only mode
        deleteEvidenceFunc: PropTypes.func,         // Function to call to delete an evidence
        evidenceCollectionDone: PropTypes.func,     // Fucntion to call to add or edit an existing one
        canCurrUserModifyEvidence: PropTypes.func   // Funcition to check if current logged in user can modify the given evidence
    },

    getInitialState() {
        return {
            rows: this.props.evidence_objects
        };
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.evidence_arr != null &&
            nextProps.evidence_arr != this.state.rows) {
                this.setState({
                    rows: nextProps.evidence_arr
                });
        }
    },

    getEvidenceTypes() {
        let evidence_types = {};
        for(let row of this.props.evidence_arr) {
            let evidence_type = row.source && row.source.metadata ? row.source.metadata['_kind_key'] : '';
            if (!(evidence_type in evidence_types)) {
                evidence_types[evidence_type] = this.props.evidence_arr.filter(row => row.source.metadata['_kind_key'] === evidence_type);
            }
        }
        return evidence_types;
    },

    /**
     * Check if current user can edit/delete the given evidence
     *
     * @param {object} row   The evidence row
     */
    canModify(row) {
        if (this.props.viewOnly === true) {
            return false;
        }
        return this.props.canCurrUserModifyEvidence(row);;
    },

    /**
     * Return the edit evidence button
     * 
     * @param {object} row       Evidence in this row
     */
    getEditButton(row) {
        return (
            <EvidenceModalManager
                data = {row}
                allData = {this.props.evidence_arr}
                criteriaList = {row.source['relevant_criteria']}
                evidenceType = {row.source.metadata['_kind_key']}
                subcategory = {row.subcategory}
                evidenceCollectionDone = {this.props.evidenceCollectionDone}
                isNew = {false}
                useIcon = {true}
                disableActuator = {false}
                affiliation = {this.props.affiliation}
                session = {this.props.session}
                canCurrUserModifyEvidence = {this.props.canCurrUserModifyEvidence}
            >
            </EvidenceModalManager>
        );
    },

    /**
     * Return the delete evidence button
     *
     * @param {object} row       Evidence in this row
     */
    getDeleteButton(row) {
        return (
            <DeleteEvidenceModal
                row = {row}
                useIcon = {true}
                deleteEvidence = {this.props.deleteEvidenceFunc}
                >
            </DeleteEvidenceModal>
        );
    },

    /**
     * Return the order to display the source types in the main table
     */
     getTableEvidenceSourceOrder() {
        return ['PMID', 'clinical_lab', 'clinic', 'research_lab', 'public_database', 'other'];
    },

    /**
     * Return the three table header rows
     * First row - Evidence source type row
     * Second row - Evidence row with edit and delete buttons if user can modify the evidence
     * Third row - Submitted by row
     * 
     * @param {array} evidence_types  All evidence source types
     */
    getHeader(evidence_types) {
        let header = [];
        let first_row = []; // Evidence source Type row
        let second_row = []; // Evidence row
        let third_row = []; // Submitted by row
        let tableOrder = this.getTableEvidenceSourceOrder();

        first_row.push(<td key="header_blank_row_1" style={{border: 'none'}} colSpan="3"></td>);
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let num_items = evidence_types[evidence_type].length;
                first_row.push(<th colSpan={num_items} key={`header_category_${evidence_type}`} style={{textAlign: 'center'}}>
                    {`${extraEvidence.typeMapping[evidence_type].name} (${num_items})`}

                </th>);
            }
        });
        second_row.push(<th key="header.codes" style={{borderBottom: 'none', borderTop: 'none', borderRight: 'none'}}></th>);
        second_row.push(<th key="header.number" style={{border: 'none'}}>Evidence Type</th>);
        second_row.push(<th key="header.sums" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}></th>);
        third_row.push(<th key="header.codes" style={{borderBottom: 'none', borderTop: 'none', borderRight: 'none'}}></th>);
        third_row.push(<th key="header.user" style={{border: 'none'}}>Submitted by</th>);
        third_row.push(<th key="header.sums" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}>
            <div><span>Sum</span></div>
        </th>);
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let rows = evidence_types[evidence_type];
                let rowNum = 0;
                rows.forEach(row => {
                    if (row.source && row.source.metadata && row.source.data) {
                        let editButton = null;
                        let deleteButton = null;
                        if (this.canModify(row)) {
                            editButton = this.getEditButton(row);
                            deleteButton = this.getDeleteButton(row);
                        }
                        if (row.source.metadata['_kind_key'] === 'PMID') {
                            let pmid = row.source.metadata.pmid;
                            let authorYear = '';
                            if (row.articles.length > 0) {
                                let article = row.articles[0];
                                let date = article && article.date ? (/^([\d]{4})/).exec(article.date) : [];
                                authorYear = date ? date[0] + '.' : '';
                                if (article && article.authors && article.authors.length) {
                                    authorYear = article.authors[0] + ', ' + authorYear;
                                }
                            }
                            let element = <a
                                href = {external_url_map['PubMed'] + pmid}
                                target = '_blank'
                                title = {`PubMed Article ID: ${pmid}`}
                            >
                                PMID {pmid}
                            </a>
                            second_row.push(<th key={`header_${row.uuid}.${pmid}`} style={{borderBottom: 'none'}}>
                                    <div style={{textAlign: 'center'}}>
                                        <span>{authorYear} {element}<div>{deleteButton}<div style={{display:'inline', float:'right'}}>{editButton}</div></div></span>
                                    </div>
                            </th>)
                        } else {
                            let identifier = extraEvidence.typeMapping[row.source.metadata['_kind_key']].fields.filter(o => o.identifier === true)[0];
                            let evidence_detail = `${row.source.metadata[identifier.name]}`;
                            second_row.push(<th key={`header_${row.uuid}.${evidence_detail}`} style={{borderBottom: 'none'}}>
                                <div style={{textAlign: 'center'}}>
                                    <span>{evidence_detail}<div>{deleteButton}<div style={{display:'inline', float:'right'}}>{editButton}</div></div></span>
                                </div>
                            </th>);
                        }
                        if (row.source['_submitted_by']) {
                            let submittedBy = row.source['_submitted_by'];
                            third_row.push(<th key={`header_${evidence_type}_${rowNum}.${row.uuid}`}>
                                <div style={{textAlign: 'center'}}>
                                    <span>{submittedBy}</span>
                                </div>
                            </th>);
                        }
                        rowNum++;
                    }
                });
            }
        });
        header.push(<tr key="header_row_1">{first_row}</tr>)
        header.push(<tr key="header_row_2">{second_row}</tr>);
        header.push(<tr key="header_row_3">{third_row}</tr>);
        return header;
    },

    /**
     * Return the evidence rows to be displayed in the table
     * 
     * @param {array} evidence_types All evidence source types
     */
    getRows(evidence_types) {
        let tds = [];
        let cell_num = 0;  // Used to set a key
        let sums = this.getSums();
        let tableOrder = this.getTableEvidenceSourceOrder();

        // Initialize the left-hand columns
        masterTable().forEach(row => {
            let contents = `${row.label}`;
            let code_td = <td></td>;

            if ('criteria_codes' in row && 'row_span' in row && row['row_span'] !== 0) {
                let codes = `${row['criteria_codes'].join(', ')}`;
                code_td = <td key={`cell_${cell_num++}`} style={{borderBottom: 'none'}}>
                    <div className={row['code_color']}>
                        <strong>{codes}</strong>
                    </div>
                </td>
            }
            // No table cell border if same source type
            if ('row_span' in row && row['row_span'] === 0) {
                code_td = <td style={{border: 'none'}}></td>;
            }
            let label_td = <td key={`cell_${cell_num++}`}>
                <div>
                    <strong>{contents}</strong>
                </div>
            </td>
            let sum_td = null;
            if (row.key in sums) {
                sum_td = <td key={`cell_${cell_num++}`}>
                    <div>{sums[row.key]}</div>
                </td>;
            } else {
                sum_td = <td key={`cell_${cell_num++}`}>
                    <div></div>
                </td>;
            }
            tds.push([code_td, label_td, sum_td]);  // Note we are pushing an array
        });

        // Middle columns
        // This needs to be the outer loop to ensure it lines up with our header
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let rows = evidence_types[evidence_type];
                rows.forEach(row => {
                    if (row.source && row.source.data) {
                        let rowNum = 0;
                        masterTable().forEach(masterRow => {
                            let val = row.source.data[masterRow.key];
                            let entry = '';
                            let key = masterRow.key;
                            // For text column, limit to column width and show full text when mouseover. 
                            if (key.endsWith('_comment') || key.startsWith('proband') || key === 'comments' || key === 'label') {
                                entry = <td key={`cell_${cell_num++}`}>
                                    <div className='title-ellipsis' title={val}>{val}</div>
                                </td>
                            } else if (key === 'is_disease_associated_with_probands') {
                                // Set checkmark for  "Disease associated with proband(s) (HPO) (Check here if unaffected)" if checked
                                let iconClass = val === true ? 'icon icon-check' : '';
                                entry = <td key={`cell_${cell_num++}`}>
                                    <div className={iconClass}></div>
                                </td>
                            } else {
                                entry = <td key={`cell_${cell_num++}`}>
                                    <div>{val}</div>
                                </td>
                            }
                            tds[rowNum].push(entry);
                            rowNum++;
                        });
                    }
                });
            }
        });

        let result = [];
        let row_num = 0;
        tds.forEach(td_set => {
            result.push(<tr key={`row_${row_num++}`}>{td_set}</tr>);
        });
        return result;
    },

    // Return the sum of all evidence for each criteria
    getSums() {
        let sums = {};
        this.props.evidence_arr.forEach(row => {
            if (row.source && row.source.data) {
                let data = row.source.data;
                Object.keys(data).forEach(name => {
                    if (name.startsWith('num_') && !name.endsWith('_comment')) {
                        let val = parseInt(data[name]);
                        if (Object.keys(sums).indexOf(name) === -1) {
                            if (isNaN(val)) {
                                sums[name] = 0;
                            } else {
                                sums[name] = val;
                            }
                        } else {
                            if (!isNaN(val)) {
                                sums[name] += val;
                            }
                        }
                    }
                })
            }
        });
        return sums;
    },

    render() {
        if (!this.props.evidence_arr || this.props.evidence_arr.length == 0) {
            return null;
        }
        this.getSums();
        let evidenceTypes = this.getEvidenceTypes();

        let table = <table className="table masterTable table-bordered">
            <thead>
                {this.getHeader(evidenceTypes)}
            </thead>
            <tbody>
                {this.getRows(evidenceTypes)}
            </tbody>
        </table>;
        return table;
    }
});

module.exports = {
    MasterEvidenceTable: MasterEvidenceTable
};
