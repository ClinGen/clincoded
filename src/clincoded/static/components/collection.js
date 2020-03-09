'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { parseAndLogError } from './mixins';
import { RestMixin } from './rest';
import { content_views, listing_titles, bindEvent, unbindEvent } from './globals';
import { Input, Form, FormMixin } from '../libs/bootstrap/form';
import { exportCSV } from '../libs/export_csv';

/**
 * This file is used to display collection data in a table format
 * 
 * One of the primary uses of this page is through /users/
 * It is used to activate or deactivate users
 */


var lookup_column = function (result, column) {
    var value = result;
    var names = column.split('.');
    for (var i = 0, len = names.length; i < len && value !== undefined; i++) {
        value = value[names[i]];
    }
    return value;
};

var Collection = module.exports.Collection = createReactClass({
    render: function () {
        var context = this.props.context;
        return (
            <div>
                <div className="container">
                    <header className="row">
                        <div className="col-sm-12">
                            <h2>{context.title}</h2>
                        </div>
                    </header>
                    <p className="description">{context.description}</p>
                </div>
                <Table {...this.props} />
            </div>
        );
    }
});

content_views.register(Collection, 'collection');

const Table = module.exports.Table = createReactClass({
    mixins: [FormMixin, RestMixin],
    
    contextTypes: {
        fetch: PropTypes.func
    },

    propTypes: {
        href: PropTypes.string,
        columns: PropTypes.array,
        href_url: PropTypes.object,
        context: PropTypes.object,
        defaultSortOn: PropTypes.number
    },


    getDefaultProps: function () {
        return {
            defaultSortOn: 0
        };
    },

    getInitialState: function () {
        const { sortColumn, reversed, searchTerm } = this.extractParams(this.props);
        return {
            sortColumn,
            reversed,
            searchTerm,
            rows: [],
            columns: [],
            communicating: true,
            modifiedUsers: [],
            allRequest: '',
            submitBusy: false,
            updateMsg: null,
        };
    },

    componentDidMount: function () {
        const columns = this.getColumns(this.props);
        this.fetchAll(this.props, columns);
    },

    componentWillReceiveProps: function (nextProps) {
        let updateData = false;
        if (nextProps.context !== this.props.context) {
            updateData = true;
            this.fetchAll(nextProps);
        }
        if (nextProps.columns !== this.props.columns) {
            updateData = true;
        }
        if (updateData) {
            const columns = this.getColumns(nextProps);
            this.extractData(nextProps, columns);
        }
        if (nextProps.href !== this.props.href) {
            const { sortColumn, reversed, searchTerm } = this.extractParams(nextProps);
            this.setState({ sortColumn, reversed, searchTerm });
        }
    },

    componentWillUnmount: function () {
        if (typeof this.submitTimer != 'undefined') {
            clearTimeout(this.submitTimer);
        }
        var request = this.state.allRequest;
        if (request) request.abort();
    },

    /**
     * Return query parameters
     * @param {object} props Component props
     */
    extractParams: function(props) {
        const params = url.parse(props.href, true).query;
        let sortColumn = parseInt(params.sorton, 10);
        if (isNaN(sortColumn)) {
            sortColumn = props.defaultSortOn;
        }
        return {
            sortColumn,
            reversed: params.reversed || false,
            searchTerm: params.q || ''
        };
    },

    /**
     * Generates columns based on the columns found in `context`
     * @param {object} props Component props
     */
    getColumns: function (props) {
        const columnList = props.context.columns;
        let columns = [];
        if (!columnList || Object.keys(columnList).length === 0) {
            for (let key in props.context['@graph'][0]) {
                if (key.slice(0, 1) !== '@' && key.search(/(uuid|_no|accession)/) == -1) {
                    columns.push(key);
                }
            }
            columns.sort();
            columns.unshift('@id');
        } else {
            for(let column in columnList) {
                columns.push(column);
            }
        }
        this.setState({ columns });
        return columns;
    },

    /**
     * Formats datetime string using moment
     * @param {string} datetime datetime string to be formatted
     */
    getFormattedDate: function (datetime) {
        return moment(datetime).format('YYYY-MM-DD h:mm:ssa');
    },

    /**
     * Return true if @value is a date string in ISO 8601 format
     * otherwise return false
     * @param {string} value string to be validated
     */
    isValidDate: function(value) {
        return moment(value, moment.ISO_8601).isValid();
    },

    /**
     * Fetches data if `context` contains property `all`, otherwise extract data from context
     * @param {object} props Component props
     * @param {array} columns Passed along to data processing function, extractData
     */
    fetchAll: function (props, columns) {
        const context = props.context;
        let request = this.state.allRequest;
        if (request) {
            request.abort();
        }
        if (context.all) {
            this.getRestData(context.all).then(response => {
                this.extractData({ context: response, defaultSortOn: this.props.defaultSortOn }, columns);
                this.setState({ allRequest: request, communicating: false });
            }).catch((err) => {
                parseAndLogError.bind(undefined, 'allRequest');
                this.setState({ communicating: false });
            });
        } else {
            this.extractData(props, columns);
            this.setState({ communicating: false });
        }
    },

    /**
     * Processes data into desired data structure
     * @param {object} props Component props
     * @param {array} columns List of columns used to lookup values
     */
    extractData: function (props, columns) {
        const context = props.context;
        columns = columns || this.state.columns;
        const rows = context['@graph'].map((item) => {
            const cells = columns.map((column) => {
                let factory;
                let value = lookup_column(item, column);
                if (column == '@id') {
                    factory = listing_titles.lookup(item);
                    value = factory({context: item});
                } else if (_.isEmpty(value)) {
                    value = '';
                } else if (value['@type']) {
                    factory = listing_titles.lookup(value);
                    value = factory({ context: value });
                }
                const sortable = ('' + value).toLowerCase();
                return { value, sortable };
            });
            const text = cells.map((cell) => {
                const cellValue = this.isValidDate(cell.value) ? this.getFormattedDate(cell.value) : cell.value;
                return cellValue;
            }).join(' ').toLowerCase();
            return { item, cells, text };
        });
        const { href_url } = this.props;
        const sortedRows = href_url && href_url.path && href_url.path.includes('/users/')
            ? this.sortRows(rows, 6, true)
            : this.sortRows(rows, props.defaultSortOn, false);
        this.setState({ rows: sortedRows });
    },

    /**
     * Sort rows based on the `sortable` property of `cells` in the rows.
     * Sets new value of @sortColumn and @reversed to the state
     * @param {array} rows Data to sort
     * @param {number} sortColumn Column number to sort
     * @param {boolean} reverse Used to set in ascending or descending order
     */
    sortRows: function (rows, sortColumn, reverse) {
        const reversed = !!reverse;
        const rowsCopy = rows ? JSON.parse(JSON.stringify(rows)) : [];
        if (Array.isArray(rowsCopy)) {
            rowsCopy.sort((rowA, rowB) => {
                const a = '' + rowA.cells[sortColumn].sortable.trim();
                const b = '' + rowB.cells[sortColumn].sortable.trim();
                if (a < b) {
                    return reversed ? 1 : -1;
                } else if (a > b) {
                    return reversed ? -1 : 1;
                }
                return 0;
            });
            this.setState({ sortColumn, reversed });
            return rowsCopy;
        }
    },

    clearFilter: function (event) {
        this.refs.q.value = '';
        this.submitTimer = setTimeout(this.submit);
    },

    handleKeyUp: function (event) {
        if (typeof this.submitTimer != 'undefined') {
            clearTimeout(this.submitTimer);
        }
        // Skip when enter key is pressed
        if (event.nativeEvent.keyCode === 13) return;
        // IE8 should only submit on enter as page reload is triggered
        if (!this.hasEvent) return;
        this.submitTimer = setTimeout(this.submit, 200);
    },

    hasEvent: typeof Event !== 'undefined',

    handleClickHeader: function (event) {
        event.preventDefault();
        event.stopPropagation();
        let target = event.target;
        while (target.tagName !== 'TH') {
            target = target.parentElement;
        }
        const cellIndex = target.cellIndex;
        let reversed = '';
        let sortColumn = this.refs.sorton;
        if (this.props.defaultSortOn !== cellIndex) {
            sortColumn.value = cellIndex;
        } else {
            sortColumn.value = '';
        }
        if (this.state.sortColumn == cellIndex) {
            reversed = !this.state.reversed || '';
        }
        this.refs.reversed.value = reversed;
        const rows = this.sortRows(this.state.rows, cellIndex, reversed);
        this.setState({ rows });
        this.submit();
    },

    submit: function () {
        // form.submit() does not fire onsubmit handlers...
        let target = this.refs.form;

        // IE8 does not support the Event constructor
        if (!this.hasEvent) {
            target.submit();
            return;
        }

        const event = new Event('submit', { bubbles: true, cancelable: true });
        target.dispatchEvent(event);
    },

    /**
     * Generates data format for CSV export based on @rows and triggers a download of the CSV
     * This function is specific to exporting a CSV for users in /users/
     * @param {array} users Desired users for CSV export
     */
    handleExportUsers: function(users) {
        const formattedUsers = [];
        if (users.length) {
            users.map(row => {
                formattedUsers.push({
                    'Email': row.item.email,
                    'Affiliation': row.item.affiliation.join('; '),
                    'First Name': row.item.first_name,
                    'Last Name': row.item.last_name,
                    'User Status': row.item.user_status,
                    'Creation Date': this.getFormattedDate(row.item.date_created)
                });
            });
            exportCSV(formattedUsers, { filename: 'users-export.csv' });
        }
    },
    
    /**
     * Makes a PUT call per user that is modified. Sets feedback message to state for display
     * This function is specific to saving changes to the user in /users/
     * @param {Event} e Submit event
     */
    handleSaveUserStatuses: function(e) {
        e.stopPropagation();
        e.preventDefault();
        const { modifiedUsers } = this.state;
        this.setState({ submitBusy: true }, () => {
            Promise.all(modifiedUsers.map((user) => {
                const formattedUser = _.omit(user, ['@id', '@type', 'title']);
                return this.putRestData(user['@id'], formattedUser);
            })).then(response => {
                this.setState({ submitBusy: false, updateMsg: 'Saved!', modifiedUsers: [] });
            }).catch(err => {
                console.log(err);
                this.setState({ submitBusy: false, updateMsg: 'Error, please try again!' });
            });
        });
    },

    /**
     * Changes the status within a user and modifies local state that tracks users that have been modified
     * This function is specific to handling changes to user status in /users/
     * @param {string} ref String value of the specific input field that was changed
     * @param {Event} e onChange event
     * @param {number} cellIndex This gives us the index of the cell that needs to be modified
     */
    handleStatusChange: function(ref, e, cellIndex) {
        if (_.isEmpty(this.state.modifiedUsers)) {
            // Reset update message if there is new change
            this.setState({ updateMsg: null });
        }
        const rows = this.state.rows ? JSON.parse(JSON.stringify(this.state.rows)) : [];
        if (rows.length) {
            const newStatus = this.refs[ref].getValue();
            const rowIndex = rows.findIndex(row => row.item['@id'] === ref);
            if (rowIndex > -1 && cellIndex > -1) {
                const currentRow = rows[rowIndex];
                const oldStatus = currentRow.item.user_status.toLowerCase();
                // Set the @user_status and cell values to the @newStatus
                currentRow.item.user_status = newStatus;
                currentRow.cells[cellIndex] = { value: newStatus, sortable: newStatus };
                // Replace old status with new status in the text string
                const newText = currentRow.text.replace(oldStatus, newStatus);
                currentRow.text = newText;
                const newRows = Object.assign(this.state.rows, rows);
                // Check @userStatusChange state array to see if it already exists
                const { modifiedUsers } = this.state;
                const existingRowIndex = modifiedUsers.findIndex(user => user['@id'] === currentRow.item['@id']);
                const modifiedUsersCopy = JSON.parse(JSON.stringify(modifiedUsers));
                if (existingRowIndex > -1) {
                    // Remove the previous entry and push new edited entry
                    modifiedUsersCopy.splice(existingRowIndex, 1, currentRow.item);
                } else {
                    // If it is not found, add the edited item to the array
                    modifiedUsersCopy.push(currentRow.item);
                }
                this.setState({ modifiedUsers: modifiedUsersCopy, rows: newRows });
            }
        }
    },

    /**
     * Formats cells based on the type of data and returns the JSX of a table row containing a list of table data
     * @param {object} row Contains data used to determine what type cell to be rendered 
     * @param {boolean} hidden Value to determine whether the row should be displayed
     */
    renderRow: function(row, hidden = false) {
        const id = row.item['@id'];
        const tds = row.cells.map((cell, index) => {
            const cellValue = (typeof cell.value === 'object') ? cell.value.join(', ') : cell.value;
            if (index === 0) {
                return (
                    <td key={index}><a href={row.item['@id']}>{cellValue}</a></td>
                );
            }
            // If the current @cellValue is a valid date, format the date
            if (this.isValidDate(cellValue)) {
                return (
                    <td key={index}>{ this.getFormattedDate(cellValue) }</td>
                );
            }
            // If the current @cellValue is the same as the user_status, render a select field
            if (row.item && row.item.user_status === cellValue) {
                return (
                    <td key={index}>
                        <Input
                            type="select"
                            ref={id}
                            defaultValue={cellValue}
                            handleChange={(ref, e) => this.handleStatusChange(ref, e, index)}
                        >
                            <option hidden value="requested activation">Requested Activation</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </Input>
                    </td>
                );
            }
            return (
                <td key={index}>{cellValue}</td>
            );
        });
        return (
            <tr key={id} hidden={hidden} data-href={id}>{tds}</tr>
        );
    },

    render: function () {
        const {
            rows,
            sortColumn,
            reversed,
            columns,
            searchTerm,
            communicating,
            updateMsg,
        } = this.state;
        const { context, defaultSortOn, href_url } = this.props;
        const titles = context.columns || {};
        const total = context.count || rows && rows.length;
        const searchTermLower = searchTerm.trim().toLowerCase();
        let matchingRows;
        let matching = [];
        const notMatching = [];
        if (rows && rows.length) {
        // Reorder rows so that the nth-child works
            if (searchTermLower) {
                rows.forEach((row) => {
                    if (row.text.indexOf(searchTermLower) == -1) {
                        notMatching.push(row);
                    } else {
                        matching.push(row);
                    }
                });
            } else {
                matching = rows;
            }
            matchingRows = matching.map(row => this.renderRow(row));
            // Add the non-matching rows to the array and set them as hidden rows
            matchingRows.push.apply(matchingRows, notMatching.map((row) => {
                return this.renderRow(row, true);
            }));
        }

        const tableTotal = communicating
            ? <i className="icon icon-refresh icon-spin"></i>
            : <span>Displaying {matching.length} of {total} records</span>;

        const headers = columns.map((column, index) => {
            let className;
            if (index === sortColumn) {
                className = reversed ? "tcell-desc" : "tcell-asc";
            } else {
                className = "tcell-sort";
            }
            return (
                <th onClick={this.handleClickHeader} key={index}>
                    { titles[column] && titles[column]['title'] || column }
                    <i className={className} />
                </th>
            );
        });

        const disableExport = matchingRows && matchingRows.length < 1;
        const isUserPage = href_url && href_url.path && href_url.path.includes('/users/');

        return (
            <div>
                <div className="table-meta">
                    <div className="container">
                        <div className="row table-summary">
                            <div className="col-sm-6 table-count">
                                { tableTotal }
                            </div>
                            <div className="col-sm-6 table-filter">
                                <div className="table-filter-input">
                                    {
                                        isUserPage
                                            && (
                                                <span className="download-button export-button-spacing">
                                                    <button onClick={() => this.handleExportUsers(matching)} className="btn btn-default btn-sm" disabled={disableExport}>
                                                        Download .csv <i className="icon icon-download"></i>
                                                    </button>
                                                </span>
                                            )
                                    }
                                    <form
                                        ref="form"
                                        className="form-inline"
                                        onKeyUp={this.handleKeyUp}
                                        data-skiprequest="true"
                                        data-removeempty="true"
                                    >
                                        <label htmlFor="table-filter">Filter table by:</label>
                                        <input ref="q" disabled={communicating || undefined}
                                            name="q" type="search" defaultValue={searchTerm} 
                                            className="form-control" id="table-filter" /> 
                                        <i className="icon icon-times-circle clear-input-icon" hidden={!searchTerm} onClick={this.clearFilter}></i>
                                    </form>
                                </div>
                                <input ref="sorton" type="hidden" name="sorton" defaultValue={sortColumn !== defaultSortOn ? sortColumn : ''} />
                                <input ref="reversed" type="hidden" name="reversed" defaultValue={!!reversed || ''} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="container">
                    <div className="table-responsive">
                        <Form>
                            <table className="table table-striped table-bordered table-condensed sticky-area">
                                <thead className="sticky-header">
                                    <tr className="col-headers">
                                        { headers }
                                    </tr>
                                </thead>
                                <tbody>
                                    { matchingRows }
                                </tbody>
                            </table>
                        </Form>
                    </div>
                </div>
                {
                    isUserPage
                        &&  (
                            <div className="fixed-save-button">
                                <Form submitHandler={this.handleSaveUserStatuses} formClassName="container input-wrapper">
                                    {
                                        updateMsg
                                            && <div className="submit-feedback">{ updateMsg }</div>
                                    }
                                    <Input
                                        type="submit"
                                        inputClassName="btn-default"
                                        id="submit"
                                        title="Submit"
                                        submitBusy={this.state.submitBusy}
                                        disabled={communicating}
                                    />
                                </Form>
                            </div>
                        )
                }
            </div>
        );
    }
});
