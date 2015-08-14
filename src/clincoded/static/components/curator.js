'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var parseAndLogError = require('./mixins').parseAndLogError;

var Panel = panel.Panel;
var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;


var CurationMixin = module.exports.CurationMixin = {
    getInitialState: function() {
        return {
            currOmimId: '' // Currently set OMIM ID
        };
    },

    // Get a flattened GDM corresponding to the one given in gdmUuid. update its OMIM ID given in
    // newOmimId, and write it back out. If the write is successful, also update the currOmimId
    // React state variable.
    updateOmimId: function(gdmUuid, newOmimId) {
        this.getRestData(
            '/gdm/' + gdmUuid + '/?frame=object'
        ).then(gdmObj => {
            // We'll get 422 (Unprocessible entity) if we PUT any of these fields:
            if (gdmObj.uuid) { delete gdmObj.uuid; }
            if (gdmObj['@id']) { delete gdmObj['@id']; }
            if (gdmObj['@type']) { delete gdmObj['@type']; }
            if (gdmObj.status) { delete gdmObj.status; }

            gdmObj.omimId = newOmimId;
            return this.putRestData('/gdm/' + gdmUuid, gdmObj);
        }).then(data => {
            this.setState({currOmimId: newOmimId});
        }).catch(e => {
            console.log('UPDATEOMIMID %o', e);
        });
    },

    // Set the currOmimId state to the given omimId
    setOmimIdState: function(omimId) {
        this.setState({currOmimId: omimId});
    }
};


var CuratorPage = module.exports.CuratorPage = React.createClass({
    render: function() {
        var context = this.props.context;

        var CuratorPageView = globals.curator_page.lookup(context, context.name);
        var content = <CuratorPageView {...this.props} />;
        return (
            <div>{content}</div>
        );
    }
});

globals.content_views.register(CuratorPage, 'curator_page');


// Curation data header for Gene:Disease
var RecordHeader = module.exports.RecordHeader = React.createClass({
    propTypes: {
        gdm: React.PropTypes.object, // GDM data to display
        omimId: React.PropTypes.string, // OMIM ID to display
        updateOmimId: React.PropTypes.func // Function to call when OMIM ID changes
    },

    render: function() {
        var gdm = this.props.gdm;

        if (gdm && Object.keys(gdm).length > 0 && gdm['@type'][0] === 'gdm') {
            var gene = this.props.gdm.gene;
            var disease = this.props.gdm.disease;
            var mode = this.props.gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];

            return (
                <div>
                    <div className="curation-data-title">
                        <div className="container">
                            <h1>{gene.symbol} – {disease.term}</h1>
                            <h2>{mode}</h2>
                        </div>
                    </div>
                    <div className="container curation-data">
                        <div className="row equal-height">
                            <GeneRecordHeader gene={gene} />
                            <DiseaseRecordHeader gdm={this.props.gdm} omimId={this.props.omimId} updateOmimId={this.props.updateOmimId} />
                            <CuratorRecordHeader gdm={this.props.gdm} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }
});


// Displays the PM item summary, with authors, title, citation
var PmidSummary = module.exports.PmidSummary = React.createClass({
    propTypes: {
        article: React.PropTypes.object, // Article object to display
        displayJournal: React.PropTypes.bool // T to display article journal
    },

    render: function() {
        var authors;
        var article = this.props.article;
        if (article && Object.keys(article).length) {
            var date = (/^([\d]{4})(.*?)$/).exec(article.date);

            if (article.authors && article.authors.length) {
                authors = article.authors[0] + (article.authors.length > 1 ? ' et al. ' : '. ');
            }

            return (
                <p>
                    {authors}
                    {article.title + ' '}
                    {this.props.displayJournal ? <i>{article.journal + '. '}</i> : null}
                    <strong>{date[1]}</strong>{date[2]}
                </p>
            );
        } else {
            return null;
        }
    }
});


var CurationPalette = module.exports.CurationPalette = React.createClass({
    propTypes: {
        annotation: React.PropTypes.object.isRequired, // Current annotation that owns the article
        gdm: React.PropTypes.object.isRequired, // Current GDM that owns the given annotation
        session: React.PropTypes.object // Session object
    },

    render: function() {
        var annotation = this.props.annotation;
        var session = this.props.session;
        var curatorMatch = annotation && userMatch(annotation.submitted_by, session);
        var groupUrl = curatorMatch ? ('/group-curation/?gdm=' + this.props.gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;
        var familyUrl = curatorMatch ? ('/family-curation/?gdm=' + this.props.gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;

        return (
            <Panel panelClassName="panel-evidence-groups" title={'Evidence for PMID:' + this.props.annotation.article.pmid}>
                <Panel title={<CurationPaletteTitles title="Group" url={groupUrl} />} panelClassName="panel-evidence">
                    {annotation.groups && annotation.groups.map(function(group) {
                        return (
                            <div className="panel-evidence-group" key={group.uuid}>
                                <h5>{group.label}</h5>
                                <div className="evidence-curation-info">
                                    {group.submitted_by ?
                                        <p className="evidence-curation-info">{group.submitted_by.title}</p>
                                    : null}
                                    <p>{moment(group.date_created).format('YYYY MMM DD, h:mm a')}</p>
                                </div>
                                <a href={'/group/' + group.uuid} target="_blank" title="View group in a new tab">View</a>{curatorMatch ? <span> | <a href={'/group-curation/?gdm=' + this.props.gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid} title="Edit this group">Edit</a></span> : null}
                                {curatorMatch ? <div><a href={familyUrl + '&group=' + group.uuid} title="Add a new family associated with this group">Add family information</a></div> : null}
                            </div>
                        );
                    }.bind(this))}
                </Panel>
                <Panel title={<CurationPaletteTitles title="Family" url={familyUrl} />} panelClassName="panel-evidence">
                    {annotation.families && annotation.families.map(function(family) {
                        return (
                            <div className="panel-evidence-group" key={family.uuid}>
                                <h5>{family.label}</h5>
                                <div className="evidence-curation-info">
                                    {family.submitted_by ?
                                        <p className="evidence-curation-info">{family.submitted_by.title}</p>
                                    : null}
                                    <p>{moment(family.date_created).format('YYYY MMM DD, h:mm a')}</p>
                                </div>
                                {family.associatedGroups && family.associatedGroups.length ?
                                    <div>
                                        <span>Associations: </span>
                                        {family.associatedGroups.map(function(group, i) {
                                            return (
                                                <span key={i}>
                                                    {i > 0 ? ', ' : ''}
                                                    <a href={group['@id']} target="_blank" title="View group in a new tab">{group.label}</a>
                                                </span>
                                            );
                                        })}
                                    </div>
                                :
                                    <div>No associations</div>
                                }
                                <a href={'/family/' + family.uuid} target="_blank" title="View family in a new tab">View</a>{curatorMatch ? <span> | <a href={'/family-curation/?gdm=' + this.props.gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid} title="Edit this family">Edit</a></span> : null}
                            </div>
                        );
                    }.bind(this))}
                </Panel>
            </Panel>
        );
    }
});


// Title for each section of the curation palette. Contains the title and an Add button.
var CurationPaletteTitles = React.createClass({
    propTypes: {
        title: React.PropTypes.string, // Title to display
        url: React.PropTypes.string // URL for panel title click to go to.
    },

    render: function() {
        return (
            <div>
                {this.props.url ?
                    <a href={this.props.url} className="curation-palette-title clearfix">
                        <h4 className="pull-left">{this.props.title}</h4>
                        <i className="icon icon-plus-circle pull-right"></i>
                    </a>
                :
                    <span className="curation-palette-title clearfix">
                        <h4 className="pull-left">{this.props.title}</h4>
                    </span>
                }
            </div>
        );
    }
});


// Display the gene section of the curation data
var GeneRecordHeader = React.createClass({
    propTypes: {
        gene: React.PropTypes.object // Object to display
    },

    render: function() {
        var gene = this.props.gene;

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    {gene ?
                        <dl>
                            <dt>{gene.symbol}</dt>
                            <dd>HGNC Symbol: <a href={external_url_map['HGNC'] + gene.hgncId} target="_blank" title={'HGNC page for ' + gene.symbol + ' in a new window'}>{gene.symbol}</a></dd>
                            <dd>NCBI Gene ID: <a href={external_url_map['Entrez'] + gene.entrezId} target="_blank" title={'NCBI page for gene ' + gene.entrezId + ' in a new window'}>{gene.entrezId}</a></dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});


// Display the disease section of the curation data
var DiseaseRecordHeader = React.createClass({
    mixins: [ModalMixin],

    propTypes: {
        gdm: React.PropTypes.object, // Object to display
        omimId: React.PropTypes.string, // OMIM ID to display
        updateOmimId: React.PropTypes.func // Function to call when OMIM ID changes
    },

    render: function() {
        var gdm = this.props.gdm;
        var disease = gdm.disease;
        var addEdit = this.props.omimId ? 'Edit' : 'Add';

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    {disease ?
                        <dl>
                            <dt>{disease.term}</dt>
                            <dd>Orphanet ID: <a href={external_url_map['OrphaNet'] + disease.orphaNumber} target="_blank" title={'Orphanet page for ORPHA' + disease.orphaNumber + ' in a new window'}>{'ORPHA' + disease.orphaNumber}</a></dd>
                            <dd>
                                <a href="http://omim.org/" target="_blank" title="Online Mendelian Inheritance in Man home page in a new window">OMIM</a> ID: {this.props.omimId ?
                                    <a href={external_url_map['OMIM'] + this.props.omimId} title={'Open Online Mendelian Inheritance in Man page for OMIM ID ' + this.props.omimId + ' in a new window'} target="_blank">
                                        {this.props.omimId}
                                    </a>
                                : null}&nbsp;
                                <Modal title="Add/Change OMIM ID" wrapperClassName="edit-omim-modal">
                                    <span>[</span><a modal={<AddOmimIdModal gdm={gdm} closeModal={this.closeModal} updateOmimId={this.props.updateOmimId} />} href="#">{addEdit}</a><span>]</span>
                                </Modal>
                            </dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});


// The content of the Add PMID(s) modal dialog box
var AddOmimIdModal = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: React.PropTypes.object.isRequired, // GDM being affected
        closeModal: React.PropTypes.func.isRequired, // Function to call to close the modal
        updateOmimId: React.PropTypes.func.isRequired // Function to call when we have a new OMIM ID
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        // Valid if the field has only 10 or fewer digits 
        if (valid) {
            valid = this.getFormValue('omimid').match(/^[0-9]{1,10}$/i);
            if (!valid) {
                this.setFormErrors('omimid', 'Only numbers allowed');
            }
        }
        return valid;
    },

    // Called when the modal form’s submit button is clicked. Handles validation and updating the OMIM in the GDM.
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.saveFormValue('omimid', this.refs.omimid.getValue());
        if (this.validateForm()) {
            // Form is valid -- we have a good OMIM ID. Close the modal and update the current GDM's OMIM ID
            this.props.closeModal();
            var enteredOmimId = this.getFormValue('omimid');
                this.props.updateOmimId(this.props.gdm.uuid, enteredOmimId);
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.props.closeModal();
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-std">
                <div className="modal-body">
                    <Input type="text" ref="omimid" label="Enter an OMIM ID"
                        error={this.getFormError('omimid')} clearError={this.clrFormErrors.bind(null, 'omim')}
                        labelClassName="control-label" groupClassName="form-group" required />
                </div>
                <div className='modal-footer'>
                    <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                    <Input type="submit" inputClassName="btn-primary btn-inline-spacer" title="Add/Change OMIM ID" />
                </div>
            </Form>
        );
    }
});


// Display the curator data of the curation data
var CuratorRecordHeader = React.createClass({
    propTypes: {
        gdm: React.PropTypes.object // GDM with curator data to display
    },

    // Return the latest annotation in the given GDM
    findLatestAnnotation: function() {
        var annotations = this.props.gdm.annotations;
        var latestAnnotation = {};
        var latestTime = 0;
        if (annotations && annotations.length) {
            annotations.forEach(function(annotation) {
                // Get Unix timestamp version of annotation's time and compare against the saved version.
                var time = moment(annotation.date_created).format('x');
                if (latestTime < time) {
                    latestAnnotation = annotation;
                    latestTime = time;
                }
            });
        }
        return latestAnnotation;
    },

    render: function() {
        var gdm = this.props.gdm;
        var owners = gdm.annotations.map(function(annotation) {
            return annotation.submitted_by;
        });
        var annotationOwners = _.chain(owners).uniq(function(owner) {
            return owner.uuid;
        }).sortBy('last_name').value();
        var latestAnnotation = this.findLatestAnnotation();

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {gdm ?
                        <dl className="inline-dl clearfix">
                            <dt>Status: </dt><dd>{gdm.status}</dd>
                            <dt>Creator: </dt><dd><a href={'mailto:' + gdm.submitted_by.email}>{gdm.submitted_by.title}</a> – {moment(gdm.date_created).format('YYYY MMM DD, h:mm a')}</dd>
                            {annotationOwners && annotationOwners.length ?
                                <div>
                                    <dt>Participants: </dt>
                                    <dd>
                                        {annotationOwners.map(function(owner, i) {
                                            return (
                                                <span key={i}>
                                                    {i > 0 ? ', ' : ''}
                                                    <a href={'mailto:' + owner.email}>{owner.title}</a>
                                                </span>
                                            );
                                        })}
                                    </dd>
                                    <dt>Last edited: </dt>
                                    <dd><a href={'mailto:' + latestAnnotation.submitted_by.email}>{latestAnnotation.submitted_by.title}</a> — {moment(latestAnnotation.date_created).format('YYYY MMM DD, h:mm a')}</dd>
                                </div>
                            : null}
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});


// Display buttons to bring up the PubMed and doi-specified web pages.
// For now, no doi is available
var PmidDoiButtons = module.exports.PmidDoiButtons = React.createClass({
    propTypes: {
        pmid: React.PropTypes.string // Numeric string PMID for PubMed page
    },

    render: function() {
        var pmid = this.props.pmid;

        return (
            <div className="pmid-doi-btns">
                {pmid ? <a className="btn btn-primary" target="_blank" href={external_url_map['PubMed'] + pmid}>PubMed</a> : null}
            </div>
        );
    }
});


// Convert a boolean value to a Yes/No dropdown value
var booleanToDropdown = module.exports.booleanToDropdown = function booleanToDropdown(boolVal) {
    return boolVal === true ? 'Yes' : (boolVal === false ? 'No' : 'none');
};


// Pull values from 's' (a list of comma-separated values) that match the regular expression given in 're'.
// If resulting values should be converted to uppercase, pass true in 'uppercase'.
function captureBase(s, re, uppercase) {
    if (s) {
        var list;
        var rawList = s.split(','); // Break input into array of raw strings
        if (rawList && rawList.length) {
            list = rawList.map(function(item) {
                var m = re.exec(item);
                return m ? (uppercase ? m[1].toUpperCase() : m[1]) : null;
            });
        }
        return list;
    }
    return null;
}

// Given a string of comma-separated values, these functions break them into an array, but only
// for values that satisfy the regex pattern. Any items that don't result in a null array entry
// for that item.
module.exports.capture = {
    // Find all the comma-separated 'orphaXX' occurrences. Return all valid orpha IDs in an array.
    orphas: function(s) {
        return captureBase(s, /^\s*orpha(\d+)\s*$/i);
    },

    // Find all the comma-separated gene-symbol occurrences. Return all valid symbols in an array.
    genes: function(s) {
        return captureBase(s, /^\s*(\w+)\s*$/, true);
    },

    // Find all the comma-separated PMID occurrences. Return all valid PMIDs in an array.
    pmids: function(s) {
        return captureBase(s, /^\s*(\d{1,10})\s*$/);
    },

    // Find all the comma-separated HPO ID occurrences. Return all valid HPO ID in an array.
    hpoids: function(s) {
        return captureBase(s, /^\s*(HP:\d{7})\s*$/i, true);
    }
};


// Take an object and make a flattened version ready for writing.
// SCHEMA: This might need to change when the schema changes.
module.exports.flatten = function(obj) {
    var flat;

    switch(obj['@type'][0]) {
        case 'annotation':
            flat = flattenAnnotation(obj);
            break;

        case 'group':
            flat = flattenGroup(obj);
            break;

        case 'family':
            flat = flattenFamily(obj);
            break;

        default:
            break;
    }

    // Delete fields we can't write
    if (flat) {
        delete flat['@id'];
        delete flat['@type'];
        delete flat.actions;
        delete flat.audit;
        delete flat.uuid;
        delete flat.submitted_by;
        delete flat.date_created;
    }
    return flat;
};




function flattenAnnotation(annotation) {
    // First copy everything before fixing the special properties
    var flat = _.clone(annotation);

    flat.article = annotation.article['@id'];

    // Flatten groups
    if (annotation.groups && annotation.groups.length) {
        flat.groups = annotation.groups.map(function(group) {
            return group['@id'];
        });
    } else {
        delete flat.groups;
    }

    // Flatten families
    if (annotation.families && annotation.families.length) {
        flat.families = annotation.families.map(function(family) {
            return family['@id'];
        });
    } else {
        delete flat.families;
    }

    // Flatten individuals
    if (annotation.individuals && annotation.individuals.length) {
        flat.individuals = annotation.individuals.map(function(individual) {
            return individual['@id'];
        });
    } else {
        delete flat.individuals;
    }

    // Flatten experimentalData
    if (annotation.experimentalData && annotation.experimentalData.length) {
        flat.experimentalData = annotation.experimentalData.map(function(data) {
            return data['@id'];
        });
    } else {
        delete flat.experimentalData;
    }

    return flat;
}

function flattenGroup(group) {
    // First copy everything before fixing the special properties
    var flat = _.clone(group);

    // Flatten diseases
    if (group.commonDiagnosis && group.commonDiagnosis.length) {
        flat.commonDiagnosis = group.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    } else {
        delete flat.commonDiagnosis;
    }

    // Flatten otherGenes
    if (group.otherGenes && group.otherGenes.length) {
        flat.otherGenes = group.otherGenes.map(function(gene) {
            return gene['@id'];
        });
    } else {
        delete flat.otherGenes;
    }

    // Flatten other PMIDs
    if (group.otherPMIDs && group.otherPMIDs.length) {
        flat.otherPMIDs = group.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    } else {
        delete flat.otherPMIDs;
    }

    // Flatten included families
    if (group.familyIncluded && group.familyIncluded.length) {
        flat.familyIncluded = group.familyIncluded.map(function(family) {
            return family['@id'];
        });
    } else {
        delete flat.familyIncluded;
    }

    // Flatten included individuals
    if (group.individualIncluded && group.individualIncluded.length) {
        flat.individualIncluded = group.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    } else {
        delete flat.individualIncluded;
    }

    // Flatten other linked objects
    if (group.statistic) {
        flat.statistic = group.statistic['@id'];
    }
    if (group.statistic) {
        flat.control = group.control['@id'];
    }

    return flat;
}

function flattenFamily(family) {
    // First copy everything before fixing the special properties
    var flat = _.clone(family);

    // Flatten diseases
    if (family.commonDiagnosis && family.commonDiagnosis.length) {
        flat.commonDiagnosis = family.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    } else {
        delete flat.commonDiagnosis;
    }

    // Flatten segregation variants
    if (family.segregation && family.segregation.variants && family.segregation.variants.length) {
        flat.segregation.variants = family.segregation.variants.map(function(variant) {
            return variant['@id'];
        });
    } else {
        delete flat.segregation.variants;
    }

    // Flatten other PMIDs
    if (family.otherPMIDs && family.otherPMIDs.length) {
        flat.otherPMIDs = family.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    } else {
        delete flat.otherPMIDs;
    }

    // Flatten included individuals
    if (family.individualIncluded && family.individualIncluded.length) {
        flat.individualIncluded = family.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    } else {
        delete flat.individualIncluded;
    }

    delete flat.associatedGroups;

    return flat;
}
