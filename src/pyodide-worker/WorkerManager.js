import {createBridgeBuffers} from '../vm-bridge/BridgeProtocol';
import {VMBridge} from '../vm-bridge/VMBridge';

function getWorkerUrl () {
    const root = typeof process !== 'undefined' && process.env && process.env.ROOT;
    const prefix = root || '/';
    return `${prefix}js/pyodide-worker/worker.js`;
}

export class PyodideWorkerManager {
    constructor (scratchVM) {
        this.vm = scratchVM;
        this.buffers = createBridgeBuffers();
        this.vmBridge = new VMBridge(scratchVM, this.buffers);
        this.worker = null;
        this.ready = false;
        this.pendingCallbacks = new Map();
        this.requestCounter = 0;
        this._pollInterval = null;
        this._initPromise = null;
    }

    init () {
        if (this.ready) return Promise.resolve();
        if (this._initPromise) return this._initPromise;

        this._initPromise = this._startWorker()
            .catch(err => {
                this._initPromise = null;
                throw err;
            });

        return this._initPromise;
    }

    _startWorker () {
        if (typeof SharedArrayBuffer === 'undefined') {
            return Promise.reject(
                new Error('SharedArrayBuffer is unavailable. COOP/COEP headers are required.')
            );
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (fn, value) => {
                if (settled) return;
                settled = true;
                fn(value);
            };

            const worker = new Worker(getWorkerUrl());
            this.worker = worker;

            worker.onerror = event => {
                const message = event.message || 'Worker failed to start';
                finish(reject, new Error(message));
            };

            worker.onmessage = event => {
                const {type, requestId, error, value} = event.data;

                if (type === 'ready') {
                    this.ready = true;
                    finish(resolve);
                    return;
                }

                if (type === 'init_error') {
                    finish(reject, new Error(error || 'Pyodide init failed'));
                    return;
                }

                this._handleMessage(event);
            };

            this._startBridgePolling();

            worker.postMessage({
                type: 'init',
                buffers: this.buffers
            });
        });
    }

    _startBridgePolling () {
        if (this._pollInterval) return;
        const flagArray = new Int32Array(this.buffers.flagBuffer);
        this._pollInterval = setInterval(() => {
            if (Atomics.load(flagArray, 0) === 1) {
                this.vmBridge.handlePendingRequest();
            }
        }, 1);
    }

    async runCode (code, spriteName) {
        if (!this.ready) await this.init();
        const requestId = ++this.requestCounter;
        return new Promise((resolve, reject) => {
            this.pendingCallbacks.set(requestId, {resolve, reject});
            this.worker.postMessage({type: 'run', code, spriteName, requestId});
        });
    }

    stop () {
        if (!this.worker) return;
        this.worker.postMessage({type: 'stop'});
        this.worker.terminate();
        this.worker = null;
        this.ready = false;
        this._initPromise = null;
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
        this.init().catch(err => console.error('[Squeeze] Failed to restart worker', err));
    }

    setGlobal (name, value) {
        if (!this.worker) return;
        this.worker.postMessage({type: 'set_global', name, value});
    }

    getGlobal (name) {
        if (!this.worker) return null;
        const requestId = ++this.requestCounter;
        return new Promise(resolve => {
            this.pendingCallbacks.set(requestId, {resolve, reject: resolve});
            this.worker.postMessage({type: 'get_global', name, requestId});
        });
    }

    _handleMessage (event) {
        const {type, requestId, error, value} = event.data;

        if (type === 'bridge_request') {
            this.vmBridge.handlePendingRequest();
            return;
        }

        if (type === 'done' || type === 'error') {
            const cb = this.pendingCallbacks.get(requestId);
            if (cb) {
                if (type === 'done') cb.resolve();
                else cb.reject(new Error(error));
                this.pendingCallbacks.delete(requestId);
            }
            return;
        }

        if (type === 'global_value') {
            const cb = this.pendingCallbacks.get(requestId);
            if (cb) {
                cb.resolve(value);
                this.pendingCallbacks.delete(requestId);
            }
        }
    }
}
