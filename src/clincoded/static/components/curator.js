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
var RestMixin = require('./rest').RestMixin;
var Input = form.Input;
var external_url_map = globals.external_url_map;
var userMatch = globals.userMatch;
var truncateString = globals.truncateString;
var external_url_map = globals.external_url_map;


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
            '/gdm/' + gdmUuid
        ).then(gdmObj => {
            var gdm = flatten(gdmObj);
            gdm.omimId = newOmimId;
            return this.putRestData('/gdm/' + gdmUuid, gdm).then(data => {
                return Promise.resolve(gdmObj);
            });
        }).then(gdmObj => {
            gdmObj.omimId = newOmimId;
            this.setState({currGdm: gdmObj, currOmimId: newOmimId});
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
        var session = this.props.session && Object.keys(this.props.session).length ? this.props.session : null;

        var provisional;
        var provisionalExist = false;
        var summaryButton = false;
        if (gdm && gdm['@type'][0] === 'gdm') {
            var gene = this.props.gdm.gene;
            var disease = this.props.gdm.disease;
            var mode = this.props.gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];


            // if provisional exist, show summary and classification, Edit link and Generate New Summary button.
            if (gdm.provisionalClassifications && gdm.provisionalClassifications.length > 0) {
                for (var i in gdm.provisionalClassifications) {
                    if (userMatch(gdm.provisionalClassifications[i].submitted_by, session)) {
                        provisionalExist = true;
                        provisional = gdm.provisionalClassifications[i];
                        break;
                    }
                }
            }

            // go through all annotations, groups, families and individuals to find one proband individual with all variant assessed.
            var supportedVariants = getUserPathogenicity(gdm, session);
            if (!summaryButton && gdm.annotations && gdm.annotations.length > 0 && supportedVariants && supportedVariants.length > 0) {
                for (var i in gdm.annotations) {
                    var annotation = gdm.annotations[i];
                    if (annotation.individuals && annotation.individuals.length > 0 && searchProbandIndividual(annotation.individuals, supportedVariants)) {
                        summaryButton = true;
                        break;
                    }
                    if (!summaryButton && annotation.families && annotation.families.length > 0) {
                        for (var j in annotation.families) {
                            if (annotation.families[j].individualIncluded && annotation.families[j].individualIncluded.length > 0 &&
                                searchProbandIndividual(annotation.families[j].individualIncluded, supportedVariants)) {
                                summaryButton = true;
                                break;
                            }
                        }
                    }
                    if (summaryButton) {
                        break;
                    }
                    else if (annotation.groups && annotation.groups.length > 0) {
                        for (var j in annotation.groups) {
                            if (annotation.groups[j].familyIncluded && annotation.groups[j].familyIncluded.length > 0) {
                                for (var k in annotation.groups[j].familyIncluded) {
                                    if (annotation.groups[j].familyIncluded[k].individualIncluded && annotation.groups[j].familyIncluded[k].individualIncluded.length > 0 &&
                                        searchProbandIndividual(annotation.groups[j].familyIncluded[k].individualIncluded, supportedVariants)) {
                                        summaryButton = true;
                                        break;
                                    }
                                }
                            }
                            if (summaryButton) {
                                break;
                            }
                            else if (annotation.groups[j].individualIncluded && annotation.groups[j].individualIncluded.length > 0 &&
                                searchProbandIndividual(annotation.groups[j].individualIncluded, supportedVariants)) {
                                summaryButton = true;
                                break;
                            }
                        }
                    }
                    if (summaryButton) {
                        break;
                    }
                }
            }

            return (
                <div>
                    <div className="curation-data-title">
                        <div className="container">
                            <h1>{gene.symbol} – {disease.term}</h1>
                            <h2>{mode}</h2>
                            <div className="provisional-info-panel">
                                <table style={{'width':'100%'}}>
                                    <tr>
                                        <td style={{'textAlign':'left'}}>
                                            <div className="provisional-title">
                                                <strong>Last Saved Summary & Provisional Classification</strong>
                                            </div>
                                            {   provisionalExist ?
                                                    <div>
                                                        <div className="provisional-data-left">
                                                            <span>
                                                                Last Saved Summary<br />
                                                                Date Generated: {moment(provisional.last_modified).format("YYYY MMM DD, h:mm a")}
                                                            </span>
                                                        </div>
                                                        <div className="provisional-data-center">
                                                            <span>
                                                                Total Score: {provisional.totalScore} ({provisional.autoClassification})<br />
                                                                Provisional Classification: {provisional.alteredClassification}&nbsp;&nbsp;
                                                                [<a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'}><strong>Edit Classification</strong></a>]
                                                            </span>
                                                        </div>
                                                    </div>
                                                :
                                                    <div className="provisional-data-left"><span>No Reported Evidence</span></div>
                                            }
                                        </td>
                                        { summaryButton ?
                                            <td style={{'width':'200px', 'vertical-align':'middle'}}>
                                                <a className="btn btn-primary" href={'/provisional-curation/?gdm=' + gdm.uuid + '&calculate=yes'}>
                                                    { provisionalExist ? 'Generate New Summary' : 'Generate Summary' }
                                                </a>
                                            </td>
                                            :
                                            <td style={{'width':'200px'}}>&nbsp;</td>
                                        }

                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="container curation-data">
                        <div className="row equal-height">
                            <GeneRecordHeader gene={gene} />
                            <DiseaseRecordHeader gdm={gdm} omimId={this.props.omimId} updateOmimId={this.props.updateOmimId} />
                            <CuratorRecordHeader gdm={gdm} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }
});


// function to collect variants assessed support by login user
var getUserPathogenicity = function(gdm, session) {
    var supportedVariants = [];
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
        for (var i in gdm.variantPathogenicity) {
            var this_patho = gdm.variantPathogenicity[i];
            if (userMatch(this_patho.submitted_by, session) && this_patho.assessments && this_patho.assessments.length > 0 && this_patho.assessments[0].value === 'Supports') {
                supportedVariants.push(this_patho.variant.uuid);
            }
        }
    }
    return supportedVariants;
};

var all_in = function(individualVariantList, allSupportedlist) {
    for(var i in individualVariantList) {
        var this_in = false;
        for (var j in allSupportedlist) {
            if (individualVariantList[i].uuid === allSupportedlist[j]) {
                this_in = true;
                break;
            }
        }

        if (!this_in) {
            return false;
        }
    }
    return true;
};

// function to find one proband individual with all variants assessed.
var searchProbandIndividual = function(individualList, variantList) {
    for (var i in individualList) {
        if (individualList[i].proband && individualList[i].variants && individualList[i].variants.length > 0 && all_in(individualList[i].variants, variantList)) {
            return true;
        }
    }
    return false;
};


// Display the header of all variants involved with the current GDM.
var VariantHeader = module.exports.VariantHeader = React.createClass({
    propTypes: {
        gdm: React.PropTypes.object, // GDM whose collected variants to display
        pmid: React.PropTypes.string, // PMID of currently selected article
        session: React.PropTypes.object // Logged-in session
    },

    render: function() {
        var gdm = this.props.gdm;
        var pmid = this.props.pmid;
        var session = this.props.session && Object.keys(this.props.session).length ? this.props.session : null;
        var collectedVariants = collectGdmVariants(gdm);

        return (
            <div>
                {collectedVariants ?
                    <div className="variant-header clearfix">
                        <h2>Gene-Disease Record Variants</h2>
                        <p>Click a variant to View, Curate, or Edit/Assess it. The icon indicates curation by one or more curators.</p>
                        {Object.keys(collectedVariants).map(variantId => {
                            var variant = collectedVariants[variantId];
                            var variantName = variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 20);
                            var userPathogenicity = null;

                            // See if the variant has a pathogenicity curated in the current GDM
                            var matchingPathogenicity;
                            var inCurrentGdm = _(variant.associatedPathogenicities).find(function(pathogenicity) {
                                var matchingGdm = _(pathogenicity.associatedGdm).find(function(associatedGdm) {
                                    return associatedGdm.uuid === gdm.uuid;
                                });
                                if (matchingGdm) {
                                    matchingPathogenicity = pathogenicity;
                                }
                                return !!matchingGdm;
                            });

                            if (session && inCurrentGdm) {
                                userPathogenicity = getPathogenicityFromVariant(gdm, session.user_properties.uuid, variant.uuid);
                                //userPathogenicity = getPathogenicityFromVariant(variant, session.user_properties.uuid);
                            }
                            inCurrentGdm = userPathogenicity ? true : false;

                            return (
                                <div className="col-sm-6 col-md-3 col-lg-2" key={variant.uuid}>
                                    <a className="btn btn-primary btn-xs" href={'/variant-curation/?all&gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '') + '&variant=' + variant.uuid + (session ? '&user=' + session.user_properties.uuid : '') + (userPathogenicity ? '&pathogenicity=' + userPathogenicity.uuid : '')}>
                                        {inCurrentGdm ? <i className="icon icon-sticky-note"></i> : null}
                                        {variantName}
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                : null}
            </div>
        );
    }
});


// Render the Variant Associations header.
var VariantAssociationsHeader = module.exports.VariantAssociationsHeader = React.createClass({
    propTypes: {
        gdm: React.PropTypes.object, // GDM containing the PMIDs we're searching
        variant: React.PropTypes.object // Variant whose associations we're searching for
    },

    render: function() {
        var gdm = this.props.gdm;
        var variant = this.props.variant;
        var annotations = gdm && gdm.annotations;
        var annotationAssociations = [];

        if (annotations && variant) {
            // Search all annotations in the GDM for all associations for the given variant
            annotations.forEach(function(annotation) {
                // Get all associations (families, individuals) for this annotation and variant
                var associations = collectVariantAssociations(annotation, variant);
                if (associations) {
                    // Sort by probands first
                    var sortedAssociations = _(associations).sortBy(function(association) {
                        if (association['@type'][0] === 'individual') {
                            return association.proband ? 0 : 1;
                        }
                        return 1;
                    });
                    var render = (
                        <div key={annotation.uuid}>
                            <span>PMID: <a href={globals.external_url_map['PubMed'] + annotation.article.pmid} target="_blank" title="PubMed article in a new tab">{annotation.article.pmid}</a> → </span>
                            {sortedAssociations.map(function(association, i) {
                                var associationType = association['@type'][0];
                                var probandLabel = (associationType === 'individual' && association.proband) ? <i className="icon icon-proband"></i> : null;
                                return (
                                    <span key={association.uuid}>
                                        {i > 0 ? ', ' : ''}
                                        <a href={association['@id']} title={'View ' + associationType + ' in a new tab'} target="_blank">{association.label}</a>{probandLabel}
                                    </span>
                                );
                            })}
                        </div>
                    );
                    annotationAssociations.push(render);
                }
            });
        }

        return (
            <div>
                {annotationAssociations}
            </div>
        );
    }
});


// Displays the PM item summary, with authors, title, citation
var PmidSummary = module.exports.PmidSummary = React.createClass({
    propTypes: {
        article: React.PropTypes.object, // Article object to display
        displayJournal: React.PropTypes.bool, // T to display article journal
        pmidLinkout: React.PropTypes.bool // T to display pmid linkout
    },

    render: function() {
        var authors, authorsAll;
        var article = this.props.article;
        if (article && Object.keys(article).length) {
            var date = (/^([\d]{4})(.*?)$/).exec(article.date);

            if (article.authors && article.authors.length) {
                authors = article.authors[0] + (article.authors.length > 1 ? ' et al. ' : '. ');
                authorsAll = article.authors.join(', ') + '. ';
            }

            return (
                <p>
                    {this.props.displayJournal ? authorsAll : authors}
                    {article.title + ' '}
                    {this.props.displayJournal ? <i>{article.journal + '. '}</i> : null}
                    <strong>{date[1]}</strong>{date[2]}
                    {this.props.pmidLinkout ? <span>&nbsp;<a href={external_url_map['PubMed'] + article.pmid} title={"PubMed entry for PMID:" + article.pmid + " in new tab"} target="_blank">PMID:{article.pmid}</a></span> : null}
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
        var gdm = this.props.gdm;
        var annotation = this.props.annotation;
        var session = this.props.session;
        var curatorMatch = annotation && userMatch(annotation.submitted_by, session);
        var groupUrl = curatorMatch ? ('/group-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;
        var familyUrl = curatorMatch ? ('/family-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;
        var individualUrl = curatorMatch ? ('/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;
        var experimentalUrl = curatorMatch ? ('/experimental-curation/?gdm=' + gdm.uuid + '&evidence=' + this.props.annotation.uuid) : null;
        var groupRenders = [], familyRenders = [], individualRenders = [], experimentalRenders = [];

        // Collect up arrays of group, family, and individual curation palette section renders. Start with groups inside the annnotation.
        if (annotation && annotation.groups) {
            var groupAnnotationRenders = annotation.groups.map(group => {
                if (group.familyIncluded) {
                    // Collect up family renders that are associated with the group, and individuals that are associated with those families.
                    var familyGroupRenders = group.familyIncluded.map(family => {
                        if (family.individualIncluded) {
                            // Collect up individuals that are direct children of families associated with groups
                            var individualFamilyRenders = family.individualIncluded.map(individual => {
                                return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch)}</div>;
                            });
                            individualRenders = individualRenders.concat(individualFamilyRenders);
                        }
                        return <div key={family.uuid}>{renderFamily(family, gdm, annotation, curatorMatch)}</div>;
                    });
                    familyRenders = familyRenders.concat(familyGroupRenders);
                }
                if (group.individualIncluded) {
                    // Collect up family renders that are associated with the group, and individuals that are associated with those families.
                    var individualGroupRenders = group.individualIncluded.map(individual => {
                        return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch)}</div>;
                    });
                    individualRenders = individualRenders.concat(individualGroupRenders);
                }
                return <div key={group.uuid}>{renderGroup(group, gdm, annotation, curatorMatch)}</div>;
            });
            groupRenders = groupRenders.concat(groupAnnotationRenders);
        }

        // Add to the array of family renders the unassociated families, and individuals that associate with them.
        if (annotation && annotation.families) {
            var familyAnnotationRenders = annotation.families.map(family => {
                if (family.individualIncluded) {
                    // Add to individual renders the individuals that are associated with this family
                    var individualFamilyRenders = family.individualIncluded.map(individual => {
                        return <div key={individual.uuid}>{renderIndividual(individual, this.props.gdm, annotation, curatorMatch)}</div>;
                    });
                    individualRenders = individualRenders.concat(individualFamilyRenders);
                }
                return <div key={family.uuid}>{renderFamily(family, gdm, annotation, curatorMatch)}</div>;
            });
            familyRenders = familyRenders.concat(familyAnnotationRenders);
        }

        // Add to the array of individual renders the unassociated individuals.
        if (annotation && annotation.individuals) {
            var individualAnnotationRenders = annotation.individuals.map(individual => {
                return <div key={individual.uuid}>{renderIndividual(individual, gdm, annotation, curatorMatch)}</div>;
            });
            individualRenders = individualRenders.concat(individualAnnotationRenders);
        }

        // Add to the array of experiment renders.
        if (annotation && annotation.experimentalData) {
            var experimentalAnnotationRenders = annotation.experimentalData.map(experimental => {
                return <div key={experimental.uuid}>{renderExperimental(experimental, gdm, annotation, curatorMatch)}</div>;
            });
            experimentalRenders = experimentalRenders.concat(experimentalAnnotationRenders);
        }

        // Render variants
        var variantRenders;
        var allVariants = collectAnnotationVariants(annotation);
        if (Object.keys(allVariants).length) {
            variantRenders = Object.keys(allVariants).map(function(variantId) {
                return <div key={variantId}>{renderVariant(allVariants[variantId], gdm, annotation, curatorMatch, session)}</div>;
            });
        }

        return (
            <div>
                {annotation ?
                    <Panel panelClassName="panel-evidence-groups" title={'Evidence for PMID:' + annotation.article.pmid}>
                        <Panel title={<CurationPaletteTitles title="Group" url={groupUrl} />} panelClassName="panel-evidence">
                            {groupRenders}
                        </Panel>
                        <Panel title={<CurationPaletteTitles title="Family" url={familyUrl} />} panelClassName="panel-evidence">
                            {familyRenders}
                        </Panel>
                        <Panel title={<CurationPaletteTitles title="Individual" url={individualUrl} />} panelClassName="panel-evidence">
                            {individualRenders}
                        </Panel>
                        <Panel title={<CurationPaletteTitles title="Experimental Data" url={experimentalUrl} />} panelClassName="panel-evidence">
                            {experimentalRenders}
                        </Panel>
                        {variantRenders && variantRenders.length ?
                            <Panel title={<CurationPaletteTitles title="Associated Variants" />} panelClassName="panel-evidence">
                                {variantRenders && variantRenders.length ?
                                    <div className="evidence-curation-info">
                                        <p>Curate Variants from the “Gene-Disease Record Variants” section above.</p>
                                    </div>
                                : null}
                                {variantRenders}
                            </Panel>
                        :
                            <Panel title={<CurationPaletteTitles title="Associated Variants" />} panelClassName="panel-evidence"></Panel>
                        }
                    </Panel>
                : null}
            </div>
        );
    }
});

// Render a family in the curator palette.
var renderGroup = function(group, gdm, annotation, curatorMatch) {
    var familyUrl = curatorMatch ? ('/family-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;
    var individualUrl = curatorMatch ? ('/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;

    return (
        <div className="panel-evidence-group">
            <h5>{group.label}</h5>
            <div className="evidence-curation-info">
                {group.submitted_by ?
                    <p className="evidence-curation-info">{group.submitted_by.title}</p>
                : null}
                <p>{moment(group.date_created).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            <a href={'/group/' + group.uuid} target="_blank" title="View group in a new tab">View</a>{curatorMatch ? <span> | <a href={'/group-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&group=' + group.uuid} title="Edit this group">Edit</a></span> : null}
            {curatorMatch ? <div><a href={familyUrl + '&group=' + group.uuid} title="Add a new family associated with this group"> Add new Family to this Group</a></div> : null}
            {curatorMatch ? <div><a href={individualUrl + '&group=' + group.uuid} title="Add a new individual associated with this group"> Add new Individual to this Group</a></div> : null}
        </div>
    );
};

// Render a family in the curator palette.
var renderFamily = function(family, gdm, annotation, curatorMatch) {
    var individualUrl = curatorMatch ? ('/individual-curation/?gdm=' + gdm.uuid + '&evidence=' + annotation.uuid) : null;
    // if any of these segregation values exist, the family is assessable
    var familyAssessable = (family && family.segregation && (family.segregation.pedigreeDescription || family.segregation.pedigreeSize
        || family.segregation.numberOfGenerationInPedigree || family.segregation.consanguineousFamily || family.segregation.numberOfCases
        || family.segregation.deNovoType || family.segregation.numberOfParentsUnaffectedCarriers || family.segregation.numberOfAffectedAlleles
        || family.segregation.numberOfAffectedWithOneVariant || family.segregation.numberOfAffectedWithTwoVariants || family.segregation.numberOfUnaffectedCarriers
        || family.segregation.numberOfUnaffectedIndividuals || family.segregation.probandAssociatedWithBoth || family.segregation.additionalInformation)) ? true : false;

    return (
        <div className="panel-evidence-group">
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
            {(family && family.segregation && family.segregation.variants && family.segregation.variants.length) ?
                <div>
                    <span>Variants: </span>
                    {family.segregation.variants.map(function(variant, j) {
                        return (
                            <span key={j}>
                                {j > 0 ? ', ' : ''}
                                {variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 15)}
                            </span>
                        );
                    })}
                </div>
            : null}
            {familyAssessable ?
                <a href={'/family/' + family.uuid + '/?gdm=' + gdm.uuid} target="_blank" title="View/Assess family in a new tab">View/Assess</a>
                : <a href={'/family/' + family.uuid + '/?gdm=' + gdm.uuid} target="_blank" title="View family in a new tab">View</a>}
            {curatorMatch ? <span> | <a href={'/family-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&family=' + family.uuid} title="Edit this family">Edit</a></span> : null}
            {curatorMatch ? <div><a href={individualUrl + '&family=' + family.uuid} title="Add a new individual associated with this group">Add new Individual to this Family</a></div> : null}
        </div>
    );
};

// Render an individual in the curator palette.
var renderIndividual = function(individual, gdm, annotation, curatorMatch) {
    var i = 0;

    return (
        <div className="panel-evidence-group">
            <h5>{individual.label}{individual.proband ? <i className="icon icon-proband"></i> : null}</h5>
            <div className="evidence-curation-info">
                {individual.submitted_by ?
                    <p className="evidence-curation-info">{individual.submitted_by.title}</p>
                : null}
                <p>{moment(individual.date_created).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {(individual.associatedGroups && individual.associatedGroups.length) || (individual.associatedFamilies && individual.associatedFamilies.length) ?
                <div>
                    <span>Associations: </span>
                    {individual.associatedGroups.map(function(group) {
                        return (
                            <span key={group.uuid}>
                                {i++ > 0 ? ', ' : ''}
                                <a href={group['@id']} target="_blank" title="View group in a new tab">{group.label}</a>
                            </span>
                        );
                    })}
                    {individual.associatedFamilies.map(function(family) {
                        return (
                            <span key={family.uuid}>
                                {family.associatedGroups.map(function(group) {
                                    return (
                                        <span key={group.uuid}>
                                            {i++ > 0 ? ', ' : ''}
                                            <a href={group['@id']} target="_blank" title="View group in a new tab">{group.label}</a>
                                        </span>
                                    );
                                })}
                                <span key={family.uuid}>
                                    {i++ > 0 ? ', ' : ''}
                                    <a href={family['@id'] + '?gdm=' + gdm.uuid} target="_blank" title="View family in a new tab">{family.label}</a>
                                </span>
                            </span>
                        );
                    })}
                </div>
            :
                <div>No associations</div>
            }
            {(individual.variants && individual.variants.length) ?
                <div>
                    <span>Variants: </span>
                    {individual.variants.map(function(variant, j) {
                        return (
                            <span key={j}>
                                {j > 0 ? ', ' : ''}
                                {variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 15)}
                            </span>
                        );
                    })}
                </div>
            : null}
            <a href={'/individual/' + individual.uuid} target="_blank" title="View individual in a new tab">View</a>
            {curatorMatch ? <span> | <a href={'/individual-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&individual=' + individual.uuid} title="Edit this individual">Edit</a></span> : null}
        </div>
    );
};

// Render an experimental data in the curator palette.
var renderExperimental = function(experimental, gdm, annotation, curatorMatch) {
    var i = 0;
    var subtype = '';
    // determine if the evidence type has a subtype, and determine the subtype
    if (experimental.evidenceType == 'Biochemical function') {
        if (!_.isEmpty(experimental.biochemicalFunction.geneWithSameFunctionSameDisease)) {
            subtype = ' (A)';
        } else if (!_.isEmpty(experimental.biochemicalFunction.geneFunctionConsistentWithPhenotype)) {
            subtype = ' (B)';
        }
    } else if (experimental.evidenceType == 'Expression') {
        if (!_.isEmpty(experimental.expression.normalExpression)) {
            subtype = ' (A)';
        } else if (!_.isEmpty(experimental.expression.alteredExpression)) {
            subtype = ' (B)';
        }
    }

    return (
        <div className="panel-evidence-group" key={experimental.uuid}>
            <h5>{experimental.label}</h5>
            {experimental.evidenceType}{subtype}
            <div className="evidence-curation-info">
                {experimental.submitted_by ?
                    <p className="evidence-curation-info">{experimental.submitted_by.title}</p>
                : null}
                <p>{moment(experimental.date_created).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {(experimental.variants && experimental.variants.length) ?
                <div>
                    <span>Variants: </span>
                    {experimental.variants.map(function(variant, j) {
                        return (
                            <span key={j}>
                                {j > 0 ? ', ' : ''}
                                {variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 15)}
                            </span>
                        );
                    })}
                </div>
            : null}
            <a href={'/experimental/' + experimental.uuid + '?gdm=' + gdm.uuid} target="_blank" title="View/Assess experimental data in a new tab">View/Assess</a>
            {curatorMatch ? <span> | <a href={'/experimental-curation/?editsc&gdm=' + gdm.uuid + '&evidence=' + annotation.uuid + '&experimental=' + experimental.uuid} title="Edit experimental data">Edit</a></span> : null}
        </div>
    );
};

// Render a variant in the curator palette.
//   variant: variant to display
//   gdm: Currently viewed GDM
//   annotation: Currently selected annotation (paper)
//   curatorMatch: True if annotation owner matches currently logged-in user
var renderVariant = function(variant, gdm, annotation, curatorMatch) {
    var variantCurated = variant.associatedPathogenicities.length > 0;

    // Get the pathogenicity record with an owner that matches the annotation's owner.
    var associatedPathogenicity = getPathogenicityFromVariant(gdm, annotation.submitted_by.uuid, variant.uuid);
    //var associatedPathogenicity = getPathogenicityFromVariant(variant, annotation.submitted_by.uuid);

    // Get all families and individuals that reference this variant into variantAssociations array of families and individuals
    var variantAssociations = collectVariantAssociations(annotation, variant).sort(function(associationA, associationB) {
        var labelA = associationA.label.toLowerCase();
        var labelB = associationB.label.toLowerCase();
        return (labelA < labelB) ? -1 : ((labelA > labelB ? 1 : 0));
    });

    return (
        <div className="panel-evidence-group">
            <h5>{variant.clinvarVariantId ? <span>{'VariationId: ' + variant.clinvarVariantId}</span> : <span>{'Description: ' + variant.otherDescription}</span>}</h5>
            <div className="evidence-curation-info">
                {variant.submitted_by ?
                    <p className="evidence-curation-info">{variant.submitted_by.title}</p>
                : null}
                <p>{moment(variant.date_created).format('YYYY MMM DD, h:mm a')}</p>
            </div>
            {variantAssociations ?
                <div>
                    <span>Associations: </span>
                    {variantAssociations.map(function(association, i) {
                        var associationType = association['@type'][0];
                        var probandIndividual = associationType === 'individual' && association.proband;
                        return (
                            <span key={i}>
                                {i > 0 ? ', ' : ''}
                                <a href={association['@id']} title={'View ' + associationType + ' in a new tab'} target="_blank">{association.label}</a>
                                {probandIndividual ? <i className="icon icon-proband"></i> : null}
                            </span>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

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
        var disease = gdm && gdm.disease;
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
                                {this.props.updateOmimId ?
                                    <Modal title="Add/Change OMIM ID" wrapperClassName="edit-omim-modal">
                                        <span>[</span><a modal={<AddOmimIdModal gdm={gdm} closeModal={this.closeModal} updateOmimId={this.props.updateOmimId} />} href="#">{addEdit}</a><span>]</span>
                                    </Modal>
                                : null}
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

        //only a mouse click on cancel button closes modal
        //(do not let the enter key [which evaluates to 0 mouse
        //clicks] be accepted to close modal)
        if (e.detail >= 1){
            this.props.closeModal();
        }
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
        var gdm = this.props.gdm;
        var annotations = gdm && gdm.annotations;
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
        var owners = gdm && gdm.annotations.map(function(annotation) {
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


// Get the pathogenicity made by the curator with the given user UUID from the given variant.
//var getPathogenicityFromVariant = function(variant, curatorUuid) {
//  var pathogenicity = null;

//    if (variant && variant.associatedPathogenicities.length > 0) {
//        // At this point, we know the variant has a curation (pathogenicity)
//        pathogenicity = _(variant.associatedPathogenicities).find(function(pathogenicity) {
//            return pathogenicity.submitted_by.uuid === curatorUuid;
//        });
//    }
//    return pathogenicity;
//};
var getPathogenicityFromVariant = function(gdm, curatorUuid, variantUuid) {
    var pathogenicity = null;
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
        for (var i in gdm.variantPathogenicity) {
            if (gdm.variantPathogenicity[i].submitted_by.uuid === curatorUuid && gdm.variantPathogenicity[i].variant.uuid === variantUuid) {
                pathogenicity = gdm.variantPathogenicity[i];
            }
        }
    }
    return pathogenicity;
};


// Collect references to all families and individuals within an annotation that reference the given variant
var collectVariantAssociations = function(annotation, targetVariant) {
    var allAssociations = [];

    // Find any variants matching the target variant in the given individual.
    // Any matching variant pushes its individual onto the associations array as a side effect
    function surveyIndividual(individual, targetVariant, associations) {
        // Search for variant in individual matching variant we're looking for
        var matchingVariant = _(individual.variants).find(function(variant) {
            return variant.uuid === targetVariant.uuid;
        });

        // Found a matching variant; push its parent individual
        if (matchingVariant) {
            associations.push(individual);
        }
    }

    // Find any variants matching the target variant in the given family's segregation.
    // Any matching variant pushes its family onto the associations array as a side effect
    function surveyFamily(family, targetVariant, associations) {
        if (family.segregation && family.segregation.variants) {
            var matchingVariant = _(family.segregation.variants).find(function(variant) {
                return variant.uuid === targetVariant.uuid;
            });

            // Found a matching variant; push its parent family
            if (matchingVariant) {
                allAssociations.push(family);
            }
        }
    }

    // Find any variants matching the target variant in the given experimental data.
    // Any matching variant pushes its experimental data onto the associations array as a side effect
    function surveyExperimental(experimental, targetVariant, associations) {
        // Search for variant in experimental matching variant we're looking for
        var matchingVariant = _(experimental.variants).find(function(variant) {
            return variant.uuid === targetVariant.uuid;
        });

        // Found a matching variant; push its parent individual
        if (matchingVariant) {
            associations.push(experimental);
        }
    }

    if (annotation && Object.keys(annotation).length) {
        // Search unassociated individuals
        annotation.individuals.forEach(function(individual) {
            // Add any variants matching targetVariant in the individual to allAssociations
            surveyIndividual(individual, targetVariant, allAssociations);
        });

        // Search unassociated families
        annotation.families.forEach(function(family) {
            // Add any variants matching targetVariant in the family to allAssociations
            surveyFamily(family, targetVariant, allAssociations);

            // Search for variant in the family's individuals matching variant we're looking for
            family.individualIncluded.forEach(function(individual) {
                surveyIndividual(individual, targetVariant, allAssociations);
            });
        });

        // Search groups
        annotation.groups.forEach(function(group) {
            // Search variants in group's individuals
            group.individualIncluded.forEach(function(individual) {
                surveyIndividual(individual, targetVariant, allAssociations);
            });

            // Search variants in group's families' segregations
            group.familyIncluded.forEach(function(family) {
                surveyFamily(family, targetVariant, allAssociations);

                // Search for variant in the group's families' individuals matching variant we're looking for
                family.individualIncluded.forEach(function(individual) {
                    surveyIndividual(individual, targetVariant, allAssociations);
                });
            });
        });

        // Search experimental data
        annotation.experimentalData.forEach(function(experimental) {
            surveyExperimental(experimental, targetVariant, allAssociations);
        });
    }

    return allAssociations.length ? allAssociations : null;
};


// Returns object keyed by variant @id, each of which points to each variant in all family segmentations
// and individuals in all annotations in the given GDM. All variants are de-duped in the returned object.
var collectGdmVariants = function(gdm) {
    var allVariants = {};

    if (gdm && gdm.annotations && gdm.annotations.length) {
        gdm.annotations.forEach(function(annotation) {
            // Get all variants in each annotation
            var annotationVariants = collectAnnotationVariants(annotation);

            // Merge them into the collection of all annotations' variants
            Object.keys(annotationVariants).forEach(function(variantId) {
                allVariants[variantId] = annotationVariants[variantId];
            });
        });
    }
    return Object.keys(allVariants).length ? allVariants : null;
};


// Returns object keyed by variant @id that points to each variant in all family segmentations
// and individuals related to the given annotation (evidence/article). There's plenty of opportunity
// for duplicate variants, but all variants are de-duped in the returned object.
// returnvalue.a -> a{}.
var collectAnnotationVariants = function(annotation) {
    var allVariants = {};

    if (annotation && Object.keys(annotation).length) {
        // Search unassociated individuals
        annotation.individuals.forEach(function(individual) {
            individual.variants.forEach(function(variant) {
                allVariants[variant['@id']] = variant;
            });
        });

        // Search unassociated families
        annotation.families.forEach(function(family) {
            // Collect variants in the family's segregation
            if (family.segregation && family.segregation.variants) {
                family.segregation.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }

            // Collect variants in the family's individuals
            family.individualIncluded.forEach(function(individual) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            });
        });

        // Search groups
        annotation.groups.forEach(function(group) {
            // Collect variants in group's individuals
            group.individualIncluded.forEach(function(individual) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            });

            // Collect variants in associated families' segregations
            group.familyIncluded.forEach(function(family) {
                // Collect variants in the family's segregation
                if (family.segregation && family.segregation.variants) {
                    family.segregation.variants.forEach(function(variant) {
                        allVariants[variant['@id']] = variant;
                    });
                }

                // Collect variants in the family's individual's
                family.individualIncluded.forEach(function(individual) {
                    individual.variants.forEach(function(variant) {
                        allVariants[variant['@id']] = variant;
                    });
                });
            });
        });

        // Search experimental data
        annotation.experimentalData.forEach(function(experimental) {
            // Collect variants in experimental data, if available
            if (experimental.variants) {
                experimental.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }
        });
    }
    return allVariants;
};


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
        return captureBase(s, /^\s*([1-9]{1}\d*)\s*$/);
    },

    // Find all the comma-separated HPO ID occurrences. Return all valid HPO ID in an array.
    hpoids: function(s) {
        return captureBase(s, /^\s*(HP:\d{7})\s*$/i, true);
    },

    // Find all the comma-separated GO_Slim ID occurrences. Return all valid GO_Slim ID in an array.
    goslims: function(s) {
        return captureBase(s, /^\s*(GO:\d{7})\s*$/i, true);
    },

    // Find all the comma-separated Uberon ID occurrences. Return all valid Uberon ID in an array.
    uberonids: function(s) {
        return captureBase(s, /^\s*(UBERON_\d{7})\s*$/i, true);
    },

    // Find all the comma-separated EFO ID occurrences. Return all valid EFO IDs in an array.
    efoids: function(s) {
        return captureBase(s, /^\s*(EFO_\d{7})\s*$/i, true);
    },

    // Find all the comma-separated CL Ontology ID occurrences. Return all valid Uberon ID in an array.
    clids: function(s) {
        return captureBase(s, /^\s*(CL_\d{7})\s*$/i, true);
    },
};


// Given a PMID for a paper in a GDM, find its annotation object.
module.exports.pmidToAnnotation = function(gdm, pmid) {
    return _(gdm.annotations).find(annotation => {
        return annotation.article.pmid === pmid;
    });
};


// Take an object and make a flattened version ready for writing.
// SCHEMA: This might need to change when the schema changes.
var flatten = module.exports.flatten = function(obj, type) {
    var flat = null;

    // Normally don't pass in a type; we'll get it from the object itself. Pass in a type only
    // if there might not be one -- rare but possible.
    if (!type) {
        type = obj['@type'][0];
    }

    if (obj) {
        switch(type) {
            case 'gdm':
                flat = flattenGdm(obj);
                break;

            case 'annotation':
                flat = flattenAnnotation(obj);
                break;

            case 'group':
                flat = flattenGroup(obj);
                break;

            case 'family':
                flat = flattenFamily(obj);
                break;

            case 'individual':
                flat = flattenIndividual(obj);
                break;

            case 'pathogenicity':
                flat = flattenPathogenicity(obj);
                break;

            case 'experimental':
                flat = flattenExperimental(obj);
                break;

            case 'assessment':
                flat = flattenAssessment(obj);
                break;

            case 'provisionalClassification':
                flat = flattenProvisional(obj);
                break;

            default:
                break;
        }

        // Flatten submitted_by
        if (obj.submitted_by) {
            flat.submitted_by = obj.submitted_by['@id'];
        }
    }

    return flat;
};


// Clone the simple properties of the given object and return them in a new object.
// An array of the names of the properties to copy in the 'props' parameter.
// Simple properties include strings, booleans, integers, arrays of those things,
// and objects comprising simple properties.

function cloneSimpleProps(obj, props) {
    var dup = {};

    props.forEach(function(prop) {
        if (obj.hasOwnProperty(prop)) {
            dup[prop] = obj[prop];
        }
    });
    return dup;
}


var annotationSimpleProps = ["active", "date_created"];

function flattenAnnotation(annotation) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(annotation, annotationSimpleProps);

    flat.article = annotation.article['@id'];

    // Flatten groups
    if (annotation.groups && annotation.groups.length) {
        flat.groups = annotation.groups.map(function(group) {
            return group['@id'];
        });
    }

    // Flatten families
    if (annotation.families && annotation.families.length) {
        flat.families = annotation.families.map(function(family) {
            return family['@id'];
        });
    }

    // Flatten individuals
    if (annotation.individuals && annotation.individuals.length) {
        flat.individuals = annotation.individuals.map(function(individual) {
            return individual['@id'];
        });
    }

    // Flatten experimentalData
    if (annotation.experimentalData && annotation.experimentalData.length) {
        flat.experimentalData = annotation.experimentalData.map(function(data) {
            return data['@id'];
        });
    }

    return flat;
}


var groupSimpleProps = ["label", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "numberOfMale", "numberOfFemale", "countryOfOrigin",
    "ethnicity", "race", "ageRangeType", "ageRangeFrom", "ageRangeTo", "ageRangeUnit", "totalNumberIndividuals", "numberOfIndividualsWithFamilyInformation",
    "numberOfIndividualsWithoutFamilyInformation", "numberOfIndividualsWithVariantInCuratedGene", "numberOfIndividualsWithoutVariantInCuratedGene",
    "numberOfIndividualsWithVariantInOtherGene", "method", "additionalInformation", "date_created"
];

function flattenGroup(group) {
    // First copy simple properties before fixing the special properties
    var flat = cloneSimpleProps(group, groupSimpleProps);

    flat.commonDiagnosis = group.commonDiagnosis.map(function(disease) {
        return disease['@id'];
    });

    if (group.otherGenes && group.otherGenes.length) {
        flat.otherGenes = group.otherGenes.map(function(gene) {
            return gene['@id'];
        });
    }

    if (group.otherPMIDs && group.otherPMIDs.length) {
        flat.otherPMIDs = group.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    if (group.statistic) {
        flat.statistic = group.statistic['@id'];
    }

    if (group.familyIncluded && group.familyIncluded.length) {
        flat.familyIncluded = group.familyIncluded.map(function(family) {
            return family['@id'];
        });
    }

    if (group.individualIncluded && group.individualIncluded.length) {
        flat.individualIncluded = group.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    }

    if (group.control) {
        flat.control = group.control['@id'];
    }

    return flat;
}


var familySimpleProps = ["label", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "numberOfMale", "numberOfFemale", "countryOfOrigin",
    "ethnicity", "race", "ageRangeType", "ageRangeFrom", "ageRangeTo", "ageRangeUnit", "method", "additionalInformation", "date_created"
];

function flattenFamily(family) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(family, familySimpleProps);

    // Flatten diseases
    flat.commonDiagnosis = family.commonDiagnosis.map(function(disease) {
        return disease['@id'];
    });

    // Flatten segregation variants
    if (family.segregation) {
        flat.segregation = flattenSegregation(family.segregation);
    }

    // Flatten other PMIDs
    if (family.otherPMIDs && family.otherPMIDs.length) {
        flat.otherPMIDs = family.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    // Flatten included individuals
    if (family.individualIncluded && family.individualIncluded.length) {
        flat.individualIncluded = family.individualIncluded.map(function(individual) {
            return individual['@id'];
        });
    }

    return flat;
}


var segregationSimpleProps = ["pedigreeDescription", "pedigreeSize", "numberOfGenerationInPedigree", "consanguineousFamily", "numberOfCases", "deNovoType",
    "numberOfParentsUnaffectedCarriers", "numberOfAffectedAlleles", "numberOfAffectedWithOneVariant", "numberOfAffectedWithTwoVariants", "numberOfUnaffectedCarriers",
    "numberOfUnaffectedIndividuals", "probandAssociatedWithBoth", "additionalInformation"];

var flattenSegregation = module.exports.flattenSegregation = function(segregation) {
    var flat = cloneSimpleProps(segregation, segregationSimpleProps);

    if (segregation.variants && segregation.variants.length) {
        flat.variants = segregation.variants.map(function(variant) {
            return variant['@id'];
        });
    }
    if (segregation.assessments && segregation.assessments.length) {
        flat.assessments = segregation.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }

    return flat;
};


var individualSimpleProps = ["label", "sex", "hpoIdInDiagnosis", "termsInDiagnosis", "hpoIdInElimination", "termsInElimination", "countryOfOrigin", "ethnicity",
    "race", "ageType", "ageValue", "ageUnit", "method", "additionalInformation", "proband", "date_created"
];

function flattenIndividual(individual) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(individual, individualSimpleProps);

    // Flatten diseases
    flat.diagnosis = individual.diagnosis.map(function(disease) {
        return disease['@id'];
    });

    // Flatten other PMIDs
    if (individual.otherPMIDs && individual.otherPMIDs.length) {
        flat.otherPMIDs = individual.otherPMIDs.map(function(article) {
            return article['@id'];
        });
    }

    // Flatten variants
    if (individual.variants && individual.variants.length) {
        flat.variants = individual.variants.map(function(variant) {
            return variant['@id'];
        });
    }

    return flat;
}


var experimentalSimpleProps = ["label", "evidenceType", "biochemicalFunction", "proteinInteractions", "expression",
    "functionalAlteration", "modelSystems", "rescue"
];

function flattenExperimental(experimental) {
    // First copy everything before fixing the special properties
    var flat = cloneSimpleProps(experimental, experimentalSimpleProps);

    // Flatten genes
    if (experimental.biochemicalFunction && experimental.biochemicalFunction.geneWithSameFunctionSameDisease
        && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes
        && experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.length) {
        flat.biochemicalFunction.geneWithSameFunctionSameDisease.genes = experimental.biochemicalFunction.geneWithSameFunctionSameDisease.genes.map(function(gene) {
            return gene['@id'];
        });
    }
    if (experimental.proteinInteractions && experimental.proteinInteractions.interactingGenes
        && experimental.proteinInteractions.interactingGenes.length) {
        flat.proteinInteractions.interactingGenes = experimental.proteinInteractions.interactingGenes.map(function(gene) {
            return gene['@id'];
        });
    }
    // Flatten assessments
    if (experimental.assessments && experimental.assessments.length) {
        flat.assessments = experimental.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }
    // Flatten variants
    if (experimental.variants && experimental.variants.length) {
        flat.variants = experimental.variants.map(function(variant) {
            return variant['@id'];
        });
    }

    return flat;
}


var gdmSimpleProps = [
    "date_created", "modeInheritance", "omimId", "draftClassification", "finalClassification", "active"
];

function flattenGdm(gdm) {
    // First copy all the simple properties
    var flat = cloneSimpleProps(gdm, gdmSimpleProps);

    // Flatten genes
    if (gdm.gene) {
        flat.gene = gdm.gene['@id'];
    }

    // Flatten diseases
    if (gdm.disease) {
        flat.disease = gdm.disease['@id'];
    }

    // Flatten annotations
    if (gdm.annotations && gdm.annotations.length) {
        flat.annotations = gdm.annotations.map(function(annotation) {
            return annotation['@id'];
        });
    }

    // Flatten variant pathogenicities
    if (gdm.variantPathogenicity && gdm.variantPathogenicity.length) {
        flat.variantPathogenicity = gdm.variantPathogenicity.map(function(vp) {
            return vp['@id'];
        });
    }

    // Flatten provisional classifications
    if (gdm.provisionalClassifications && gdm.provisionalClassifications.length) {
        flat.provisionalClassifications = gdm.provisionalClassifications.map(function(classification) {
            return classification['@id'];
        });
    }

    return flat;
}


var pathogenicitySimpleProps = [
    "date_created", "consistentWithDiseaseMechanism", "withinFunctionalDomain", "frequencySupportPathogenicity", "previouslyReported",
    "denovoType", "intransWithAnotherVariant", "supportingSegregation", "supportingStatistic", "supportingExperimental", "comment"
];

function flattenPathogenicity(pathogenicity) {
    // First copy all the simple properties
    var flat = cloneSimpleProps(pathogenicity, pathogenicitySimpleProps);

    // Flatten variant
    flat.variant = pathogenicity.variant['@id'];

    // Flatten assessments
    if (pathogenicity.assessments && pathogenicity.assessments.length) {
        flat.assessments = pathogenicity.assessments.map(function(assessment) {
            return assessment['@id'];
        });
    }

    return flat;
}


var assessmentSimpleProps = [
    "date_created", "value", "evidence_type", "evidence_id", "evidence_gdm", "active"
];

function flattenAssessment(assessment) {
    var flat = cloneSimpleProps(assessment, assessmentSimpleProps);

    return flat;
}


var provisionalSimpleProps = [
    "date_created", "totalScore", "autoClassification", "alteredClassification", "reasons", "active"
];

function flattenProvisional(provisional) {
    var flat = cloneSimpleProps(provisional, provisionalSimpleProps);

    return flat;
}


// Given an array of group or families in 'objList', render a list of Orphanet IDs for all diseases in those
// groups or families.
var renderOrphanets = module.exports.renderOrphanets = function(objList, title) {
    return (
        <div>
            {objList && objList.length ?
                <div>
                    {objList.map(function(obj) {
                        return (
                            <div key={obj.uuid} className="form-group">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Orphanet Diseases Associated with {title}:</strong>
                                </div>
                                <div className="col-sm-7">
                                    {obj.commonDiagnosis.map(function(disease, i) {
                                        return (
                                            <span key={disease.orphaNumber}>
                                                {i > 0 ? ', ' : ''}
                                                {'ORPHA' + disease.orphaNumber}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

// Mixin for delete button (and associated modal) of Group, Family, Individual, and Experimental
// Data objects. This mixin only renderes the button; please see DeleteButtonModal for bulk of
// functionality
var DeleteButton = module.exports.DeleteButton = React.createClass({
    mixins: [ModalMixin],
    propTypes: {
        gdm: React.PropTypes.object,
        parent: React.PropTypes.object,
        item: React.PropTypes.object,
        pmid: React.PropTypes.string,
    },
    render: function() {
        return (
            <Modal title="Delete Item">
                <a className="btn btn-warning pull-left" modal={<DeleteButtonModal gdm={this.props.gdm} parent={this.props.parent} item={this.props.item} pmid={this.props.pmid} closeModal={this.closeModal} />}>
                    Delete
                </a>
            </Modal>
        );
    }
});

// Delete Button confirmation modal. Sets target item to have status of 'deleted', and removes
// the 'deleted' entry from its parent object. Forwards user back to curation central on delete
// success
var DeleteButtonModal = React.createClass({
    mixins: [RestMixin],
    propTypes: {
        gdm: React.PropTypes.object,
        parent: React.PropTypes.object,
        item: React.PropTypes.object,
        pmid: React.PropTypes.string,
        closeModal: React.PropTypes.func, // Function to call to close the modal
    },

    getInitialState: function() {
        return {
            submitBusy: false // True while form is submitting
        };
    },

    deleteItem: function(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({submitBusy: true});
        var deletedItem;
        var deletedParent;
        this.getRestData(this.props.item['@id'], null, true).then(item => {
            // get up-to-date target item and set its status to deleted
            deletedItem = flatten(item);
            deletedItem.status = 'deleted';
            return Promise.resolve(item);
        }).then(item => {
            // get up-to-date parent object; also bypass issue of certain certain embedded parent
            // items in edit pages being un-flattenable
            return this.getRestData(this.props.parent['@id'], null, true).then(parent => {
                return Promise.resolve(parent);
            });
        }).then(parent => {
            // flatten parent object and remove link to deleted item as appropriate
            deletedParent = flatten(parent);
            if (parent['@type'][0] == 'annotation') {
                if (this.props.item['@type'][0] == 'group') {
                    deletedParent.groups = _.without(deletedParent.groups, this.props.item['@id']);
                } else if (this.props.item['@type'][0] == 'family') {
                    deletedParent.families = _.without(deletedParent.families, this.props.item['@id']);
                } else if (this.props.item['@type'][0] == 'individual') {
                    deletedParent.individuals = _.without(deletedParent.individuals, this.props.item['@id']);
                } else if (this.props.item['@type'][0] == 'experimental') {
                    deletedParent.experimentalData = _.without(deletedParent.experimentalData, this.props.item['@id']);
                }
            } else {
                if (this.props.item['@type'][0] == 'family') {
                    deletedParent.familyIncluded = _.without(deletedParent.familyIncluded, this.props.item['@id']);
                } else if (this.props.item['@type'][0] == 'individual') {
                    deletedParent.individualIncluded = _.without(deletedParent.individualIncluded, this.props.item['@id']);
                }
            }
            // PUT updated parent object w/ removed link to deleted item
            return this.putRestData(this.props.parent['@id'], deletedParent).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }).then(data => {
            // PUT deleted item w/ updated status
            return this.putRestData(this.props.item['@id'], deletedItem).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }).then(data => {
            // forward user to curation central w/ PMID selected
            window.location.href = '/curation-central/?gdm=' + this.props.gdm.uuid + '&pmid=' + this.props.pmid;
        }).catch(function(e) {
            this.setState({submitBusy: false});
            console.log('DELETE ERROR: %o', e);
        });
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        //only a mouse click on cancel button closes modal
        //(do not let the enter key [which evaluates to 0 mouse
        //clicks] be accepted to close modal)
        if (e.detail >= 1){
            this.props.closeModal();
        }
    },

    render: function() {
        return (
            <div>
                <div className="modal-body">
                    Are you sure you would like to delete this item?
                </div>
                <div className="modal-footer">
                    <Input type="button" inputClassName="btn-primary btn-inline-spacer" clickHandler={this.deleteItem} title="Confirm Delete" submitBusy={this.state.submitBusy} />
                    <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                </div>
            </div>
        );
    }
});

