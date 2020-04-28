'use strict';

// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// third party lib
import _ from 'underscore';
import { ContextualHelp } from '../../../../libs/bootstrap/contextual_help';
import moment from 'moment';

// Internal lib
import { EvidenceModalManager } from './evidenceModalManager';
import { DeleteEvidenceModal} from './deleteEvidenceModal';
import { extraEvidence } from './segregationData';
import { external_url_map } from '../../../globals';
import { PmidSummary } from '../../../curator';
import { getAffiliationName } from '../../../../libs/get_affiliation_name';

let EvidenceTable = createReactClass({
    propTypes: {
        tableData: PropTypes.array,                 // Evidence data for this table
        allData: PropTypes.array,                   // All extra evidence we've collected
        subcategory: PropTypes.string,              // subcategory (usually the panel) the evidence is part of
        deleteEvidenceFunc: PropTypes.func,         // Function to call to delete an evidence
        evidenceCollectionDone: PropTypes.func,     // Function to call to add or edit an evidence
        criteriaList: PropTypes.array,              // ACMG criteria
        session: PropTypes.object,                  // Session object
        affiliation: PropTypes.object,              // User's affiliation
        viewOnly: PropTypes.bool,                   // If the page is in read-only mode
        canCurrUserModifyEvidence: PropTypes.func   // Function to check if current logged in user can modify the given evidence
    },

    getInitialState() {
        let tableFormat = _.find(extraEvidence.tableCols(), (table) => table.subcategory == this.props.subcategory);

        return {
            tableFormat: tableFormat,
            rows: this.props.tableData,
        };
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
        return this.props.canCurrUserModifyEvidence(row);
    },

    /**
     * Return the criteria codes that are mapped with given column
     * 
     * @param {string} colKey  The column key
     */
    getCriteriaCodes(colKey) {
        let criteriaCodes = extraEvidence.fieldToCriteriaCodeMapping.filter(o => o.key === colKey);
        return criteriaCodes;
    },

    /**
     * Return the number of criteria that has value in this evidence
     * 
     * @param {object} source  The evidence source
     */
    getSubRowCount(source) {
        let count = 0;
        // The criteria under Specificity of phenotype panel has only one corresponding comment so display them on same row.
        // SubRowCount is 1.
        if (this.props.subcategory === 'specificity-of-phenotype') {
            count = 1;
        } else {
            if (source['relevant_criteria']) {
                let relevantData = _.find(extraEvidence.sheetToTableMapping, o => o.subcategory === this.props.subcategory);
                let cols = relevantData.cols.map(o => o.key);
                cols.forEach(col => {
                    const colComment = col + '_comment';
                    if ((source[col] && source[col] != '') || (source[colComment] && source[colComment] != '')) {
                        count++;
                    }
                });
            }
        }
        return count;
    },

    /**
     * Return the formatted source title for given evidence
     * 
     * @param {object} row  The evidence row data 
     */
    getSourceColumnContent(row) {
        let nodeContent = null;
        let metadata = row.sourceInfo.metadata;

        if (metadata['_kind_key'] === 'PMID') {
            if (row.articles.length > 0) {
                nodeContent = <PmidSummary
                    article = {row.articles[0]}
                    pmidLinkout
                />
            } else if (metadata.pmid) { 
                nodeContent = <a
                    href = {external_url_map['PubMed'] + metadata.pmid}
                    target = "_blank"
                    title = {`PubMed Article ID: ${metadata.pmid}`}
                >
                    PMID {pmid}
                </a>
            }
        } else {
            let content = null;
            let help = null;
            const separator = ', ';
            switch (metadata['_kind_key']) {
                case 'clinical_lab':
                    content = metadata.lab_name;
                    help = (metadata.clinvar_gtr_labid ? `Clinvar/GTR LabID: ${metadata.clinvar_gtr_labid}` : '') +
                           (metadata.clinvar_gtr_labid && metadata.clinvar_scv ? separator : '') +
                           (metadata.clinvar_scv ? `ClinVar Submission Accession (SCV): ${metadata.clinvar_scv}` : '');
                    break;
                case 'clinic':
                    content = metadata.institutional_affiliation;
                    help = (metadata.department_affiliation ? `Department Affiliation: ${metadata.department_affiliation}` : '') +
                           (metadata.department_affiliation && metadata.clinvar_gtr_labid ? separator : '') +
                           (metadata.clinvar_gtr_labid ? `Clinvar/GTR LabID: ${metadata.clinvar_gtr_labid}` : '') +
                           ((metadata.department_affiliation || metadata.clinvar_gtr_labid) && metadata.clinvar_scv ? separator : '') +
                           (metadata.clinvar_scv ? ` ClinVar Submission Accession (SCV): ${metadata.clinvar_scv}` : '');
                    break;
                case 'research_lab':
                    content = metadata.institutional_affiliation;
                    help = (metadata.department_affiliation ? `Department Affiliation/Principal Investigator: ${metadata.department_affiliation}` : '') +
                           (metadata.department_affiliation && metadata.clinvar_gtr_labid ? separator : '') +
                           (metadata.clinvar_gtr_labid ? ` Clinvar/GTR LabID: ${metadata.clinvar_gtr_labid}` : '') +
                           ((metadata.department_affiliation || metadata.clinvar_gtr_labid) && metadata.clinvar_scv ? separator : '') +
                           (metadata.clinvar_scv ? ` ClinVar Submission Accession (SCV): ${metadata.clinvar_scv}` : '');
                    break;
                case 'public_database':
                    content = metadata.name;
                    help = (metadata.url ? `URL: ${metadata.url}` : '') +
                           (metadata.url && metadata.variant_id ? separator : '') +
                           (metadata.variant_id ? ` Variant ID: ${metadata.variant_id}` : '') +
                           ((metadata.url || metadata.variant_id) && metadata.clinvar_gtr_labid ? separator : '') +
                           (metadata.clinvar_gtr_labid ? ` Clinvar/GTR LabID: ${metadata.clinvar_gtr_labid}` : '') +
                           ((metadata.url || metadata.variant_id || metadata.clinvar_gtr_labid) && metadata.clinvar_scv ? separator : '') +
                           (metadata.clinvar_scv ? ` ClinVar Submission Accession (SCV): ${metadata.clinvar_scv}` : '');
                    break;
                default:
                    content = Object.keys(metadata)
                        .filter(k => !k.startsWith('_'))
                        .map(k => metadata[k])
                        .join(', ');
                    break;
            }

            nodeContent = help && help.length
                ? <span>
                  {content} <ContextualHelp content={help}></ContextualHelp>
                  </span>
                : <span>{content}</span>;
        }

        return nodeContent;
    },

    /**
     * Return the edit evidence button for this row
     * 
     * @param {object} row       Evidence in this row
     */
    getEditButton(row) {
        return (
            <EvidenceModalManager
                data = {row}
                allData = {this.props.allData}
                criteriaList = {row.sourceInfo['relevant_criteria']}
                evidenceType = {row.sourceInfo.metadata['_kind_key']}
                subcategory = {this.props.subcategory}
                evidenceCollectionDone = {this.props.evidenceCollectionDone}
                isNew = {false}
                useIcon = {false}
                disableActuator = {false}
                affiliation = {this.props.affiliation}
                session = {this.props.session}
                canCurrUserModifyEvidence = {this.props.canCurrUserModifyEvidence}
            >
            </EvidenceModalManager>
        );
    },

    /**
     * Return the delete evidence button for this row
     * 
     * @param {object} row       Evidence in this row
     */
    getDeleteButton(row) {
        return (
            <DeleteEvidenceModal
                row = {row}
                useIcon = {false}
                deleteEvidence = {this.props.deleteEvidenceFunc}
                >
            </DeleteEvidenceModal>
        );
    },

    /**
     * Return the add/edit buttons for given row if current user can modify this evidence.
     * If not, return empty column.
     * 
     * @param {string} id       Table Column unique key
     * @param {object} row       Evidence in this row
     * @param {array}  rowTDs    The table row columns content
     * @param {number} rowspan   Number of rows to span in this button column
     */
    addButtons(id, row, rowTDs, rowspan=1) {
        if (this.canModify(row)) {
            let editButton = this.getEditButton(row);
            let deleteButton = this.getDeleteButton(row);
            let buttons = <td key={`editDelete_${id}`} rowSpan={rowspan}>
                {editButton} {deleteButton}
            </td>
            rowTDs.push(buttons);
        } else {
            rowTDs.push(<td key={`noEditDelete_${id}`}></td>);
        }
    },

    /**
     * Add the given criteria row data to table
     *
     * @param {string} criteria  The criteria name to be added
     * @param {object} colNames  The table columns 
     * @param {object} source       The evidence source
     * @param {number} key       Table column unique key
     */
    addAnotherCriteriaRow(criteria, colNames, source, key) {
        let i = 0; // Hack for table key
        let rowTDs = [];
        let rowTR = [];
        let criteriaName = '';

        colNames.forEach(col => {
            let node = null;
            let nodeContent = null;
            let criteriaCodes = this.getCriteriaCodes(col);
            if (col in source) {
                nodeContent = source[col];
            }
            if (criteriaCodes.length > 0) {
                // If this column is for given criteria, display its value
                if (col === criteria) {
                    node = <td key={`cell_${key++}`} style={{borderTop: 'none'}}>
                        {nodeContent}
                    </td>
                    criteriaName = col;
                }
                else {
                    // Other criteria, output blank column
                    rowTDs.push(<td key={`empty_cell_${key++}_${i++}`} style={{borderTop: 'none'}}></td>);
                }
            } else if (col === 'comments') {
                // Display the comment for given criteria
                let commentCol = criteriaName + '_comment';
                nodeContent = null;
                if (commentCol in source) {
                    nodeContent = source[commentCol];
                }
                node = <td className='word-break-all' key={`cell_${key++}`} style={{borderTop: 'none'}}>
                    {nodeContent}
                </td>
            }
            // Add column
            if (node) {
                rowTDs.push(node);
            }
        });
        rowTR = <tr key={`row_${key++}`}>{rowTDs}</tr>

        return rowTR;
    },

    /**
     * Display the evidences in the table for this panel
     */
    additionalEvidenceRows() {
        let i = 0;  // Hack for unique key
        let rows = [];

        let colNames = this.state.tableFormat && this.state.tableFormat.cols ? this.state.tableFormat.cols.map(col => col.key) : [];
        // Don't read the kind_title property so we can handle each case separately.
        colNames.splice(colNames.indexOf('_kind_title'), 1);
        let tableData = this.props.tableData.filter(item => item.status != 'deleted');

        tableData.forEach(row => {
            if (this.showRow(row)) {
                let sourceData = row.sourceInfo.data;
                let metadata = row.sourceInfo.metadata;
                sourceData['_kind_title'] = metadata['_kind_title']
                sourceData['relevant_criteria'] = this.props.criteriaList.join(', ');
                sourceData['_last_modified'] = moment(row['last_modified']).format('YYYY MMM DD, h:mm a');
                let affiliation = row.affiliation ? getAffiliationName(row.affiliation) : null;
                sourceData['_submitted_by'] = affiliation ? `${affiliation} (${row.submitted_by.title})` : `${row.submitted_by.title}`;

                // Get number of criteria that has value which determines the number of rows for this evidence
                let subRows = this.getSubRowCount(sourceData);
                let rowTDs = [];
                let otherCriteria = [];
                let criteriaName = '';

                // Add source column for this evidence
                rowTDs.push(<td key={`cell_${i++}`} rowSpan={subRows}>{this.getSourceColumnContent(row)}</td>);

                // The criteria under Specificity of phenotype panel has only one corresponding comment so display them on same row.
                if (this.props.subcategory === 'specificity-of-phenotype') {
                    colNames.forEach(col => {
                        let node = <td key={`empty_cell_${i++}`}></td>;
                        if (col in sourceData) {
                            if (sourceData.hpoData && sourceData.hpoData.length && col === 'proband_hpo_ids') {
                                let hpoData = sourceData.hpoData.map((hpo, i) => {
                                    return <p key={i}>{hpo.hpoTerm} ({hpo.hpoId})</p>
                                });
                                node = <td key={`cell_${i++}`}>
                                    {hpoData}
                                </td>
                            } else {
                                node = <td key={`cell_${i++}`}>
                                    {sourceData[col]}
                                </td>
                            }
                        }
                        if (col === 'comments') {
                            // Display the HPO comment
                            let nodeContent = null;
                            if ('proband_hpo_comment' in sourceData) {
                                nodeContent = sourceData['proband_hpo_comment'];
                            }
                            node = <td className='word-break-all' key={`cell_${i++}`}>
                                {nodeContent}
                            </td>
                        }
                        rowTDs.push(node);
                    });
                } else {
                    // For other panels, put each criteria on separate row.
                    // Add first available criteria in this evidence to the first row
                    colNames.forEach(col => {
                        const colComment = col + '_comment';
                        let node = null;
                        let nodeContent = null;
                        let criteriaCodes = this.getCriteriaCodes(col);
                        // If this is a criteria column, display the first criteria only
                        if (criteriaCodes.length > 0) {
                            // If this criteria column or its comment has value
                            if ((col in sourceData) || (colComment in sourceData)) {
                                // If this is the first criteria column that has value, display in first row
                                if (criteriaName === '') {
                                    // Display the criteria value if exists
                                    if (col in sourceData) {
                                        nodeContent = sourceData[col];
                                        node = <td key={`cell_${i++}`}>
                                            {nodeContent}
                                        </td>
                                    }
                                    else {
                                        node = <td key={`empty_cell_${i++}`}></td>;
                                    }
                                    // Set the criteria name which is used to get its comment later
                                    criteriaName = col;
                                } else {
                                    // If first row criteria has been set, display empty column
                                    // And add this criteria to the list that will be added later
                                    node = <td key={`empty_cell_${i++}`}></td>;
                                    otherCriteria.push(col);
                                }
                            } else {
                                // If criteria or its comment has no value, display empty column
                                node = <td key={`empty_cell_${i++}`}></td>;
                            }
                        } else if (col === 'comments') {
                            // Display the comment for current criteria in this column
                            let commentCol = criteriaName + '_comment';
                            if (commentCol in sourceData) {
                                nodeContent = sourceData[commentCol];
                            }
                            node = <td className='word-break-all' key={`cell_${i++}`}>
                                {nodeContent}
                            </td>
                        } else {
                            // Display value for other columns
                            if (col in sourceData) {
                                nodeContent = sourceData[col];
                            }
                            node = <td key={`cell_${i++}`} rowSpan={subRows}>
                                {nodeContent}
                            </td>
                        }
                        rowTDs.push(node);
                    });
                }
                // Add the edit/delete buttons if user can modify this evidence
                this.addButtons(i++, row, rowTDs, subRows);
                let rowTR = <tr key={`row_${i++}`}>{rowTDs}</tr>
                rows.push(rowTR);

                // Add other criteria rows if more is available for this evidence row.
                otherCriteria.forEach(criteria => {
                    rowTR = this.addAnotherCriteriaRow(criteria, colNames, sourceData, i);
                    rows.push(rowTR);
                    // Hack for unique key
                    i = i + 10;
                });
            }
        });
        return rows;
    },

    /**
     * Set the evidence table headers
     */
    tableHeader() {
        let cols = this.state.tableFormat && this.state.tableFormat.cols ? this.state.tableFormat.cols.map(col => {
            let criteriaCodes = this.getCriteriaCodes(col.key);
            if (criteriaCodes.length > 0) {
                criteriaCodes = criteriaCodes[0].codes;
                return <th key={col.key}>{`${col.title} [${criteriaCodes.join(',')}]`}</th>
            }
            return <th key={col.key}>{col.title}</th>;
        }) : [];
        cols.push(<th key="editDelete"></th>)
        return cols;
    },

    /**
     * Get the columns that are avaiable for this subcategory including their comment columns
     */
    getSubcategoryPanelColumns() {
        let relevantData = _.find(extraEvidence.sheetToTableMapping, o => o.subcategory === this.props.subcategory);
        let cols = relevantData && relevantData.cols ? relevantData.cols.map(o => o.key) : [];
        let commentCols = [];
        cols.forEach(o => {
            commentCols.push(o + '_comment');
        });
        cols = cols.concat(commentCols);

        return cols;
    },

    /**
     * Check if there is evidence to be displayed for this panel.
     */
    hasTableData() {
        // relevant columns non empty -> return true
        // relevant columns empty -> return False
        const foundData = this.props.tableData.some(row => {
            // Check if this row's columns have data to show
            if (this.showRow(row)) {
                return true;
            }
        });
        return foundData;
    },

    /**
     * Check if any of the columns in given row has value to be displayed
     * 
     * @param {object} row The evidence row
     */
    showRow(row) {
        let cols = this.getSubcategoryPanelColumns();
        const show = cols.some(col => {
            if (row.sourceInfo && row.sourceInfo.data && row.sourceInfo.data[col] && row.sourceInfo.data[col] != '') {
                return true;
            }
        });
        return show;
    },

    render() {
        if (this.props.tableData.length == 0 || !this.hasTableData()) {
            return (
                <table className="evidenceTable table">
                    <tbody>
                        <tr><td>No evidence added.</td></tr>
                    </tbody>
                </table>
            )
        }
        return (
            <table className="evidenceTable table">
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
