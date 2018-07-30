
message_template = {
    'iri': ['$PATH_TO_DATA', 'resource', 'uuid'],
    'jsonMessageVersion': ['$COMBINE_DATA', '.',
        {
            1: ['$CONVERT_DATA', ['resourceType'],
                {
                    'classification': 'GCI',
                    'interpretation': 'VCI'
                }
            ],
            2: '5'
        }
    ],    
    'sopVersion': '5',
    'curationVersion': 'TO BE DETERMINED',
    'title': ['$COMBINE_DATA', ' : ',
        {
            1: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
            2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term']
        }
    ],
    'statusFlag': ['$PATH_TO_DATA', 'resource', 'classificationStatus'],
    'statusPublishFlag': ['$CONVERT_DATA', ['resource', 'publishClassification'],
        {
            False: 'Publish',
            True: 'Unpublish'
        }
    ],
    'type': 'clinicalValidity',
    'affiliation': {
        'id': ['$PATH_TO_DATA', 'resource', 'affiliation'],
        'name': ['$LOOKUP_AFFILIATION_NAME', ['resource', 'affiliation']]
    },
    'genes': [
        {
            'ontology': 'HGNC',
            'curie': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'hgncId'],
            'symbol': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'gene', 'symbol'],
            'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'gene', 'hgncId'], ':', '']
        }
    ],
    # Going to need something for free text
    'conditions': [
        {
            'ontology': 'MONDO',
            'curie': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'diseaseId'], '_', ':'],
            'name': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'term'],
            'uri': ['$REPLACE_DATA', ['resourceParent', 'gdm', 'disease', 'diseaseId'], '_', ''],
            'iri': ['$COMBINE_DATA', '',
                {
                    1: 'http://purl.obolibrary.org/obo/',
                    2: ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'disease', 'diseaseId']
                }
            ]
        }
    ],
    'scoreJson': {
        'ModeOfInheritance': ['$PATH_TO_DATA', 'resourceParent', 'gdm', 'modeInheritance'],
        'GeneticEvidence': {
            'CaseLevelData': {
                'VariantEvidence': {
                    'AutosomalDominantOrXlinkedDisorder': {
                        'VariantIsDeNovo': {
                            'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
                            'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['$EVIDENCE_DATA', 'VARIANT_IS_DE_NOVO'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'ProbandWithPredictedOrProvenNullVariant': {
                            'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
                            'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['$EVIDENCE_DATA', 'PREDICTED_OR_PROVEN_NULL_VARIANT'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'ProbandWithOtherVariantTypeWithSomeEvidenceOfGeneImpact': {
                            'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
                            'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['$EVIDENCE_DATA', 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        }
                    },
                    'AutosomalRecessiveDisease': {
                        'TwoVariantsInTransAndAtLeastOneDeNovoOrAPredictedProvenNullVariant': {
                            'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'totalPointsGiven'],
                                ['autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['$EVIDENCE_DATA', 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'pointsCounted'],
                            ['autosomalRecessiveDisorder']],
                        'TwoVariantsNotPredictedProvenNullWithSomeEvidenceOfGeneImpactInTrans': {
                            'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'totalPointsGiven'],
                                ['autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['$EVIDENCE_DATA', 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        }
                    }
                },
                'SegregationEvidence': {
                    'EvidenceOfSegregationInOneOrMoreFamilies': {
                        'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
                            ['segregation', 'evidenceCount']],
                        'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
                            ['segregation', 'evidenceCount']]
                        # Evidence, in the form of key/value pairs of numbers and article metadata objects, added here (dynamically)
                    }
                }
            },
            'CaseControlData': {
                'SingleVariantAnalysis': {
                    'Value': ['$EVIDENCE_DATA', 'case-control-single-points'],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'case-control-single'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'caseControl', 'pointsCounted'],
                    ['caseControl', 'evidenceCount']],
                'AggregateVariantAnalysis': {
                    'Value': ['$EVIDENCE_DATA', 'case-control-aggregate-points'],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'case-control-aggregate'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'TotalGeneticEvidencePoints': {
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
                'Notes': ''
            }
        },
        'ExperimentalEvidence': {
            'Function': {
                'BiochemicalFunction': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'biochemicalFunctions', 'totalPointsGiven'],
                        ['function', 'biochemicalFunctions', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-biochemical-function'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'pointsCounted'],
                    ['function']],
                'ProteinInteraction': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'proteinInteractions', 'totalPointsGiven'],
                        ['function', 'proteinInteractions', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-protein-interactions'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Expression': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'function', 'expression', 'totalPointsGiven'],
                        ['function', 'expression', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-expression'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'FunctionalAlteration': {
                'PatientCells': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'patientCells', 'totalPointsGiven'],
                        ['functionalAlteration', 'patientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'pointsCounted'],
                    ['functionalAlteration']],
                'NonPatientCells': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'functionalAlteration', 'nonPatientCells', 'totalPointsGiven'],
                        ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-functional-alteration-non-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'Models': {
                'NonHumanModelOrganism': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsNonHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'modelsNonHuman', 'evidenceCount']]
                },
                'CellCultureModel': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'modelsCellCulture', 'totalPointsGiven'],
                        ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-cell-culture-model'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'ModelsRescue': {
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'pointsCounted'],
                    ['modelsRescue']],
                'NonHumanModelOrganism': {
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-model-systems-non-human-model-organism'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'Rescue': {
                'RescueInHuman': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueHuman', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-rescue-human'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInNonHumanModelOrganism': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueNonHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-rescue-non-human-model-organism'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInCellCultureModel': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescueCellCulture', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-rescue-cell-culture-model'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInPatientCell': {
                    'Value': ['$SCORE_DATA', ['resource', 'classificationPoints', 'modelsRescue', 'rescuePatientCells', 'totalPointsGiven'],
                        ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['$EVIDENCE_DATA', 'exp-rescue-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'TotalExperimentalEvidencePoints': {
                'Tally': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
                'Notes': ''
            }
        },
        'summary': {
            'GeneticEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
            'ExperimentalEvidenceTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
            'EvidencePointsTotal': ['$SCORE_DATA', ['resource', 'classificationPoints', 'evidencePointsTotal'], True],
            'CalculatedClassification': ['$PATH_TO_DATA', 'resource', 'autoClassification'],
            'CalculatedClassificationDate': ['$PATH_TO_DATA', 'resource', 'provisionalDate'],
            'CuratorModifyCalculation': ['$CONVERT_DATA', ['resource', 'alteredClassification'],
                {
                    'No Modification': 'NO',
                    '$DEFAULT': 'YES'
                }
            ],
            'CuratorClassification': ['$PATH_TO_DATA', 'resource', 'alteredClassification'],
            'CuratorClassificationDate': ['$PATH_TO_DATA', 'resource', 'provisionalDate'],
            'CuratorClassificationNotes': ['$PATH_TO_DATA', 'resource', 'reasons'],
            'FinalClassification': ['$USE_FIRST_DATA', 'No Modification', ['resource', 'alteredClassification'], ['resource', 'autoClassification']],
            'FinalClassificationDate': ['$PATH_TO_DATA', 'resource', 'approvalDate'],
            'FinalClassificationNotes': ['$PATH_TO_DATA', 'resource', 'evidenceSummary']
        },
        'ReplicationOverTime': ['$CONVERT_DATA', ['resource', 'replicatedOverTime'],
            {
                False: 'NO',
                True: 'YES'
            }
        ],
        'ValidContradictoryEvidence': {
            # A yes/no value (at key "Value") and evidence added here (dynamically)
        }
    }
}
