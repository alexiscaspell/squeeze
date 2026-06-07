import {
    encodeBridgeRequest,
    decodeBridgeResult,
    BridgeFlags
} from '../vm-bridge/BridgeProtocol';

export function createWorkerBridge (buffers) {
    const callArray = new Uint8Array(buffers.callBuffer);
    const resultArray = new Uint8Array(buffers.resultBuffer);
    const flagArray = new Int32Array(buffers.flagBuffer);

    const request = (action, spriteName, args) => {
        encodeBridgeRequest(callArray, action, spriteName, args);
        Atomics.store(flagArray, 0, BridgeFlags.REQUEST);
        Atomics.notify(flagArray, 0);
        self.postMessage({type: 'bridge_request'});
        while (Atomics.load(flagArray, 0) !== BridgeFlags.RESPONSE) {
            Atomics.wait(flagArray, 0, BridgeFlags.REQUEST);
        }
        Atomics.store(flagArray, 0, BridgeFlags.IDLE);
        return decodeBridgeResult(resultArray);
    };

    return {
        call: (action, spriteName, ...args) => {
            request('call', spriteName, [action, ...args]);
        },
        get: (prop, spriteName, ...args) => request('get', spriteName, [prop, ...args]),
        get_var: (spriteName, name) => request('get_var', spriteName, [name]),
        set_var: (spriteName, name, val) => request('set_var', spriteName, [name, val]),
        change_var: (spriteName, name, delta) => request('change_var', spriteName, [name, delta])
    };
}
