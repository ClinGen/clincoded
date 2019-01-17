'use strict';

// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';;

// third party lib
import _ from 'underscore';

// Internal lib
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';

let EvidenceTable = createReactClass({
    propTypes: {
        criteriaList: PropTypes.array,
        session: PropTypes.object,
        tableData: PropTypes.array,
        subcategory: PropTypes.string
    },

    getInitialState: function() {
        let tableFormat = _.find(extraEvidence.tableCols, (table) => table.subcategory == this.props.subcategory);
        return {
            tableFormat: tableFormat
        };
    },

    additionalEvidenceRows: function() {
        let i = 0;  // hack
        let rows = [];
        
        let colNames = this.state.tableFormat.cols.map(col => col.key);

        // tableData is an array of the entire new evidence object
        this.props.tableData.forEach(obj => {
            let inner =  [];
            colNames.forEach(col => {
                let node = <td key={`cell_${i++}`}>
                    {col in obj ? obj[col] : '' }
                </td>
                inner.push(node);
            });
            let outer = <tr key={`row_${i++}`}>{inner}</tr>
            rows.push(outer)
        })
        return rows;
    },

    tableHeader: function() {
        return this.state.tableFormat.cols.map(col => <th key={col.key}>{ col.title }</th>)
    },

    render() {
        if (this.props.tableData.length == 0) {
            return null;
        }
        return (
            <table className="table">
            <thead>
                <tr>
                    {this.tableHeader()}
                </tr>
            </thead>
            <tbody>
                {this.additionalEvidenceRows()}
            </tbody>
        </table>
        )
    }
});

module.exports = {
    EvidenceTable: EvidenceTable
}