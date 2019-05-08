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
        criteriaList: PropTypes.array,              // Criteria code(s) pertinent to the category/subcategory
        evidenceType: PropTypes.string,             // Evidence source type
        subcategory: PropTypes.string,              // Subcategory (usually the panel) the evidence is part of
        evidenceCollectionDone: PropTypes.func,     // Function to call when we finish with modal 2
        isNew: PropTypes.bool,                      // If we are adding a new piece of evidence or editing an existing piece
        useIcon: PropTypes.bool,                    // Use an icon instead of text as link text  
        disableActuator: PropTypes.bool,            // Disable the actuator or not
        affiliation: PropTypes.object,              // The user's affiliation
        session: PropTypes.object,                  // The session object
        canCurrUserModifyEvidence: PropTypes.func   // Funcition to check if current logged in user can modify the given evidence
    },

    getInitData(){
        let data = {};
        // If current evidence has source data, set as default
        if (this.props.data && this.props.data.source) {
            data = this.props.data.source;
        }
        else {
            data = {'metadata': {}, 'data': {}}
        }

        return data;
    },

    getInitialState() {
        let data = this.getInitData();
        return {
            nextModal: false,        // Flag if able to go to next data form  
            sourceData: data,        // Source data being added/edited
            isNew: this.props.isNew  // This may change from T -> F if a matching identifier is found.  See metadataDone() for details.
        };
    },

    componentDidMount(){
        let data = this.getInitData();
        this.setState({
            sourceData: data
        });
    },

    componentWillReceiveProps(nextProps) {
        if(nextProps.data != null && nextProps.data.source != null && nextProps.data.source !== this.state.sourceData) {
            this.setState({
                sourceData: nextProps.data.source
            });
        }
        if (nextProps.isNew != null && nextProps.isNew !== this.state.isNew) {
            this.setState({
                isNew: nextProps.isNew
            });
        }
    },

    /**
     * If editing current evidence, return its id.
     * If adding new one, return null.
     */
    getCurrentEvidenceId() {
        // If editing existing evidence, return its id.
        if (this.props.data) {
            return (this.props.data['@id']);
        }
        else {
            // If adding evidence but same evidence exits, return existing evidence id.
            let foundEvidence = this.getExistingEvidence(this.state.sourceData.metadata);
            if (foundEvidence) {
                return (foundEvidence['@id']);
            }
        }
        // If adding new evidence, return null;
        return null;
    },

    /**
     * Check if an existing evidence has same data as given metadata.
     * If yes, return that evidence; else null.
     * 
     * @param {object} metadata  The metadata object
     */
    getExistingEvidence(metadata) {
        let identifierCol = extraEvidence.typeMapping[this.props.evidenceType].fields
            .filter(o => o.identifier === true)
            .map(o => o.name);

        // Determine if this is meant to be linked to an existing piece of evidence that current user can modify
        let candidates = this.props.allData
            .filter(o => identifierCol in o.source.metadata
                && o.source.metadata[identifierCol] === metadata[identifierCol]);
        let result = null;
        if (candidates.length > 0) {
            candidates.forEach(candidate => {
                if (this.props.canCurrUserModifyEvidence(candidate)) {
                    result = candidate;
                }
            });
        }
        return result;
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
            let newData = Object.assign({}, this.state.sourceData);
            if (this.props.isNew) {
                if (candidate) {
                    // Editing a piece of evidence initially input in a different panel
                    Object.assign(candidate.source.metadata, metadata);
                    Object.assign(newData, candidate.source);
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
                // Editing existing evidence
                Object.assign(newData.metadata, metadata);
            }

            this.setState({
                sourceData: newData,
                nextModal: true
            });
        } else {
            // Cancelled
            this.setState({
                nextModal: false,
                sourceData: this.getInitData()
            });
        }
    },

    reset() {
        this.setState({
            nextModal: false,
            isNew: false,
            sourceData: this.getInitData()
        });
    },

    /**
     * Save the evidence and reset form data.
     * 
     * @param {object} data  THe evidence data object returned from modal form
     */
    sheetDone(data) {
        if (data === null) {
            // No change is needed
            this.props.evidenceCollectionDone(false, this.state.sourceData, this.getCurrentEvidenceId(), this.props.subcategory);
        }
        else {
            // Remove empty fields from data
            let hasData = Object.keys(data).reduce((object, key) => { 
                if (data[key] !== '') {
                    object[key] = data[key]
                }
                return object
            }, {})

            // Combine the changes with existing data
            let newData = Object.assign({}, this.state.sourceData);
            newData.data = {};
            Object.assign(newData.data, hasData);
            newData['relevant_criteria'] = this.props.criteriaList;
            // Save the evidence data
            this.props.evidenceCollectionDone(true, newData, this.getCurrentEvidenceId(), this.props.subcategory);
        }
        this.reset();
    },

    /**
     * Return the evidence data object
     */
    getSheetData() {
        return this.state.sourceData.data;
    },

    /**
     * Return the evidence metadata object
     */
    getMetadata() {
        return this.state.sourceData.metadata;
    },

    /**
     * Bring up the second modal form for evidence data
     */
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
                    >
                    </EvidenceSheet>
        }
    },

    render() {
        let jsx = <div>
            <NewEvidenceModalMetadata
                evidenceType = {this.props.evidenceType}
                metadataDone = {this.metadataDone}
                data = {this.getMetadata()}
                isNew = {this.props.isNew}
                useIcon = {this.props.useIcon}
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
