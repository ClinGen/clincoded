'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { dbxref_prefix_map, external_url_map } from '../../globals';
import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';

// Display the gene data of the interpretation
class CurationInterpretationGeneSpecific extends Component {
    constructor(props) {
        super(props);
    }

    // Method to render constraint scores table
    renderConstraintScores(myGeneInfo) {
        if (myGeneInfo.exac) {
            let allExac = myGeneInfo.exac.all,
                nonPsych = myGeneInfo.exac.nonpsych,
                nonTcga = myGeneInfo.exac.nontcga;
            return (
                <tbody>
                    {allExac ?
                        <tr>
                            <td>All ExAC</td>
                            <td>{this.parseFloatShort(allExac.p_li)}</td>
                            <td>{this.parseFloatShort(allExac.p_rec)}</td>
                            <td>{this.parseFloatShort(allExac.p_null)}</td>
                            <td>{this.parseFloatShort(allExac.syn_z)}</td>
                            <td>{this.parseFloatShort(allExac.mis_z)}</td>
                        </tr>
                        : null}
                    {nonPsych ?
                        <tr>
                            <td>Non-psych</td>
                            <td>{this.parseFloatShort(nonPsych.p_li)}</td>
                            <td>{this.parseFloatShort(nonPsych.p_rec)}</td>
                            <td>{this.parseFloatShort(nonPsych.p_null)}</td>
                            <td>{this.parseFloatShort(nonPsych.syn_z)}</td>
                            <td>{this.parseFloatShort(nonPsych.mis_z)}</td>
                        </tr>
                        : null}
                    {nonTcga ?
                        <tr>
                            <td>Non-TCGA</td>
                            <td>{this.parseFloatShort(nonTcga.p_li)}</td>
                            <td>{this.parseFloatShort(nonTcga.p_rec)}</td>
                            <td>{this.parseFloatShort(nonTcga.p_null)}</td>
                            <td>{this.parseFloatShort(nonTcga.syn_z)}</td>
                            <td>{this.parseFloatShort(nonTcga.mis_z)}</td>
                        </tr>
                        : null}
                </tbody>
            );
        }
    }

    // helper function to shorten display of imported float values to 5 decimal places;
    // if float being displayed has less than 5 decimal places, just show the value with no changes
    // Returns a string for display purposes.
    parseFloatShort(float) {
        let splitFloat = (float + "").split('.');
        if (splitFloat.length > 1 && splitFloat[1].length > 5) {
            return float.toFixed(5) + '';
        } else {
            return float.toString();
        }
    }

    render() {
        const { ext_myGeneInfo, ext_geneSynonyms, ext_ensemblGeneId, loading_myGeneInfo } = this.props;
        let myGeneInfo = ext_myGeneInfo ? ext_myGeneInfo : null;
        let geneSynonyms = ext_geneSynonyms ? ext_geneSynonyms : null;
        let ensemblGeneId = ext_ensemblGeneId ? ext_ensemblGeneId : null;

        return (
            <div className="variant-interpretation gene-specific">
                <div className="panel panel-info datasource-constraint-scores">
                    <div className="panel-heading">
                        <h3 className="panel-title">ExAC Constraint Scores
                            <a href="#credit-mygene" className="credit-mygene" title="MyGene.info"><span>MyGene</span></a>
                        </h3>
                    </div>
                    <div className="panel-content-wrapper">
                        {loading_myGeneInfo ? showActivityIndicator('Retrieving data... ') : null}
                        {(myGeneInfo && myGeneInfo.exac) ?
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>&nbsp;</th>
                                        <th>pLI</th>
                                        <th>pRec</th>
                                        <th>pNull</th>
                                        <th>syn Z</th>
                                        <th>mis Z</th>
                                    </tr>
                                </thead>

                                {this.renderConstraintScores(myGeneInfo)}

                                <tfoot>
                                    <tr className="footnote">
                                        <td colSpan="6">
                                            <dl className="inline-dl clearfix">
                                                <dt>pLI:</dt><dd>the probability of being loss-of-function intolerant (intolerant of both heterozygous and homozygous LOF variants)</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>pRec:</dt><dd>the probability of being intolerant of homozygous, but not heterozygous LOF variants</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>pNull:</dt><dd>the probability of being tolerant of both heterozygous and homozygous LOF variants</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>syn Z:</dt><dd>corrected synonymous Z score</dd>
                                            </dl>
                                            <dl className="inline-dl clearfix">
                                                <dt>mis Z:</dt><dd>corrected missense Z score</dd>
                                            </dl>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            :
                            <div className="panel-body"><span>No ExAC constraint scores found for this variant.</span></div>
                        }
                    </div>
                </div>

                <div className="panel panel-info datasource-clinvar">
                    <div className="panel-heading"><h3 className="panel-title">Other ClinVar Variants in Same Gene</h3></div>
                    <div className="panel-content-wrapper">
                        {loading_myGeneInfo ? showActivityIndicator('Retrieving data... ') : null}
                        <div className="panel-body">
                            {(myGeneInfo) ?
                                <a href={external_url_map['ClinVar'] + '?term=' + myGeneInfo.symbol + '%5Bgene%5D'}
                                    target="_blank">Search ClinVar for variants in this gene</a>
                                :
                                <span>No other variants found in this gene at ClinVar.</span>
                            }
                        </div>
                    </div>
                </div>

                <div className="panel panel-info datasource-gene-resources">
                    <div className="panel-heading"><h3 className="panel-title">Gene Resources</h3></div>
                    <div className="panel-content-wrapper">
                        {loading_myGeneInfo ? showActivityIndicator('Retrieving data... ') : null}
                        {(myGeneInfo) ?
                            <div className="panel-body">
                                <dl className="inline-dl clearfix">
                                    <dt>HGNC</dt>
                                    <dd>
                                        Symbol: <a href={external_url_map['HGNC'] + myGeneInfo.HGNC} target="_blank">{myGeneInfo.symbol}</a><br/>
                                        Approved Name: {myGeneInfo.name ? myGeneInfo.name : 'None'}<br/>
                                        {geneSynonyms ? <span>Synonyms: {geneSynonyms.join(', ')}</span> : null}
                                    </dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>Entrez Gene:</dt>
                                    <dd>
                                        {myGeneInfo.entrezgene ?
                                            <a href={dbxref_prefix_map['GeneID'] + myGeneInfo.entrezgene.toString()} target="_blank">{myGeneInfo.entrezgene}</a>
                                            : 'None'}
                                    </dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>Ensembl:</dt>
                                    <dd>
                                        {ensemblGeneId ?
                                            <a href={dbxref_prefix_map['ENSEMBL'] + ensemblGeneId + ';db=core'} target="_blank">{ensemblGeneId}</a>
                                            :
                                            <a href="http://ensembl.org" target="_blank">Search Ensembl</a>
                                        }
                                    </dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>GeneCards:</dt>
                                    <dd><a href={dbxref_prefix_map['HGNC'] + myGeneInfo.symbol} target="_blank">{myGeneInfo.symbol}</a></dd>
                                </dl>
                            </div>
                            :
                            <div className="panel-body"><span>No gene resources found for this gene.</span></div>
                        }
                    </div>
                </div>

                <div className="panel panel-info datasource-protein-resources">
                    <div className="panel-heading"><h3 className="panel-title">Protein Resources</h3></div>
                    <div className="panel-content-wrapper">
                        {loading_myGeneInfo ? showActivityIndicator('Retrieving data... ') : null}
                        {(myGeneInfo && myGeneInfo.uniprot && myGeneInfo.uniprot['Swiss-Prot']) ?
                            <div className="panel-body">
                                <dl className="inline-dl clearfix">
                                    <dt>UniProtKB:</dt>
                                    <dd><a href={dbxref_prefix_map['UniProtKB'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank">{myGeneInfo.uniprot['Swiss-Prot']}</a></dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>Domains:</dt>
                                    <dd><a href={external_url_map['InterPro'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank">InterPro</a></dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>Structure:</dt>
                                    <dd><a href={external_url_map['PDBe'] + '?uniprot_accession:(' + myGeneInfo.uniprot['Swiss-Prot'] + ')'} target="_blank">PDBe</a></dd>
                                </dl>
                                <dl className="inline-dl clearfix">
                                    <dt>Gene Ontology (Function/Process/Cellular Component):</dt>
                                    <dd><a href={external_url_map['AmiGO2'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank">AmiGO2</a> | <a href={external_url_map['QuickGO'] + myGeneInfo.uniprot['Swiss-Prot']} target="_blank">QuickGO</a></dd>
                                </dl>
                            </div>
                            :
                            <div className="panel-body"><span>No protein resources found for this gene.</span></div>
                        }
                    </div>
                </div>

                {renderDataCredit('mygene')}

            </div>
        );
    }
}

CurationInterpretationGeneSpecific.propTypes = {
    ext_myGeneInfo: PropTypes.object,
    ext_ensemblGeneId: PropTypes.string,
    ext_geneSynonyms: PropTypes.array,
    loading_myGeneInfo: PropTypes.bool
};

export default CurationInterpretationGeneSpecific;
