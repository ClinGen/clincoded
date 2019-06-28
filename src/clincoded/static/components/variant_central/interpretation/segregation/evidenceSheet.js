'use strict';

// stdlib
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

// third-party lib
import ModalComponent from 'libs/bootstrap/modal';
import { Form, FormMixin, Input } from 'libs/bootstrap/form';
import _ from 'underscore';

// Internal lib
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
import { external_url_map } from 'components/globals';
import { RestMixin } from 'components/rest';

let EvidenceSheet = createReactClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        evidenceCollectionDone: PropTypes.func,
        ready: PropTypes.bool,
        data: PropTypes.object,         // Data relevant to this particular piece of evidence
        allData: PropTypes.object,      // All extra evidence across all entries for this variant
        isNew: PropTypes.bool,
        subcategory: PropTypes.string
    },

    getInitialState: function() {
        let data =  {};
        if (this.props.data) {
            data = this.props.data;
        }
        let case_db_data = {
            cases: []
        };
        return {
            data: data,
            hpo: null,
            backgroundGreen: '#00FF0030',
            case_db_data: case_db_data
        };
    },

    componentDidMount() {
        let uri = external_url_map['CASEDB'];
        uri = `${uri}/queries/variants/${this.props.variant.clinvarVariantId}`;
        let newState = {
            case_db_data: {
                cases: []
            }
        };
        this.getRestData(uri).then(res => {
            let returnObj = {
                changes: false
            };
            if (res.length > 0) {
                newState.case_db_data.cases = res;
                returnObj.changes = true;
                returnObj.newState = newState;
            }
            return returnObj;
        }).then(obj => {
            if (obj.changes === true) {
                this.setState(obj.newState);
            }
        });
    },

    handleModalClose() {
        this.child.closeModal();
    },

    cancel() {
        this.props.sheetDone(null);
        this.handleModalClose();
    },

    submitNewEvidence(e) {
        e.preventDefault();
        e.stopPropagation();

        this.saveAllFormValues();
        const formValues = this.getAllFormValues();
        let allData = null;
        if (this.props.isNew) {
            allData = Object.assign(this.props.data, formValues);
        } else {
            allData = Object.assign({}, this.props.data);
            Object.assign(allData, formValues);
        }
        this.handleModalClose();
        this.resetAllFormValues();
        this.setState({
            data: {}
        });
        this.props.sheetDone(allData);
    },

    /**
     * Given the subcategory, return a list of allowed fields.
     * This is used to highlight the input.
     */
    allowedFields() {
        let tableObj = _.find(extraEvidence.tableCols(), o => o.subcategory === this.props.subcategory);
        let fields = tableObj.cols.map(col => col.key);
        if (fields.indexOf('comments') != -1) {
            fields.splice(fields.indexOf('comments'), 1);
        }
        return fields;
    },

    inputs() {
        let jsx = [];
        let i = 0;
        let outerStyle = {
            'display': 'flex',
            'alignItems': 'flex-end'
        };

        // Get a list of allowed fields
        let fields = this.allowedFields();

        extraEvidence.evidenceInputs.forEach(row => {
            let inner = [];
            row.cols.forEach(col => {
                let value = '';
                if (this.state.data != null && Object.keys(this.state.data).length > 0) {
                    value = this.state.data[col.name]
                }

                // Set up the label for the input
                let codes = extraEvidence.fieldToCriteriaCodeMapping
                    .filter(obj => obj.key === col.name)
                    .map(obj => obj.codes);
                let label = col.label;
                if (codes.length > 0) {
                    label += ` (${codes.join(', ')})`;
                }

                let node = [<div className={`col-md-${col.width}`} key={i++}>
                    <Input 
                        type = {col.kind}
                        label = {label}
                        name = {col.name}
                        ref = {col.name}
                        value = {value}
                        fieldStyle = { fields.indexOf(col.name) == -1 ? null : {backgroundColor: this.state.backgroundGreen} }
                    />
                </div>]
                inner.push(node);
            });
            let outer = <div className="row" style={outerStyle} key={i++}>
                {inner}
            </div>
            jsx.push(outer);
        });
        return jsx;
    },

    renderLookupResult() {
        if (this.state.hpo == null) {
            return null;
        }
        let node = <div className="row">
            <p>
                <strong>{this.state.hpo.label}</strong>
                {this.state.hpo.description[0]}
            </p>
            <a 
                href={this.state.hpo.iri} 
                title={"Open HPO term " + this.state.hpo.short_form + " in new tab"}
                target="_blank"
            >
                {this.state.hpo.short_form}
            </a>
        </div>
        return node;
    },

    case_data() {
        if (this.state.case_db_data.cases.length === 0) {
            return null;
        }
        const header_titles = Object.keys(this.state.case_db_data.cases[0].case_data);    // e.g. ['diseases', 'symptoms', ...]
        const headers = header_titles.map(t => <th key={`case_db_header_${t}`}>{t}</th>)

        let rows = [];
        let row_num = 0;
        this.state.case_db_data.cases.forEach(v => {
            let this_row = [];
            header_titles.forEach(t => {
                this_row.push(<td key={`case_db_cell_${row_num}_${t}`}>{v.case_data[t]}</td>)
            });
            rows.push(<tr key={`case_db_row_${row_num}`}>{this_row}</tr>);
            row_num += 1;
        });

        return (
            <div>
                <div className="cdb-logo">
                    <span className="cdb-logo-text">Cases seen with this variant inside</span>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            {headers}
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
        );
    },

    render() {
        return  <ModalComponent
            modalTitle="Add Evidence Details"
            modalClass="modal-default"
            modalWrapperClass="input-inline add-resource-id-modal"
            onRef={ref => (this.child = ref)}
            disabled={!this.props.ready}
            modalOpen={this.props.ready}
            modalWidthPct={90}
        >
        <div className="form-std">
            <div className="modal-body">
                <h4>
                    Fields marked in a <span style={{backgroundColor: this.state.backgroundGreen}}>green background</span> are specifically relevant to this Criteria Code.
                </h4>
                <Form submitHandler={this.submitNewEvidence} formClassName="form-horizontal form-std">
                {this.inputs()}
                <div className="row">&nbsp;<br />&nbsp;</div>
                {this.case_data()}
                <div className='modal-footer'>
                    <Input type="submit" inputClassName="btn-default btn-inline-spacer" title="Submit" id="submit" />
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                </div>
                </Form>
            </div>
        </div>
        </ModalComponent>
    }
});

module.exports = {
    EvidenceSheet: EvidenceSheet
};
