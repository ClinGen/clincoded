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
import { FormMixin } from 'libs/bootstrap/form';

// Internal lib
import { EvidenceSheet } from 'components/variant_central/interpretation/segregation/evidenceSheet';
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
import { NewEvidenceModalMetadata } from 'components/variant_central/interpretation/segregation/newEvidenceModalMetadata';

let EvidenceModalManager = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        data: PropTypes.object,                     // If null, we are adding.  Otherwise, we are editing.
        allData: PropTypes.array,                   // All extra evidence we've collected
        criteriaList: PropTypes.array,              // criteria code(s) pertinent to the category/subcategory
        evidenceType: PropTypes.string,
        subcategory: PropTypes.string,              // subcategory (usually the panel) the evidence is part of
        evidenceCollectionDone: PropTypes.func,     // Function to call when we finish with modal 2
        isNew: PropTypes.bool,                      // If we are adding a new piece of evidence or editing an existing piece
        disableActuator: PropTypes.bool,
        affiliation: PropTypes.object,              // The user's affiliation
        session: PropTypes.object,                  // The session object
        variant: PropTypes.object                   // The variant we are curating
    },

    getInitData: function(){
        let data = {};
        let metadata = {};
        if (this.props.data) {
            data = this.props.data;
            if ('source' in data) {
                if ('metadata' in data['source']) {
                    metadata = data['source']['metadata'];
                }
            }
        }
        return {
            'metadata': metadata,
            'data': data
        };
    },

    getInitialState: function() {
        let data = this.getInitData();
        if (this.props.data) {
            data = this.props.data;
        }
        return {
            nextModal: false,
            data: data,
            isNew: this.props.isNew  // This may change from T -> F if a matching identifier is found.  See metadataDone() for details.
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

    componentWillReceiveProps(nextProps) {
        if(nextProps.data != null && nextProps.data !== this.state.data) {
            this.setState({
                data: nextProps.data
            });
        }
        if (nextProps.isNew != null && nextProps.isNew !== this.state.isNew) {
            this.setState({
                isNew: nextProps.isNew
            });
        }
    },

    getExistingEvidence(metadata){
        let identifierCol = extraEvidence.typeMapping[this.props.evidenceType].fields
            .filter(o => o.identifier === true)
            .map(o => o.name);

        // Determine if this is meant to be linked to an existing piece of evidence
        let candidate = this.props.allData
            .filter(o => identifierCol in o.source.metadata
                && o.source.metadata[identifierCol] === metadata[identifierCol]);
        if (candidate.length > 0) {
            if (candidate[0].affiliation && candidate[0].affiliation === this.props.affiliation.affiliation_id) {
                // Hopefully only one item, otherwise we have run into consistency issues
                return candidate[0];
            } else if (candidate[0].submitted_by['@id'] === this.props.session.user_properties['@id']) {
                return candidate[0];
            }
        }
        return false;
    },

    /**
     * Here, we need to check the identifier field against all other known identifier fields.  If we get a match,
     * then we know that even if we were told this is a new entry, it's really an edit of an existing entry that
     * was initially entered in a separate panel.
     *
     * @param {bool} next           T -> Move to next screen, F -> Cancel was clicked
     * @param {object} metadata     The metadata object returned from the modal
     */
    metadataDone(next, metadata) {
        if (next) {
            let candidate = this.getExistingEvidence(metadata);
            let newData = Object.assign({}, this.state.data);
            if (this.props.isNew) {
                if (candidate) {
                    // Editing a piece of evidence initially input in a different panel
                    Object.assign(candidate.source.metadata, metadata);
                    Object.assign(newData, candidate);
                    this.setState({
                        isNew: false
                    });
                } else {
                    // Totally new piece of evidence
                    Object.assign(newData.metadata, metadata);
                    this.setState({
                        isNew: true
                    });
                }
            } else {
                // Editing
                Object.assign(newData.source.metadata, metadata);
            }

            this.setState({
                data: newData,
                nextModal: true
            });
        } else {
            // cancelled
            this.setState({
                nextModal: false,
                data: this.getInitData()
            });
        }
    },

    reset() {
        this.setState({
            nextModal: false,
            isNew: true,
            data: this.getInitData()
        });
    },

    sheetDone(data) {
        if (data === null) {
            this.props.evidenceCollectionDone(false, this.state.data, this.state.isNew);
            this.setState({
                nextModal: false,
                isNew: null
            });
        }
        else {
            let metadata = null;
            if ('source' in this.state.data) {
                metadata = this.state.data.source.metadata;
            } else {
                metadata = this.state.data.metadata;
            }
            let candidate = this.getExistingEvidence(metadata);
            let newData = Object.assign({}, this.state.data);
            if (candidate) {
                Object.assign(newData.source.data, data);
            } else {
                Object.assign(newData.data, data);
            }
            newData['affiliation'] = this.props.affiliation;
            this.props.evidenceCollectionDone(true, newData, this.state.isNew);
            this.reset();
        }
    },

    getSheetData() {
        if ('source' in this.state.data) {
            return this.state.data.source.data;
        }
        return this.state.data.data;
    },

    getMetadata() {
        if ('source' in this.state.data) {
            return this.state.data.source.metadata;
        }
        return this.state.data.metadata;
    },

    evidenceSheet() {
        if (!this.state.nextModal) {
            return null;
        } else {
            return <EvidenceSheet
                        ready = {this.state.nextModal}
                        sheetDone = {this.sheetDone}
                        data = {this.getSheetData()}
                        allData = {this.props.data}
                        isNew = {this.state.isNew}
                        subcategory = {this.props.subcategory}
                        variant = {this.props.variant}
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
                disableActuator = {this.props.disableActuator}
            />
            {this.evidenceSheet()}
        </div>;
        return jsx;
    }
});

module.exports = {
    EvidenceModalManager: EvidenceModalManager
}
