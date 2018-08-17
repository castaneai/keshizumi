const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_API_KEY);
const algoliaIndex = algoliaClient.initIndex('keshizumi');
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();

exports.keshizumi = async (data, context) => {
    const pageId = data.attributes.pageId;
    const itemId = data.attributes.itemId;
    const gcsUrl = data.attributes.gcsUrl;
    const publicUrl = data.attributes.publicUrl;
    if (!pageId || !itemId || !gcsUrl || !publicUrl) {
        console.error('invalid pubsubMessage: ', data.attributes);
        return;
    }

    console.log('start keshizumize: ', data.attributes);
    const annotations = await detectAnnotations(gcsUrl);

    const res = await algoliaIndex.addObject({
        annotations: annotations,
        pageId: pageId,
        itemId: itemId,
        gcsUrl: gcsUrl,
        publicUrl: publicUrl,
    });
    console.log('finished keshizumize: ', res);
}

async function detectAnnotations(gcsUrl) {
    const annotations = [];
    const results = await visionClient.textDetection(gcsUrl);
    results.forEach(res => {
        res.textAnnotations.map(tn => {
            return { text: tn.description, bounding: tn.boundingPoly.vertices };
        }).forEach(an => annotations.push(an));
    });
    return annotations;
}
