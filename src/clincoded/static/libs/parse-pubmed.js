'use strict';
// Derived from:
// https://github.com/standard-analytics/pubmed-schema-org/blob/master/lib/pubmed.js
var _ = require('underscore');
var moment = require('moment');

module.exports.parsePubmed = parsePubmed;

/**
 * see http://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html
 */
function parsePubmed(xml){
    var article = {};
    var doc = new DOMParser().parseFromString(xml, 'text/xml');

    // Get PMID from DOI XML
    var $DOIResult = doc.getElementsByTagName('eSearchResult')[0];
    if($DOIResult) {
        var $PMID = $DOIResult.getElementsByTagName('Id')[0];
        if($PMID) {
            article.pmid = $PMID.textContent;
        }
    }

    var $PubmedArticle = doc.getElementsByTagName('PubmedArticle')[0];
    if($PubmedArticle){
        var publicationData = '';

        // Get the PMID and DOI
        var $PMID = $PubmedArticle.getElementsByTagName('PMID')[0];
        var $DOI = $PubmedArticle.querySelector('[IdType="doi"]')
        if($PMID) {
            article.pmid = $PMID.textContent;
        }
        if($DOI) {
            article.doi = $DOI.textContent;
        }

        // Get the journal name
        var $Journal = $PubmedArticle.getElementsByTagName('Journal')[0];
        if($Journal){
            article.date = pubmedDatePublished($PubmedArticle, $Journal);
            article.journal = pubmedPeriodical($Journal);
        }

        article.authors = pubmedAuthors($PubmedArticle);

        var $ArticleTitle = $PubmedArticle.getElementsByTagName('ArticleTitle')[0];
        if($ArticleTitle){
            article.title = $ArticleTitle.textContent; //remove [] Cf http://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html#articletitle
        }

        var abstracts = pubmedAbstract($PubmedArticle);
        if(abstracts){
            article.abstract = abstracts;
        }

        //issue, volume, periodical, all nested...
        if($Journal){

            var publicationIssue = pubmedPublicationIssue($Journal);
            var publicationVolume = pubmedPublicationVolume($Journal);
            var publicationPgn = '';

            //pages (bibo:pages (bibo:pages <-> schema:pagination) or bibo:pageStart and bibo:pageEnd e.g <Pagination> <MedlinePgn>12-9</MedlinePgn>)
            var $Pagination = $PubmedArticle.getElementsByTagName('Pagination')[0];
            if($Pagination){
                var $MedlinePgn = $Pagination.getElementsByTagName('MedlinePgn')[0];
                if($MedlinePgn){
                    publicationPgn = $MedlinePgn.textContent;
                }
            }
            publicationData = publicationVolume + (publicationIssue ? '(' + publicationIssue + ')' : '')  + (publicationPgn ? ':' + publicationPgn : '');
        }
        if (publicationData) {
            article.date += ';' + publicationData + '.';
        } else {
            article.date += '.';
        }
    }

    return article;
}

function pubmedAuthors($PubmedArticle){
    var authors = [];

    var $AuthorList = $PubmedArticle.getElementsByTagName('AuthorList')[0];
    if($AuthorList){
        var $Authors = $AuthorList.getElementsByTagName('Author');
        for (var i = 0; i < $Authors.length; ++i) {
            var author = '';
            var $CollectiveName = $Authors[i].getElementsByTagName('CollectiveName')[0];
            if ($CollectiveName) {
                author = $CollectiveName.textContent;
            } else {
                var $LastName = $Authors[i].getElementsByTagName('LastName')[0];
                if ($LastName){
                    author = $LastName.textContent;
                }
                var $Initials = $Authors[i].getElementsByTagName('Initials')[0];
                if ($Initials){
                    author += (author ? ' ' : '') + $Initials.textContent;
                }
            }
            authors.push(author);
        }
    } else {
        authors[0] = 'Anonymous';
    }
    return authors;
}

function pubmedDoi($PubmedArticle){
    var $ELocationID = $PubmedArticle.getElementsByTagName('ELocationID');
    if($ELocationID){
        for(var i=0; i<$ELocationID.length; i++){
            if($ELocationID[i].getAttribute('EIdType') === 'doi'){
                var doiValid = $ELocationID[i].getAttribute('ValidYN');
                if(!doiValid || doiValid === 'Y'){
                    return $ELocationID[i].textContent;
                }
            }
        }
    }
}


function pubmedDatePublished($PubmedArticle, $Journal){
    var $PubDate = $Journal.getElementsByTagName('PubDate')[0];
    if($PubDate){
        var day = $PubDate.getElementsByTagName('Day')[0] ? $PubDate.getElementsByTagName('Day')[0].textContent.trim() : null;
        var month = $PubDate.getElementsByTagName('Month')[0] ? $PubDate.getElementsByTagName('Month')[0].textContent.trim() : null;
        var year = $PubDate.getElementsByTagName('Year')[0] ? $PubDate.getElementsByTagName('Year')[0].textContent.trim() : null;
        var pubdate;

        pubdate = parseDate(day, month, year);

        if (!pubdate || pubdate.length < 5) {
            // if PubDate tag is empty, or if only the year available, check to see if the
            // ArticleDate tag exists, and use it for pubdate if it's longer
            var $ArticleDate = $PubmedArticle.getElementsByTagName('ArticleDate')[0] ? $PubmedArticle.getElementsByTagName('ArticleDate')[0] : null;
            if($ArticleDate) {
                day = $ArticleDate.getElementsByTagName('Day')[0] ? $ArticleDate.getElementsByTagName('Day')[0].textContent.trim() : null;
                month = $ArticleDate.getElementsByTagName('Month')[0] ? $ArticleDate.getElementsByTagName('Month')[0].textContent.trim() : null;
                year = $ArticleDate.getElementsByTagName('Year')[0] ? $ArticleDate.getElementsByTagName('Year')[0].textContent.trim() : null;
                pubdate = pubdate && pubdate.length < parseDate(day, month, year).length ? parseDate(day, month, year) : pubdate;
            }
        }
        if (!pubdate) {
            // if we still don't have a valid pubdate, fall back to the MedlineDate info
            var $MedlineDate = $PubDate.getElementsByTagName('MedlineDate')[0];
            if($MedlineDate){
                try {
                    pubdate = $MedlineDate.textContent;
                } catch(e){}
            }
        }
        if (pubdate){
            return pubdate;
        } else {
            return '';
        }
    }
}

function parseDate(day, month, year) {
    // put together the date information for a valid Pubmed-style timestamp
    var pubdate;

    // Remove leading zero from day of month
    if (day) {
        day = day.replace(/^0([1-9])$/, '$1');
    }

    if (month && !isNaN(parseFloat(month)) && isFinite(month)) {
        // if the month is in numeric format, switch it over to short alphabet
        month = parseInt(month);
        var monthToStr = {
            1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
            5: 'May', 6: 'Jun', 7: 'July', 8: 'Aug',
            9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
        };
        if (month in monthToStr) {
            month = monthToStr[month];
        }
    }
    if (year && month && day) {
        pubdate = year + ' ' + month + ' ' + day;
    } else if (year && month) {
        pubdate = year + ' ' + month;
    } else if (year) {
        pubdate = year;
    }
    if (pubdate) {
        return String(pubdate);
    } else {
        return null;
    }
}

function pubmedPublicationIssue($Journal){

    var $issue = $Journal.getElementsByTagName('Issue')[0];
    if($issue){
        return $issue.textContent;
    }
    return '';
}

function pubmedPublicationVolume($Journal){

    var $volume = $Journal.getElementsByTagName('Volume')[0];
    if($volume){
        return $volume.textContent;
    }
    return '';
}

function pubmedPeriodical($Journal){

    var $Title = $Journal.getElementsByTagName('Title')[0];
    if($Title){
        var journalFormatted = $Title.textContent;
        if (journalFormatted.indexOf('.', journalFormatted.length - 1) !== -1) {
            journalFormatted = journalFormatted.substring(0, journalFormatted.length - 1);
        }
        return journalFormatted;
    }
    return '';

}


/**
 * CF http://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html structured abstract.
 * Abstract can be structured
 *e.g http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=19897313&rettype=abstract&retmode=xml
 */

function pubmedAbstract($PubmedArticle){
    var abstractText = '';

    var $Abstracts = $PubmedArticle.getElementsByTagName('Abstract');
    if($Abstracts && $Abstracts.length){

        var $AbstractTexts = $Abstracts[0].getElementsByTagName('AbstractText');
        if($AbstractTexts && $AbstractTexts.length){

            abstractText = $AbstractTexts[0].textContent;

        }

    }
    return abstractText;

}


/**
 * keywords e.g http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=24920540&rettype=abstract&retmode=xml
 * TODO: take advandage of Owner attribute Cf http://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html#Keyword
 */
function pubmedKeywords($PubmedArticle){

    var keywords = [];
    var $KeywordLists = $PubmedArticle.getElementsByTagName('KeywordList');
    if($KeywordLists){
        Array.prototype.forEach.call($KeywordLists, function($KeywordList){
            var $Keywords = $KeywordList.getElementsByTagName('Keyword');
            if($Keywords){
                Array.prototype.forEach.call($Keywords, function($Keyword){
                    keywords.push($Keyword.textContent).toLowerCase();
                });
            }
        });
    }

    if(keywords.length){
        return _.uniq(keywords);
    }

}



/**
 * <Grant> as sourceOrganization (grantId is added TODO fix...)
 */
function pubmedSourceOrganization($PubmedArticle){

    var $GrantList = $PubmedArticle.getElementsByTagName('GrantList')[0];
    var soMap = {}; //re-aggregate grant entries by organizations
    if($GrantList){
        var $Grants = $GrantList.getElementsByTagName('Grant');
        if($Grants){
            Array.prototype.forEach.call($Grants, function($Grant, gid){
                var $Agency = $Grant.getElementsByTagName('Agency')[0];
                var $GrantID = $Grant.getElementsByTagName('GrantID')[0];
                var $Acronym = $Grant.getElementsByTagName('Acronym')[0];
                var $Country = $Grant.getElementsByTagName('Country')[0];

                var name;
                if($Agency){
                    name = $Agency.textContent;
                }

                var key = name || gid.toString();

                if($Agency || $GrantID){
                    var organization = soMap[key] || { '@type': 'Organization' };
                    if(name){
                        organization.name = name;
                    }
                    if($Acronym){
                        organization.alternateName = $Acronym.textContent;
                    }
                    if($GrantID){ //accumulate grantId(s)...
                        var grantId = $GrantID.textContent;
                        if(organization.grantId){
                            organization.grantId.push(grantId);
                        } else {
                            organization.grantId = [grantId];
                        }
                    }
                    if($Country){
                        organization.address = {
                            '@type': 'PostalAddress',
                            'addressCountry': $Country.textContent
                        };
                    }
                    soMap[key] = organization;
                }
            });
        }
    }

    var sourceOrganizations = [];
    Object.keys(soMap).forEach(function(key){
        sourceOrganizations.push(soMap[key]);
    });

    if(sourceOrganizations.length){
        return sourceOrganizations;
    }


}
