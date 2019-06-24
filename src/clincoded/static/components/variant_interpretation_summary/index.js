'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { curator_page, userMatch, queryKeyValue, external_url_map } from '../globals';
import { RestMixin } from '../rest';
import omit from 'lodash/omit';
import ViewJson from '../view_json';
import VariantInterpretationSummaryHeader from './header';
import VariantInterpretationSummaryEvaluation from './evaluations';

const VariantInterpretationSummary = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        href: PropTypes.string,
        session: PropTypes.object,
        affiliation: PropTypes.object
    },

    getInitialState() {
        return {
            user: null, // Logged-in user uuid
            interpretation: null, // The parent interpretation object associated with the classification
            classification: {}, // Logged-in user's existing classification object
            preview: queryKeyValue('preview', this.props.href),
            displayJson: false,
        };
    },

    componentDidMount() {
        this.loadData();
    },

    componentDidUpdate(prevProps, prevState) {
        // Remove header and notice bar (if any) from DOM
        let siteHeader = document.querySelector('.site-header');
        siteHeader.setAttribute('style', 'display:none');
        let affiliationUtilityBar = document.querySelector('.affiliation-utility-container');
        if (affiliationUtilityBar) {
            affiliationUtilityBar.setAttribute('style', 'display:none');
        }
        if (this.jsonView) {
            this.jsonView.scrollIntoView({ behavior: "smooth" });
        }
    },

    loadData() {
        const snapshotUuid = queryKeyValue('snapshot', this.props.href);
        this.getRestData('/snapshot/' + snapshotUuid).then(data => {
            let stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid;
            // Just to be sure that the response is a snapshot object
            if (data['@type'][0] === 'snapshot' && data.resourceType && data.resourceType === 'interpretation') {
                stateObj.interpretation = data.resourceParent.interpretation;
                stateObj.classification = data.resource;
            }
            this.setState(stateObj);
        }).catch(err => {
            console.log('Error in fetching snapshot data =: %o', err);
        });
    },

    /**
     * Method to close current window
     * @param {*} e - Window event
     */
    handleWindowClose(e) {
        window.close();
    },

    /**
     * Method to genetate PDF from HTML
     * @param {*} e - Window event
     */
    handlePrintPDF(e) {
        window.print();
    },

    /**
     * Method to toggle JSON from interpretation state
     * @param {*} e - Window event
     */
    handleViewJSON(e) {
        this.setState({displayJson: !this.state.displayJson})
    },

    render() {
        const interpretation = this.state.interpretation;
        const classification = this.state.classification;
        const parsedJson = omit(interpretation, ['@id', '@type', 'actions', 'active']);
        const json = JSON.stringify(parsedJson, null, 4);
        let jsonButtonText = this.state.displayJson ? 'Hide JSON' : 'View JSON';


        return (
            <div className="container variant-interprertation-summary-wrapper">
                <div className="window-close-btn-wrapper">
                    <button className="btn btn-default" onClick={this.handleWindowClose}><i className="icon icon-close"></i> Close</button>
                </div>
                <div className={this.state.preview && this.state.preview === 'yes' ?
                    'evidence-panel-wrapper preview-only-overlay' : 'evidence-panel-wrapper'}>
                    <VariantInterpretationSummaryHeader interpretation={interpretation} classification={classification} />
                    <VariantInterpretationSummaryEvaluation interpretation={interpretation} classification={classification} />
                </div>
                {this.state.displayJson ? 
                    <div ref={(ref) => this.jsonView = ref}>
                        <ViewJson data={json} />
                    </div>
                : null}
                <p className="print-info-note">
                    <i className="icon icon-info-circle"></i> For best printing, choose "Landscape" for layout, 50% for Scale, "Minimum" for Margins, and select "Background graphics".
                </p>
                <div className="pdf-download-wrapper">
                    <button className="btn btn-default btn-inline-spacer" onClick={this.handleWindowClose}><i className="icon icon-close"></i> Close</button>
                    <button className="btn btn-primary btn-inline-spacer" onClick={this.handleViewJSON}>{jsonButtonText}</button>
                    <button className="btn btn-primary btn-inline-spacer pull-right" onClick={this.handlePrintPDF}>Print PDF</button>
                </div>
            </div>
        );
    }

});

curator_page.register(VariantInterpretationSummary, 'curator_page', 'variant-interpretation-summary');