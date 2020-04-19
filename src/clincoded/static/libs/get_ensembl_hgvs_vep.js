import { external_url_map } from "../components/globals";

export const getEnsemblHGVSVEP = (getRestFunc, hgvs_notation) => {
    // TODO: fetch emsembl
    let request_params =
    "?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&ExAC=1&MaxEntScan=1&GeneSplicer=1&Conservation=1&numbers=1&domains=1&mane=1&canonical=1&merged=1";

    return getRestFunc(
        '//' +
            external_url_map["EnsemblHgvsVEP"] +
            hgvs_notation +
            request_params
    ).then(response => {
        if (Array.isArray(response) && response.length) {
            const ensemblResponse = response[0];

            if (Array.isArray(ensemblResponse.transcript_consequences) && ensemblResponse.transcript_consequences.length) {
                // TODO: filter hgvsc
                ensemblResponse.transcript_consequences = ensemblResponse.transcript_consequences.filter((transcript) => !!transcript.hgvsc);
            }
            
            // TODO: patch mane

            // get all mane
            const maneTranscriptGenomicCoordinateSet = new Set();
            for (const transcript of ensemblResponse.transcript_consequences) {
                if (transcript.mane) {
                    maneTranscriptGenomicCoordinateSet.add(transcript.mane);
                }
            }

            // patch mane
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
