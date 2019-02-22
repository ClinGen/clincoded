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
        interpretation: PropTypes.object    // Master interpretation document
    },

    getInitialState() {
        return {
            rows: this.props.interpretation
        };
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.interpretation != null &&
            nextProps.interpretation.extra_evidence_list != null &&
            nextProps.interpretation.extra_evidence_list != this.state.rows) {
                this.setState({
                    rows: nextProps.interpretation.extra_evidence_list
                });
        }
    },

    getHeader() {
        let header = [];
        header.push(<th key="header.number" style={{border: 'none'}}>Evidence Type</th>);
        header.push(<th key="header.sums" className="rotate">
            <div><span>Sum</span></div>
        </th>);
        this.state.rows.forEach(row => {
            if (row.source.metadata['_kind_key'] === 'PMID') {
                let pmid = row.source.metadata.pmid;
                let element = <a
                    href = {external_url_map['PubMed'] + pmid}
                    target = '_blank'
                    title = {`PubMed Article ID: ${pmid}`}
                >
                    PMID {pmid}
                </a>
                header.push(<th key={`header.${pmid}`} className="rotate"><div><span>{element}</span></div></th>)
            } else {
                let evidence_category = row.source.metadata['_kind_title'];
                let identifier = extraEvidence.typeMapping[row.source.metadata['_kind_key']].fields.filter(o => o.identifier === true)[0];
                let evidence_detail = `${identifier.description}: ${row.source.metadata[identifier.name]}`;
                let s = `${evidence_category} (${evidence_detail})`;
                header.push(<th key={`header.${evidence_detail}`} className="rotate"><div><span>{s}</span></div></th>);
            }
        });
        return header;
    },

    getRows() {
        let tds = [];
        let cell_num = 0;  // Used to set a key
        let sums = this.getSums();

        // Initialize the left-hand columns
        masterTable().forEach(row => {
            let label_td = <td key={`cell_${cell_num++}`}><strong>{row.label}</strong></td>
            let sum_td = null;
            if (row.key in sums) {
                sum_td = <td key={`cell_${cell_num++}`}>{sums[row.key]}</td>;
            } else {
                sum_td = <td key={`cell_${cell_num++}`}></td>;
            }
            
            tds.push([label_td, sum_td]);  // Note we are pushing an array
        });

        // Middle columns
        // This needs to be the outer loop to ensure it lines up with our header
        this.state.rows.forEach(row => {
            let rowNum = 0;
            masterTable().forEach(masterRow => {
                let val = row.source.data[masterRow.key];
                let entry = <td key={`cell_${cell_num++}`}>
                    {val}
                </td>
                tds[rowNum].push(entry);
                rowNum++;
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
        this.state.rows.forEach(row => {
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
        if (!this.state.rows || this.state.rows.length == 0) {
            return null;
        }
        this.getSums();

        let table = <table className="table masterTable table-bordered">
            <thead>
                <tr>
                    {this.getHeader()}
                </tr>
            </thead>
            <tbody>
                {this.getRows()}
            </tbody>
        </table>;
        return table;
    }
});

module.exports = {
    MasterEvidenceTable: MasterEvidenceTable
};
