'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { FormMixin, Form, Input } from '../../libs/bootstrap/form';
import { queryKeyValue } from '../globals';
import _ from 'underscore';
import { RestMixin } from '../rest';
import { parseAndLogError } from '../mixins';
import ModalComponent from '../../libs/bootstrap/modal';
import { InterpretationDisease } from '../disease';

var fetched = require('../fetched');
var CuratorHistory = require('../curator_history');
var curator = require('../curator');
var modesOfInheritance = require('../mapping/modes_of_inheritance.json');

// Display the variant curation action bar above the criteria and tabs
var VariantCurationActions = module.exports.VariantCurationActions = createReactClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        variantData: PropTypes.object, // ClinVar data payload
        session: PropTypes.object,
        interpretation: PropTypes.object,
        editKey: PropTypes.string,
        updateInterpretationObj: PropTypes.func,
        calculatedAssertion: PropTypes.string,
        provisionalPathogenicity: PropTypes.string,
        affiliation: PropTypes.object
    },

    getInitialState: function() {
        return {
            variantUuid: null,
            interpretation: this.props.interpretation,
            isInterpretationActive: this.props.interpretation ? true : false,
            hasAssociatedDisease: this.props.interpretation && this.props.interpretation.disease ? true : false,
            hasAssociatedInheritance: this.props.interpretation && this.props.interpretation.modeInheritance ? true : false,
            diseaseObj: {},
            diseaseUuid: null
        };
    },

    componentDidMount: function() {
        if (this.props.interpretation) {
            if (this.props.editKey && this.props.editKey === 'true') {
                this.setState({isInterpretationActive: true});
                let interpretation = this.props.interpretation;
                if (interpretation.disease) {
                    this.setState({hasAssociatedDisease: true});
                }
                if (interpretation.modeInheritance) {
                    this.setState({hasAssociatedInheritance: true});
                }
            }
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.editKey === 'true' && nextProps.interpretation) {
            this.setState({isInterpretationActive: true, interpretation: nextProps.interpretation});
            // set disease and inheritance flags accordingly
            if (nextProps.interpretation.disease) {
                this.setState({hasAssociatedDisease: true});
            } else {
                this.setState({hasAssociatedDisease: false});
            }
            if (nextProps.interpretation.modeInheritance) {
                this.setState({hasAssociatedInheritance: true});
            } else {
                this.setState({hasAssociatedInheritance: false});
            }
        }
    },

    // handler for 'Start new interpretation'
    // 'Continue Interpretation' button is removed
    handleInterpretationEvent: function(e) {
        e.preventDefault(); e.stopPropagation();
        var variantObj = this.props.variantData;
        var selectedTab = queryKeyValue('tab', window.location.href),
            selectedSubtab = queryKeyValue('subtab', window.location.href);
        var newInterpretationObj = {variant: variantObj.uuid};
        // Add affiliation if the user is associated with an affiliation
        // and if the data object has no affiliation
        if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
            newInterpretationObj.affiliation = this.props.affiliation.affiliation_id;
        }
        this.postRestData('/interpretations/', newInterpretationObj).then(interpretation => {
            var newInterpretationUuid = interpretation['@graph'][0].uuid;
            var meta = {
                interpretation: {
                    variant: variantObj['@id']
                }
            };
            this.recordHistory('add', interpretation['@graph'][0], meta).then(result => {
                window.location.href = '/variant-central/?edit=true&variant=' + variantObj.uuid + '&interpretation=' + newInterpretationUuid + (selectedTab ? '&tab=' + selectedTab : '') + (selectedSubtab ? '&subtab=' + selectedSubtab : '');
            });
        }).catch(e => {parseAndLogError.bind(undefined, 'postRequest');});
    },

    /**
     * Update the 'diseaseObj' state used to save data upon form submission
     */
    updateDiseaseObj(diseaseObj) {
        this.setState({diseaseObj: diseaseObj});
    },

    render() {
        const affiliation = this.props.affiliation, session = this.props.session;
        let hasExistingInterpretation = this.props.interpretation ? true : false;
        if (!hasExistingInterpretation) {
            let variant = this.props.variantData;
            if (variant && variant.associatedInterpretations && variant.associatedInterpretations.length) {
                for (let interpretation of variant.associatedInterpretations) {
                    if (affiliation && interpretation.affiliation && interpretation.affiliation === affiliation.affiliation_id) {
                        hasExistingInterpretation = true;
                        break;
                    } else if (!affiliation && !interpretation.affiliation && interpretation.submitted_by.uuid === session.user_properties.uuid) {
                        hasExistingInterpretation = true;
                        break;
                    }
                }
            }
        }

        return (
            <div className="container curation-actions curation-variant">
                {this.props.interpretation ?
                    <div className="interpretation-record clearfix">
                        <h2><span>Variant Interpretation Record</span></h2>
                        <div className="btn-group">
                            <InheritanceModalButton variantData={this.props.variantData} session={this.props.session} hasAssociatedInheritance={this.state.hasAssociatedInheritance}
                                interpretation={this.props.interpretation} editKey={this.props.editkey} updateInterpretationObj={this.props.updateInterpretationObj} />
                            <InterpretationDisease variantData={this.props.variantData} interpretation={this.props.interpretation} diseaseObj={this.state.diseaseObj} editKey={this.props.editkey}
                                updateInterpretationObj={this.props.updateInterpretationObj} updateDiseaseObj={this.updateDiseaseObj} hasAssociatedDisease={this.state.hasAssociatedDisease}
                                session={this.props.session} />
                        </div>
                    </div>
                    :
                    <div className="interpretation-record clearfix">
                        <h2><span>Evidence View</span></h2>
                        <div className="btn-group">
                            {!hasExistingInterpretation ?
                                <button className="btn btn-primary pull-right" onClick={this.handleInterpretationEvent}>
                                    Interpretation <i className="icon icon-plus-circle"></i>
                                </button>
                                : null}
                        </div>
                    </div>
                }
            </div>
        );
    }
});

// class to contain the Inheritance button and its modal
var InheritanceModalButton = createReactClass({
    propTypes: {
        variantData: PropTypes.object,
        hasAssociatedInheritance: PropTypes.bool,
        session: PropTypes.object,
        interpretation: PropTypes.object,
        editKey: PropTypes.string,
        updateInterpretationObj: PropTypes.func
    },

    render: function() {
        let associateInheritanceButtonTitle = <span>Inheritance <i className="icon icon-plus-circle"></i></span>,
            associateInheritanceModalTitle = 'Associate this interpretation with a mode of inheritance';
        if (this.props.hasAssociatedInheritance) {
            associateInheritanceButtonTitle = <span>Inheritance <i className="icon icon-pencil"></i></span>;
            associateInheritanceModalTitle = 'Associate this interpretation with a different mode of inheritance';
        }

        return (
            <AssociateInheritance
                data={this.props.variantData}
                session={this.props.session}
                interpretation={this.props.interpretation}
                editKey={this.props.editkey}
                updateInterpretationObj={this.props.updateInterpretationObj}
                title={associateInheritanceModalTitle}
                buttonText={associateInheritanceButtonTitle}
                buttonClass={this.props.hasAssociatedInheritance ? 'btn-info pull-right btn-inline-spacer' : 'btn-primary pull-right btn-inline-spacer'}
            />
        );
    }
});

// handle 'Associate with Inheritance' button click event
var AssociateInheritance = createReactClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    contextTypes: {
        handleStateChange: PropTypes.func
    },

    propTypes: {
        data: PropTypes.object, // variant object
        session: PropTypes.object, // session object
        interpretation: PropTypes.object, // interpretation object
        editKey: PropTypes.bool, // edit flag
        updateInterpretationObj: PropTypes.func,
        title: PropTypes.string, // Text appearing in the modal header
        buttonText: PropTypes.oneOfType([ // Text of the link/button invoking the modal
            PropTypes.object,
            PropTypes.string
        ]),
        buttonClass: PropTypes.string // CSS class of the link/button invoking the modal
    },

    getInitialState: function() {
        return {
            submitResourceBusy: false,
            adjectives: [],
            adjectiveDisabled: true,
            tempAdjectives: [] // Temp storage for adjectives. Used for reverting to previous list if user cancels.
        };
    },

    componentDidMount: function() {
        let interpretation = this.props.interpretation;
        if (interpretation && interpretation.modeInheritance) {
            let moi = interpretation.modeInheritance;
            let adjective = interpretation.modeInheritanceAdjective ? interpretation.modeInheritanceAdjective : 'none';
            this.parseModeInheritance(moi, adjective);
        }
    },

    // Handle value changes in modeInheritance dropdown selection
    handleChange: function(ref, e) {
        if (ref === 'inheritance') {
            // Copy existing adjective array into temp storage when user changes the selected MOI,
            // which triggers the re-rendering of a different adjective list
            this.setState({tempAdjectives: this.state.adjectives}, () => {
                this.parseModeInheritance(this.refs[ref].getValue(), 'none');
            });
        }
    },

    parseModeInheritance: function(modeInheritance, defaultValue) {
        if (modeInheritance && modeInheritance.length) {
            /******************************************************/
            /* If 'X-linked inheritance', or 'Other',             */
            /* or 'Autosomal dominant inheritance',               */
            /* or 'Autosomal recessive inheritance is selected,   */
            /* enable adjective menu only.                        */
            /* Everything else, disable adjective menu.           */
            /* Req'd adjective isn't needed in VCI (no scoring)   */
            /******************************************************/
            if (modeInheritance.indexOf('X-linked inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['X-linked inheritance (HP:0001417)'], defaultValue);
            } else if (modeInheritance.indexOf('Autosomal dominant inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Autosomal dominant inheritance (HP:0000006)'], defaultValue);
            } else if (modeInheritance.indexOf('Autosomal recessive inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Autosomal recessive inheritance (HP:0000007)'], defaultValue);
            } else if (modeInheritance.indexOf('Mitochondrial inheritance') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Mitochondrial inheritance (HP:0001427)'], defaultValue);
            } else if (modeInheritance.indexOf('Other') > -1) {
                this.handleAdjectives(false, modesOfInheritance['Other'], defaultValue);
            } else {
                this.handleAdjectives(true, [], defaultValue);
            }
        }
    },

    // Helper method for the 'handleChange' method to minimize repetitive code
    handleAdjectives: function(adjectiveDisabled, adjectives, defaultValue) {
        this.setState({
            adjectiveDisabled: adjectiveDisabled,
            adjectives: adjectives
        }, () => {
            if (this.refs.moiAdjective) {
                this.refs.moiAdjective.setValue(defaultValue);
            }
        });
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Get values from form and validate them
        this.saveFormValue('inheritance', this.refs.inheritance.getValue());
        let moiAdjectiveValue = this.refs.moiAdjective.getValue();
        if (moiAdjectiveValue && moiAdjectiveValue !== 'none') {
            this.saveFormValue('moiAdjective', moiAdjectiveValue);
        } else {
            this.saveFormValue('moiAdjective', null);
        }

        // Invoke button progress indicator
        this.setState({submitResourceBusy: true});

        let modeInheritance = this.getFormValue('inheritance');
        let adjective = this.getFormValue('moiAdjective');
        let currInterpretation;

        this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
            currInterpretation = interpretation;
            // get up-to-date copy of interpretation object and flatten it
            var flatInterpretation = curator.flatten(currInterpretation);

            // if modeInheritance is set to none, either delete the key in interpretation object, or if
            // the key is already blank, return null and close modal
            if (modeInheritance === 'no-moi') {
                if ('modeInheritance' in flatInterpretation) {
                    delete flatInterpretation['modeInheritance'];
                    if ('modeInheritanceAdjective' in flatInterpretation) {
                        delete flatInterpretation['modeInheritanceAdjective'];
                    }
                } else {
                    return null;
                }
            } else {
                flatInterpretation.modeInheritance = modeInheritance;
                if (adjective && adjective.length) {
                    flatInterpretation['modeInheritanceAdjective'] = adjective;
                } else {
                    if ('modeInheritanceAdjective' in flatInterpretation) {
                        delete flatInterpretation['modeInheritanceAdjective'];
                    }
                }
            }

            return this.putRestData('/interpretation/' + this.props.interpretation.uuid, flatInterpretation).then(result => {
                var meta = {
                    interpretation: {
                        variant: this.props.data['@id'],
                        mode: 'edit-inheritance'
                    }
                };
                if (modeInheritance !== 'no-moi') {
                    meta.interpretation.modeInheritance = modeInheritance;
                }
                if (currInterpretation.disease) {
                    meta.interpretation.disease = currInterpretation.disease['@id'];
                }
                return this.recordHistory('modify', currInterpretation, meta).then(result => {
                    this.setState({submitResourceBusy: false});
                    // Need 'submitResourceBusy' state to proceed closing modal
                    return Promise.resolve(this.state.submitResourceBusy);
                });
            });
        }).then(result => {
            this.setState({submitResourceBusy: false}, () => {
                this.props.updateInterpretationObj();
                this.handleModalClose();
            });
        }).catch(e => {
            // Some unexpected error happened
            this.setState({submitResourceBusy: false});
            parseAndLogError.bind(undefined, 'fetchedRequest');
        });
    },

    // Called when the modal 'Cancel' button is clicked
    cancelAction: function(e) {
        this.setState({submitResourceBusy: false}, () => {
            this.handleModalClose('cancel');
        });
    },

    /************************************************************************************************/
    /* Form error checking for the 2 'Select' inputs in this Inheritance modal had been removed     */
    /* because neither one of the selections are required. And the user is given a set of           */
    /* pre-defined values to choose from.                                                           */
    /************************************************************************************************/
    /* Resetting the adjectives array for selected MOI adjective input was not needed previously    */
    /* because the previous MixIn implementation allowed the actuator (button to show the modal)    */
    /* to be defined outside of this component and closing the modal would delete this component    */
    /* from virtual DOM, along with the states.                                                     */
    /* The updated/converted implementation (without MixIn) wraps the actuator in the modal         */
    /* component and thus this component always exists in the virtual DOM as long as the actuator   */
    /* needs to be rendered in the UI. As a result, closing the modal does not remove the component */
    /* and the modified states are retained.                                                        */
    /* The MixIn function this.props.closeModal() has been replaced by this.child.closeModal(),     */
    /* which is way to call a function defined in the child component from the parent component.    */
    /* The reference example is at: https://jsfiddle.net/frenzzy/z9c46qtv/                          */
    /************************************************************************************************/
    handleModalClose(trigger) {
        let interpretation = this.props.interpretation;
        if (!this.state.submitResourceBusy) {
            if (trigger === 'cancel') {
                if (interpretation && interpretation.modeInheritanceAdjective) {
                    // User cancels the modal and there is a pre-existing MOI adjective stored,
                    // set the adjectives array to the last loaded state whether the user had
                    // changed it or not.
                    if (this.state.adjectives && this.state.adjectives.length) {
                        this.setState({adjectives: this.state.tempAdjectives, adjectiveDisabled: false});
                    }
                } else {
                    // User cancels the modal and there is no pre-existing MOI adjective stored,
                    // reset all states.
                    this.setState({adjectives: [], adjectiveDisabled: true, tempAdjectives: []});
                }
            } else {
                // User saves the selected adjective and so we retain the associated adjectives array
                this.setState({tempAdjectives: this.state.adjectives, adjectiveDisabled: false});
            }
            this.child.closeModal();
        }
    },

    render: function() {
        let interpretation = this.props.interpretation;
        let adjectives = this.state.adjectives;
        let adjectiveDisabled = this.state.adjectiveDisabled;
        const moiKeys = Object.keys(modesOfInheritance);

        let defaultModeInheritance = interpretation && interpretation.modeInheritance ? interpretation.modeInheritance : 'no-moi';
        let defaultModeInheritanceAdjective = interpretation && interpretation.modeInheritanceAdjective ? interpretation.modeInheritanceAdjective : 'none';

        return (
            <ModalComponent modalTitle={this.props.title} modalClass="modal-default" modalWrapperClass="modal-associate-disease"
                actuatorClass={this.props.buttonClass} actuatorTitle={this.props.buttonText} onRef={ref => (this.child = ref)}>
                <Form submitHandler={this.submitForm} formClassName="form-std">
                    <div className="modal-box">
                        <div className="modal-body clearfix">
                            <Input type="select" ref="inheritance" label="Mode of Inheritance" value={defaultModeInheritance} handleChange={this.handleChange}
                                labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="inheritance" >
                                <option value="no-moi">No mode of inheritance</option>
                                <option value="" disabled="disabled"></option>
                                {moiKeys.map(function(modeOfInheritance, i) {
                                    return <option key={i} value={modeOfInheritance}>{modeOfInheritance}</option>;
                                })}
                            </Input>
                             <Input type="select" ref="moiAdjective" label="Select an adjective" value={defaultModeInheritanceAdjective} inputDisabled={adjectiveDisabled}
                                labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="moiAdjective">
                                <option value="none">Select</option>
                                <option disabled="disabled"></option>
                                {adjectives.map(function(adjective, i) {
                                    return <option key={i} value={adjective}>{adjective.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1]}</option>;
                                })}
                            </Input>
                        </div>
                        <div className='modal-footer'>
                            <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelAction} title="Cancel" />
                            <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="OK" submitBusy={this.state.submitResourceBusy} />
                        </div>
                    </div>
                </Form>
            </ModalComponent>
        );
    }
});
