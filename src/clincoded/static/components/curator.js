'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var modal = require('../libs/bootstrap/modal');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var CuratorHistory = require('./curator_history');
var parseAndLogError = require('./mixins').parseAndLogError;

var parseClinvar = require('../libs/parse-resources').parseClinvar;

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
        var summaryPage = this.props.summaryPage ? true : false;

        var provisional;
        var provisionalExist = false;
        var summaryButton = false;

        if (gdm && gdm['@type'][0] === 'gdm') {
            var gene = this.props.gdm.gene;
            var disease = this.props.gdm.disease;
            var mode = this.props.gdm.modeInheritance.match(/^(.*?)(?: \(HP:[0-9]*?\)){0,1}$/)[1];

            var i, j, k;
            // if provisional exist, show summary and classification, Edit link and Generate New Summary button.
            if (gdm.provisionalClassifications && gdm.provisionalClassifications.length > 0) {
                for (i in gdm.provisionalClassifications) {
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
                for (i in gdm.annotations) {
                    var annotation = gdm.annotations[i];
                    if (annotation.individuals && annotation.individuals.length > 0 && searchProbandIndividual(annotation.individuals, supportedVariants)) {
                        summaryButton = true;
                        break;
                    }
                    if (!summaryButton && annotation.families && annotation.families.length > 0) {
                        for (j in annotation.families) {
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
                        for (j in annotation.groups) {
                            if (annotation.groups[j].familyIncluded && annotation.groups[j].familyIncluded.length > 0) {
                                for (k in annotation.groups[j].familyIncluded) {
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
                                <table border="1" style={{'width':'100%'}}>
                                    <tr>
                                        <td>
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
                                                                Provisional Classification: {provisional.alteredClassification}
                                                                { summaryPage ?
                                                                    null
                                                                    :
                                                                    <span>&nbsp;&nbsp;[<a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'}><strong>Edit Classification</strong></a>]</span>
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                :
                                                    <div className="provisional-data-left"><span>No Reported Evidence</span></div>
                                            }
                                        </td>
                                        <td className="button-box" rowSpan="2">
                                            { summaryButton ?
                                                ( summaryPage ?
                                                    <button type="button" className="btn btn-primary" disabled="disabled">
                                                        Generate New Summary
                                                    </button>
                                                    :
                                                    <a className="btn btn-primary" role="button" href={'/provisional-curation/?gdm=' + gdm.uuid + '&calculate=yes'}>
                                                        { provisionalExist ? 'Generate New Summary' : 'Generate Summary' }
                                                    </a>
                                                )
                                                :
                                                null
                                            }
                                        </td>
                                    </tr>
                                    <tr style={{height:'10px'}}></tr>
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
    //individualList.forEach(individual => {
    //    if (individual.proband && individual.variants && individual.variants.length > 0 && all_in(individual.variants, variantList)) {
    //        return true;
    //    }
    //});
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
                            var variantName = variant.clinvarVariantTitle ? variant.clinvarVariantTitle :
                                (variant.clinvarVariantId ? variant.clinvarVariantId : variant.otherDescription);
                            // shorten long title
                            // 46 char max
                            var char_in_line = 46;
                            var nameDisplay;
                            //var blueBarStyle = null;
                            if (variantName.length <= char_in_line) {
                                nameDisplay = variantName;
                            } else {
                                nameDisplay = variantName.substr(0, char_in_line-4) + ' ...';
                            }

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
                                <div className="col-sm-4 col-md-4 col-lg-4" key={variant.uuid}>
                                    <a className="btn btn-primary btn-xs"
                                        href={'/variant-curation/?all&gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '') + '&variant=' + variant.uuid + (session ? '&user=' + session.user_properties.uuid : '') + (userPathogenicity ? '&pathogenicity=' + userPathogenicity.uuid : '')}
                                        title={variantName}>
                                        {nameDisplay}
                                        {inCurrentGdm ? <i className="icon icon-sticky-note"></i> : null}
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
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
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
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
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

    render: function() {
        var gdm = this.props.gdm;
        var annotationOwners = getAnnotationOwners(gdm);
        var latestAnnotation = gdm && findLatestAnnotation(gdm);

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {gdm ?
                        <dl className="inline-dl clearfix">
                            <dt>Status: </dt><dd>{gdm.gdm_status}</dd>
                            <dt>Creator: </dt><dd><a href={'mailto:' + gdm.submitted_by.email}>{gdm.submitted_by.title}</a> – {moment(gdm.date_created).format('YYYY MMM DD, h:mm a')}</dd>
                            {annotationOwners && annotationOwners.length && latestAnnotation ?
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


// Return the latest annotation in the given GDM. This is the internal version; use the memoized version externally.
var findLatestAnnotation = module.exports.findLatestAnnotation = function(gdm) {
    var annotations = gdm && gdm.annotations;
    var latestAnnotation = null;
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
};


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
var getPathogenicityFromVariant = module.exports.getPathogenicityFromVariant = function(gdm, curatorUuid, variantUuid) {
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


// Get a de-duped array of annotation submitted_by objects sorted by last name from the given GDM.
var getAnnotationOwners = module.exports.getAnnotationOwners = function(gdm) {
    var owners = gdm && gdm.annotations.map(function(annotation) {
        return annotation.submitted_by;
    });
    var annotationOwners = _.chain(owners).uniq(function(owner) {
        return owner.uuid;
    }).sortBy('last_name').value();
    return annotationOwners;
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
            if (individual.variants && individual.variants.length) {
                individual.variants.forEach(function(variant) {
                    allVariants[variant['@id']] = variant;
                });
            }
        });

        // Search unassociated families
        annotation.families.forEach(function(family) {
            // Collect variants in the family's segregation
            if (family.segregation && family.segregation.variants && family.segregation.variants.length) {
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
    }
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

    if (group.commonDiagnosis && group.commonDiagnosis.length) {
        flat.commonDiagnosis = group.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

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
    if (family.commonDiagnosis && family.commonDiagnosis.length > 0) {
        flat.commonDiagnosis = family.commonDiagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

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
    if (individual.diagnosis && individual.diagnosis.length > 0) {
        flat.diagnosis = individual.diagnosis.map(function(disease) {
            return disease['@id'];
        });
    }

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
                                    <strong className="pull-right">Orphanet Disease(s) Associated with {title}:</strong>
                                </div>
                                <div className="col-sm-7">
                                    { (obj.commonDiagnosis && obj.commonDiagnosis.length > 0) ?
                                        obj.commonDiagnosis.map(function(disease, i) {
                                            return (
                                                <span key={disease.orphaNumber}>
                                                    {i > 0 ? ', ' : ''}
                                                    {'ORPHA' + disease.orphaNumber}
                                                </span>
                                            );
                                        })
                                        :
                                        <span>&nbsp;</span>
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

// Given an array of group or families in 'objList', render a list of HPO IDs and/or Phenotype free text in those groups and familes.
var renderPhenotype = module.exports.renderPhenotype = function(objList, title) {
    return (
        <div>
            <div className="col-sm-5">&nbsp;</div>
            { title === 'Experimental' ?
                <div className="col-sm-7 alert alert-warning">
                    <p style={{'margin-bottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) <strong>(required)</strong> using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300). If no HPO code exists for a particular feature,
                        please describe it in the free text box instead.
                    </p>
                </div>
            : null }
            { title === 'Family' ?
                <div className="col-sm-7">
                    <p style={{'margin-bottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) of the Family using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300).
                        If no HPO code exists for a particular feature, please describe it in the free text box instead.
                    </p>
                </div>
            : null}
            { title === 'Individual' ?
                <div className="col-sm-7">
                    <p style={{'margin-bottom':'10px'}}>
                        Please enter the relevant phenotypic feature(s) of the Individual using the Human Phenotype Ontology (HPO)
                        terms wherever possible (e.g. HP:0010704, HP:0030300).
                        If no HPO code exists for a particular feature, please describe it in the free text box instead.
                    </p>
                </div>
            : null}
            {objList && objList.length ?
                <div>
                    {objList.map(function(obj) {
                        return (
                            <div key={obj.uuid} className="form-group">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Phenotype(s) Associated with {title}:</strong>
                                </div>
                                <div className="col-sm-7">
                                    { (obj.hpoIdInDiagnosis && obj.hpoIdInDiagnosis.length > 0) ?
                                        obj.hpoIdInDiagnosis.map(function(hpoid, i) {
                                            return (
                                                <span>
                                                    {hpoid}
                                                    {i < obj.hpoIdInDiagnosis.length-1 ? ', ' : ''}
                                                    {i === obj.hpoIdInDiagnosis.length-1 && obj.termsInDiagnosis ? '; ' : null}
                                                </span>
                                            );
                                        })
                                        : null
                                    }
                                    { obj.termsInDiagnosis ?
                                        <span>View <a href={obj['@id']} target='_blank'>{obj.label}</a> for phenotype free text.</span>
                                        :
                                        null
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>
            : null}
        </div>
    );
};

// A link to Mutalyzer to check HGVC terms
var renderMutalyzerLink = module.exports.renderMutalyzerLink = function() {
    return (
        <p className="col-sm-7 col-sm-offset-5 mutalyzer-link">
            (e.g. HGVS, RCV, refSNP (rs) ID)<br />For help in verifying, generating or converting to HGVS nomenclature, please visit <a href='https://mutalyzer.nl/' target='_blank'>Mutalyzer</a>.
        </p>
    );
};

// A note underneath the Group/Family/Individual label input field
var renderLabelNote = module.exports.renderLabelNote = function(label) {
    return (
        <span className="curation-label-note">Please enter a label to help you keep track of this {label} within the interface - if possible, please use the label described in the paper.</span>
    );
};

// Class for delete button (and associated modal) of Group, Family, Individual, and Experimental
// Data objects. This class only renderes the button; please see DeleteButtonModal for bulk of
// functionality
var DeleteButton = module.exports.DeleteButton = React.createClass({
    mixins: [ModalMixin],
    propTypes: {
        gdm: React.PropTypes.object,
        parent: React.PropTypes.object,
        item: React.PropTypes.object,
        pmid: React.PropTypes.string,
        disabled: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            noticeVisible: false // True while form is submitting
        };
    },

    showNotice: function() {
        this.setState({noticeVisible: true});
    },

    hideNotice: function() {
        this.setState({noticeVisible: false});
    },

    render: function() {
        return (
            <span>
                {this.props.disabled ?
                <div className="delete-button-wrapper pull-right" onMouseEnter={this.showNotice} onMouseLeave={this.hideNotice}>
                    <a className="btn btn-danger" disabled="disabled">
                        Delete
                    </a>
                </div>
                :
                <div className="delete-button-wrapper pull-right"><Modal title="Delete Item" modalClass="modal-danger">
                    <a className="btn btn-danger" modal={<DeleteButtonModal gdm={this.props.gdm} parent={this.props.parent} item={this.props.item} pmid={this.props.pmid} closeModal={this.closeModal} />}>
                        Delete
                    </a>
                </Modal></div>
                }
                {this.state.noticeVisible ? <span className="delete-notice pull-right">This item cannot be deleted because it has been assessed by another user.</span> : <span></span>}
            </span>
        );
    }
});

// Delete Button confirmation modal. Sets target item to have status of 'deleted', and removes
// the 'deleted' entry from its parent object. Forwards user back to curation central on delete
// success
var DeleteButtonModal = React.createClass({
    mixins: [RestMixin, CuratorHistory],
    propTypes: {
        gdm: React.PropTypes.object,
        parent: React.PropTypes.object,
        item: React.PropTypes.object,
        pmid: React.PropTypes.string,
        closeModal: React.PropTypes.func // Function to call to close the modal
    },

    getInitialState: function() {
        return {
            submitBusy: false // True while form is submitting
        };
    },

    // main recursive function that finds any child items, and generates and returns either the promises
    // for delete and history recording, the display strings, or the @ids of the items and its children,
    // depending on the mode (delete, display, id, respectively). The depth specifies the 'depth' of the
    // loop; should always be called at 0 when called outside of the function.
    recurseItem: function(item, depth, mode) {
        var returnPayload = [];
        var hasChildren = false;

        // check possible child objects
        if (item.group) {
            if (item.group.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.group, depth, mode, 'groups'));
        }
        if (item.family) {
            if (item.family.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.family, depth, mode, 'families'));
        }
        if (item.individual) {
            if (item.individual.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individual, depth, mode, 'individuals'));
        }
        if (item.familyIncluded) {
            if (item.familyIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.familyIncluded, depth, mode, 'families'));
        }
        if (item.individualIncluded) {
            if (item.individualIncluded.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.individualIncluded, depth, mode, 'individuals'));
        }
        if (item.experimentalData) {
            if (item.experimentalData.length > 0) {
                hasChildren = true;
            }
            returnPayload = returnPayload.concat(this.recurseItemLoop(item.experimentalData, depth, mode, 'experimental datas'));
        }

        // if the mode is 'delete', get the items' parents' info if needed, flatten the current item, set it as deleted
        // and inactive, and load the PUT and history record promises into the payload
        if (mode == 'delete') {
            var parentInfo;
            // if this is the target item being deleted, get its parent item information to store in the history object
            if (depth == 0) {
                parentInfo = {};
                if (item.associatedGdm && item.associatedGdm.length > 0) {
                    parentInfo.id = item.associatedGdm[0]['@id'];
                    parentInfo.name = item.associatedGdm[0].gdm_title;
                } else if (item.associatedAnnotations && item.associatedAnnotations.length > 0) {
                    parentInfo.id = item.associatedAnnotations[0]['@id'];
                    parentInfo.name = item.associatedAnnotations[0].associatedGdm[0].gdm_title + ':' + item.associatedAnnotations[0].article.pmid;
                } else if (item.associatedGroups && item.associatedGroups.length > 0) {
                    parentInfo.id = item.associatedGroups[0]['@id'];
                    parentInfo.name = item.associatedGroups[0].label;
                } else if (item.associatedFamilies && item.associatedFamilies.length > 0) {
                    parentInfo.id = item.associatedFamilies[0]['@id'];
                    parentInfo.name = item.associatedFamilies[0].label;
                }
            }
            // flatten the target item and set its status to deleted
            var deletedItem = flatten(item);
            deletedItem.status = 'deleted';
            // define operationType and add flags as needed
            var operationType = 'delete';
            if (depth > 0) {
                operationType += '-hide';
            }
            if (hasChildren) {
                operationType += '-hadChildren';
            }
            // push promises to payload
            returnPayload.push(this.putRestData(item['@id'] + '?render=false', deletedItem));
            returnPayload.push(this.recordHistory(operationType, item, null, parentInfo));
        }

        // return the payload, whether it's promises, display texts, or @ids
        return returnPayload;
    },

    // function for looping through a parent item's list of child items
    // of a specific type
    recurseItemLoop: function(tempSubItem, depth, mode, type) {
        var tempDisplayString;
        var returnPayload = [];
        if (tempSubItem) {
            if (tempSubItem.length > 0) {
                for (var i = 0; i < tempSubItem.length; i++) {
                    if (mode == 'display') {
                        // if the mode is 'display', generate the display string
                        tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; <a href={tempSubItem[i]['@id']} onClick={this.linkout}>{tempSubItem[i]['@type'][0]} {tempSubItem[i].label}</a></span>;
                        returnPayload.push(tempDisplayString);
                    } else if (mode == 'id') {
                        // if the mode is 'id', grab the @ids of the child items
                        returnPayload.push(tempSubItem[i]['@id']);
                    }
                    // call recurseItem on child item
                    returnPayload = returnPayload.concat(this.recurseItem(tempSubItem[i], depth + 1, mode));
                }
            } else {
                if (mode == 'display') {
                    // if childspace is empty, add a display line indicating the fact
                    tempDisplayString = <span>{Array.apply(null, Array(depth)).map(function(e, i) {return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;})}&#8627; no associated {type}</span>;
                    returnPayload.push(tempDisplayString);
                }
            }
        }
        return returnPayload;
    },

    // parent function when deleting an item. Re-grabs the latest versions of the target and parent items,
    // finds and deletes all children of the target item, deletes the target item, removes the target item's
    // entry from the parent item, and saves the updated target item. Forwards user to curation central
    // upon completion.
    deleteItem: function(e) {
        e.preventDefault(); e.stopPropagation();
        this.setState({submitBusy: true});
        var itemUuid = this.props.item['@id'];
        var parentUuid = this.props.parent['@id'];
        var deletedItemType, deletedItem, deletedParent;

        this.getRestData(itemUuid, null, true).then(item => {
            // get up-to-date target object, then get the promises for deleting it and
            // all its children, along with the promises for any related history items
            deletedItemType = item['@type'][0];
            var deletePromises = this.recurseItem(item, 0, 'delete');
            return Promise.all(deletePromises); // wait for ALL promises to resolve
        }).then(rawData => {
            // get up-to-date parent object; also bypass issue of certain certain embedded parent
            // items in edit pages being un-flattenable
            return this.getRestData(parentUuid, null, true).then(parent => {
                // flatten parent object and remove link to deleted item as appropriate
                deletedParent = flatten(parent);
                if (parent['@type'][0] == 'annotation') {
                    if (deletedItemType == 'group') {
                        deletedParent.groups = _.without(deletedParent.groups, itemUuid);
                    } else if (deletedItemType == 'family') {
                        deletedParent.families = _.without(deletedParent.families, itemUuid);
                    } else if (deletedItemType == 'individual') {
                        deletedParent.individuals = _.without(deletedParent.individuals, itemUuid);
                    } else if (deletedItemType == 'experimental') {
                        deletedParent.experimentalData = _.without(deletedParent.experimentalData, itemUuid);
                    }
                } else {
                    if (deletedItemType == 'family') {
                        deletedParent.familyIncluded = _.without(deletedParent.familyIncluded, itemUuid);
                    } else if (deletedItemType == 'individual') {
                        deletedParent.individualIncluded = _.without(deletedParent.individualIncluded, itemUuid);
                        if (parent['@type'][0] == 'family') {
                            // Empty variants of parent object if target item is individual and parent is family
                            deletedParent.segregation.variants = [];
                        }
                    }
                }
                // PUT updated parent object w/ removed link to deleted item
                return this.putRestData(parentUuid, deletedParent).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            });
        }).then(data => {
            // forward user to curation central
            window.location.href = '/curation-central/?gdm=' + this.props.gdm.uuid + '&pmid=' + this.props.pmid;
        }).catch(function(e) {
            console.log('DELETE ERROR: %o', e);
        });
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.props.closeModal();
    },

    // Called when user clicks a link in the delete confirmation modal to view another object.
    // Allows for scrolling in subsequent pages, as the initial modal rendering disabled scrolling.
    linkout: function(e) {
        this.props.closeModal();
    },

    render: function() {
        var tree;
        var message;
        // generate custom messages and generate display tree for group and family delete confirm modals.
        // generic message for everything else.
        if (this.props.item['@type'][0] == 'group') {
            message = <p><strong>Warning</strong>: Deleting this Group will also delete any associated families and individuals (see any Families or Individuals associated with the Group under its name, bolded below).</p>;
            tree = this.recurseItem(this.props.item, 0, 'display');
        } else if (this.props.item['@type'][0] == 'family') {
            message = <p><strong>Warning</strong>: Deleting this Family will also delete any associated individuals (see any Individuals associated with the Family under its name, bolded below).</p>;
            tree = this.recurseItem(this.props.item, 0, 'display');
        }
        return (
            <div>
                <div className="modal-body">
                    {message}
                    <p>Are you sure you want to delete this item?</p>
                    {tree ?
                    <div><strong>{this.props.item['@type'][0]} {this.props.item.label}</strong><br />
                    {tree.map(function(treeItem, i) {
                        return <span key={i}>&nbsp;&nbsp;{treeItem}<br /></span>;
                    })}
                    <br /></div>
                    : null}
                    </div>
                <div className="modal-footer">
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="button-button" inputClassName="btn-danger btn-inline-spacer" clickHandler={this.deleteItem} title="Confirm Delete" submitBusy={this.state.submitBusy} />
                </div>
            </div>
        );
    }
});

// Class for the add resource button. This class only renderes the button to add and clear the fields.
var AddResourceId = module.exports.AddResourceId = React.createClass({
    mixins: [ModalMixin],
    propTypes: {
        resourceType: React.PropTypes.string, // specify what the resource you're trying to add is (passed to Modal)
        label: React.PropTypes.object, // text for the button's label
        labelVisible: React.PropTypes.bool, // specify whether or not the label is visible
        buttonText: React.PropTypes.string, // text for the button
        initialFormValue: React.PropTypes.string, // specify the initial value of the resource, in case of editing (passed to Modal)
        fieldNum: React.PropTypes.string, // specify which field on the main form this should edit (passed to Modal)
        updateParentForm: React.PropTypes.func, // function to call upon pressing the Save button
        disabled: React.PropTypes.bool // specify whether or not the button on the main form is disabled
    },

    getInitialState: function() {
        return {
            txtModalTitle: ''
        };
    },

    // set the text of the modal title on load
    componentDidMount: function() {
        switch(this.props.resourceType) {
            case 'clinvar':
                this.setState({txtModalTitle: clinvarTxt('modalTitle')});
                break;
        }
    },

    // called when the 'Clear' button is pressed on the main form
    resetForm: function(e) {
        this.props.updateParentForm(null, this.props.fieldNum);
    },

    render: function() {
        return (
            <div className="form-group">
                <span className="col-sm-5 control-label">{this.props.labelVisible ? <label>{this.props.label}</label> : null}</span>
                <span className="col-sm-7">
                <div className="delete-button-wrapper">
                    <Modal title={this.state.txtModalTitle} className="input-inline" modalClass="modal-default">
                        <a className={"btn btn-default" + (this.props.disabled ? " disabled" : "")} modal={<AddResourceIdModal resourceType={this.props.resourceType} initialFormValue={this.props.initialFormValue}
                            fieldNum={this.props.fieldNum} updateParentForm={this.props.updateParentForm} protocol={this.props.protocol} closeModal={this.closeModal} />}>
                                {this.props.buttonText}
                        </a>
                    </Modal>
                </div>
                {this.props.initialFormValue ?
                    <Input type="button" title="Clear" inputClassName="btn-default" clickHandler={this.resetForm} />
                : null}
                </span>
            </div>
        );
    }
});

// Class for the modal for adding external resource IDs
var AddResourceIdModal = React.createClass({
    mixins: [FormMixin, RestMixin, CuratorHistory],

    propTypes: {
        resourceType: React.PropTypes.string, // specify what the resource you're trying to add is
        initialFormValue: React.PropTypes.string, // specify the initial value of the resource, in case of editing
        fieldNum: React.PropTypes.string, // specify which field on the main form this should edit
        closeModal: React.PropTypes.func, // Function to call to close the modal
        protocol: React.PropTypes.string, // Protocol to use to access PubMed ('http:' or 'https:')
        updateParentForm: React.PropTypes.func // Function to call when submitting and closing the modal
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            txtInputLabel: '',
            txtInputButton: '',
            txtHelpText: '',
            txtResourceResponse: '',
            inputValue: '',
            queryResourceDisabled: true,
            queryResourceBusy: false, // True while form is submitting
            resourceFetched: false,
            tempResource: {},
            submitResourceBusy: false
        };
    },

    // load text for different parts of the modal on load
    componentDidMount: function() {
        switch(this.props.resourceType) {
            case 'clinvar':
                var tempTxtLabel;
                if (this.props.initialFormValue) {
                    tempTxtLabel = clinvarTxt('editLabel');
                } else {
                    tempTxtLabel = clinvarTxt('inputLabel');
                }
                this.setState({
                    txtInputLabel: tempTxtLabel,
                    txtInputButton: clinvarTxt('inputButton'),
                    txtHelpText: clinvarTxt('helpText'),
                    txtResourceResponse: clinvarTxt('resourceResponse')
                });
                break;
        }
    },

    // called when the button to ping the outside API is pressed
    queryResource: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({queryResourceBusy: true, resourceFetched: false});
        // Apply queryResource logic depending on resourceType
        switch(this.props.resourceType) {
            case 'clinvar':
                clinvarQueryResource.call(this);
                break;
        }
    },

    // called when the button to submit the resource to the main form is pressed
    submitResource: function(e) {
        e.preventDefault(); e.stopPropagation();
        // Apply submitResource logic depending on resourceType
        switch(this.props.resourceType) {
            case 'clinvar':
                clinvarSubmitResource.call(this);
                break;
        }
    },

    // called when the value in the input field is changed
    handleChange: function(e) {
        if (this.refs.resourceId) {
            var tempResourceId = this.refs.resourceId.getValue();
            this.setState({inputValue: tempResourceId, resourceFetched: false, tempResource: {}});
            if (this.refs.resourceId.getValue().length > 0) {
                this.setState({queryResourceDisabled: false});
            } else {
                this.setState({queryResourceDisabled: true});
            }
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.props.closeModal();
    },

    render: function() {
        return (
            <Form submitHandler={this.submitResource} formClassName="form-std">
                <div className="modal-body">
                    <Input type="text" ref="resourceId" label={this.state.txtInputLabel} handleChange={this.handleChange} value={this.props.initialFormValue}
                        error={this.getFormError('resourceId')} clearError={this.clrFormErrors.bind(null, 'resourceId')}
                        labelClassName="control-label" groupClassName="resource-input" required />
                    <Input type="button-button" title={this.state.txtInputButton} inputClassName={(this.state.queryResourceDisabled ? "btn-default" : "btn-primary") + " pull-right"} clickHandler={this.queryResource} submitBusy={this.state.queryResourceBusy} inputDisabled={this.state.queryResourceDisabled}/>
                    <div className="row">&nbsp;<br />&nbsp;</div>
                    {this.state.resourceFetched ?
                    <span>
                        <p>&nbsp;<br />{this.state.txtResourceResponse}</p>
                        <span className="p-break">{this.state.tempResource.clinvarVariantTitle}</span>
                    </span>
                    : <span><p className="alert alert-info">{this.state.txtHelpText}</p></span>}
                </div>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="button-button" inputClassName={this.getFormError('resourceId') === null || this.getFormError('resourceId') === undefined || this.getFormError('resourceId') === '' ?
                        "btn-primary btn-inline-spacer" : "btn-primary btn-inline-spacer disabled"} title="Save" clickHandler={this.submitResource} inputDisabled={!this.state.resourceFetched} submitBusy={this.state.submitResourceBusy} />
                </div>
            </Form>
        );
    }
});

// Logic and helper functions for resource type 'clinvar' for AddResource modal
function clinvarTxt(field) {
    // Text to use for the resource type of 'clinvar'
    var txt;
    switch(field) {
        case 'modalTitle':
            txt = 'ClinVar Variant';
            break;
        case 'inputLabel':
            txt = 'Enter ClinVar VariationID';
            break;
        case 'editLabel':
            txt = 'Edit ClinVar VariationID';
            break;
        case 'inputButton':
            txt = 'Retrieve from ClinVar';
            break;
        case 'helpText':
            txt = <span>You must enter a ClinVar VariationID. The VariationID is the number found after <strong>/variation/</strong> in the URL for a variant in ClinVar (<a href={external_url_map['ClinVarSearch'] + '139214'} target="_blank">example</a>: 139214).</span>;
            break;
        case 'resourceResponse':
            txt = "Below is the ClinVar Preferred Title for the VariationID you submitted. Press \"Save\" below if it is the correct Variant, otherwise revise your search above:";
            break;
    }
    return txt;
}
function clinvarValidateForm() {
    // validating the field for ClinVarIDs
    var valid = this.validateDefault();
    var formInput = this.getFormValue('resourceId');

    // valid if input isn't zero-filled
    if (valid && formInput.match(/^0+$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Invalid ClinVar ID');
    }
    // valid if input isn't zero-leading
    if (valid && formInput.match(/^0+/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Please re-enter ClinVar ID without any leading 0\'s');

    }
    // valid if the input only has numbers
    if (valid && !formInput.match(/^[0-9]*$/)) {
        valid = false;
        this.setFormErrors('resourceId', 'Only numbers allowed');
    }
    return valid;
}
function clinvarQueryResource() {
    // for pinging and parsing data from ClinVar
    this.saveFormValue('resourceId', this.state.inputValue);
    if (clinvarValidateForm.call(this)) {
        var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=';
        var data;
        var id = this.state.inputValue;
        this.getRestDataXml(url + id).then(xml => {
            data = parseClinvar(xml);
            if (data.clinvarVariantId) {
                // found the result we want
                this.setState({queryResourceBusy: false, tempResource: data, resourceFetched: true});
            } else {
                // no result from ClinVar
                this.setFormErrors('resourceId', 'ClinVar ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}
function clinvarSubmitResource() {
    // for dealing with the main form
    this.setState({submitResourceBusy: true});
    if (this.state.tempResource.clinvarVariantId) {
        this.getRestData('/search/?type=variant&clinvarVariantId=' + this.state.tempResource.clinvarVariantId).then(check => {
            if (check.total) {
                // variation already exists in our db
                this.getRestData(check['@graph'][0]['@id']).then(result => {
                    this.props.updateParentForm(result, this.props.fieldNum);
                    this.setState({submitResourceBusy: false});
                    this.props.closeModal();
                });
            } else {
                // variation is new to our db
                this.postRestData('/variants/', this.state.tempResource).then(result => {
                    // record the user adding a new variant entry
                    this.recordHistory('add', result['@graph'][0]).then(history => {
                        this.props.updateParentForm(result['@graph'][0], this.props.fieldNum);
                        this.setState({submitResourceBusy: false});
                        this.props.closeModal();
                    });
                });
            }
        });
    }
}
