
message_template = {
    'iri': ['# path to data #', 'resource', 'uuid'],
    'jsonMessageVersion': ['# combine data #', '.',
        {
            1: ['# convert data #', ['resourceType'],
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
    'title': ['# combine data #', ' : ',
        {
            1: ['# path to data #', 'resourceParent', 'gdm', 'gene', 'symbol'],
            2: ['# path to data #', 'resourceParent', 'gdm', 'disease', 'term']
        }
    ],
    'statusFlag': ['# path to data #', 'resource', 'classificationStatus'],
    'statusPublishFlag': ['# convert data #', ['resource', 'publishClassification'],
        {
            False: 'Publish',
            True: 'Unpublish'
        }
    ],
    'type': 'clinicalValidity',
    'affiliation': {
        'id': ['# path to data #', 'resource', 'affiliation'],
        'name': ['# lookup affiliation name #', ['resource', 'affiliation']]
    },
    'genes': [
        {
            'ontology': 'HGNC',
            'curie': ['# path to data #', 'resourceParent', 'gdm', 'gene', 'hgncId'],
            'symbol': ['# path to data #', 'resourceParent', 'gdm', 'gene', 'symbol'],
            'uri': ['# replace data #', ['resourceParent', 'gdm', 'gene', 'hgncId'], ':', '']
        }
    ],
    # Going to need something for free text
    'conditions': [
        {
            'ontology': 'MONDO',
            'curie': ['# replace data #', ['resourceParent', 'gdm', 'disease', 'diseaseId'], '_', ':'],
            'name': ['# path to data #', 'resourceParent', 'gdm', 'disease', 'term'],
            'uri': ['# replace data #', ['resourceParent', 'gdm', 'disease', 'diseaseId'], '_', ''],
            'iri': ['# combine data #', '',
                {
                    1: 'http://purl.obolibrary.org/obo/',
                    2: ['# path to data #', 'resourceParent', 'gdm', 'disease', 'diseaseId']
                }
            ]
        }
    ],
    'scoreJson': {
        'ModeOfInheritance': ['# path to data #', 'resourceParent', 'gdm', 'modeInheritance'],
        'GeneticEvidence': {
            'CaseLevelData': {
                'VariantEvidence': {
                    'AutosomalDominantOrXlinkedDisorder': {
                        'VariantIsDeNovo': {
                            'Value': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
                            'Tally': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'variantIsDeNovo', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['# evidence data #', 'VARIANT_IS_DE_NOVO'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'ProbandWithPredictedOrProvenNullVariant': {
                            'Value': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
                            'Tally': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithPredictedOrProvenNullVariant', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['# evidence data #', 'PREDICTED_OR_PROVEN_NULL_VARIANT'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'ProbandWithOtherVariantTypeWithSomeEvidenceOfGeneImpact': {
                            'Value': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'totalPointsGiven'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
                            'Tally': ['# score data #', ['resource', 'classificationPoints', 'autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'pointsCounted'],
                                ['autosomalDominantOrXlinkedDisorder', 'probandWithOtherVariantTypeWithGeneImpact', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['# evidence data #', 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        }
                    },
                    'AutosomalRecessiveDisease': {
                        'TwoVariantsInTransAndAtLeastOneDeNovoOrAPredictedProvenNullVariant': {
                            'Value': ['# score data #', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'totalPointsGiven'],
                                ['autosomalRecessiveDisorder', 'twoVariantsInTransWithOneDeNovo', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['# evidence data #', 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        },
                        'Tally': ['# score data #', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'pointsCounted'],
                            ['autosomalRecessiveDisorder']],
                        'TwoVariantsNotPredictedProvenNullWithSomeEvidenceOfGeneImpactInTrans': {
                            'Value': ['# score data #', ['resource', 'classificationPoints', 'autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'totalPointsGiven'],
                                ['autosomalRecessiveDisorder', 'twoVariantsWithGeneImpactInTrans', 'evidenceCount']],
                            'Evidence': {
                                'Publications': ['# evidence data #', 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS'],
                                'Notes': {
                                    'note': ''
                                }
                            }
                        }
                    }
                },
                'SegregationEvidence': {
                    'EvidenceOfSegregationInOneOrMoreFamilies': {
                        'Value': ['# score data #', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
                            ['segregation', 'evidenceCount']],
                        'Tally': ['# score data #', ['resource', 'classificationPoints', 'segregation', 'pointsCounted'],
                            ['segregation', 'evidenceCount']]
                        # Evidence, in the form of key/value pairs of numbers and article metadata objects, added here (dynamically)
                    }
                }
            },
            'CaseControlData': {
                'SingleVariantAnalysis': {
                    'Value': ['# evidence data #', 'case-control-single-points'],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'case-control-single'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'caseControl', 'pointsCounted'],
                    ['caseControl', 'evidenceCount']],
                'AggregateVariantAnalysis': {
                    'Value': ['# evidence data #', 'case-control-aggregate-points'],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'case-control-aggregate'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'TotalGeneticEvidencePoints': {
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
                'Notes': ''
            }
        },
        'ExperimentalEvidence': {
            'Function': {
                'BiochemicalFunction': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'function', 'biochemicalFunctions', 'totalPointsGiven'],
                        ['function', 'biochemicalFunctions', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-biochemical-function'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'function', 'pointsCounted'],
                    ['function']],
                'ProteinInteraction': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'function', 'proteinInteractions', 'totalPointsGiven'],
                        ['function', 'proteinInteractions', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-protein-interactions'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Expression': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'function', 'expression', 'totalPointsGiven'],
                        ['function', 'expression', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-expression'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'FunctionalAlteration': {
                'PatientCells': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'functionalAlteration', 'patientCells', 'totalPointsGiven'],
                        ['functionalAlteration', 'patientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-functional-alteration-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'functionalAlteration', 'pointsCounted'],
                    ['functionalAlteration']],
                'NonPatientCells': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'functionalAlteration', 'nonPatientCells', 'totalPointsGiven'],
                        ['functionalAlteration', 'nonPatientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-functional-alteration-non-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'Models': {
                'NonHumanModelOrganism': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'modelsNonHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'modelsNonHuman', 'evidenceCount']]
                },
                'CellCultureModel': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'modelsCellCulture', 'totalPointsGiven'],
                        ['modelsRescue', 'modelsCellCulture', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-model-systems-cell-culture-model'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'ModelsRescue': {
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'pointsCounted'],
                    ['modelsRescue']],
                'NonHumanModelOrganism': {
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-model-systems-non-human-model-organism'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'Rescue': {
                'RescueInHuman': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'rescueHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueHuman', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-rescue-human'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInNonHumanModelOrganism': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'rescueNonHuman', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueNonHuman', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-rescue-non-human-model-organism'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInCellCultureModel': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'rescueCellCulture', 'totalPointsGiven'],
                        ['modelsRescue', 'rescueCellCulture', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-rescue-cell-culture-model'],
                        'Notes': {
                            'note': ''
                        }
                    }
                },
                'RescueInPatientCell': {
                    'Value': ['# score data #', ['resource', 'classificationPoints', 'modelsRescue', 'rescuePatientCells', 'totalPointsGiven'],
                        ['modelsRescue', 'rescuePatientCells', 'evidenceCount']],
                    'Evidence': {
                        'Publications': ['# evidence data #', 'exp-rescue-patient-cells'],
                        'Notes': {
                            'note': ''
                        }
                    }
                }
            },
            'TotalExperimentalEvidencePoints': {
                'Tally': ['# score data #', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
                'Notes': ''
            }
        },
        'summary': {
            'GeneticEvidenceTotal': ['# score data #', ['resource', 'classificationPoints', 'geneticEvidenceTotal'], True],
            'ExperimentalEvidenceTotal': ['# score data #', ['resource', 'classificationPoints', 'experimentalEvidenceTotal'], True],
            'EvidencePointsTotal': ['# score data #', ['resource', 'classificationPoints', 'evidencePointsTotal'], True],
            'CalculatedClassification': ['# path to data #', 'resource', 'autoClassification'],
            'CalculatedClassificationDate': ['# path to data #', 'resource', 'provisionalDate'],
            'CuratorModifyCalculation': ['# convert data #', ['resource', 'alteredClassification'],
                {
                    'No Modification': 'NO',
                    '# default #': 'YES'
                }
            ],
            'CuratorClassification': ['# path to data #', 'resource', 'alteredClassification'],
            'CuratorClassificationDate': ['# path to data #', 'resource', 'provisionalDate'],
            'CuratorClassificationNotes': ['# path to data #', 'resource', 'reasons'],
            'FinalClassification': ['# use first data #', 'No Modification', ['resource', 'alteredClassification'], ['resource', 'autoClassification']],
            'FinalClassificationDate': ['# path to data #', 'resource', 'approvalDate'],
            'FinalClassificationNotes': ['# path to data #', 'resource', 'evidenceSummary']
        },
        'ReplicationOverTime': ['# convert data #', ['resource', 'replicatedOverTime'],
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
