'use strict';

/**
 * Manages the addition and editing of new evidence through two modals:
 * 
 * 1. Metadata about the new evidence type (e.g. name of PI, database location, clinical lab contact info, etc.)
 * 2. The evidence itself (e.g. number of unaffected variant carriers, associated phenotypes, etc.)
 * 
 */

// stdlib
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class'

// Third-party lib
import ModalComponent from 'libs/bootstrap/modal';
import { Form, FormMixin, Input } from 'libs/bootstrap/form';

// Internal lib
import { EvidenceSheet } from 'components/variant_central/interpretation/segregation/evidenceSheet';
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
import { NewEvidenceModalMetadata } from 'components/variant_central/interpretation/segregation/newEvidenceModalMetadata';

let EvidenceModalManager = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        data: PropTypes.object,                     // If null, we are adding.  Otherwise, we are editing.
        criteriaList: PropTypes.array,              // criteria code(s) pertinent to the category/subcategory
        evidenceType: PropTypes.string,
        subcategory: PropTypes.string,              // subcategory (usually the panel) the evidence is part of
        evidenceCollectionDone: PropTypes.func,     // Function to call when we finish with modal 2
        isNew: PropTypes.bool                       // If we are adding a new piece of evidence or editing an existing piece
    },

    getInitData: function(){
        return {
            'metadata': {},
            'data': {}
        };
    },

    getInitialState: function() {
        let data = this.getInitData();
        if (this.props.data) {
            data = this.props.data;
        }
        return {
            nextModal: false,
            data: data
        };
    },

    componentDidMount: function(){
        let data = this.getInitData();
        if (this.props.data) {
            data = this.props.data;
        }
        this.setState({
            data: data
        });
    },

    metadataDone(next, metadata) {
        if (next) {
            let newData = Object.assign({}, this.state.data);
            if (this.props.isNew) {
                Object.assign(newData.metadata, metadata);
            } else {
                Object.assign(newData.source.metadata, metadata);
            }
            
            this.setState({
                data: newData,
                nextModal: true
            });
        } else {
            // cancelled
            this.setState({
                nextModal: false
            });
        }
    },

    reset() {
        let data = this.getInitData();
        this.setState({
            nextModal: false,
            data: data,
            isNew: null
        });
    },

    sheetDone(data) {
        if (data === null) {
            this.setState({
                nextModal: false
            });
            this.props.evidenceCollectionDone(false, this.state.data, this.props.isNew);
        }
        else {
            let newData = Object.assign({}, this.state.data);
            if (this.props.isNew) {
                Object.assign(newData.data, data);
            } else {
                Object.assign(newData.source.data, data);
            }
            
            this.reset();
            this.props.evidenceCollectionDone(true, newData, this.props.isNew);
        }
        
    },

    getSheetData() {
        if (this.props.isNew) {
            return this.state.data.data;
        }
        return this.props.data.source.data;
    },

    getMetadata() {
        if (this.props.isNew) {
            return this.state.data.metadata;
        }
        return this.props.data.source.metadata;
    },

    evidenceSheet() {
        if (!this.state.nextModal) {
            return null;
        } else {
            return <EvidenceSheet
                        ready = {this.state.nextModal}
                        sheetDone = {this.sheetDone}
                        data = {this.getSheetData()}
                        isNew = {this.props.isNew}
                        reset = {this.reset}
                        subcategory = {this.props.subcategory}
                    >
                    </EvidenceSheet>
        }
    },

    render: function() {
        let jsx = <div>
            <NewEvidenceModalMetadata
                evidenceType = {this.props.evidenceType}
                metadataDone = {this.metadataDone}
                data = {this.getMetadata()}
                isNew = {this.props.isNew}
            />
            {this.evidenceSheet()}
        </div>;
        return jsx;
    }
});

module.exports = {
    EvidenceModalManager: EvidenceModalManager
}
