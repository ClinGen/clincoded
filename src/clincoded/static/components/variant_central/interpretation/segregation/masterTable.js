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
        evidence_arr: PropTypes.array    // All pieces of evidence added to this variant
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

    getHeader(evidence_types) {
        let header = [];
        let first_row = [];
        let second_row = [];

        first_row.push(<td key="header_blank_row_1" style={{border: 'none'}} colSpan="2"></td>)
        Object.keys(evidence_types).forEach(evidence_type => {
            let num_items = evidence_types[evidence_type].length;
            first_row.push(<th colSpan={num_items} key={`header_category_${evidence_type}`} style={{textAlign: 'center'}}>
                {extraEvidence.typeMapping[evidence_type].name}
            </th>)
        });

        second_row.push(<th key="header.number" style={{border: 'none'}}>Evidence Type</th>);
        second_row.push(<th key="header.sums" style={{borderBottom: 'none', borderTop: 'none', borderLeft: 'none'}}>
            <div><span>Sum</span></div>
        </th>);
        Object.keys(evidence_types).forEach(evidence_type => {
            let rows = evidence_types[evidence_type];
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
                    second_row.push(<th key={`header.${evidence_detail}`}>
                        <div style={{textAlign: 'center'}}>
                            <span>{evidence_detail}</span>
                        </div>
                    </th>);
                }
            });
        });
        header.push(<tr key="header_row_1">{first_row}</tr>)
        header.push(<tr key="header_row_2">{second_row}</tr>);
        return header;
    },

    getRows(evidence_types) {
        let tds = [];
        let cell_num = 0;  // Used to set a key
        let sums = this.getSums();

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
            Object.keys(evidence_types).forEach(evidence_type => {
                let rows = evidence_types[evidence_type];
                rows.forEach(row => {
                    let rowNum = 0;
                    masterTable().forEach(masterRow => {
                        let val = row.source.data[masterRow.key];
                        let entry = <td key={`cell_${cell_num++}`}>
                            <div>{val}</div>
                        </td>
                        tds[rowNum].push(entry);
                        rowNum++;
                    });
                });
            });

        let result = [];
        let row_num = 0;
        tds.forEach(td_set => {
            result.push(<tr key={`row_${row_num++}`}>{td_set}</tr>);
        });
        return result;
    },

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
