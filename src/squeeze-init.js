import JSZip from 'jszip';
import {PyodideWorkerManager} from './pyodide-worker/WorkerManager.js';
import {ScriptsLibrary} from './scripts-library/ScriptsLibrary.js';
import {injectSqueezeMetadata, extractSqueezeFromProject} from './serialization/SqueezeSerializer.js';
import {syncPythonToBlocks} from './code-generator/sync-python-to-blocks.js';

async function extractSqueezeFromInput (input) {
    try {
        if (typeof input === 'string') {
            return JSON.parse(input).squeeze || null;
        }
        if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
            const zip = await JSZip.loadAsync(input);
            const projectFile = zip.file('project.json');
            if (!projectFile) return null;
            const json = await projectFile.async('string');
            return JSON.parse(json).squeeze || null;
        }
        if (typeof input === 'object' && input !== null) {
            return input.squeeze || null;
        }
    } catch {
        return null;
    }
    return null;
}

function resetSqueezeProjectState (scriptsLibrary, state) {
    state.spriteCode = {};
    scriptsLibrary.vm.runtime.squeezeScripts = {};
    if (window.__squeeze) {
        window.dispatchEvent(new CustomEvent('squeeze:project-reset'));
    }
}

function applySqueezeData (squeeze, scriptsLibrary, state) {
    if (!squeeze) {
        resetSqueezeProjectState(scriptsLibrary, state);
        return;
    }
    if (squeeze.scripts) {
        Object.entries(squeeze.scripts).forEach(([name, code]) => {
            scriptsLibrary.save(name, code);
        });
    }
    if (squeeze.spriteCode) {
        state.spriteCode = {...squeeze.spriteCode};
        window.dispatchEvent(new CustomEvent('squeeze:sprite-code-loaded', {
            detail: state.spriteCode
        }));
    }
}

let squeezeState = null;

export function getSqueezeState () {
    return squeezeState;
}

export function initSqueeze (vm) {
    if (squeezeState) return squeezeState;

    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('debugCompletions')) {
            window.__squeezeDebugCompletions = true;
        }
    }

    const workerManager = new PyodideWorkerManager(vm);
    const scriptsLibrary = new ScriptsLibrary(vm);
    scriptsLibrary.loadAllFromStorage();

    const state = {
        vm,
        workerManager,
        scriptsLibrary,
        spriteCode: {},
        pythonPanelVisible: false,
        pyodideStatus: 'loading'
    };

    // Defer Pyodide download until the user opens the Python panel.
    state.pyodideStatus = 'idle';

    vm.runtime.squeezeSpriteCode = state.spriteCode;

    vm.runtime.on('PROJECT_STOP_ALL', () => {
        if (workerManager.ready) workerManager.stop();
    });

    window.__squeeze = {
        vm,
        workerManager,
        scriptsLibrary,
        get spriteCode () {
            return state.spriteCode;
        },
        getSpriteCode (spriteName) {
            return state.spriteCode[spriteName] || '';
        },
        setSpriteCode (spriteName, code) {
            state.spriteCode[spriteName] = code;
        },
        getSqueezeSaveData () {
            return {
                scripts: scriptsLibrary.getAll(),
                spriteCode: state.spriteCode
            };
        },
        onSpriteCodeLoaded (spriteCodeMap) {
            state.spriteCode = {...spriteCodeMap};
        },
        syncPythonToBlocks (spriteName, code) {
            const python = code ?? state.spriteCode[spriteName] ?? '';
            return syncPythonToBlocks(vm, spriteName, python);
        },
        enableCompletionDebug (enabled = true) {
            window.__squeezeDebugCompletions = enabled;
            return enabled;
        }
    };

    const originalLoadProject = vm.loadProject.bind(vm);
    vm.loadProject = input => extractSqueezeFromInput(input)
        .then(squeeze => originalLoadProject(input)
            .then(result => {
                applySqueezeData(squeeze, scriptsLibrary, state);
                return result;
            }));

    const originalToJSON = vm.toJSON.bind(vm);
    vm.toJSON = () => injectSqueezeMetadata(originalToJSON(), {
        scripts: scriptsLibrary.getAll(),
        spriteCode: state.spriteCode
    });

    if (window.__squeezeExtension) {
        window.__squeezeExtension.workerManager = workerManager;
    }

    vm.extensionManager.loadExtensionURL('/python-extension/index.js')
        .then(() => {
            if (window.__squeezeExtension) {
                window.__squeezeExtension.workerManager = workerManager;
            }
        })
        .catch(err => console.error('[Squeeze] Extension load failed', err));

    squeezeState = state;
    return state;
}
