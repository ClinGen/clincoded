// # Static method to render credits of data source
// # Parameters: data source identifier
// # Usage: renderDataCredit('myvariant')
// # Dependency: None

'use strict';
import React from 'react';

export function renderDataCredit(source) {
    if (source === 'myvariant') { 
        return (
            <div className="credits">
                <div className="credit credit-myvariant" id="credit-myvariant"><a name="credit-myvariant"></a>
                    <span className="credit-myvariant"><span>MyVariant</span></span> - When available, data in this table was retrieved using:
                    MyVariant.info (<a href="http://myvariant.info" target="_blank">http://myvariant.info</a>)
                    Xin J, Mark A, Afrasiabi C, Tsueng G, Juchler M, Gopal N, Stupp GS, Putman TE, Ainscough BJ,
                    Griffith OL, Torkamani A, Whetzel PL, Mungall CJ, Mooney SD, Su AI, Wu C (2016)
                    High-performance web services for querying gene and variant annotation. Genome Biology 17(1):1-7.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/27154141" target="_blank">27154141</a>&nbsp;
                PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4858870/" target="_blank">PMC4858870</a>&nbsp;
                DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0953-9" target="_blank">10.1186/s13059-016-0953-9</a>
                </div>
            </div>
        );
    } else if (source === 'mygene') {
        return (
            <div className="credits">
                <div className="credit credit-mygene" id="credit-mygene"><a name="credit-mygene"></a>
                    <span className="credit-mygene"><span>MyGene</span></span> - When available, data in this table was retrieved using:
                    MyGene.info (<a href="http://mygene.info" target="_blank">http://mygene.info</a>)
                    Xin J, Mark A, Afrasiabi C, Tsueng G, et al. (2016) High-performance web services for querying gene and variant annotation. Genome Biology 17(1):1-7.
                    PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/27154141" target="_blank">27154141</a>&nbsp;
                    PMCID: <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC4858870/" target="_blank">PMC4858870</a>&nbsp;
                    DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0953-9" target="_blank">10.1186/s13059-016-0953-9</a>.&nbsp;
                    Wu C, MacLeod I, Su AI (2013) BioGPS and MyGene.info: organizing online, gene-centric information. Nucl. Acids Res. 41(D1): D561-D565.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/23175613" target="_blank">23175613</a>&nbsp;
                    PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3531157/" target="_blank">PMC3531157</a>&nbsp;
                    DOI: <a href="http://nar.oxfordjournals.org/content/41/D1/D561" target="_blank">10.1093/nar/gks1114</a>
                </div>
            </div>
        );
    } else if (source === 'vep') {
        return (
            <div className="credits">
                <div className="credit credit-vep" id="credit-vep"><a name="credit-vep"></a>
                    <span className="credit-vep"><span>VEP</span></span> - When available, data in this table was retrieved using:
                    The Ensembl Variant Effect Predictor (<a href="http://www.ensembl.org/Homo_sapiens/Tools/VEP" target="_blank">www.ensembl.org/Homo_sapiens/Tools/VEP</a>)
                    McLaren W, Gil L, Hunt SE, Riat HS, Ritchie GR, Thormann A, Flicek P, Cunningham F.
                    Genome Biol. 2016 Jun 6;17(1):122.
                    PMID: <a href="https://www.ncbi.nlm.nih.gov/pubmed/27268795" target="_blank">27268795</a>&nbsp;
                    PMCID: <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4893825/" target="_blank">PMC4893825</a>&nbsp;
                    DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0974-4" target="_blank">10.1186/s13059-016-0974-4</a>
                </div>
            </div>
        );
    }  else if (source === 'pagestudy') {
        return (
            <div className="credits">
                <div className="credit credit-pagestudy" id="credit-pagestudy"><a name="credit-pagestudy"></a>
                    <span className="credit-pagestudy"><span>PAGE</span></span> - <a href="https://www.pagestudy.org/" target="_blank">Population Architecture using Genomics and Epidemiology</a>
                </div>
            </div>
        );
    }
}
