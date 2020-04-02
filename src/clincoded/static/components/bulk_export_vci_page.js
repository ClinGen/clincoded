import React, { Component } from "react";
import createReactClass from 'create-react-class';
import moment from "moment";
import { showActivityIndicator } from './activity_indicator'
import PropTypes from 'prop-types';
import { RestMixin } from "./rest";
import { renderVariantTitle } from '../libs/render_variant_title';
import { curator_page, getQueryUrl } from "./globals";

const BulkExportVCIPage = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        // session: PropTypes.object,
        affiliation: PropTypes.object,
    },

    contextTypes: {
        fetch: PropTypes.func
    },

    getInitialState() {
        return {
            searchTerm: '',
            exportResponse: {},
            interpretations: []
        };
    },

    sortDir() {
        alert('sort clicked!');
    },

    handleChange(e) {
        this.setState({searchTerm: e.target.value});
    },

    export(e) {
        const url = getQueryUrl(
            '/bulk_export_vci', [
                ['type', 'interpretation'],
                ['affiliation', this.props.affiliation.affiliation_id],
            ]
        );

        return this.getRestData(url, undefined, undefined, true).then((res) => {
            console.log(res);
            this.setState({ exportResponse: res, interpretations: res['@graph'] });
        }).catch((error) => {
            alert(`error! ${JSON.stringify(error, null, 4)}`)
            console.error(error);
        });
    },

    render() {
        const sortIconClass = {};
    
        return (
            <div className="container">
                <div className="row gdm-header">
                    <div className="col-sm-12 col-md-8">
                        <h1>
                            Bulk Export VCI Data{" "}
                            <span className="number-of-entries">
                                {" "}
                                number of entries: {this.state.interpretations.length}{" "}
                            </span>{" "}
                        </h1>
                    </div>
                </div>
    
                <div className="row">
                    <div className="col-sm-12">
                        <input
                            type="text"
                            name="filterTerm"
                            id="filterTerm"
                            placeholder="Filter by Variant, Disease, or Creator"
                            value={this.state.searchTerm}
                            onChange={this.handleChange}
                            className="form-control"
                        />
                    </div>
                </div>

                <div className="row">
                    <button type="button" className="btn btn-default btn-sm" onClick={this.export}>Export</button>
                </div>

                <div className="row">
                    <section className="col-sm-12">
                        <pre>{JSON.stringify(this.state.exportResponse, null, 4).slice(0, 500) + `...`}</pre>
                    </section>
                </div>
    
                <div className="table-responsive">
                    <div className="table-gdm">
                        <div className="table-header-gdm">
                            <div
                                className="table-cell-gdm-main tcell-sortable"
                                onClick={this.sortDir.bind(null, "variant")}
                            >
                                <div>
                                    Variant Preferred Title
                                    <span className={sortIconClass.variant}></span>
                                </div>
                                <div>Variant ID(s)</div>
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "gene_title")}
                            >
                                Gene
                                {/* <span className={sortIconClass.disease}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "status")}
                            >
                                Status
                                {/* <span className={sortIconClass.disease}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "classification")}
                            >
                                Classification
                                {/* <span className={sortIconClass.disease}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "approve_date")}
                            >
                                Approve Date
                                {/* <span className={sortIconClass.disease}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "disease")}
                            >
                                Disease
                                <span className={sortIconClass.disease}></span>
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "moi")}
                            >
                                Mode of Inheritance
                                <span className={sortIconClass.moi}></span>
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "evidence_summary")}
                            >
                                Evidence Summary
                                {/* <span className={sortIconClass.disease}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "creator")}
                            >
                                Creator
                                <span className={sortIconClass.creator}></span>
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "contributors")}
                            >
                                Contributors
                                {/* <span className={sortIconClass.creator}></span> */}
                            </div>
                            <div
                                className="table-cell-gdm tcell-sortable"
                                onClick={this.sortDir.bind(null, "created")}
                            >
                                Created
                                <span className={sortIconClass.created}></span>
                            </div>
                        </div>
    
                        {/* {showActivityIndicator("Loading... ")} */}
    
                        {this.state.interpretations.map((interpretation, index) => {
                            console.log('map', interpretation);
                            return (
                                <a
                                    className="table-row-gdm"
                                    href={
                                        "/variant-central/?variant=" +
                                        interpretation.variant.uuid
                                    }
                                    // key={interpretation.interpretation_uuid}
                                    key={index}
                                >
                                    <div className="table-cell-gdm-main">
                                        <div>
                                            {renderVariantTitle(
                                                interpretation.variant
                                            )}
                                        </div>
                                        <div>
                                            {interpretation.variant.clinvarVariantId ? (
                                                <span>
                                                    ClinVar Variation ID:{" "}
                                                    <strong>
                                                        {
                                                            interpretation.variant.clinvarVariantId
                                                        }
                                                    </strong>
                                                </span>
                                            ) : null}
                                            {interpretation.variant.clinvarVariantId &&
                                            interpretation.variant.carId
                                                ? " // "
                                                : null}
                                            {interpretation.variant.carId ? (
                                                <span>
                                                    ClinGen Allele Registry ID:{" "}
                                                    <strong>
                                                        {interpretation.variant.carId}
                                                    </strong>
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.interpretation_genes ? (
                                            <span>
                                                {interpretation.interpretation_genes}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.interpretation_status ? (
                                            <span>
                                                {interpretation.interpretation_status}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        ?Current classification?
                                    </div>
                                    <div className="table-cell-gdm">
                                        ?Approve Date?
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.disease && interpretation.disease.term ? (
                                            <span>
                                                {interpretation.disease.term} (
                                                {interpretation.disease.diseaseId.replace(
                                                    "_",
                                                    ":"
                                                )}
                                                )
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        {interpretation.modeInheritance
                                            ? interpretation.modeInheritance
                                            : null}
                                    </div>
                                    <div className="table-cell-gdm">
                                        ?Evidence Summary?
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>
                                            {interpretation.submitted_by.last_name},{" "}
                                            {interpretation.submitted_by.first_name}{" "}
                                            {interpretation.affiliation ? (
                                                <span>
                                                    ({interpretation.affiliation})
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="table-cell-gdm">
                                        ?Contributors?
                                    </div>
                                    <div className="table-cell-gdm">
                                        <div>{moment(interpretation.date_created).format('YYYY MMM DD')}</div>
                                        <div>{moment(interpretation.date_created).format('h:mm a')}</div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }
});

// const BulkExportVCIPageWithRestMixin = React.createElement(Object.assign({}, BulkExportVCIPage, RestMixin));

curator_page.register(BulkExportVCIPage, "curator_page", "bulk-export-vci");
