// # ClinVar Interpretations Helper: Getter Method
// # Parameters: XML data or response object
// # Usage: getClinvarInterpretations(xml)
// # Dependency: ClinVar API response

'use strict';

var moment = require('moment');

// FIXME: Consoliate repetitive code that can be shared in different methods
export function getClinvarInterpretations(xml) {
    let interpretationSummary = {};
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            let ObservationList = VariationReport.getElementsByTagName('ObservationList')[0];
            if (ObservationList) {
                let ObservationNodes = ObservationList.getElementsByTagName('Observation');
                if (ObservationNodes && ObservationNodes.length) {
                    let ReviewStatus, Description, DateLastEvaluated, SubmissionCount, Explanation;
                    for (var i = 0; i < ObservationNodes.length; i++) {
                        let ObservationType = ObservationNodes[i].getAttribute('ObservationType');
                        if (ObservationType === 'primary') {
                            SubmissionCount = ObservationNodes[i].getAttribute('SubmissionCount');
                            ReviewStatus = ObservationNodes[i].getElementsByTagName('ReviewStatus')[0];
                            let ClinicalSignificance = ObservationNodes[i].getElementsByTagName('ClinicalSignificance')[0];
                            if (ClinicalSignificance) {
                                DateLastEvaluated = ClinicalSignificance.getAttribute('DateLastEvaluated');
                                Description = ClinicalSignificance.getElementsByTagName('Description')[0];
                                Explanation = ClinicalSignificance.getElementsByTagName('Explanation')[0];
                            }
                        }
                    }
                    interpretationSummary = {
                        'ReviewStatus': ReviewStatus.textContent,
                        'ClinicalSignificance': Description ? Description.textContent : null,
                        'Explanation': Explanation ? Explanation.textContent : null,
                        'DateLastEvaluated': DateLastEvaluated,
                        'SubmissionCount': SubmissionCount
                    };
                }
            }
        }
    }
    return interpretationSummary;
}

export function getClinvarRCVs(xml) {
    // Make sure we have at least one RCV node to work with
    // Then put each RCV id into an array
    let RCVs = [];
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            // Catch variation id and will used to filter RCVs later
            let v_id = VariationReport.getAttribute('VariationID');
            let ObservationList = VariationReport.getElementsByTagName('ObservationList')[0];
            if (ObservationList) {
                let ObservationNodes = ObservationList.getElementsByTagName('Observation');
                if (ObservationNodes && ObservationNodes.length) {
                    for (var i = 0; i < ObservationNodes.length; i++) {
                        // Filter RVCs, collect primary RCVs of this variant only
                        if (ObservationNodes[i].getAttribute('VariationID') === v_id && ObservationNodes[i].getAttribute('ObservationType') === 'primary') {
                            let RCV_Nodes = ObservationNodes[i].getElementsByTagName('RCV');
                            if (RCV_Nodes.length) {
                                for(var j = 0; j < RCV_Nodes.length; j++) {
                                    RCVs.push(RCV_Nodes[j].textContent);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return RCVs;
}

export function parseClinvarSCVs(xml) {
    // Make sure we have at least one SCV node to work with
    // Then put each SCV id into an array
    let SCVs = [];
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            let ClinicalAssertionList = VariationReport.getElementsByTagName('ClinicalAssertionList')[0];
            if (ClinicalAssertionList) {
                let GermlineList = ClinicalAssertionList.getElementsByTagName('GermlineList')[0];
                if (GermlineList) {
                    let GermlineNodes = GermlineList.getElementsByTagName('Germline');
                    if (GermlineNodes && GermlineNodes.length) {
                        for (var i = 0; i < GermlineNodes.length; i++) {
                            let ClinicalAssertion = {};
                            // Filter SCVs for this variant only
                            if (GermlineNodes[i].getAttribute('Accession') && GermlineNodes[i].getAttribute('Accession').indexOf('SCV') > -1) {
                               // Parse 'Accession' number
                               ClinicalAssertion['accession'] = GermlineNodes[i].getAttribute('Accession');
                                // Parse 'Accession' version
                                if (GermlineNodes[i].getAttribute('Version')) {
                                    ClinicalAssertion['version'] = GermlineNodes[i].getAttribute('Version');
                                }
                                // Parse 'Submitter' name
                                if (GermlineNodes[i].getAttribute('SubmitterName')) {
                                    ClinicalAssertion['submitterName'] = GermlineNodes[i].getAttribute('SubmitterName');
                                }
                                if (GermlineNodes[i].getAttribute('OrgID')) {
                                    ClinicalAssertion['orgID'] = GermlineNodes[i].getAttribute('OrgID');
                                }
                                // Parse 'Mode of Inheritance'
                                if (GermlineNodes[i].getAttribute('ModeOfInheritance')) {
                                    ClinicalAssertion['modeOfInheritance'] = GermlineNodes[i].getAttribute('ModeOfInheritance');
                                }
                                // Parse 'Study description'
                                if (GermlineNodes[i].getElementsByTagName('StudyDescription')[0]) {
                                    ClinicalAssertion['studyDescription'] = GermlineNodes[i].getElementsByTagName('StudyDescription')[0].textContent;
                                }
                                // Parse 'ClinicalSignificance'
                                let ClinicalSignificance = GermlineNodes[i].getElementsByTagName('ClinicalSignificance')[0];
                                if (ClinicalSignificance.getElementsByTagName('Description')[0]) {
                                    ClinicalAssertion['clinicalSignificance'] = ClinicalSignificance.getElementsByTagName('Description')[0].textContent;
                                }
                                // Parse the last evaluated date
                                if (ClinicalSignificance.getAttribute('DateLastEvaluated')) {
                                    ClinicalAssertion['dateLastEvaluated'] = moment(ClinicalSignificance.getAttribute('DateLastEvaluated')).format('MMM DD, YYYY');
                                }
                                // Parse 'Assertion method'
                                let AssertionMethod = ClinicalSignificance.getElementsByTagName('AssertionMethod')[0];
                                if (AssertionMethod) {
                                    if (AssertionMethod.getElementsByTagName('Description')[0]) {
                                        ClinicalAssertion['assertionMethod'] = AssertionMethod.getElementsByTagName('Description')[0].textContent;
                                    }
                                    let AssertionMethodCitation = AssertionMethod.getElementsByTagName('Citation')[0];
                                    if (AssertionMethodCitation) {
                                        let CitationURL = AssertionMethodCitation.getElementsByTagName('URL')[0];
                                        let CitationIDs = AssertionMethodCitation.getElementsByTagName('ID');
                                        if (CitationURL) {
                                            ClinicalAssertion['AssertionMethodCitationURL'] = CitationURL.textContent;
                                        } else if (CitationIDs && CitationIDs.length) {
                                            for (var j = 0; j < CitationIDs.length; j++) {
                                                if (CitationIDs[j].getAttribute('Source') === 'PubMed') {
                                                    ClinicalAssertion['AssertionMethodCitationPubMedID'] = CitationIDs[j].textContent;
                                                }
                                            }
                                        }
                                    }
                                }
                                // Parse 'Review status'
                                if (GermlineNodes[i].getElementsByTagName('ReviewStatus')) {
                                    ClinicalAssertion['reviewStatus'] = GermlineNodes[i].getElementsByTagName('ReviewStatus')[0].textContent;
                                }
                                // Parse 'Condition(s)'
                                ClinicalAssertion['phenotypeList'] = [];
                                let PhenotypeList = GermlineNodes[i].getElementsByTagName('PhenotypeList')[0];
                                if (PhenotypeList) {
                                    let Phenotypes = PhenotypeList.getElementsByTagName('Phenotype');
                                    for (var x = 0; x < Phenotypes.length; x++) {
                                        let Phenotype = {};
                                        // Name this property as 'identifiers' instead of 'XRefList' so that we can
                                        // share the same rendering functions with the RCVs
                                        Phenotype['identifiers'] = [];
                                        if (Phenotypes[x].getAttribute('Name')) {
                                            Phenotype['name'] = Phenotypes[x].getAttribute('Name');
                                        }
                                        let XRefList = Phenotypes[x].getElementsByTagName('XRefList')[0];
                                        if (XRefList) {
                                            let XRefs = XRefList.getElementsByTagName('XRef');
                                            if (XRefs && XRefs.length) {
                                                let XRefNodes = [];
                                                for (var y = 0; y < XRefs.length; y++) {
                                                    let XRefNode = {};
                                                    if (!XRefs[y].getAttribute('Type') || (XRefs[y].getAttribute('Type') && XRefs[y].getAttribute('Type') !== 'secondary')) {
                                                        XRefNode['id'] = XRefs[y].getAttribute('ID') ? XRefs[y].getAttribute('ID') : null;
                                                        XRefNode['db'] = XRefs[y].getAttribute('DB') ? XRefs[y].getAttribute('DB') : null;
                                                        XRefNodes.push(XRefNode);
                                                    }
                                                }
                                                Phenotype['identifiers'] = XRefNodes;
                                            }
                                        }
                                        ClinicalAssertion['phenotypeList'].push(Phenotype);
                                    }
                                }
                            }
                            SCVs.push(ClinicalAssertion);
                        }
                    }
                }
            }
        }
    }
    return SCVs;
}

// Method to parse conditions data for the most recent version of individual RCV accession
export function parseClinvarInterpretation(result) {
    // List of Type values of <Trait>. Each should be traited as disease and collected.
    //const disease_types = ['Disease', 'NamedProteinVariant'];

    // Define 'interpretation' object model
    let interpretation = {
        'RCV': '',
        'reviewStatus': '',
        'clinicalSignificance': '',
        'conditions': []
    };
    // Find the <ReferenceClinVarAssertion> node in the returned XML
    let resultSet = new DOMParser().parseFromString(result, 'text/xml');
    let ClinVarResultSet = resultSet.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResultSet) {
        let ClinVarSet = ClinVarResultSet.getElementsByTagName('ClinVarSet')[0];
        if (ClinVarSet) {
            let ReferenceClinVarAssertion = ClinVarSet.getElementsByTagName('ReferenceClinVarAssertion')[0];
            if (ReferenceClinVarAssertion) {
                // Get clinvar accession if <ReferenceClinVarAssertion> node is found
                let ClinVarAccession = ReferenceClinVarAssertion.getElementsByTagName('ClinVarAccession')[0];
                // Get clinical significance description if <ReferenceClinVarAssertion> node is found
                let ClinicalSignificance = ReferenceClinVarAssertion.getElementsByTagName('ClinicalSignificance')[0];
                if (ClinicalSignificance) {
                    // Expect only 1 <ReviewStatus> node and 1 <Description> node within <ClinicalSignificance>
                    let ReviewStatus = ClinicalSignificance.getElementsByTagName('ReviewStatus')[0];
                    let Description = ClinicalSignificance.getElementsByTagName('Description')[0];
                    // Set 'RCV' and 'clinicalSignificance' property values of the 'interpretation' object
                    interpretation['RCV'] = ClinVarAccession.getAttribute('Acc');
                    interpretation['reviewStatus'] = ReviewStatus.textContent;
                    interpretation['clinicalSignificance'] = Description.textContent;
                }
                // Get conditions/disease if <ReferenceClinVarAssertion> node is found
                let TraitSet = ReferenceClinVarAssertion.getElementsByTagName('TraitSet')[0];
                if (TraitSet) {
                    let Traits = TraitSet.getElementsByTagName('Trait');
                    // Handle one <Trait> node (e.g. each associated condition) at a time
                    for(var i = 0; i < Traits.length; i++) {
                        let nameNodes = [],
                            xRefNodes = [],
                            identifiers = [],
                            disease = '';
                        //if (disease_types.includes(Trait.getAttribute('Type'))) {
                        nameNodes = Traits[i].getElementsByTagName('Name');
                        // Expect to find the only one <ElementValue> node in each <Name> node
                        for(var l = 0; l < nameNodes.length ; l++) {
                            let ElementValueNode = nameNodes[l].getElementsByTagName('ElementValue')[0];
                            if (ElementValueNode.getAttribute('Type') === 'Preferred') {
                                // Set disease name property value for each associated condition
                                disease = ElementValueNode.textContent;
                            }
                        }

                        for (var j = 0; j < Traits[i].childNodes.length; j++) {
                            if (Traits[i].childNodes[j].nodeName === 'XRef' && Traits[i].childNodes[j].getAttribute('ID') && Traits[i].childNodes[j].getAttribute('DB')) {
                                if (Traits[i].childNodes[j].getAttribute('Type') && Traits[i].childNodes[j].getAttribute('Type') === 'primary') {
                                    xRefNodes.push(Traits[i].childNodes[j]);
                                } else if (!Traits[i].childNodes[j].getAttribute('Type')) {
                                    xRefNodes.push(Traits[i].childNodes[j]);
                                }
                            }
                        }

                        // Set identifiers property value for each associated condition
                        if (xRefNodes) {
                            for(var k = 0; k < xRefNodes.length; k++) {
                                let identifier = {
                                    'db': xRefNodes[k].getAttribute('DB'),
                                    'id': xRefNodes[k].getAttribute('ID')
                                };
                                identifiers.push(identifier);
                            }
                        }
                        //}
                        let condition = {
                            'name': disease,
                            'identifiers': identifiers
                        };
                        interpretation['conditions'].push(condition);
                    }
                }
            }
        }
    }
    return interpretation;
}
