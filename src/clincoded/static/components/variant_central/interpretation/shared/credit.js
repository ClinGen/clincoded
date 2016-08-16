// # Static method to render credits of data source
// # Parameters: data source identifier
// # Usage: getClinvarInterpretations(xml)
// # Dependency: None

'use strict';
var React = require('react');

export function renderDataCredit(source) {
	if (source === 'myvariant') {
		return (
	    	<div className="credits">
	            <div className="credit credit-myvariant" id="credit-myvariant"><a name="credit-myvariant"></a>
                    <span className="label label-primary">MyVariant</span> - The data in this table were retrieved using:
                    MyVariant.info (<a href="http://myvariant.info" target="_blank">http://myvariant.info</a>)
                    Xin J, Mark A, Afrasiabi C, Tsueng G, Juchler M, Gopal N, Stupp GS, Putman TE, Ainscough BJ,
                    Griffith OL, Torkamani A, Whetzel PL, Mungall CJ, Mooney SD, Su AI, Wu C (2016)
                    High-performance web services for querying gene and variant annotation. Genome Biology 17(1):1-7.
                    PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/27154141" target="_blank">27154141</a>&nbsp;
					PMCID: <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC4858870/" target="_blank">PMC4858870</a>&nbsp;
					DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0953-9" target="_blank">10.1186/s13059-016-0953-9</a>
                </div>
	        </div>
	    );
	} else if (source === 'vep') {
		return (
	    	<div className="credits">
	            <div className="credit credit-vep" id="credit-vep"><a name="credit-vep"></a>
                    <span className="label label-primary">VEP</span> - The data in this table were retrieved using:
                    The Ensembl Variant Effect Predictor (<a href="http://www.ensembl.org/Homo_sapiens/Tools/VEP" target="_blank">www.ensembl.org/Homo_sapiens/Tools/VEP</a>)
                    McLaren W, Gil L, Hunt SE, Riat HS, Ritchie GR, Thormann A, Flicek P, Cunningham F.
                    Genome Biol. 2016 Jun 6;17(1):122.
                    PMID: <a href="http://www.ncbi.nlm.nih.gov/pubmed/27268795" target="_blank">27268795</a>&nbsp;
					PMCID: <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC4893825/" target="_blank">PMC4893825</a>&nbsp;
					DOI: <a href="https://genomebiology.biomedcentral.com/articles/10.1186/s13059-016-0974-4" target="_blank">10.1186/s13059-016-0974-4</a>
              	</div>
	        </div>
	    );
	}
}
