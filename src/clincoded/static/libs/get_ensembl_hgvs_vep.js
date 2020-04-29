import { external_url_map, getQueryUrl } from "../components/globals";

export const getEnsemblHGVSVEP = (getRestFunc, hgvs_notation) => {
    // fetch ensembl
    const url = getQueryUrl(
        '//' + external_url_map["EnsemblHgvsVEP"] + hgvs_notation,
        [
            { key: 'content-type', value: 'application/json' },
            { key: 'hgvs', value: '1' },
            { key: 'protein', value: '1' },
            { key: 'xref_refseq', value: '1' },
            { key: 'ExAC', value: '1' },
            { key: 'MaxEntScan', value: '1' },
            { key: 'GeneSplicer', value: '1' },
            { key: 'Conservation', value: '1' },
            { key: 'numbers', value: '1' },
            { key: 'domains', value: '1' },
            { key: 'mane', value: '1' },
            { key: 'canonical', value: '1' },
            { key: 'merged', value: '1' },
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
