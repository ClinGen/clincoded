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
        evidenceCollectionDone: PropTypes.func,
        criteriaList: PropTypes.array,              // ACMG criteria
        session: PropTypes.object                   // Session object
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

    getEditButton: function(key, row) {
        let curr_user = this.props.session.user_properties['@id'];
        let created_user = row.submitted_by['@id'];
        let disableActuator = false;
        if (curr_user != created_user) {
            disableActuator = true;
        }
        return <td key={key} >
            <EvidenceModalManager
                data = {row}
                allData = {this.props.allData}
                criteriaList = {row.source['relevant_criteria']}
                evidenceType = {row.source.metadata['_kind_key']}
                subcategory = {this.props.subcategory}
                evidenceCollectionDone = {this.props.evidenceCollectionDone}
                isNew = {false}
                disableActuator = {disableActuator}
            >
            </EvidenceModalManager>
        </td>
    },

    getDeleteButton: function(deleteKey, row) {
        let curr_user = this.props.session.user_properties['@id'];
        let created_user = row.submitted_by['@id'];
        let disableActuator = false;
        if (curr_user != created_user) {
            disableActuator = true;
        }
        return <td key={deleteKey}>
            <Input 
                type="button-button"
                inputClassName="btn btn-danger"
                title="Delete"
                submitBusy={this.state.deleteBusy}
                clickHandler={() => this.clickDelete(row)}
                inputDisabled = {disableActuator}
            />
        </td>;
    },

    additionalEvidenceRows: function() {
        let i = 0;  // hack
        let rows = [];
        
        let colNames = this.state.tableFormat.cols.map(col => col.key);
        // Don't read the kind_title property so we can handle each case separately.
        colNames.splice(colNames.indexOf('_kind_title'), 1);

        let tableData = this.props.tableData.filter(item => item.status != 'deleted');

        tableData.forEach(row => {
            if (this.showRow(row)) {
                let obj = row.source.data;
                let metadata = row.source.metadata;
                obj['last_modified'] = row['last_modified'];
                obj['_kind_title'] = metadata['_kind_title']
                obj['relevant_criteria'] = this.props.criteriaList.join(', ');
                obj['last_modified'] = moment(obj['last_modified']).format('YYYY MMM DD, h:mm a');
                obj['_submitted_by'] = row.source['_submitted_by'];

                let inner =  [];
                let nodeContent = null;
                if (metadata['_kind_key'] === 'PMID') {
                    let pmid = metadata.pmid;
                    nodeContent = <a
                            href = {external_url_map['PubMed'] + pmid}
                            target = "_blank"
                            title = {`PubMed Article ID: ${pmid}`}
                        >
                            PMID {pmid}
                        </a>
                } else {
                    let content = null;
                    let help = null;
                    if (metadata['_kind_key'] === 'clinical_lab') {
                        content = metadata.lab_name;
                        help = `Clinvar/GTR LabID: ${metadata.clinvar_gtr_labid}, Contact: ${metadata.contact}`;
                    } else if (metadata['_kind_key'] === 'clinic') {
                        content = metadata.healthcare_provider;
                        help = `Institutional Affiliation: ${metadata.institutional_affiliation}, Department: ${metadata.department_affiliation}, ORCID ID: ${metadata.orcid_id}`;
                    } else if (metadata['_kind_key'] === 'research_lab') {
                        content = metadata.pi_lab_director;
                        help = `Institution: ${metadata.institution}, ORCID ID: ${metadata.orcid_id}`;
                    } else if (metadata['_kind_key'] === 'public_database') {
                        content = metadata.name;
                        help = metadata.url;
                    } else {
                        content = Object.keys(metadata)
                            .filter(k => !k.startsWith('_'))
                            .map(k => metadata[k])
                            .join(', ');
                        help = obj['_kind_title'];
                    }
                    nodeContent = <span>
                        {content} <ContextualHelp content={help}></ContextualHelp>
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

                let editButton = this.getEditButton(`edit_${i++}`, row)

                inner.push(editButton);

                let deleteKey = `delete+${i++}`;
                let deleteButton = this.getDeleteButton(deleteKey, row);
                inner.push(deleteButton);

                let outer = <tr key={`row_${i++}`}>{inner}</tr>
                rows.push(outer)
            }
        });
        return rows;
    },

    tableHeader: function() {
        let cols = this.state.tableFormat.cols.map(col => <th key={col.key}>{ col.title }</th>);
        cols.push(<th key="edit">Edit</th>)
        cols.push(<th key="delete">Delete</th>)
        return cols;
    },

    hasTableData: function() {
        // relevant columns non empty -> return true
        // relevant columns empty -> return False
        let relevantData = _.find(extraEvidence.sheetToTableMapping, o => o.subcategory === this.props.subcategory);
        let cols = relevantData.cols.map(o => o.key);
        let foundData = false;
        this.props.tableData.forEach(row => {
            let obj = row.source.data;
            if (foundData) {
                return;
            }
            cols.forEach(col => {
                if (obj[col] != '') {
                    foundData = true;
                    return;
                }
            });
        });
        return foundData;
    },

    showRow: function(row) {
        // relevant columns non empty -> return True
        // relevant columns empty -> return False
        let relevantData = _.find(extraEvidence.sheetToTableMapping, o => o.subcategory === this.props.subcategory);
        let cols = relevantData.cols.map(o => o.key);
        let show = false;
        cols.forEach(col => {
            if (row.source.data[col] != '') {
                show = true;
                return;
            }
        });
        return show;
    },

    render() {
        if (this.props.tableData.length == 0 || !this.hasTableData()) {
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