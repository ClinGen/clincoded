'use strict';
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { RestMixin } from './rest';
import { curator_page } from './globals';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import * as curator from './curator';
import { getAllGdmObjects } from '../libs/get_all_gdm_objects';
import { getAllInterpretationObjects } from '../libs/get_all_interpretation_objects';

/**
 * Return an array of '@id' from the annotations, evidence, scores, classifications if GDM object
 * Return an array of '@id' from the evaluations, provisional_variants, extra_evidence if Interpretation object
 * @param {string} type - object type - gdm or interpretation
 * @param {object} object - the gene-disease record data object or interpretation data object
 * @param {string} contributorType - contributor type - individual user or affiliation
 * @param {array} contributorUuids - contributor uuids or affiliation ids
 */
const findAllObjectIds = (type, object, contributorType, contributorUuids) => {
    let allObjects = null;
    if (type === 'gdm') {
        allObjects = getAllGdmObjects(object);
    } else {
        allObjects = getAllInterpretationObjects(object);
    }

    let filteredObjects = [];
    if (contributorType === 'individual') {
        // Remove objects not created by the same user(s) who started the GDM/Interpretation
        filteredObjects = allObjects.filter(obj => {
            return contributorUuids.indexOf(obj.submitted_by.uuid) > -1;
        });
    }
    else {
        // Remove objects not belonged to the given affiliation(s)
        filteredObjects = allObjects.filter(obj => {
            return contributorUuids.indexOf(obj.affiliation) > -1;
        });
    }

    // Extract the '@id' values from the filtered objects array into a new array
    let objIds = filteredObjects.map(object => {
        return object['@id'];
    });

    let uniqueIds = _.uniq(objIds);

    return uniqueIds;
};

const TransferCuration = createReactClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            selectedType: 'gdm', // selected object type - gdm or interpretation
            contributorType: 'individual', // selected contributor type for transfer - individual or affiliation
            errorMsg: '', // Error message to display 
            submitBusy: false // REST operation in progress
        };
    },

    /**
     * Method to validate form content with the GDM/interpretation that needs to be transferred.
     * @param {object} object - GDM/interpretation object
     */
    validateForm(object) {
        const affiliationId = this.getFormValue('affiliation_id');
        const contributorType = this.getFormValue('contributor_type')
        const contributorUuids = this.getFormValue('contributor_uuid');
        var valid = false;

        if (contributorType === 'affiliation' && contributorUuids === affiliationId) {
            this.setState({errorMsg: 'Selected Affiliation Id for transfer should not be the same as new Affiliation Id.'});
        } else if (contributorType === 'individual' && object.affiliation) {
            this.setState({errorMsg: 'Cannot transfer curation from an affiliation by selected individual user(s).'});
        } else if (contributorType === 'individual' && !object.affiliation && contributorUuids.indexOf(object.submitted_by.uuid) === -1) {
            this.setState({errorMsg: 'Cannot transfer curation because it does not belong to any selected individual user(s).'});
        } else if (contributorType === 'affiliation' && !object.affiliation) {
            this.setState({errorMsg: 'Cannot transfer curation from a user by selected affiliation(s).'});
        } else if (contributorType === 'affiliation' && object.affiliation && contributorUuids.indexOf(object.affiliation) === -1) {
            this.setState({errorMsg: 'Cannot transfer curation because it does not belong to any selected affiliation(s).'});
        } else {
            valid = true;
        }

        return valid;
    },

    // Handle selection changes and showing of message
    handleChange(ref, e) {
        if (ref === 'type' && this.refs[ref].getValue()) {
            this.setState({selectedType: this.refs[ref].getValue()});
        }
        if (ref === 'contributor_type') {
            this.setState({contributorType: this.refs[ref].getValue()});
        }
        this.setState({errorMsg: ''});
    },

    // PUT the objects in an array to given the associated affiliation id
    putRestDatas(objs, affiliationId) {
        return Promise.all(objs.map(obj => {
            let newObj = _.clone(obj);
            // If affiliationId is '0', then set to no associated affiliation 
            if (affiliationId === '0' && newObj.affiliation) {
                delete newObj.affiliation;
            } else {
                newObj.affiliation = affiliationId;
            }
            delete newObj['@id'];
            return this.putRestData(obj['@id'], newObj);
        }));
    },

    /**
     * Method to add affiliation to the GDM or Interpretation and its nested objects when form is submitted
     * @param {object} e - Event object
     */
    submitForm(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();
        this.setState({submitBusy: true});

        const getTypeObject = (type, uuid) => {
            if (type === 'gdm') {
                return this.getRestData('/gdm/' + uuid, null, true);
            } else {
                return this.getRestData('/interpretations/' + uuid);
            }
        };

        const getObjectIds = (type, uuid, object, contributorType, contributorUuidList) => {
            let objIds = findAllObjectIds(type, object, contributorType, contributorUuidList);
            if (type === 'gdm') {
                objIds.push('/gdm/' + uuid);
            } else {
                objIds.push('/interpretations/' + uuid);
            }
            return Promise.resolve(objIds);
        };

        const affiliationId = this.getFormValue('affiliation_id');
        const type = this.getFormValue('type');
        const uuid = this.getFormValue('uuid');
        const contributorType = this.getFormValue('contributor_type')
        const contributorUuids = this.getFormValue('contributor_uuid');
        const errMsg = type === 'gdm' ? 'The Gene-Disease record has been affiliated with '
                                : 'The Interpretation record has been affiliated with ';
        const affiliation = affiliationId === '0' ? 'no affiliation' : affiliationId;
        // Convert contributor(s) UUIDs string into array
        const re = /\s*(?:,|$)\s*/;
        var contributorUuidList = contributorUuids.split(re);

        // Start with default validation
        if (this.validateDefault() && affiliationId && uuid) {
            // Get up-to-date object
            getTypeObject(type, uuid).then(obj => {
                // Validate form data with to be transferred GDM/interpretation object
                if (!this.validateForm(obj)) {
                    return Promise.all(null);
                }
                // If form data is validated.  Gather all objects' '@id', including the GDM's or Interpretation's
                return getObjectIds(type, uuid, obj, contributorType, contributorUuidList);
            }).then(ObjectIds => {
                if (ObjectIds.length) {
                    // Get all objects given their '@id' and flatten them
                    // Return all flattened objects in an array as a promise
                    let tempObjArray = [];
                    return this.getRestDatas(ObjectIds).then(objects => {
                        objects.map(obj => {
                            let newObj = curator.flatten(obj);
                            // Insert '@id' back into the flattened object
                            newObj['@id'] = obj['@id'];
                            tempObjArray.push(newObj);
                        });
                        return Promise.all(tempObjArray);
                    });
                }
            }).then(objectList => {
                if (objectList && objectList.length) {
                    let tempArray = [];
                    // Batch update the objects
                    return this.putRestDatas(objectList, affiliationId).then(response => {
                        for (let item of response) {
                            tempArray.push(item['@graph'][0]);
                        }
                        return Promise.resolve(tempArray);
                    });
                } else {
                    return Promise.resolve(null);
                }
            }).then(data => {
                if (data && data.length) {
                    this.setState({
                        submitBusy: false,
                        errorMsg: errMsg + affiliation + '.  ' + this.state.errorMsg
                    });
                } else {
                    console.warn('Result: ' + JSON.stringify(data));
                    this.setState({
                        submitBusy: false,
                        errorMsg: 'Something seems wrong. Check console warnings.'
                    });
                }
            }).catch(e => {
                if (!this.state.errorMsg) {
                    console.log('AFFILIATION ERROR: %o', e);
                    if (!e.statusText) {
                        e.statusText = 'An unexpected error occurred.';
                    } else if (e.statusText === 'Conflict') {
                        e.statusText = 'Affiliation already exists';
                    }
                    this.setState({errorMsg: e.statusText});
                }
                this.setState({submitBusy: false});
            });
        }
    },

    render() {
        const submitErrClass = 'submit-err pull-right' + (this.state.errorMsg ? '' : ' hidden');
        const title = this.props.context.title;
        const user = this.props.session.user_properties;
        const uuidLabel = this.state.selectedType === 'gdm' ? 'GDM UUID' : 'Interpretation UUID';
        const ownerLabel = this.state.contributorType === 'individual' ? 'Current Contributor UUID(s) for Transfer' : 'Current Affiliation ID(s) for Transfer';
        const listHelp = this.state.contributorType === 'individual' ? 'Separate UUIDs with commas' : 'Separate IDs with commas';
        const group = user && user.groups && user.groups.length ? user.groups[0] : null;

        return (
            <div className="container">
                {group === 'admin' ?
                    <div>
                        <h1>{title}</h1>
                        <div className="col-md-8 col-md-offset-2 col-sm-9 col-sm-offset-1 form-add-affiliation">
                            <Panel panelClassName="panel-add-affiliation">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <div className="row">
                                        <Input type="select" ref="type" label="GDM or Interpretation" defaultValue="gdm" handleChange={this.handleChange}
                                            error={this.getFormError('type')} clearError={this.clrFormErrors.bind(null, 'type')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required>
                                            <option value="gdm">GDM</option>
                                            <option value="interpretaton">Interpretation</option>
                                        </Input>
                                        <Input type="text" ref="uuid" label={uuidLabel} value="" handleChange={this.handleChange}
                                            error={this.getFormError('uuid')} clearError={this.clrFormErrors.bind(null, 'uuid')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                        <Input type="select" ref="contributor_type" label="Select Individual Contributor or Affiliation for Transfer" defaultValue="individual" handleChange={this.handleChange}
                                            error={this.getFormError('contributor_type')} clearError={this.clrFormErrors.bind(null, 'contributor_type')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required>
                                            <option value="individual">Individual</option>
                                            <option value="affiliation">Affiliation</option>
                                        </Input>
                                        <Input type="text" ref="contributor_uuid" label={ownerLabel} value="" handleChange={this.handleChange}
                                            error={this.getFormError('contributor_uuid')} clearError={this.clrFormErrors.bind(null, 'contributor_uuid')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group"
                                            placeholder={listHelp} required />
                                        <Input type="text" ref="affiliation_id" label="New Affiliation ID" value="" handleChange={this.handleChange}
                                            error={this.getFormError('affiliation_id')} clearError={this.clrFormErrors.bind(null, 'affiliation_id')}
                                            labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Submit" submitBusy={this.state.submitBusy} />
                                            <div className={submitErrClass}>{this.state.errorMsg}</div>
                                        </div>
                                    </div>
                                </Form>
                            </Panel>
                        </div>
                    </div>
                    :
                    <div><h3><i className="icon icon-exclamation-triangle"></i> Sorry. You do not have access to this page.</h3></div>
                }
            </div>
        );
    }
});

curator_page.register(TransferCuration, 'curator_page', 'transfer-curation');
