'use strict';

// stdlib
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

// Internal
import { masterTable, extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
import { external_url_map } from 'components/globals';

let MasterEvidenceTable = createReactClass({
    propTypes: {
        evidence_arr: PropTypes.array,    // All pieces of evidence added to this variant
        affiliation: PropTypes.object,   // User's affiliation
        session: PropTypes.object       // Session object
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
            let evidence_type = row.source.metadata['_kind_key'];
            if (!(evidence_type in evidence_types)) {
                evidence_types[evidence_type] = this.props.evidence_arr.filter(row => row.source.metadata['_kind_key'] === evidence_type);
            }
        }
        return evidence_types;
    },

    // Return the order to display the source types in the table
    getTableEvidenceSourceOrder() {
        return ['PMID', 'clinical_lab', 'clinic', 'research_lab', 'public_database', 'other'];
    },

    /**
     * Return the three table header rows
     * First row - Evidence source type row
     * Second row - Evidence row
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

        first_row.push(<td key="header_blank_row_1" style={{border: 'none'}} colSpan="2"></td>)
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let num_items = evidence_types[evidence_type].length;
                first_row.push(<th colSpan={num_items} key={`header_category_${evidence_type}`} style={{textAlign: 'center'}}>
                    {extraEvidence.typeMapping[evidence_type].name}
                </th>)
            }
        });

        second_row.push(<th key="header.number" style={{border: 'none'}}>Evidence Type</th>);
        second_row.push(<th key="header.sums" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}></th>);
        third_row.push(<th key="header.user" style={{border: 'none'}}>Submitted by</th>);
        third_row.push(<th key="header.sums" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}>
            <div><span>Sum</span></div>
        </th>);
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let rows = evidence_types[evidence_type];
                let rowNum = 0;
                rows.forEach(row => {
                    if (row.source.metadata['_kind_key'] === 'PMID') {
                        let pmid = row.source.metadata.pmid;
                        let element = <a
                            href = {external_url_map['PubMed'] + pmid}
                            target = '_blank'
                            title = {`PubMed Article ID: ${pmid}`}
                        >
                            PMID {pmid}
                        </a>
                        second_row.push(<th key={`header_${row.uuid}.${pmid}`} style={{borderBottom: 'none'}}>
                            <div style={{textAlign: 'center'}}>
                                <span>{element}</span>
                            </div>
                        </th>)
                    } else {
                        let identifier = extraEvidence.typeMapping[row.source.metadata['_kind_key']].fields.filter(o => o.identifier === true)[0];
                        let evidence_detail = `${row.source.metadata[identifier.name]}`;
                        second_row.push(<th key={`header_${row.uuid}.${evidence_detail}`} style={{borderBottom: 'none'}}>
                            <div style={{textAlign: 'center'}}>
                                <span>{evidence_detail}</span>
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
            if ('criteria_codes' in row) {
                contents = `[${row['criteria_codes'].join(', ')}] ${contents}`;
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
            
            tds.push([label_td, sum_td]);  // Note we are pushing an array
        });

        // Middle columns
        // This needs to be the outer loop to ensure it lines up with our header
        tableOrder.forEach(evidence_type => {
            if (evidence_types[evidence_type]) {
                let rows = evidence_types[evidence_type];
                rows.forEach(row => {
                    let rowNum = 0;
                    masterTable().forEach(masterRow => {
                        let val = row.source.data[masterRow.key];
                        let entry = '';
                        // For text column, limit to column width and show full text when mouseover. 
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
