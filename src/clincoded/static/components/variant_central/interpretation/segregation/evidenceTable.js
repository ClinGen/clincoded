'use strict';

// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';;

// third party lib
import _ from 'underscore';
import { Form, FormMixin, Input } from 'libs/bootstrap/form';
import { ContextualHelp } from 'libs/bootstrap/contextual_help';
import moment from 'moment';

// Internal lib
import { EvidenceModalManager } from 'components/variant_central/interpretation/segregation/evidenceModalManager';
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
import { external_url_map } from 'components/globals';

let EvidenceTable = createReactClass({
    propTypes: {
        tableData: PropTypes.array,                 // Evidence data for this table
        allData: PropTypes.array,                   // All extra evidence we've collected
        subcategory: PropTypes.string,
        deleteEvidenceFunc: PropTypes.func,
        evidenceCollectionDone: PropTypes.func
    },

    getInitialState: function() {
        let tableFormat = _.find(extraEvidence.tableCols(), (table) => table.subcategory == this.props.subcategory);

        return {
            tableFormat: tableFormat,
            rows: this.props.tableData,
            deleteBusy: false
        };
    },

    clickDelete(row) {
        this.setState({
            deleteBusy: true
        });
        this.props.deleteEvidenceFunc(row)
        .then(() => {
            this.setState({
                deleteBusy: false
            });
        });
    },

    additionalEvidenceRows: function() {
        let i = 0;  // hack
        let rows = [];
        
        let colNames = this.state.tableFormat.cols.map(col => col.key);
        // Don't read the kind_title property so we can handle each case separately.
        colNames.splice(colNames.indexOf('_kind_title'), 1);

        this.props.tableData.forEach(row => {
            let obj = row.source.data;
            obj['last_modified'] = row['last_modified'];
            obj['_kind_title'] = row.source.metadata['_kind_title']
            obj['relevant_criteria'] = row.source['relevant_criteria'].join(', ');
            obj['last_modified'] = moment(obj['last_modified']).format('YYYY MMM DD, h:mm a');
            obj['_submitted_by'] = row.source['_submitted_by'];

            let inner =  [];
            let nodeContent = null;
            if (row.source.metadata['_kind_key'] === 'PMID') {
                let pmid = row.source.metadata.pmid;
                nodeContent = <a
                        href = {external_url_map['PubMed'] + pmid}
                        target = "_blank"
                        title = {`PubMed Article ID: ${pmid}`}
                    >
                        PMID {pmid}
                    </a>
            } else {
                let content = Object.keys(row.source.metadata)
                    .filter(k => !k.startsWith('_'))
                    .map(k => row.source.metadata[k])
                    .join(', ');

                nodeContent = <span>
                    {obj['_kind_title']} <ContextualHelp content={content}></ContextualHelp>
                </span>;
            }
            inner.push(<td key={`cell_${i++}`}>{nodeContent}</td>)

            colNames.forEach(col => {
                nodeContent = null;
                if (col in obj) {
                    nodeContent = obj[col];
                }
                let node = <td key={`cell_${i++}`}>
                    {nodeContent}
                </td>
                inner.push(node);
            });

            let editButton = <td key={`edit_${i++}`} >
                <EvidenceModalManager
                    data = {row}
                    allData = {this.props.allData}
                    criteriaList = {row.source['relevant_criteria']}
                    evidenceType = {row.source.metadata['_kind_key']}
                    subcategory = {this.props.subcategory}
                    evidenceCollectionDone = {this.props.evidenceCollectionDone}
                    isNew = {false}
                >
                </EvidenceModalManager>
            </td>

            inner.push(editButton);

            let deleteKey = `delete+${i++}`;
            let deleteButton = <td key={deleteKey}>
                <Input 
                    type="button-button"
                    inputClassName="btn btn-danger"
                    title="Delete"
                    submitBusy={this.state.deleteBusy}
                    clickHandler={() => this.clickDelete(row)}
                />
            </td>;
            inner.push(deleteButton);

            let outer = <tr key={`row_${i++}`}>{inner}</tr>
            rows.push(outer)
            
        });
        return rows;
    },

    tableHeader: function() {
        let cols = this.state.tableFormat.cols.map(col => <th key={col.key}>{ col.title }</th>);
        cols.push(<th key="edit">Edit</th>)
        cols.push(<th key="delete">Delete</th>)
        return cols;
    },

    render() {
        if (this.props.tableData.length == 0) {
            return <div style={{paddingBottom: '5px'}}><span>&nbsp;&nbsp;No evidence added.</span></div>
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