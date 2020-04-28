'use strict';

/*
XSD (XML Schema Definition) that likely describes the XML elements within ClinVar's EFetch response:
ftp://ftp.ncbi.nlm.nih.gov/pub/clinvar/xsd_public/clinvar_variation/variation_archive.xsd (v1.3 as of Sept 2019)

A quasi-XSD of the elements we're interested in (refined from the document above):
<xs:element name="ClinVarResult-Set">
    <xs:element name="VariationArchive" minOccurs="1" maxOccurs="unbounded">
        <xs:attribute name="VariationID" type="xs:positiveInteger" use="required" />
        <xs:attribute name="VariationName" type="xs:string" use="required" />
        <xs:attribute name="VariationType" type="xs:string" use="required" />
        <xs:choice>
            <xs:element name="InterpretedRecord" minOccurs="1" maxOccurs="1">
                <xs:choice>
                    <xs:element name="SimpleAllele" />
                    <xs:element name="Haplotype" minOccurs="1" maxOccurs="1">
                        <xs:attribute name="VariationID" type="xs:int" use="required" />
                        <xs:element name="SimpleAllele" minOccurs="1" maxOccurs="unbounded" />
                    </xs:element>
                    <xs:element name="Genotype" minOccurs="1" maxOccurs="1">
                        <xs:attribute name="VariationID" type="xs:int" use="required" />
                        <xs:choice minOccurs="1" maxOccurs="unbounded">
                            <xs:element name="SimpleAllele" minOccurs="1" maxOccurs="1" />
                            <xs:element name="Haplotype" minOccurs="1" maxOccurs="1">
                                <xs:attribute name="VariationID" type="xs:int" use="required" />
                                <xs:element name="SimpleAllele" minOccurs="1" maxOccurs="unbounded" />
                            </xs:element>
                        </xs:choice>
                    </xs:element>
                </xs:choice>
            </xs:element>
            <xs:element name="IncludedRecord" minOccurs="1" maxOccurs="1">
                <xs:choice>
                    <xs:element name="SimpleAllele" />
                    <xs:element name="Haplotype" minOccurs="1" maxOccurs="1">
                        <xs:attribute name="VariationID" type="xs:int" use="required" />
                        <xs:element name="SimpleAllele" minOccurs="1" maxOccurs="unbounded" />
                    </xs:element>
                </xs:choice>
            </xs:element>
        </xs:choice>
    </xs:element>
</xs:element>

<xs:element name="SimpleAllele">
    <xs:attribute name="VariationID" type="xs:positiveInteger" use="required" />
    <xs:element name="GeneList" minOccurs="0" maxOccurs="1">
        <xs:element name="Gene" minOccurs="0" maxOccurs="unbounded">
            <xs:attribute name="Symbol" use="optional" />
            <xs:attribute name="FullName" type="xs:string" use="required" />
            <xs:attribute name="GeneID" type="xs:positiveInteger" use="required" />
            <xs:attribute name="HGNC_ID" type="xs:string" use="optional" />
        </xs:element>
    </xs:element>
    <xs:element name="VariantType" type="xs:string" minOccurs="0" />
    <xs:element name="Location" minOccurs="0">
        <xs:element name="SequenceLocation" minOccurs="0" maxOccurs="unbounded">
            <xs:attribute name="Assembly" type="xs:string" use="required" />
            <xs:attribute name="Chr" use="required">
                <xs:union>
                    <xs:restriction base="xs:int">
                        <xs:minInclusive value="1" />
                        <xs:maxInclusive value="22" />
                    </xs:restriction>
                    <xs:restriction base="xs:string">
                        <xs:enumeration value="X" />
                        <xs:enumeration value="Y" />
                        <xs:enumeration value="MT" />
                        <xs:enumeration value="PAR" />
                        <xs:enumeration value="Un" />
                    </xs:restriction>
                </xs:union>
            </xs:attribute>
            <xs:attribute name="Accession" type="xs:string" use="optional" />
            <xs:attribute name="start" type="xs:nonNegativeInteger" use="optional" />
            <xs:attribute name="stop" type="xs:positiveInteger" use="optional" />
            <xs:attribute name="referenceAllele" type="xs:string" use="optional" />
            <xs:attribute name="alternateAllele" type="xs:string" use="optional" />
            <xs:attribute name="AssemblyAccessionVersion" type="xs:string" use="optional" />
            <xs:attribute name="AssemblyStatus" use="optional">
                <xs:restriction base="xs:string">
                    <xs:enumeration value="current" />
                    <xs:enumeration value="previous" />
                </xs:restriction>
            </xs:attribute>
        </xs:element>
    </xs:element>
    <xs:element name="OtherNameList" minOccurs="0">
        <xs:element name="Name" type="xs:string" nillable="false" maxOccurs="unbounded" />
    </xs:element>
    <xs:element name="ProteinChange" type="xs:string" minOccurs="0" maxOccurs="unbounded" />
    <xs:element name="HGVSlist" minOccurs="0">
        <xs:element name="HGVS" minOccurs="0" maxOccurs="unbounded">
            <xs:attribute name="Type" use="required">
                <xs:restriction base="xs:string">
                    <xs:enumeration value="coding" />
                    <xs:enumeration value="genomic" />
                    <xs:enumeration value="genomic, top-level" />
                    <xs:enumeration value="non-coding" />
                    <xs:enumeration value="protein" />
                </xs:restriction>
            </xs:attribute>
            <xs:attribute name="Assembly" use="optional" />
            <xs:element name="NucleotideExpression" minOccurs="0" maxOccurs="1">
                <xs:attribute name="sequenceAccessionVersion" use="optional" />
                <xs:attribute name="change" use="optional" />
                <xs:element name="Expression" type="xs:string" />
            </xs:element>
            <xs:element name="ProteinExpression" minOccurs="0" maxOccurs="1">
                <xs:attribute name="sequenceAccessionVersion" use="optional" />
                <xs:attribute name="change" use="optional" />
                <xs:element name="Expression" type="xs:string" />
            </xs:element>
            <xs:element name="MolecularConsequence" minOccurs="0" maxOccurs="unbounded">
                <xs:attribute name="DB" type="xs:string" use="required" />
                <xs:attribute name="ID" type="xs:string" use="required" />
                <xs:attribute name="Type" type="xs:string" use="optional" />
            </xs:element>
        </xs:element>
    </xs:element>
    <xs:element name="XRefList" minOccurs="0">
        <xs:element name="XRef" minOccurs="0" maxOccurs="unbounded">
            <xs:attribute name="DB" type="xs:string" use="required" />
            <xs:attribute name="ID" type="xs:string" use="required" />
        </xs:element>
    </xs:element>
</xs:element>
*/

/**
 * Function to parse XML document of ClinVar data for variant object creation
 * @param {string} xml - XML document containing ClinVar data
 * @param {boolean} extended - Indicator that extended parsing needs to happen
 */
export function parseClinvar(xml, extended) {
    let variant = {};
    const docClinVarXML = new DOMParser().parseFromString(xml, 'text/xml');
    const elementClinVarResultSet = docClinVarXML.getElementsByTagName('ClinVarResult-Set')[0];

    if (elementClinVarResultSet) {
        // Expecting one VariationArchive element per variant (and one variant at a time)
        const elementVariationArchive = elementClinVarResultSet.getElementsByTagName('VariationArchive')[0];

        if (elementVariationArchive) {
            let elementRecord = elementVariationArchive.getElementsByTagName('InterpretedRecord')[0];
            let isInterpretedRecord = false;
            let elementSimpleAllele;
            variant.clinvarVariantId = elementVariationArchive.getAttribute('VariationID');
            variant.clinvarVariantTitle = elementVariationArchive.getAttribute('VariationName');

            // Expecting either an InterpretedRecord or an IncludedRecord element
            if (elementRecord) {
                isInterpretedRecord = true;
            } else {
                elementRecord = elementVariationArchive.getElementsByTagName('IncludedRecord')[0];
            }

            // Keeping existing business logic of processing only one SimpleAllele element
            if (elementRecord) {
                const elementSimpleAlleleTemp = elementRecord.getElementsByTagName('SimpleAllele')[0];

                if (elementSimpleAlleleTemp && (elementSimpleAlleleTemp.getAttribute('VariationID') === variant.clinvarVariantId)) {
                    elementSimpleAllele = elementSimpleAlleleTemp;
                } else {
                    const elementHaplotype = elementRecord.getElementsByTagName('Haplotype')[0];

                    if (elementHaplotype && (elementHaplotype.getAttribute('VariationID') === variant.clinvarVariantId)) {
                        elementSimpleAllele = elementHaplotype.getElementsByTagName('SimpleAllele')[0];

                    // Only InterpretedRecord element might contain a Genotype element
                    } else if (isInterpretedRecord) {
                        const elementGenotype = elementRecord.getElementsByTagName('Genotype')[0];

                        if (elementGenotype && (elementGenotype.getAttribute('VariationID') === variant.clinvarVariantId)) {
                            elementSimpleAllele = elementGenotype.getElementsByTagName('SimpleAllele')[0];

                            if (!elementSimpleAllele) {
                                const elementGenotypeHaplotype = elementGenotype.getElementsByTagName('Haplotype')[0];

                                if (elementGenotypeHaplotype) {
                                    elementSimpleAllele = elementGenotypeHaplotype.getElementsByTagName('SimpleAllele')[0];
                                }
                            }
                        }
                    }
                }
            }

            if (elementSimpleAllele) {
                let objTranscripts = {
                    'NucleotideChangeList': [],
                    'ProteinChangeList': []
                };
                const elementVariantType = elementSimpleAllele.getElementsByTagName('VariantType')[0];
                const elementOtherNameList = elementSimpleAllele.getElementsByTagName('OtherNameList')[0];
                const elementHGVSlist = elementSimpleAllele.getElementsByTagName('HGVSlist')[0];
                const elementXRefList = elementSimpleAllele.getElementsByTagName('XRefList')[0];
                variant.molecularConsequenceList = [];
                variant.dbSNPIds = [];

                // Save the variant type
                if (elementVariantType) {
                    variant.variationType = elementVariantType.textContent;
                }

                // Save other names for the variant
                if (elementOtherNameList) {
                    const elementsName = elementOtherNameList.getElementsByTagName('Name');
                    variant.otherNameList = [];

                    for (let i = 0; i < elementsName.length; i++) {
                        variant.otherNameList.push(elementsName[i].textContent)
                    }
                }

                // Save HGVS expressions and molecular consequences for the variant
                if (elementHGVSlist) {
                    const elementsHGVS = elementHGVSlist.getElementsByTagName('HGVS');
                    variant.hgvsNames = {
                        'others': []
                    };

                    for (let i = 0; i < elementsHGVS.length; i++) {
                        let textNEExpression = '';
                        const elementNucleotideExpression = elementsHGVS[i].getElementsByTagName('NucleotideExpression')[0];
                        const elementProteinExpression = elementsHGVS[i].getElementsByTagName('ProteinExpression')[0];
                        const elementsMolecularConsequence = elementsHGVS[i].getElementsByTagName('MolecularConsequence');
                        const attributeHGVSType = elementsHGVS[i].getAttribute('Type');

                        if (elementNucleotideExpression) {
                            const elementNEExpression = elementNucleotideExpression.getElementsByTagName('Expression')[0];
                            const attributeAssembly = elementsHGVS[i].getAttribute('Assembly');
                            textNEExpression = elementNEExpression ? elementNEExpression.textContent : '';

                            if (attributeAssembly) {
                                variant.hgvsNames[attributeAssembly] = textNEExpression;
                            } else if (variant.hgvsNames.others.indexOf(textNEExpression) === -1) {
                                variant.hgvsNames.others.push(textNEExpression);
                            }

                            // Save nucleotide change transcript data (for possible extended parsing)
                            if (attributeHGVSType === 'coding') {
                                objTranscripts.NucleotideChangeList.push({
                                    'HGVS': textNEExpression,
                                    'Change': elementNucleotideExpression.getAttribute('change'),
                                    'AccessionVersion': elementNucleotideExpression.getAttribute('sequenceAccessionVersion'),
                                    'Type': attributeHGVSType
                                });
                            }
                        }

                        if (elementProteinExpression) {
                            const elementPEExpression = elementProteinExpression.getElementsByTagName('Expression')[0];
                            const textPEExpression = elementPEExpression ? elementPEExpression.textContent : '';

                            if (variant.hgvsNames.others.indexOf(textPEExpression) === -1) {
                                variant.hgvsNames.others.push(textPEExpression);
                            }

                            // Save protein change transcript data (for possible extended parsing)
                            if (attributeHGVSType === 'protein') {
                                objTranscripts.ProteinChangeList.push({
                                    'HGVS': textPEExpression,
                                    'Change': elementProteinExpression.getAttribute('change'),
                                    'AccessionVersion': elementProteinExpression.getAttribute('sequenceAccessionVersion'),
                                    'Type': attributeHGVSType
                                });
                            }
                        }

                        for (let j = 0; j < elementsMolecularConsequence.length; j++) {
                            const attributeMCID = elementsMolecularConsequence[j].getAttribute('DB') === 'SO' ?
                                elementsMolecularConsequence[j].getAttribute('ID') : '';
                            variant.molecularConsequenceList.push({
                                'hgvsName': textNEExpression,
                                'term': elementsMolecularConsequence[j].getAttribute('Type'),
                                'soId': attributeMCID
                            });
                        }
                    }
                }

                // Save dbSNP IDs for the variant
                if (elementXRefList) {
                    const elementsXRef = elementXRefList.getElementsByTagName('XRef');

                    for (let i = 0; i < elementsXRef.length; i++) {
                        if (elementsXRef[i].getAttribute('DB') === 'dbSNP') {
                            variant.dbSNPIds.push(elementsXRef[i].getAttribute('ID'));
                        }

                        if (elementsXRef[i].getAttribute('DB') === 'ClinGen') {
                            variant.carId = elementsXRef[i].getAttribute('ID');
                        }
                    }
                }

                // Extract additional data about the variant (if necessary)
                if (extended) {
                    parseClinvarExtended(variant, objTranscripts, elementVariationArchive, elementSimpleAllele);
                }
            }
        }
    }

    return variant;
}

/**
 * Function to perform extended parsing of XML document of ClinVar data (which is not stored in the DB)
 * @param {object} variant - Object containing data results of parsing
 * @param {object} objTranscripts - Object containing transcript data (from HGVS elements)
 * @param {object} elementVariationArchive - Object representing the VariationArchive element
 * @param {object} elementSimpleAllele - Object representing the SimpleAllele element
 */
function parseClinvarExtended(variant, objTranscripts, elementVariationArchive, elementSimpleAllele) {
    // Group (RefSeq?) transcripts by molecular consequence, nucleotide change and protein change
    variant.RefSeqTranscripts = {
        'MolecularConsequenceList': [],
        'NucleotideChangeList': objTranscripts.NucleotideChangeList,
        'ProteinChangeList': objTranscripts.ProteinChangeList
    };
    variant.gene = {};
    variant.allele = {
        'SequenceLocation': [],
        'ProteinChange': null
    };

    // Save the VariationType attribute of the VariationArchive element
    variant.clinvarVariationType = elementVariationArchive.getAttribute('VariationType');

    // Used for transcript tables on "Basic Information" tab in VCI
    // HGVS property for mapping to transcripts with matching HGVS names
    // SOid and Function properties for UI display
    variant.molecularConsequenceList.forEach(molecularConsequence => {
        variant.RefSeqTranscripts.MolecularConsequenceList.push({
            'HGVS': molecularConsequence.hgvsName,
            'SOid': molecularConsequence.soId,
            'Function': molecularConsequence.term
        });
    });

    // Parse Gene element (keeping existing business logic of processing only one)
    const elementGeneList = elementSimpleAllele.getElementsByTagName('GeneList')[0];

    if (elementGeneList) {
        const elementGene = elementGeneList.getElementsByTagName('Gene')[0];

        if (elementGene) {
            variant.gene.id = elementGene.getAttribute('GeneID');
            variant.gene.symbol = elementGene.getAttribute('Symbol');
            variant.gene.full_name = elementGene.getAttribute('FullName');
            variant.gene.hgnc_id = elementGene.getAttribute('HGNC_ID');
        }
    }

    // Evaluate whether a variant has protein change
    // Keeping existing business logic of processing only one ProteinChange element
    const elementProteinChange = elementSimpleAllele.getElementsByTagName('ProteinChange')[0];

    // Set protein change property value
    if (elementProteinChange) {
        variant.allele.ProteinChange = elementProteinChange.textContent;
    } else if (variant.RefSeqTranscripts.ProteinChangeList.length > 0) {
        const attributeChange = variant.RefSeqTranscripts.ProteinChangeList[0].Change;

        if (attributeChange) {
            // Remove 'p.' from string value
            let posStart = attributeChange.indexOf('.') + 1;
            let newAttrValue = attributeChange.slice(posStart);
            // Extract the numbers into a new string
            let num = newAttrValue.match(/[0-9]+(?!.*[0-9])/);
            // Separate groups of letters into arrays
            let stringArray = newAttrValue.split(/[0-9]+(?!.*[0-9])/);
            // Transform string into the format similar to common ProteinChange element value
            variant.allele.ProteinChange = stringArray[0] + num + stringArray[1].substr(0, 1);
        }
    }

    // Parse SequenceLocation elements (attributes are used to construct LinkOut URLs)
    // Used primarily for LinkOut links on "Basic Information" tab in VCI
    // referenceAllele and alternateAllele properties are added for Population tab
    const elementLocation = elementSimpleAllele.getElementsByTagName('Location')[0];

    if (elementLocation) {
        const elementsSequenceLocation = elementLocation.getElementsByTagName('SequenceLocation');

        for (let i = 0; i < elementsSequenceLocation.length; i++) {
            variant.allele.SequenceLocation.push({
                'Assembly': elementsSequenceLocation[i].getAttribute('Assembly'),
                'AssemblyAccessionVersion': elementsSequenceLocation[i].getAttribute('AssemblyAccessionVersion'),
                'AssemblyStatus': elementsSequenceLocation[i].getAttribute('AssemblyStatus'),
                'Chr': elementsSequenceLocation[i].getAttribute('Chr'),
                'Accession': elementsSequenceLocation[i].getAttribute('Accession'),
                'start': elementsSequenceLocation[i].getAttribute('start'),
                'stop': elementsSequenceLocation[i].getAttribute('stop'),
                'referenceAllele': elementsSequenceLocation[i].getAttribute('referenceAllele'),
                'alternateAllele': elementsSequenceLocation[i].getAttribute('alternateAllele')
            });
        }
    }
}

// Function for parsing CAR data for variant object creation
export function parseCAR(json) {
    var variant = {};
    // set carId in payload, since we'll always have this from a CAR response
    variant.carId = json['@id'].substring(json['@id'].indexOf('CA'));
    if (json.externalRecords) {
        // extract ClinVar data if available
        if (json.externalRecords.ClinVarVariations && json.externalRecords.ClinVarVariations.length > 0) {
            // only need the ClinVar Variation data, since we'll re-ping ClinVar with it, if available
            variant.clinvarVariantId = json.externalRecords.ClinVarVariations[0].variationId;
        }
        // extract dbSNPId data if available
        if (json.externalRecords.dbSNP && json.externalRecords.dbSNP.length > 0) {
            variant.dbSNPIds = [];
            json.externalRecords.dbSNP.map(function(dbSNPentry, i) {
                variant.dbSNPIds.push(dbSNPentry.rs.toString());
            });
        }
    }
    variant.hgvsNames = {};
    if (json.genomicAlleles && json.genomicAlleles.length > 0) {
        json.genomicAlleles.map(function(genomicAllele, i) {
            if (genomicAllele.hgvs && genomicAllele.hgvs.length > 0) {
                // extract the genomicAlleles hgvs terms
                genomicAllele.hgvs.map(function(hgvs_temp, j) {
                    // skip the hgvs term if it starts with 'CM'
                    if (!hgvs_temp.startsWith('CM')) {
                        // if NC, file by referenceGenome
                        if (hgvs_temp.startsWith('NC')) {
                            if (genomicAllele.referenceGenome) {
                                variant.hgvsNames[genomicAllele.referenceGenome] = hgvs_temp;
                            } else {
                                variant = parseCarHgvsHandler(hgvs_temp, variant);
                            }
                        } else {
                            variant = parseCarHgvsHandler(hgvs_temp, variant);
                        }
                    }
                });
            }
        });
    }
    // extract the aminoAcidAlleles hgvs terms
    if (json.aminoAcidAlleles && json.aminoAcidAlleles.length > 0) {
        variant = parseCarHgvsLoop(json.aminoAcidAlleles, variant);
    }
    // extract the transcriptAlleles hgvs terms
    if (json.transcriptAlleles && json.transcriptAlleles.length > 0) {
        variant = parseCarHgvsLoop(json.transcriptAlleles, variant);
    }
    return variant;
}

// helper function for the parseCar() function; loops through some of the CAR's repeating
// data structures to find HGVS terms and add them to the variant object
function parseCarHgvsLoop(alleles, variant) {
    variant['tempAlleles'] = [];
    alleles.map(function(allele, i) {
        if (allele.hgvs && allele.hgvs.length > 0) {
            allele.hgvs.map(function(hgvs_temp, j) {
                variant = parseCarHgvsHandler(hgvs_temp, variant);
            });
        }
        // Collect all the allele objects containing 'geneSymbol'
        // and put them in a temp array for canonical transcript matching
        // (if match found, the gene is selected for constructing the canonical transcript title)
        if (allele.geneSymbol) {
            let temp_allele_obj = {
                geneSymbol: allele.geneSymbol,
                hgvs: allele.hgvs,
                proteinEffect: allele.proteinEffect
            };
            variant['tempAlleles'].push(temp_allele_obj);
        }
    });
    // Evaluate whether there are overlapping genes in the variant
    // If so, we won't try constructing the canonical transcript title.
    // Instead, we just show the GRCh38 HGVS representation for the variant title.
    // Hence, delete the variant['tempAlleles'] as it is no longer useful.
    let genes = []; // For keeping track of overlapping genes
    variant['tempAlleles'].forEach(item => {
        let match = genes.find(gene => gene === item.geneSymbol);
        if (!match) genes.push(item.geneSymbol);
    });
    if (genes.length > 1) delete variant['tempAlleles'];
    return variant;
}

// helper function for the parseCar() function: checks to see if the variant object's hgvsNames'
// others variable is set, creates it if not, and adds an HGVS term to it
function parseCarHgvsHandler(hgvs_temp, variant) {
    if (!variant.hgvsNames.others) {
        variant.hgvsNames.others = [];
    }
    variant.hgvsNames.others.push(hgvs_temp);
    return variant;
}


/**
 * Method to return the variant preferred title. Examples given as below.
 * 
 * When both gene name and protein effect information are available, the format will be `NM_002496.4(Gene):c.64C>T (Amino-acid change)`.
 * 
 * When protein effect is unavailable, the format will be `NM_002496.4(Gene):c.64C>T`.
 * 
 * When both gene and protein effect not available, will fall back to hgvs format `NM_002496.4:c.64C>T`.
 * 
 * When gene name is unavailable, amino-acid change is unavailable as well, so the format will fallback to hgvs as above.
 * @param {string} geneName - Gene name, or gene symbol.
 * @param {string} hgvs - A HGVS representation of the variant.
 * @param {object} proteinEffect - An object containing the amino acid change hgvs information.
 * @returns {string} Preferred title of the variant.
 */
export const generateVariantPreferredTitle = (geneName, hgvs, proteinEffect) => {
    if (!hgvs.includes(':') || !geneName) {
        // when gene name is unavailable, then there will be no amino-acid change, where title will fall back to hgvs
        return hgvs;
    }

    const [transcriptId, aminoAcidChange] = hgvs.split(':');
    
    let aminoAcidChangeName = '';
    if (proteinEffect && proteinEffect.hgvs && proteinEffect.hgvs.includes(':')) {
        aminoAcidChangeName = proteinEffect.hgvs.split(':')[1];
    }

    return `${transcriptId}(${geneName}):${aminoAcidChange}${aminoAcidChangeName ? ` (${aminoAcidChangeName})` : ''}`;
}


/**
 * Method to parse components from a variant preferred title
 * 
 * Take variant preferred title `NM_002496.4(NDUFS8):c.64C>T (p.Pro22Ser)` as an example, we should parse components as below:
 * 
 * (required) transcript id: NM_002496.4
 * (optional) gene name: NDUFS8
 * (required) nucleotide change: c.64C>T
 * (optional) amino acid change name: p.Pro22Ser
 * 
 * When an optional component above is missing, we give an empty string.
 * When a required component is missing, we throw an error.
 * 
 * @param {string} variantPreferredTitle a qualified variant preferred title of the form `<transcript id>(<gene name>):<amino acid change> (<amino acid change name>)`. Note that gene name and amino acid change name are optional.
 * @returns {object} an object containing transcript id (i.e. refseq, or hgvs), gene name, amino acid change, and amino acid change name (i.e. protein effect name)
 */
export const parseVariantPreferredTitle = (variantPreferredTitle) => {
    const [transcriptIdAndGeneNamePart, aminoAcidChangePart] = variantPreferredTitle.split(':');

    if (!(transcriptIdAndGeneNamePart && aminoAcidChangePart)) {
        throw `Cannot parse variantPreferredTitle: ${variantPreferredTitle}`;
    }

    // parse transcript id and gene name
    const [transcriptId, geneName] = transcriptIdAndGeneNamePart.split(/[()]/);
    if (!transcriptId) {
        throw `Cannot parse variantPreferredTitle, missing transcript id: ${variantPreferredTitle}`;
    }

    // parse amino acid change and its protein effect name
    const [nucleotideChange, aminoAcidChangeName] = aminoAcidChangePart.replace(' ', '').split(/[()]/);
    if (!nucleotideChange) {
        throw `Cannot parse variantPreferredTitle, missing nucleotide change: ${variantPreferredTitle}`;
    }

    return {
        transcriptId,
        geneName: geneName || "",
        nucleotideChange,
        aminoAcidChangeName: aminoAcidChangeName || ""
    };
}


/**
 * Method to extract the unique, non-duplicated set of gene urls in genomic CAR from an array of transcripts for a variant in CAR (Clingen Allele Registry).
 * @param {Array} transcriptAlleles - Transcripts associated with a variant from CAR.
 * @returns {Set<string>} A set of genomic CAR gene urls.
 */
export const getTranscriptAllelesGeneUrlSet = (transcriptAlleles) => {
    let geneUrls = new Set();
    transcriptAlleles.forEach(transcript => {
        if (transcript.gene) {
            geneUrls.add(transcript.gene);
        }
    })

    return geneUrls;
}
