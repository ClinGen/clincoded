import { external_url_map, getQueryUrl } from "../components/globals";

export const getEnsemblHGVSVEP = (getRestFunc, hgvs_notation) => {
    // fetch ensembl
    const url = getQueryUrl(
        '//' + external_url_map["EnsemblHgvsVEP"] + hgvs_notation,
        [
            ['content-type', 'application/json'],
            ['hgvs', '1'],
            ['protein', '1'],
            ['xref_refseq', '1'],
            ['ExAC', '1'],
            ['MaxEntScan', '1'],
            ['GeneSplicer', '1'],
            ['Conservation', '1'],
            ['numbers', '1'],
            ['domains', '1'],
            ['mane', '1'],
            ['canonical', '1'],
            ['merged', '1'],
        ]
    );

    return getRestFunc(url).then(response => {
        if (Array.isArray(response) && response.length) {
            const ensemblResponse = response[0];

            // we'll patch and mutate the response object

            // filter by hgvsc. If a transcipt has no hgvsc, it means it does not overlap with
            // our queried nucleotide change (hgvs_notation) thus not of our interest
            if (Array.isArray(ensemblResponse.transcript_consequences) && ensemblResponse.transcript_consequences.length) {
                ensemblResponse.transcript_consequences = ensemblResponse.transcript_consequences.filter((transcript) => transcript.hgvsc);
            }
            
            // get all MANE transcripts
            const maneTranscriptGenomicCoordinateSet = new Set();
            for (const transcript of ensemblResponse.transcript_consequences) {
                if (transcript.mane) {
                    maneTranscriptGenomicCoordinateSet.add(transcript.mane);
                }
            }

            // patch transcripts which are MANE but lacking `.mane` property
            for (const transcript of ensemblResponse.transcript_consequences) {
                const [genomicCoordinate,] = transcript.hgvsc.split(':');
                if (genomicCoordinate && maneTranscriptGenomicCoordinateSet.has(genomicCoordinate)) {
                    transcript.mane = genomicCoordinate;
                }
            }
        }

        return response;
    })
}
