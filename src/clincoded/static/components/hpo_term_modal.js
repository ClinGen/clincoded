'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import * as curator from './curator';
import { external_url_map } from './globals';
import { RestMixin } from './rest';
import { FormMixin, Input } from '../libs/bootstrap/form';
import ModalComponent from '../libs/bootstrap/modal';

var HpoTermModal = createReactClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        addHpoTermButton: PropTypes.object.isRequired, // Button to trigger HPO modal
        inElim: PropTypes.bool, // Used to differentiate between normal and "in elim" modal
        savedHpo: PropTypes.array, // HPO saved from parent
        savedElimHpo: PropTypes.array, // HPO in elimination saved from parent
        passHpoToParent: PropTypes.func, // Function used to pass HPO data to respective parent
        passElimHpoToParent: PropTypes.func // Function used to pass Elim HPO data to parent
    },

    getInitialState: function() {
        return {
            hpoWithTerms: [],
            hpoElimWithTerms: []
        };
    },

    handleModalClose() {
        this.child.closeModal();
    },

    componentDidMount() {
        const savedHpo = this.props.savedHpo ? this.props.savedHpo : null;
        const savedElimHpo = this.props.savedElimHpo ? this.props.savedElimHpo : null;
        if (savedHpo && savedHpo.length) {
            this.setState({ hpoWithTerms: savedHpo });
        }
        if (savedElimHpo && savedElimHpo.length) {
            this.setState({ hpoElimWithTerms: savedElimHpo });
        }
    },

    saveForm(e) {
        e.preventDefault(); e.stopPropagation();
        let hpoWithTermsList = _.uniq(this.state.hpoWithTerms);
        let hpoElimWithTermsList = _.uniq(this.state.hpoElimWithTerms);
        const inElim = this.props.inElim ? this.props.inElim : false;
        // Check if the modal has valid values to save, and if in Elim (NOT Phenotype); Modal has two use-cases
        if (hpoWithTermsList && !inElim) {
            this.props.passHpoToParent(hpoWithTermsList);
            this.setState({ hpoWithTerms: hpoWithTermsList });
        }
        else if (hpoElimWithTermsList && inElim) {
            this.props.passElimHpoToParent(hpoElimWithTermsList);
            this.setState({ hpoElimWithTerms: hpoElimWithTermsList });
        }
        this.child.closeModal();
    },

    cancelForm(e) {
        this.handleModalClose();
    },

    validateHpo(hpoids) {
        const checkIds = curator.capture.hpoids(hpoids);
        // Check HPO ID format
        if (checkIds && checkIds.length && _(checkIds).any(function(id) { return id === null; })) {
            // HPOID list is bad
            this.setFormErrors('hpoid', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
        }
        else if (checkIds && checkIds.length && !_(checkIds).any(function(id) { return id === null; })) {
            const hpoidList = _.without(checkIds, null);
            return hpoidList;
        }
    },

    deleteHpo(index) {
        const term = this.state.hpoWithTerms[index];
        const hpo = this.state.hpoWithTerms.filter(hpo => {
            return hpo !== term;
        });
        this.setState({ hpoWithTerms: hpo });
    },

    deleteElimHpo(index) {
        const term = this.state.hpoElimWithTerms[index];
        const elimHpo = this.state.hpoElimWithTerms.filter(hpo => {
            return hpo !== term;
        });
        this.setState({ hpoElimWithTerms: elimHpo });
    },
    
    /**
     * Method to fetch HPO term names and append them to HPO ids
    */
    fetchHpoName() {
        let hpoIds = this.refs['hpoid'].getValue();
        const hpoidList = this.validateHpo(hpoIds);
        if (hpoidList) {
            hpoidList.forEach(id => {
                const url = external_url_map['HPOApi'] + id;
                // Make the OLS REST API call
                this.getRestData(url).then(response => {
                    const termLabel = response['details']['name'];
                    const hpoWithTerm = `${termLabel} (${id})`;
                    this.setState({ hpoWithTerms: [...this.state.hpoWithTerms, hpoWithTerm] });
                }).catch(err => {
                    // Unsuccessful retrieval
                    console.warn('Error in fetching HPO data =: %o', err);
                    const hpoWithTerm = id + ' (note: term not found)';
                    this.setState({ hpoWithTerms: [...this.state.hpoWithTerms, hpoWithTerm] });
                });
            });
        }
    },

    /**
     * Method to fetch HPO term names and append them to HPO In Elimination ids
     */
    fetchHpoInElimName() {
        let hpoIds = this.refs['hpoid'].getValue();
        const hpoidList = this.validateHpo(hpoIds);
        if (hpoidList) {
            hpoidList.forEach(id => {
                const url = external_url_map['HPOApi'] + id;
                // Make the OLS REST API call
                this.getRestData(url).then(response => {
                    const termLabel = response['details']['name'];
                    const hpoWithTerm = `${termLabel} (${id})`;
                    this.setState({ hpoElimWithTerms: [...this.state.hpoElimWithTerms, hpoWithTerm] });
                }).catch(err => {
                    // Unsuccessful retrieval
                    console.warn('Error in fetching HPO data =: %o', err);
                    const hpoWithTerm = id + ' (note: term not found)';
                    this.setState({ hpoElimWithTerms: [...this.state.hpoElimWithTerms, hpoWithTerm] });
                });
            });
        }
    },

    render() {
        let hpoWithTerms = _.uniq(this.state.hpoWithTerms ? this.state.hpoWithTerms : []);
        let hpoElimWithTerms = _.uniq(this.state.hpoElimWithTerms ? this.state.hpoElimWithTerms : []);

        return (
            <div>
                <ModalComponent modalTitle="Add HPO Terms" modalClass="modal-default" bootstrapBtnClass="btn btn-primary " 
                    actuatorClass="input-group-hpo" actuatorTitle={this.props.addHpoTermButton} onRef={ref => (this.child = ref)}>
                    <div className="modal-body">
                        <strong><span><a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s)</span>:</strong>
                        <Input type="textarea" ref="hpoid" inputClassName="hpo-text-area" placeholder="e.g. HP:0010704, HP:0030300" rows="4" error={this.getFormError('hpoid')} clearError={this.clrFormErrors.bind(null, 'hpoid')} />
                        <Input type="button" ref="gethpoidterm" inputClassName="btn-copy btn-sm btn-last hpo-add-btn" title="Add" clickHandler={this.props.inElim === true ? this.fetchHpoInElimName : this.fetchHpoName} />
                        <div>
                            {hpoWithTerms ? 
                                <ul>
                                    {hpoWithTerms.map((term, i) => {
                                        return (
                                            <div key={i}>
                                                <li className="hpo-term-list">{term}</li>
                                                <a className="delete-hpo" role="button" onClick={() => this.deleteHpo(i)}><i className="icon icon-trash-o"></i></a>
                                            </div>
                                        );
                                    })}
                                </ul>
                                : null}
                            {hpoElimWithTerms ? 
                                <ul>
                                    {hpoElimWithTerms.map((term, i) => {
                                        return (
                                            <div key={i}>
                                                <li className="hpo-term-list">{term}</li>
                                                <a className="delete-hpo" role="button" onClick={() => this.deleteElimHpo(i)}>
                                                    <i className="icon icon-trash-o"></i>
                                                </a>
                                            </div>
                                        );
                                    })}
                                </ul>
                                : null}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <Input type="button" inputClassName="btn-default btn-primary btn-inline-spacer" clickHandler={this.saveForm} title="Save" />
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    </div>
                </ModalComponent>
            </div>
        )
    }
});

export default HpoTermModal;