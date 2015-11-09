'use strict';
var React = require('react'),
    globals = require('./globals'),
    Table = require('./collection').Table;


var statusIconClassName = {
    'Created': 'icon icon-circle-o icon-in-progress',
    'In Progress': 'icon icon-dot-circle-o icon-in-progress',
    'Provisional': 'icon icon-adjust icon-in-progress',
    'Draft': 'icon icon-check-circle-o icon-in-progress',
    'Final': 'icon icon-check-circle icon-success',
    'Title': 'icon icon-circle'
};

statusIconClassName['Summary/Provisional Classifications'] = statusIconClassName['Provisional'];
statusIconClassName['Draft Classification'] = statusIconClassName['Draft'];
statusIconClassName['Final Classification'] = statusIconClassName['Final'];


var TableMetaView = function (matchCount, totalCount, state, handleKeyUp, clearFilter, searchTerm, searchSort, searchOrder) {
    var loading_or_notice;

    if (state.communicating) {
        loading_or_notice = <i className="icon icon-refresh icon-spin"></i>;
    } else {
        loading_or_notice = [
          <div className="col-lg-offset-1 col-lg-2 col-sm-4 col-xs-12 icon-legend"><i className={statusIconClassName["Created"]}></i> Created</div>,
          <div className="col-lg-2 col-sm-4 col-xs-12 icon-legend"><i className={statusIconClassName["In Progress"]}></i> In Progress</div>,
          <div className="col-lg-2 col-sm-4 col-xs-12 icon-legend"><i className={statusIconClassName["Provisional"]}></i> Provisional</div>,
          <div className="col-lg-2 col-sm-4 col-xs-12 icon-legend"><i className={statusIconClassName["Draft"]}></i> Draft</div>,
          <div className="col-lg-2 col-sm-4 col-xs-12 icon-legend"><i className={statusIconClassName["Final"]}></i> Final</div>
        ];
    }

    return (
        <div className="container">
            <div className="row table-header-search">
                <form ref="form" className="form-inline table-filter col-xs-12 col-sm-3 col-sm-offset-9 col-lg-2 col-lg-offset-10" onKeyUp={handleKeyUp}
                    data-skiprequest="true" data-removeempty="true">
                    <div className="form-group table-filter-input">
                        <input ref="searchTerm" disabled={state.communicating || undefined}
                            name="searchTerm" type="search" defaultValue={searchTerm}
                            className="form-control" id="table-filter" placeholder="Filter" />
                        { searchTerm ? <i className="icon icon-times-circle clear-input-icon" onClick={clearFilter}></i> : null }
                    </div>
                    <input ref="searchSort" type="hidden" name="searchSort" defaultValue={searchSort} />
                    <input ref="searchOrder" type="hidden" name="searchOrder" defaultValue={searchOrder} />
                </form>
            </div>
            <div className="row table-summary">
                {loading_or_notice}
            </div>
        </div>
    );
};

var GDM = React.createClass({

    columns: ['status', 'gene.symbol', 'participants',
              'last_annotations_modified', 'submitted_by.title', 'date_created'],

    guessColumns: function (props) {
        return this.columns;
    },

    lookupColumn: function (item, column) {
        var value;
        switch (column) {
            case 'gene.symbol':
                value = item['gene']['symbol'];
                break;
            case 'submitted_by.title':
                value = item['submitted_by']['title'];
                break;
            case 'participants':
                value = [];
                item['annotations'].forEach(function(anno) {
                    var title = anno['submitted_by']['title'];
                    if (value.indexOf(title) === -1) {
                        value.push(title);
                    }
                });
                value = value.join(', ');
                break;
            default:
                value = item[column];
                break;
        }
        return value;
    },

    rowView: function (props) {
        var tds,
            row = props.row,
            cells = row.cells,
            id = row.item['@id'],
            path = '/curation-central/?gdm=' + row.item['uuid'];

        tds = this.columns.map(function (column, index) {
            var inside,
                cell = cells[index],
                value = cell.value;
            switch (column) {
                case 'status':
                    var iconClass = statusIconClassName[value];
                    iconClass = iconClass ? iconClass : '';
                    inside = <i className={iconClass} title={value}></i>;
                    break;
                case 'gene.symbol':
                    value = value + ' - ' + row.item['disease']['term'];
                    inside = [<a href={path}>{value}</a>,
                              <div><em>{row.item['modeInheritance']}</em></div>];
                    break;
                case 'date_created':
                case 'last_annotations_modified':
                    inside = Date.parse(value);
                    inside = isNaN(inside) ? '' : new Date(inside).toLocaleString();
                    break;
                default:
                    inside = value;
            }
            return (
                <td key={index}>{inside}</td>
            );
        });
        return (
            <tr key={id} hidden={props.hidden} data-href={id}>{tds}</tr>
        );
    },

    columnTitleView: function (titles, column) {
        var result = [],
            title = titles[column] && titles[column]['title'] || column;
        switch (column) {
            case 'status':
                result.push(<i className={statusIconClassName['Title']} title={title}></i>);
                break;
            case 'gene.symbol':
                result.push(<div><strong>Gene - Disease</strong></div>);
                result.push(<div><em>Mode</em></div>);
                break;
            case 'date_created':
                result.push(<span>Created</span>);
                break;
            default:
                result = title;
                break;
        }
        return [result, column !== 'participants'];
    },

    render: function () {
        var context = this.props.context;
        return (
            <div>
                <div className="container">
                    <header className="row">
                        <div className="col-sm-12">
                            <h2>All Gene-Disease Records</h2>
                        </div>
                    </header>
                </div>
                <Table {...this.props} tableClassName="table-condensed gdm-table" TableMetaView={TableMetaView} guessColumns={this.guessColumns} lookupColumn={this.lookupColumn} RowView={this.rowView} ColumnTitleView={this.columnTitleView} />
            </div>
        );
    }
});

globals.content_views.register(GDM, 'gdm_collection');
