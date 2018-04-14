'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { curator_page, userMatch, queryKeyValue, external_url_map } from '../globals';
import { RestMixin } from '../rest';
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
            preview: queryKeyValue('preview', this.props.href)
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

    render() {
        const interpretation = this.state.interpretation;
        const classification = this.state.classification;

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
                <p className="print-info-note">
                    <i className="icon icon-info-circle"></i> For best printing, choose "Landscape" for layout, 50% for Scale, "Minimum" for Margins, and select "Background graphics".
                </p>
                <div className="pdf-download-wrapper">
                    <button className="btn btn-default btn-inline-spacer" onClick={this.handleWindowClose}><i className="icon icon-close"></i> Close</button>
                    <button className="btn btn-primary btn-inline-spacer pull-right" onClick={this.handlePrintPDF}>Print PDF</button>
                </div>
            </div>
        );
    }

});

curator_page.register(VariantInterpretationSummary, 'curator_page', 'variant-interpretation-summary');