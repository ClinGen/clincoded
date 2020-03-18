// # ClinVar Interpretations Helper: Getter Method
// # Parameters: XML data or response object
// # Usage: parseClinvarInterpretations(xml)
// # Dependency: ClinVar API response

'use strict';

var moment = require('moment');

/*
XSD (XML Schema Definition) that likely describes the XML elements within ClinVar's EFetch response:
ftp://ftp.ncbi.nlm.nih.gov/pub/clinvar/xsd_public/clinvar_variation/variation_archive.xsd (v1.5 as of Feb 2020)

A quasi-XSD of the elements we're interested in (refined from the document above):
<xs:element name="ClinVarResult-Set">
    <xs:element name="VariationArchive" minOccurs="1" maxOccurs="unbounded">
        <xs:choice>
            <xs:element name="InterpretedRecord" minOccurs="1" maxOccurs="1">
                <xs:element name="ReviewStatus">
                    <xs:restriction base="xs:string">
                        <xs:enumeration value="no assertion provided" />
                        <xs:enumeration value="no assertion criteria provided" />
                        <xs:enumeration value="criteria provided, single submitter" />
                        <xs:enumeration value="criteria provided, multiple submitters, no conflicts" />
                        <xs:enumeration value="criteria provided, conflicting interpretations" />
                        <xs:enumeration value="reviewed by expert panel" />
                        <xs:enumeration value="practice guideline" />
                    </xs:restriction>
                </xs:element>
                <xs:element name="Interpretations" minOccurs="1" />
                    <xs:element name="Interpretation" minOccurs="1" maxOccurs="unbounded" />
                        <xs:attribute name="DateLastEvaluated" type="xs:date" use="optional" />
                        <xs:attribute name="NumberOfSubmissions" type="xs:nonNegativeInteger" use="required" />
                        <xs:element name="Description" type="xs:string" minOccurs="0" maxOccurs="1" />
                        <xs:element name="Explanation" minOccurs="0" maxOccurs="1" />
                    </xs:element>
                </xs:element>
                <xs:element name="ClinicalAssertionList" minOccurs="1" maxOccurs="1">
                    <xs:element name="ClinicalAssertion" minOccurs="1" maxOccurs="unbounded">
                        <xs:attribute name="ID" type="xs:positiveInteger" use="optional" />
                        <xs:element name="ClinVarAccession" minOccurs="1" maxOccurs="1">
                            <xs:attribute name="Accession" type="xs:string" use="required" />
                            <xs:attribute name="Version" type="xs:integer" use="required" />
                            <xs:attribute name="Type" type="xs:string" fixed="SCV" />
                            <xs:attribute name="SubmitterName" type="xs:string" use="required" />
                            <xs:attribute name="OrgID" type="xs:positiveInteger" use="required" />
                        </xs:element>
                        <xs:element name="ReviewStatus" minOccurs="0" maxOccurs="1">
                            <xs:restriction base="xs:string">
                                <xs:enumeration value="no assertion provided" />
                                <xs:enumeration value="no assertion criteria provided" />
                                <xs:enumeration value="criteria provided, single submitter" />
                                <xs:enumeration value="reviewed by expert panel" />
                                <xs:enumeration value="practice guideline" />
                                <xs:enumeration value="criteria provided, multiple submitters, no conflicts" />
                                <xs:enumeration value="criteria provided, conflicting interpretations" />
                                <xs:enumeration value="classified by single submitter" />
                                <xs:enumeration value="reviewed by professional society" />
                                <xs:enumeration value="not classified by submitter" />
                                <xs:enumeration value="classified by multiple submitters" />
                            </xs:restriction>
                        </xs:element>
                        <xs:element name="Interpretation" minOccurs="1">
                            <xs:attribute name="DateLastEvaluated" type="xs:date" use="optional" />
                            <xs:element name="Description" type="xs:string" minOccurs="0" maxOccurs="1" />
                        </xs:element>
                        <xs:element name="AttributeSet" minOccurs="0" maxOccurs="unbounded">
                            <xs:element name="Attribute">
                                <xs:attribute name="Type" use="required">
                                    <xs:restriction base="xs:string">
                                        <xs:enumeration value="ModeOfInheritance" />
                                        <xs:enumeration value="Penetrance" />
                                        <xs:enumeration value="AgeOfOnset" />
                                        <xs:enumeration value="Severity" />
                                        <xs:enumeration value="ClinicalSignificanceHistory" />
                                        <xs:enumeration value="SeverityDescription" />
                                        <xs:enumeration value="AssertionMethod" />
                                    </xs:restriction>
                                </xs:attribute>
                            </xs:element>
                            <xs:element name="Citation" minOccurs="0" maxOccurs="unbounded">
                                <xs:element name="ID" minOccurs="0" maxOccurs="unbounded">
                                    <xs:attribute name="Source" type="xs:string" use="required" />
                                </xs:element>
                                <xs:element name="URL" type="xs:anyURI" minOccurs="0" maxOccurs="1" />
                            </xs:element>
                        </xs:element>
                        <xs:element name="TraitSet" minOccurs="1" maxOccurs="1">
                            <xs:attribute name="Type" use="required">
                                <xs:restriction base="xs:string">
                                    <xs:enumeration value="Disease" />
                                    <xs:enumeration value="DrugResponse" />
                                    <xs:enumeration value="Finding" />
                                    <xs:enumeration value="PhenotypeInstruction" />
                                    <xs:enumeration value="TraitChoice" />
                                </xs:restriction>
                            </xs:attribute>
                            <xs:element name="Trait" minOccurs="1" maxOccurs="unbounded">
                                <xs:attribute name="Type" use="required">
                                    <xs:restriction base="xs:string">
                                        <xs:enumeration value="Disease" />
                                        <xs:enumeration value="DrugResponse" />
                                        <xs:enumeration value="BloodGroup" />
                                        <xs:enumeration value="Finding" />
                                        <xs:enumeration value="NamedProteinVariant" />
                                        <xs:enumeration value="PhenotypeInstruction" />
                                    </xs:restriction>
                                </xs:attribute>
                                <xs:element name="Name" minOccurs="0" maxOccurs="unbounded">
                                    <xs:element name="ElementValue">
                                        <xs:attribute name="Type" type="xs:string" use="required" />
                                    </xs:element>
                                </xs:element>
                                <xs:element name="XRef" minOccurs="0" maxOccurs="unbounded">
                                    <xs:attribute name="DB" type="xs:string" use="required" />
                                    <xs:attribute name="ID" type="xs:string" use="required" />
                                </xs:element>
                            </xs:element>
                        </xs:element>
                        <xs:element name="StudyDescription" type="xs:string" minOccurs="0" maxOccurs="1" />
                    </xs:element>
                </xs:element>
                <xs:element name="TraitMappingList" minOccurs="0" maxOccurs="1">
                    <xs:element name="TraitMapping" maxOccurs="unbounded">
                        <xs:attribute name="ClinicalAssertionID" type="xs:positiveInteger" />
                        <xs:attribute name="TraitType" type="xs:string" />
                        <xs:attribute name="MappingType">
                            <xs:restriction base="xs:string">
                                <xs:enumeration value="Name" />
                                <xs:enumeration value="XRef" />
                            </xs:restriction>
                        </xs:attribute>
                        <xs:attribute name="MappingValue" type="xs:string" />
                        <xs:attribute name="MappingRef" type="xs:string" />
                        <xs:element name="MedGen">
                            <xs:attribute name="Name" type="xs:string" use="required" />
                            <xs:attribute name="CUI" type="xs:string" use="required" />
                        </xs:element>
                    </xs:element>
                </xs:element>
            </xs:element>
            <xs:element ref="IncludedRecord" minOccurs="1" maxOccurs="1" />
        </xs:choice>
    </xs:element>
</xs:element>
*/

/**
 * Function to parse XML document of ClinVar data for submitted interpretations
 * @param {string} xml - XML document containing ClinVar data
 * @returns {object} - containing an object of summary data and an array of SCV data
 */
export function parseClinvarInterpretations(xml) {
    let interpretationSummary = {}, interpretationSCVs = [];
    const docClinVarXML = new DOMParser().parseFromString(xml, 'text/xml');
    const elementClinVarResultSet = docClinVarXML.getElementsByTagName('ClinVarResult-Set')[0];

    if (elementClinVarResultSet) {
        // Expecting one VariationArchive element per variant (and one variant at a time)
        const elementVariationArchive = elementClinVarResultSet.getElementsByTagName('VariationArchive')[0];

        if (elementVariationArchive) {
            // Only interested in InterpretedRecord element
            const elementInterpretedRecord = elementVariationArchive.getElementsByTagName('InterpretedRecord')[0];

            if (elementInterpretedRecord) {
                let attributeIRDateLastEvaluated, attributeNumberOfSubmissions, elementIRDescription, elementExplanation;
                let refTraitMapping = [];
                const elementInterpretations = elementInterpretedRecord.getElementsByTagName('Interpretations')[0];
                const elementIRReviewStatus = elementInterpretedRecord.getElementsByTagName('ReviewStatus')[0];
                const elementTraitMappingList = elementInterpretedRecord.getElementsByTagName('TraitMappingList')[0];
                const elementClinicalAssertionList = elementInterpretedRecord.getElementsByTagName('ClinicalAssertionList')[0];

                // Retrieve summary data from the first Interpretation element within the first Interpretations element
                if (elementInterpretations) {
                    const elementIRInterpretation = elementInterpretations.getElementsByTagName('Interpretation')[0];

                    if (elementIRInterpretation) {
                        attributeIRDateLastEvaluated = elementIRInterpretation.getAttribute('DateLastEvaluated');
                        attributeNumberOfSubmissions = elementIRInterpretation.getAttribute('NumberOfSubmissions');
                        elementIRDescription = elementIRInterpretation.getElementsByTagName('Description')[0];

                        if (elementIRDescription) {
                            elementExplanation = elementIRInterpretation.getElementsByTagName('Explanation')[0];
                        }
                    }
                }

                // Save summary data (for display) if any one of the significant data elements (labeled fields) is present
                if (elementIRReviewStatus || elementIRDescription || attributeIRDateLastEvaluated || attributeNumberOfSubmissions) {
                    interpretationSummary = {
                        'ReviewStatus': elementIRReviewStatus ? elementIRReviewStatus.textContent : '',
                        'ClinicalSignificance': elementIRDescription ? elementIRDescription.textContent : '',
                        'Explanation': elementExplanation ? elementExplanation.textContent : '',
                        'DateLastEvaluated': attributeIRDateLastEvaluated ? attributeIRDateLastEvaluated : '',
                        'SubmissionCount': attributeNumberOfSubmissions ? attributeNumberOfSubmissions : ''
                    };
                }

                // Fill TraitMapping reference array (with data to lookup condition names and/or MedGen IDs, when necessary)
                if (elementTraitMappingList) {
                    const elementsTraitMapping = elementTraitMappingList.getElementsByTagName('TraitMapping');

                    for (let i = 0; i < elementsTraitMapping.length; i++) {
                        if (elementsTraitMapping[i].getAttribute('TraitType') === 'Disease') {
                            let objTraitMap = {
                                'ClinicalAssertionID': elementsTraitMapping[i].getAttribute('ClinicalAssertionID'),
                                'MappingType': elementsTraitMapping[i].getAttribute('MappingType'),
                                'MappingValue': elementsTraitMapping[i].getAttribute('MappingValue'),
                                'MappingRef': elementsTraitMapping[i].getAttribute('MappingRef')
                            };
                            const elementMedGen = elementsTraitMapping[i].getElementsByTagName('MedGen')[0];

                            if (elementMedGen) {
                                objTraitMap['MedGenCUI'] = elementMedGen.getAttribute('CUI');
                                objTraitMap['MedGenName'] = elementMedGen.getAttribute('Name');
                            }

                            refTraitMapping.push(objTraitMap);
                        }
                    }
                }

                // Process and save SCVs (representing interpretations submitted to ClinVar)
                if (elementClinicalAssertionList) {
                    const elementsClinicalAssertion = elementClinicalAssertionList.getElementsByTagName('ClinicalAssertion');

                    for (let i = 0; i < elementsClinicalAssertion.length; i++) {
                        const elementClinVarAccession = elementsClinicalAssertion[i].getElementsByTagName('ClinVarAccession')[0];

                        if (elementClinVarAccession && elementClinVarAccession.getAttribute('Type') === 'SCV') {
                            let objSCV = {'phenotypeList': []}, boolSaveSCV = false;
                            const attributeAccession = elementClinVarAccession.getAttribute('Accession');
                            const attributeSubmitterName = elementClinVarAccession.getAttribute('SubmitterName');
                            const attributeCAID = elementsClinicalAssertion[i].getAttribute('ID');
                            const elementCAReviewStatus = elementsClinicalAssertion[i].getElementsByTagName('ReviewStatus')[0];
                            const elementCAInterpretation = elementsClinicalAssertion[i].getElementsByTagName('Interpretation')[0];
                            const elementTraitSet = elementsClinicalAssertion[i].getElementsByTagName('TraitSet')[0];
                            const elementsAttributeSet = elementsClinicalAssertion[i].getElementsByTagName('AttributeSet');

                            // Save submission accession (including version)
                            if (attributeAccession) {
                                const attributeVersion = elementClinVarAccession.getAttribute('Version');

                                objSCV['accession'] = attributeAccession;
                                boolSaveSCV = true;

                                if (attributeVersion) {
                                    objSCV['version'] = attributeVersion;
                                }
                            }

                            // Save submitter name/ID and study description
                            if (attributeSubmitterName) {
                                const attributeOrgID = elementClinVarAccession.getAttribute('OrgID');
                                const elementStudyDescription = elementsClinicalAssertion[i].getElementsByTagName('StudyDescription')[0];

                                objSCV['submitterName'] = attributeSubmitterName;
                                boolSaveSCV = true;

                                if (attributeOrgID) {
                                    objSCV['orgID'] = attributeOrgID;
                                }

                                if (elementStudyDescription) {
                                    objSCV['studyDescription'] = elementStudyDescription.textContent;
                                }
                            }

                            // Save review status
                            if (elementCAReviewStatus) {
                                objSCV['reviewStatus'] = elementCAReviewStatus.textContent;
                                boolSaveSCV = true;
                            }

                            // Save clinical significance and last evaluated date (from first Interpretation element)
                            if (elementCAInterpretation) {
                                const elementCADescription = elementCAInterpretation.getElementsByTagName('Description')[0];

                                if (elementCADescription) {
                                    const attributeCADateLastEvaluated = elementCAInterpretation.getAttribute('DateLastEvaluated');

                                    objSCV['clinicalSignificance'] = elementCADescription.textContent;
                                    boolSaveSCV = true;

                                    if (attributeCADateLastEvaluated) {
                                        objSCV['dateLastEvaluated'] = moment(attributeCADateLastEvaluated).format('MMM DD, YYYY');
                                    }
                                }
                            }

                            // Save condition(s)
                            if (elementTraitSet) {
                                if (elementTraitSet.getAttribute('Type') === 'Disease') {
                                    const elementsTrait = elementTraitSet.getElementsByTagName('Trait');

                                    for (let j = 0; j < elementsTrait.length; j++) {
                                        if (elementsTrait[j].getAttribute('Type') === 'Disease') {
                                            let elementElementValue, attributeType;
                                            let objTrait = {'identifiers': []}, boolSaveTrait = false;
                                            let boolMedGenFound = false;
                                            const elementName = elementsTrait[j].getElementsByTagName('Name')[0];
                                            const elementsXRef = elementsTrait[j].getElementsByTagName('XRef');

                                            // Save condition name from the first Name element
                                            if (elementName) {
                                                elementElementValue = elementName.getElementsByTagName('ElementValue')[0];

                                                if (elementElementValue) {
                                                    attributeType = elementElementValue.getAttribute('Type');
                                                    objTrait['name'] = elementElementValue.textContent;
                                                    boolSaveSCV = true;
                                                    boolSaveTrait = true;
                                                }
                                            }

                                            // Save condition ID(s) (and corresponding data source(s)) 
                                            for (let k = 0; k < elementsXRef.length; k++) {
                                                const attributeDB = elementsXRef[k].getAttribute('DB');
                                                const attributeID = elementsXRef[k].getAttribute('ID');
                                                const objXRef = {
                                                    'db': attributeDB ? attributeDB : null,
                                                    'id': attributeID ? attributeID : null
                                                };

                                                objTrait['identifiers'].push(objXRef);
                                                boolSaveTrait = true;

                                                if (!boolMedGenFound && objXRef.db === 'MedGen') {
                                                    boolMedGenFound = true;
                                                }

                                                // If not already saved, retrieve condition name from TraitMapping reference array (using saved ID and data source)
                                                if (!objTrait['name']) {
                                                    const objTraitMap = refTraitMapping.find(refElement => refElement.ClinicalAssertionID == attributeCAID &&
                                                        refElement.MappingType === 'XRef' && refElement.MappingValue == objXRef.id &&
                                                        refElement.MappingRef == objXRef.db);

                                                    if (objTraitMap) {
                                                        objTrait['name'] = objTraitMap.MedGenName;
                                                        boolSaveSCV = true;
                                                        boolSaveTrait = true;
                                                    }
                                                }
                                            }

                                            // If not already saved, retrieve condition MedGen ID from TraitMapping reference array (using saved name)
                                            if (elementElementValue && !boolMedGenFound) {
                                                const objTraitMap = refTraitMapping.find(refElement => refElement.ClinicalAssertionID == attributeCAID &&
                                                    refElement.MappingType === 'Name' && refElement.MappingValue == objTrait['name'] &&
                                                    refElement.MappingRef == attributeType);

                                                if (objTraitMap) {
                                                    objTrait['identifiers'].push({
                                                        'db': 'MedGen',
                                                        'id': objTraitMap.MedGenCUI ? objTraitMap.MedGenCUI : null
                                                    });
                                                    boolSaveTrait = true;
                                                }
                                            }

                                            if (boolSaveTrait) {
                                                objSCV['phenotypeList'].push(objTrait);
                                            }
                                        }
                                    }
                                }
                            }

                            // Save assertion method and/or mode of inheritance
                            for (let j = 0; j < elementsAttributeSet.length; j++) {
                                const elementAttribute = elementsAttributeSet[j].getElementsByTagName('Attribute')[0];

                                if (elementAttribute) {
                                    const attributeASType = elementAttribute.getAttribute('Type');

                                    // Save assertion method data (when it can be partnered with a review status)
                                    if (attributeASType === 'AssertionMethod' && objSCV.reviewStatus) {
                                        const elementCitation = elementsAttributeSet[j].getElementsByTagName('Citation')[0];

                                        objSCV['assertionMethod'] = elementAttribute.textContent;

                                        if (elementCitation) {
                                            const elementURL = elementCitation.getElementsByTagName('URL')[0];

                                            // For an assertion method citation, prefer a provided URL to a PubMed ID
                                            if (elementURL) {
                                                objSCV['AssertionMethodCitationURL'] = elementURL.textContent;
                                            } else {
                                                const elementsID = elementCitation.getElementsByTagName('ID');

                                                // Save first PubMed ID
                                                for (let k = 0; k < elementsID.length; k++) {
                                                    if (elementsID[k].getAttribute('Source') === 'PubMed') {
                                                        objSCV['AssertionMethodCitationPubMedID'] = elementsID[k].textContent;
                                                        k = elementsID.length;
                                                    }
                                                }
                                            }
                                        }

                                    // Save a mode of inheritance (when it can be partnered with a condition)
                                    } else if (attributeASType === 'ModeOfInheritance' && objSCV.phenotypeList.length) {
                                        objSCV['modeOfInheritance'] = elementAttribute.textContent;
                                    }
                                }
                            }

                            // Save SCV (for display) if any one of the significant data elements (main column headers) was found
                            if (boolSaveSCV) {
                                interpretationSCVs.push(objSCV);
                            }
                        }
                    }
                }
            }
        }
    }

    return {'clinvarInterpretationSummary': interpretationSummary, 'clinvarInterpretationSCVs': interpretationSCVs};
}
