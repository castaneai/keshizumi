const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_API_KEY);
const algoliaIndex = algoliaClient.initIndex('keshizumi');
const vision = require('@google-cloud/vision');
const visionClient = new vision.ImageAnnotatorClient();

exports.keshizumi = async (pubsubMessage, context) => {
    const payload = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString())
    await doKeshizumi(payload).catch(console.error);
}

async function doKeshizumi(payload) {
    if (!validatePayload(payload)) {
        conosle.error('invalid payload: ', payload);
        return;
    }
    console.log('start keshizumize: ', payload);
    const algoliaObject = await createAlgoliaObject(payload);
    const res = await algoliaIndex.addObject(algoliaObject);
    console.log('finished keshizumize (add to algoliasearch): ', res);
}

async function createAlgoliaObject(payload) {
    const annotations = await detectAnnotations(payload.gcsUrl);
    return {
        annotations: annotations,
        ...payload,
    };
}

function validatePayload(payload) {
    if (!payload.name || !payload.gcsUrl || !payload.itemId || !payload.pageNo) {
        return false;
    }
    return true;
}

async function detectAnnotations(gcsUrl) {
    const annotations = [];
    const results = await visionClient.textDetection(gcsUrl);
    results.forEach(res => {
        if (res.error) {
            throw res.error;
        }
        if (res.textAnnotations.length > 0) {
            // ひとつめが画像全体のテキストになってる
            annotations.push(res.textAnnotations[0].description);
        }
    });
    return annotations;
}
