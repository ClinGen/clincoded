'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var fetched = require('../fetched');
var RestMixin = require('../rest').RestMixin;
var parseAndLogError = require('../mixins').parseAndLogError;
var form = require('../../libs/bootstrap/form');
var CuratorHistory = require('../curator_history');
var curator = require('../curator');
var modesOfInheritance = require('../mapping/modes_of_inheritance.json');

var Input = form.Input;
var Form = form.Form;
var FormMixin = form.FormMixin;
var queryKeyValue = globals.queryKeyValue;

import ModalComponent from '../../libs/bootstrap/modal';

// Display the variant curation action bar above the criteria and tabs
var VariantCurationActions = module.exports.VariantCurationActions = React.createClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        session: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.string,
        updateInterpretationObj: React.PropTypes.func,
        calculatedAssertion: React.PropTypes.string,
        provisionalPathogenicity: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            variantUuid: null,
            interpretation: this.props.interpretation,
            isInterpretationActive: this.props.interpretation ? true : false,
            hasAssociatedDisease: this.props.interpretation && this.props.interpretation.disease ? true : false,
            hasAssociatedInheritance: this.props.interpretation && this.props.interpretation.modeInheritance ? true : false
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

    render: function() {
        let hasExistingInterpretation = this.props.interpretation ? true : false;
        if (!hasExistingInterpretation) {
            let variant = this.props.variantData;
            if (variant && variant.associatedInterpretations && variant.associatedInterpretations.length) {
                for (let interpretation of variant.associatedInterpretations) {
                    if (interpretation.submitted_by.uuid === this.props.session.user_properties.uuid) {
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
                            <DiseaseModalButton variantData={this.props.variantData} session={this.props.session} hasAssociatedDisease={this.state.hasAssociatedDisease}
                                interpretation={this.props.interpretation} editKey={this.props.editkey} updateInterpretationObj={this.props.updateInterpretationObj}
                                calculatedAssertion={this.props.calculatedAssertion} provisionalPathogenicity={this.props.provisionalPathogenicity} />
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
                                :
                                null
                            }
                        </div>
                    </div>
                }
            </div>
        );
    }
});

// class to contain the Disease button and its modal
var DiseaseModalButton = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object,
        hasAssociatedDisease: React.PropTypes.bool,
        session: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.string,
        updateInterpretationObj: React.PropTypes.func,
        calculatedAssertion: React.PropTypes.string,
        provisionalPathogenicity: React.PropTypes.string
    },

    render: function() {
        let associateDiseaseButtonTitle = <span>Disease <i className="icon icon-plus-circle"></i></span>,
            associateDiseaseModalTitle = 'Associate this interpretation with a disease';
        if (this.props.hasAssociatedDisease) {
            associateDiseaseButtonTitle = <span>Disease <i className="icon icon-pencil"></i></span>;
            associateDiseaseModalTitle = 'Associate this interpretation with a different disease';
        }

        return (
            <AssociateDisease
                data={this.props.variantData}
                session={this.props.session}
                interpretation={this.props.interpretation}
                editKey={this.props.editkey}
                updateInterpretationObj={this.props.updateInterpretationObj}
                calculatedAssertion={this.props.calculatedAssertion}
                provisionalPathogenicity={this.props.provisionalPathogenicity}
                title={associateDiseaseModalTitle}
                buttonText={associateDiseaseButtonTitle}
                buttonClass='btn-primary pull-right'
            />
        );
    }
});

// class to contain the Inheritance button and its modal
var InheritanceModalButton = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object,
        hasAssociatedInheritance: React.PropTypes.bool,
        session: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        editKey: React.PropTypes.string,
        updateInterpretationObj: React.PropTypes.func
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
                buttonClass='btn-primary pull-right btn-inline-spacer'
            />
        );
    }
});

// handle 'Associate with Disease' button click event
var AssociateDisease = React.createClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    contextTypes: {
        handleStateChange: React.PropTypes.func
    },

    propTypes: {
        data: React.PropTypes.object, // variant object
        session: React.PropTypes.object, // session object
        interpretation: React.PropTypes.object, // interpretation object
        editKey: React.PropTypes.bool, // edit flag
        updateInterpretationObj: React.PropTypes.func,
        calculatedAssertion: React.PropTypes.string,
        provisionalPathogenicity: React.PropTypes.string,
        title: React.PropTypes.string, // Text appearing in the modal header
        buttonText: React.PropTypes.string, // Text of the link/button invoking the modal
        buttonClass: React.PropTypes.string // CSS class of the link/button invoking the modal
    },

    getInitialState: function() {
        return {
            submitResourceBusy: false,
            shouldShowWarning: false
        };
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        if (valid && this.getFormValue('orphanetid') === '') {
            return valid;
        }
        // Check if orphanetid
        if (valid) {
            valid = this.getFormValue('orphanetid').match(/^ORPHA[0-9]{1,6}$/i);
            if (!valid) {
                this.setFormErrors('orphanetid', 'Use Orphanet IDs (e.g. ORPHA15)');
            }
        }
        return valid;
    },

    // Handle value changes in provisional form
    handleChange: function() {
        if (!this.refs['orphanetid'].getValue()) {
            let interpretation = this.props.interpretation;
            if (interpretation && interpretation.markAsProvisional) {
                this.setState({shouldShowWarning: true});
            } else if (interpretation && !interpretation.markAsProvisional) {
                this.setState({shouldShowWarning: false});
            }
        } else {
            this.setState({shouldShowWarning: false});
        }
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Get values from form and validate them
        this.saveFormValue('orphanetid', this.refs.orphanetid.getValue());
        if (this.validateForm()) {
            // Invoke button progress indicator
            this.setState({submitResourceBusy: true});
            // Get the free-text values for the Orphanet ID to check against the DB
            var orphaId = this.getFormValue('orphanetid');
            var interpretationDisease, currInterpretation, flatInterpretation;

            if (orphaId !== '') {
                orphaId = orphaId.match(/^ORPHA([0-9]{1,6})$/i)[1];
                // Get the disease orresponding to the given Orphanet ID.
                // If either error out, set the form error fields
                this.getRestDatas([
                    '/diseases/' + orphaId
                ], [
                    function() { this.setFormErrors('orphanetid', 'Orphanet ID not found'); }.bind(this)
                ]).then(data => {
                    interpretationDisease = data[0]['@id'];
                    this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
                        currInterpretation = interpretation;
                        // get up-to-date copy of interpretation object and flatten it
                        flatInterpretation = curator.flatten(currInterpretation);
                        // if the interpretation object does not have a disease object, create it
                        if (!('disease' in flatInterpretation)) {
                            flatInterpretation.disease = '';
                            // Return the newly flattened interpretation object in a Promise
                            return Promise.resolve(flatInterpretation);
                        } else {
                            return Promise.resolve(flatInterpretation);
                        }
                    }).then(interpretationObj => {
                        if (interpretationDisease) {
                            // Set the disease '@id' to the newly flattened interpretation object's 'disease' property
                            interpretationObj.disease = interpretationDisease;
                            // Update the intepretation object partially with the new disease property value
                            return this.putRestData('/interpretation/' + this.props.interpretation.uuid, interpretationObj).then(result => {
                                this.props.updateInterpretationObj();
                                var meta = {
                                    interpretation: {
                                        variant: this.props.data['@id'],
                                        disease: interpretationDisease,
                                        mode: 'edit-disease'
                                    }
                                };
                                if (flatInterpretation.modeInheritance) {
                                    meta.interpretation.modeInheritance = flatInterpretation.modeInheritance;
                                }
                                return this.recordHistory('modify', currInterpretation, meta).then(result => {
                                    this.setState({submitResourceBusy: false});
                                    // Need 'submitResourceBusy' state to proceed closing modal
                                    return Promise.resolve(this.state.submitResourceBusy);
                                });
                            }).then(submitState => {
                                // Close modal after 'submitResourceBusy' is completed
                                if (submitState !== true) {
                                    this.handleModalClose();
                                }
                            });
                        }
                    });
                }).catch(e => {
                    // Some unexpected error happened
                    this.setState({submitResourceBusy: false});
                    parseAndLogError.bind(undefined, 'fetchedRequest');
                });
            } else {
                this.getRestData('/interpretation/' + this.props.interpretation.uuid).then(interpretation => {
                    currInterpretation = interpretation;
                    // get up-to-date copy of interpretation object and flatten it
                    var flatInterpretation = curator.flatten(currInterpretation);
                    // if the interpretation object does not have a disease object, create it
                    if ('disease' in flatInterpretation) {
                        delete flatInterpretation['disease'];
                        let provisionalPathogenicity = this.props.provisionalPathogenicity;
                        let calculatedAssertion = this.props.calculatedAssertion;
                        if (provisionalPathogenicity === 'Likely pathogenic' || provisionalPathogenicity === 'Pathogenic') {
                            flatInterpretation['markAsProvisional'] = false;
                        } else if (!provisionalPathogenicity) {
                            if (calculatedAssertion === 'Likely pathogenic' || calculatedAssertion === 'Pathogenic' ) {
                                flatInterpretation['markAsProvisional'] = false;
                            }
                        }

                        // Update the intepretation object partially with the new disease property value
                        this.putRestData('/interpretation/' + this.props.interpretation.uuid, flatInterpretation).then(result => {
                            var meta = {
                                interpretation: {
                                    variant: this.props.data['@id'],
                                    disease: interpretationDisease,
                                    mode: 'edit-disease'
                                }
                            };
                            this.recordHistory('modify', currInterpretation, meta).then(result => {
                                this.setState({submitResourceBusy: false}, () => {
                                    // Need 'submitResourceBusy' state to proceed closing modal
                                    this.props.updateInterpretationObj();
                                    this.handleModalClose();
                                });
                            });
                        });
                    } else {
                        this.setState({submitResourceBusy: false}, () => {
                            // Need 'submitResourceBusy' state to proceed closing modal
                            this.handleModalClose();
                        });
                    }
                }).catch(e => {
                    // Some unexpected error happened
                    this.setState({submitResourceBusy: false});
                    parseAndLogError.bind(undefined, 'fetchedRequest');
                });
            }
        }
    },

    // Called when the modal 'Cancel' button is clicked
    cancelAction: function(e) {
        this.setState({submitResourceBusy: false}, () => {
            this.handleModalClose();
        });
    },

    /************************************************************************************************/
    /* Resetting the formErrors for selected input and other states was not needed previously       */
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
    handleModalClose() {
        let errors = this.state.formErrors;
        errors['orphanetid'] = '';
        if (!this.state.submitResourceBusy) {
            this.setState({formErrors: errors, shouldShowWarning: false});
            this.child.closeModal();
        }
    },

    render: function() {
        var disease_id = '';
        if (this.props.interpretation) {
            if (this.props.interpretation.interpretation_disease) {
                disease_id = this.props.interpretation.interpretation_disease;
            }
        }

        return (
            <ModalComponent modalTitle={this.props.title} modalClass="modal-default" modalWrapperClass="modal-associate-inheritance"
                actuatorClass={this.props.buttonClass} actuatorTitle={this.props.buttonText} onRef={ref => (this.child = ref)}>
                <Form submitHandler={this.submitForm} formClassName="form-std">
                    <div className="modal-box">
                        <div className="modal-body clearfix">
                            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} placeholder="e.g. ORPHA15" value={(disease_id) ? disease_id : null}
                                error={this.getFormError('orphanetid')} clearError={this.clrFormErrors.bind(null, 'orphanetid')} handleChange={this.handleChange}
                                labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
                        </div>
                        {this.state.shouldShowWarning ?
                            <div className="alert alert-warning">
                                Warning: This interpretation is marked as "Provisional." If it has a Modified Pathogenicity of "Likely pathogenic" or "Pathogenic,"
                                or no Modified Pathogenicity but a Calculated Pathogenicity of "Likely pathogenic" or "Pathogenic," it must be associated with a disease.<br/><br/>
                                <strong>If you still wish to delete the disease, select "Cancel," then select "View Summary" and remove the "Provisional" selection </strong>
                                - otherwise, deleting the disease will automatically remove the "Provisional" status.
                            </div>
                        : null}
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

var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Enter <a href="http://www.orpha.net/" target="_blank" title="Orphanet home page in a new tab">Orphanet</a> ID</span>;
    }
});

// handle 'Associate with Inheritance' button click event
var AssociateInheritance = React.createClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    contextTypes: {
        handleStateChange: React.PropTypes.func
    },

    propTypes: {
        data: React.PropTypes.object, // variant object
        session: React.PropTypes.object, // session object
        interpretation: React.PropTypes.object, // interpretation object
        editKey: React.PropTypes.bool, // edit flag
        updateInterpretationObj: React.PropTypes.func,
        title: React.PropTypes.string, // Text appearing in the modal header
        buttonText: React.PropTypes.string, // Text of the link/button invoking the modal
        buttonClass: React.PropTypes.string // CSS class of the link/button invoking the modal
    },

    getInitialState: function() {
        return {
            submitResourceBusy: false,
            adjectives: [],
            adjectiveDisabled: true
        };
    },

    componentDidMount: function() {
        if (this.props.interpretation) {
            if (this.props.interpretation.modeInheritance) {
                let moi = this.props.interpretation.modeInheritance;
                let adjective = this.props.interpretation.modeInheritanceAdjective;
                this.parseModeInheritance(moi, adjective ? adjective : 'none');
            }
        }
    },

    // Handle value changes in modeInheritance dropdown selection
    handleChange: function(ref, e) {
        if (ref === 'inheritance') {
            this.parseModeInheritance(this.refs[ref].getValue(), 'none');
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
        }, () => {this.refs.moiAdjective.setValue(defaultValue);});
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Get values from form and validate them
        this.saveFormValue('inheritance', this.refs.inheritance.getValue());
        let moiAdjectiveValue = this.refs.moiAdjective.getValue();
        if (moiAdjectiveValue && moiAdjectiveValue !== 'none') {
            this.saveFormValue('moiAdjective', moiAdjectiveValue);
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
            this.handleModalClose();
        });
    },

    /************************************************************************************************/
    /* Resetting the formErrors for selected input and other states was not needed previously       */
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
    handleModalClose() {
        let errors = this.state.formErrors;
        errors['inheritance'] = '', errors['moiAdjective'] = '';
        if (!this.state.submitResourceBusy) {
            this.setState({formErrors: errors, adjectives: [], adjectiveDisabled: true});
            this.child.closeModal();
        }
    },

    render: function() {
        let adjectives = this.state.adjectives;
        let adjectiveDisabled = this.state.adjectiveDisabled;
        const moiKeys = Object.keys(modesOfInheritance);

        let defaultModeInheritance = 'select';
        if (this.props.interpretation) {
            if (this.props.interpretation.modeInheritance) {
                defaultModeInheritance = this.props.interpretation.modeInheritance;
            }
        }

        return (
            <ModalComponent modalTitle={this.props.title} modalClass="modal-default" modalWrapperClass="modal-associate-disease"
                actuatorClass={this.props.buttonClass} actuatorTitle={this.props.buttonText} onRef={ref => (this.child = ref)}>
                <Form submitHandler={this.submitForm} formClassName="form-std">
                    <div className="modal-box">
                        <div className="modal-body clearfix">
                            <Input type="select" ref="inheritance" label="Mode of Inheritance" defaultValue={defaultModeInheritance} handleChange={this.handleChange}
                                error={this.getFormError('inheritance')} clearError={this.clrFormErrors.bind(null, 'inheritance')}
                                labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="inheritance" >
                                <option value="no-moi">No mode of inheritance</option>
                                <option value="" disabled="disabled"></option>
                                {moiKeys.map(function(modeOfInheritance, i) {
                                    return <option key={i} value={modeOfInheritance}>{modeOfInheritance}</option>;
                                })}
                            </Input>
                             <Input type="select" ref="moiAdjective" label="Select an adjective" defaultValue='none' inputDisabled={adjectiveDisabled}
                                error={this.getFormError('moiAdjective')} clearError={this.clrFormErrors.bind(null, 'moiAdjective')}
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
