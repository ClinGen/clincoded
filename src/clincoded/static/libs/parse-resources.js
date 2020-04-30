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
 * @param {Array<string>?} extendedVariantKeysAdded - Provide an array which will be mutated in this method 
 *      and populated with the additional keys added to the returned variant object. 
 *      Additional keys are keys that are added by extended parsing. This arg is only effective when `extended=true`. 
 *      Optional, if not provided will do nothing.
 */
export function parseClinvar(xml, extended, extendedVariantKeysAdded) {
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
                    const originalVariantKeysSnapshot = new Set(Object.keys(variant));

                    parseClinvarExtended(variant, objTranscripts, elementVariationArchive, elementSimpleAllele);

                    // store the diff keys between before extended and after extended
                    if (extendedVariantKeysAdded) {
                        const extendedVariantKeysSnapshot = new Set(Object.keys(variant));
                        for (const key of extendedVariantKeysSnapshot) {
                            if (!originalVariantKeysSnapshot.has(key)) {
                                extendedVariantKeysAdded.push(key);
                            }
                        }
                    }
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
 * `NM_015506.3(MMACHC):c.436_450del (p.Ser146_Ile150del)`
 *  NM: Chromosome
 *  015506: Gene on chromosome (a gene produces certain protein)
 *  MMACHC: Symbol represent the gene
 *  c.436_450del: Nucleotide change
 *  p.Ser146_Ile150del: Name of the amino acid (protein) change
 *  
 * Regarding the title format, below gives another example:
 * 
 * When both gene name and protein effect information are available, the format will be `NM_002496.4(Gene):c.64C>T (Amino-acid change)`.
 * 
 * When protein effect is unavailable, the format will be `NM_002496.4(Gene):c.64C>T`.
 * 
 * When both gene and protein effect not available, will fall back to hgvs format `NM_002496.4:c.64C>T`.
 * 
 * When gene name is unavailable, amino-acid change is unavailable as well, so the format will fallback to hgvs as above.
 * @param {Object} props - The argument object for this method
 * @param {string} props.geneName - Gene name, or gene symbol.
 * @param {string} props.transcriptId - (required) The transcript id, see example above
 * @param {string} props.nucleotideChange - (required) The nucleotide change, see example above
 * @param {Object} props.aminoAcidChangeName - The name of amino acid change, see example above.
 * @returns {string} Preferred title of the variant.
 */
export const generateVariantPreferredTitle = ({geneName, transcriptId, nucleotideChange, aminoAcidChangeName}) => {
    // required fields
    if (!(transcriptId && nucleotideChange)) {
        return null;
    }

    if (!geneName) {
        // when gene name is unavailable, then there will be no amino-acid change, where title will fall back to hgvs form, i.e. transcriptId:nucleotideChange
        return `${transcriptId}:${nucleotideChange}`;
    }

    return `${transcriptId}(${geneName}):${nucleotideChange}${aminoAcidChangeName ? ` (${aminoAcidChangeName})` : ''}`;
}


/**
 * Method to extract the unique, non-duplicated set of gene symbols in genomic CAR from an array of transcripts for a variant in CAR (Clingen Allele Registry).
 * @param {Array<Object>} transcriptAlleles - Transcripts associated with a variant from CAR.
 * @returns {Set<string>} A set of genomic CAR gene urls.
 */
export const getTranscriptAllelesGeneSymbolSet = (transcriptAlleles) => {
    let geneSymbols = new Set();
    transcriptAlleles.forEach(transcript => {
        if (transcript.geneSymbol) {
            geneSymbols.add(transcript.geneSymbol);
        }
    })

    return geneSymbols;
}

/**
 * This method returns the preferred variant title using Ensembl API data.
 * Note that this method does not try to match a transcript id using data from other data source; instead will just use the `transcriptId` provided
 * 
 * @param {string} transcriptId The first portion of the hgvs of a transcript, which is the part before ':', but without the gene symbol (gene name)
 * @param {Object} transcriptFromEnsembl The transcript object retreived from Ensembl
 */
export const getPreferredTitleFromEnsemblTranscriptsNoMatch = (transcriptId, transcriptFromEnsembl) => {
    const { hgvsc, hgvsp, gene_symbol } = transcriptFromEnsembl;

    const [, nucleotideChange] = hgvsc.split(':');
    const [, aminoAcidChangeName] = hgvsp.split(':');

    return generateVariantPreferredTitle({
        geneName: gene_symbol,
        transcriptId,
        nucleotideChange,
        aminoAcidChangeName
    });
}

/**
 * Method to return the transcript title given the trnascript id and the json fetched from variant CAR.
 * This method uses the CAR data to match the transcript id in order to generate the full perferred transcript title
 * 
 * @param {string} transcriptIdToMatch - The first portion of the hgvs of a transcript, which is the part before ':', but without the gene symbol (gene name).
 * @param {Object} carJson - Variant CAR json response object.
 * @returns {(string|null)} Variant title for the MANE transcript.
 */
export const getPreferredTitleFromEnsemblTranscriptsMatchByCar = (transcriptIdToMatch, carJson) => {
    // given the id of MANE transcript, reverse lookup in CAR to obtain complete transcript info
    const {
        transcriptAlleles = []
    } = carJson;

    for (let transcript of transcriptAlleles) {
        const { hgvs: [ hgvsValue = '' ] = [] } = transcript;
        if (!hgvsValue) {
            continue;
        }
        
        const [transcriptId, nucleotideChange] = hgvsValue.split(':')
        const {
            proteinEffect: {
                hgvs = ''
            } = {}
        } = transcript;
        const [, aminoAcidChangeName] =  hgvs.split(':');
        if (transcriptId === transcriptIdToMatch) {
            // Only return the transcript preferred title for now.
            // Can add more transcript info here if needed in the future.
            return generateVariantPreferredTitle({
                geneName: transcript.geneSymbol,
                transcriptId,
                nucleotideChange,
                aminoAcidChangeName
            });
        }
    }

    return null;
}
