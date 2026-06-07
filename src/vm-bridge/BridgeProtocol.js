const CALL_BUFFER_SIZE = 4096;
const RESULT_BUFFER_SIZE = 4096;

const FLAG_IDLE = 0;
const FLAG_REQUEST = 1;
const FLAG_RESPONSE = 2;

export function createBridgeBuffers () {
    return {
        callBuffer: new SharedArrayBuffer(CALL_BUFFER_SIZE),
        resultBuffer: new SharedArrayBuffer(RESULT_BUFFER_SIZE),
        flagBuffer: new SharedArrayBuffer(4)
    };
}

export function encodeBridgeRequest (callArray, action, spriteName, args) {
    const payload = JSON.stringify({action, spriteName, args});
    const encoded = new TextEncoder().encode(payload);
    if (encoded.length > callArray.length - 4) {
        throw new Error('Bridge request too large');
    }
    callArray[0] = (encoded.length >> 24) & 0xff;
    callArray[1] = (encoded.length >> 16) & 0xff;
    callArray[2] = (encoded.length >> 8) & 0xff;
    callArray[3] = encoded.length & 0xff;
    callArray.set(encoded, 4);
}

export function decodeBridgeRequest (callArray) {
    const length = (callArray[0] << 24) | (callArray[1] << 16) | (callArray[2] << 8) | callArray[3];
    const payload = new TextDecoder().decode(callArray.subarray(4, 4 + length));
    return JSON.parse(payload);
}

export function encodeBridgeResult (resultArray, value) {
    const payload = JSON.stringify({value});
    const encoded = new TextEncoder().encode(payload);
    if (encoded.length > resultArray.length - 4) {
        throw new Error('Bridge result too large');
    }
    resultArray[0] = (encoded.length >> 24) & 0xff;
    resultArray[1] = (encoded.length >> 16) & 0xff;
    resultArray[2] = (encoded.length >> 8) & 0xff;
    resultArray[3] = encoded.length & 0xff;
    resultArray.set(encoded, 4);
}

export function decodeBridgeResult (resultArray) {
    const length = (resultArray[0] << 24) | (resultArray[1] << 16) | (resultArray[2] << 8) | resultArray[3];
    const payload = new TextDecoder().decode(resultArray.subarray(4, 4 + length));
    return JSON.parse(payload).value;
}

export const BridgeFlags = {
    IDLE: FLAG_IDLE,
    REQUEST: FLAG_REQUEST,
    RESPONSE: FLAG_RESPONSE
};
