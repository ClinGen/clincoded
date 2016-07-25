// # Primary Transcript Helper: Setter Method
// # Parameters: data or response object
// # Usage: setPrimaryTranscript(data)
// # Dependency: Ensembl HGVS VEP API response

'use strict';

export function setPrimaryTranscript(data) {
    let transcripts = data[0].transcript_consequences;
    let primaryTranscript = {};

    // Filter transcripts with 'canonical', 'source' and 'hgvsc' flags
    transcripts.forEach(transcript => {
        if (transcript.canonical && transcript.canonical === 1) {
            if (transcript.source === 'RefSeq' && transcript.hgvsc) {
                primaryTranscript = transcript;
            }
        }
    });

    return primaryTranscript;
}
