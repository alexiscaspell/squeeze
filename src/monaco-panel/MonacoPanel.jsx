import React, {useEffect, useState, useRef, useCallback} from 'react';
import {BlocksToPython} from '../code-generator/BlocksToPython.js';
import {syncPythonToBlocks} from '../code-generator/sync-python-to-blocks.js';
import ScriptsLibraryPanel from '../scripts-library/ScriptsLibraryPanel.jsx';
import {getSqueezeState} from '../squeeze-init.js';
import {registerSqueezeCompletions, setCompletionContext} from './monaco-squeeze-completions.js';
import {fixDoubleEventHash, isCompletionDebugEnabled} from './monaco-completion-fix.js';
import styles from './MonacoPanel.css';

const MONACO_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';

let monacoLoadPromise = null;

function loadMonaco () {
    if (window.monaco) return Promise.resolve(window.monaco);
    if (monacoLoadPromise) return monacoLoadPromise;

    monacoLoadPromise = new Promise((resolve, reject) => {
        const configure = () => {
            window.require.config({paths: {vs: MONACO_VS}});
            window.require(['vs/editor/editor.main'], () => {
                resolve(window.monaco);
            }, reject);
        };

        if (window.require) {
            configure();
            return;
        }

        const script = document.createElement('script');
        script.src = `${MONACO_VS}/loader.js`;
        script.onload = configure;
        script.onerror = reject;
        document.body.appendChild(script);
    });

    return monacoLoadPromise;
}

function defaultSpriteCode (spriteName) {
    return [
        `# Python for ${spriteName}`,
        '# Write your code here. Use the "run sprite Python" block to execute.',
        '',
        `sprite = get_sprite("${spriteName}")`,
        ''
    ].join('\n');
}

const MonacoPanel = ({
    vm,
    workerManager,
    isVisible,
    onClose,
    spriteCodeStore,
    onCodeChange
}) => {
    const [code, setCode] = useState('');
    const [activeSprite, setActiveSprite] = useState('Sprite1');
    const [pyodideReady, setPyodideReady] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const suppressEditorChangeRef = useRef(false);
    const suppressBlockSyncRef = useRef(false);
    const syncTimerRef = useRef(null);
    const lastSyncedCodeRef = useRef('');
    const spriteCodeStoreRef = useRef(spriteCodeStore);
    const activeSpriteRef = useRef(activeSprite);
    const onCodeChangeRef = useRef(onCodeChange);
    spriteCodeStoreRef.current = spriteCodeStore;
    activeSpriteRef.current = activeSprite;
    onCodeChangeRef.current = onCodeChange;

    const applyEditorCode = useCallback((nextCode, persist = true) => {
        suppressEditorChangeRef.current = true;
        setCode(nextCode);
        if (editorRef.current && editorRef.current.getValue() !== nextCode) {
            editorRef.current.setValue(nextCode);
        }
        suppressEditorChangeRef.current = false;
        if (persist && onCodeChangeRef.current) {
            onCodeChangeRef.current(activeSpriteRef.current, nextCode);
        }
    }, []);

    const runBlockSync = useCallback((pythonCode, spriteName) => {
        if (!vm || suppressBlockSyncRef.current) return;
        if (!pythonCode.trim()) return;
        if (pythonCode === lastSyncedCodeRef.current) return;

        const result = syncPythonToBlocks(vm, spriteName, pythonCode);
        if (!result.ok) {
            setSyncStatus(result.error || 'Could not sync to blocks');
            return;
        }

        lastSyncedCodeRef.current = pythonCode;
        if (result.warnings?.length) {
            setSyncStatus(`${result.warnings.length} line(s) could not be converted to blocks`);
        } else {
            setSyncStatus('Synced to blocks');
        }
    }, [vm]);

    const scheduleBlockSync = useCallback((pythonCode, spriteName) => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            runBlockSync(pythonCode, spriteName);
        }, 1200);
    }, [runBlockSync]);

    useEffect(() => {
        if (!workerManager) return undefined;
        if (workerManager.ready) {
            setPyodideReady(true);
            return undefined;
        }
        const onReady = () => setPyodideReady(true);
        window.addEventListener('squeeze:pyodide-ready', onReady);
        return () => window.removeEventListener('squeeze:pyodide-ready', onReady);
    }, [workerManager]);

    useEffect(() => {
        const onTargetChange = () => {
            const target = vm.editingTarget;
            if (target && !target.isStage) {
                setActiveSprite(target.getName());
            }
        };
        vm.on('targetsUpdate', onTargetChange);
        onTargetChange();
        return () => vm.off('targetsUpdate', onTargetChange);
    }, [vm]);

    useEffect(() => {
        setCompletionContext(() => ({
            vm,
            spriteName: activeSpriteRef.current
        }));
    }, [vm, activeSprite]);

    // Load code when the panel opens or the active sprite changes — not on every keystroke.
    useEffect(() => {
        if (!isVisible) return;

        const stored = spriteCodeStoreRef.current?.[activeSprite];
        const nextCode = stored || defaultSpriteCode(activeSprite);
        lastSyncedCodeRef.current = '';
        applyEditorCode(nextCode, !stored);
    }, [activeSprite, isVisible, applyEditorCode]);

    useEffect(() => {
        const onProjectCodeLoaded = e => {
            if (!isVisible) return;
            const stored = e.detail?.[activeSpriteRef.current];
            if (stored) applyEditorCode(stored, false);
        };
        window.addEventListener('squeeze:sprite-code-loaded', onProjectCodeLoaded);
        return () => window.removeEventListener('squeeze:sprite-code-loaded', onProjectCodeLoaded);
    }, [isVisible, applyEditorCode]);

    useEffect(() => {
        if (!isVisible || !containerRef.current) return undefined;

        let disposed = false;
        loadMonaco()
            .then(monaco => {
                if (disposed || editorRef.current) return;
                registerSqueezeCompletions(monaco);
                setCompletionContext(() => ({
                    vm,
                    spriteName: activeSpriteRef.current
                }));
                editorRef.current = monaco.editor.create(containerRef.current, {
                    value: code,
                    language: 'python',
                    theme: 'vs-dark',
                    fontSize: 13,
                    minimap: {enabled: false},
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 4,
                    automaticLayout: true,
                    quickSuggestions: {other: true, comments: true, strings: true},
                    suggestOnTriggerCharacters: true,
                    tabCompletion: 'on',
                    parameterHints: {enabled: true},
                    suggest: {
                        showMethods: true,
                        showFunctions: true,
                        showConstructors: true,
                        showFields: true,
                        showVariables: true,
                        showClasses: true,
                        showStructs: true,
                        showInterfaces: true,
                        showModules: true,
                        showProperties: true,
                        showEvents: true,
                        showOperators: true,
                        showUnits: true,
                        showValues: true,
                        showConstants: true,
                        showEnums: true,
                        showSnippets: true
                    }
                });
                editorRef.current.onDidChangeModelContent(e => {
                    if (suppressEditorChangeRef.current) return;
                    const editor = editorRef.current;
                    const value = editor.getValue();
                    setCode(value);
                    if (onCodeChangeRef.current) {
                        onCodeChangeRef.current(activeSpriteRef.current, value);
                    }
                    scheduleBlockSync(value, activeSpriteRef.current);

                    const fixedHash = fixDoubleEventHash(editor, monaco);
                    if (fixedHash) {
                        suppressEditorChangeRef.current = true;
                        const fixedValue = editor.getValue();
                        setCode(fixedValue);
                        if (onCodeChangeRef.current) {
                            onCodeChangeRef.current(activeSpriteRef.current, fixedValue);
                        }
                        suppressEditorChangeRef.current = false;
                    }

                    const typedHash = e.changes.some(
                        change => typeof change.text === 'string' && change.text.includes('#')
                    );
                    if (typedHash) {
                        setTimeout(() => {
                            editor.trigger('squeeze', 'editor.action.hideSuggestWidget', {});
                            setTimeout(() => {
                                editor.trigger('squeeze', 'editor.action.triggerSuggest', {});
                            }, 20);
                        }, 0);
                    }
                });
                setEditorReady(true);
            })
            .catch(err => console.error('[Squeeze] Monaco load failed', err));

        return () => {
            disposed = true;
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
            setEditorReady(false);
        };
    }, [isVisible, scheduleBlockSync]);

    const handleImportFromBlocks = () => {
        const target = vm.runtime.targets.find(t => t.getName() === activeSprite);
        if (!target) return;

        const generator = new BlocksToPython(vm);
        const generated = generator.generate(target).trim();
        const imported = generated
            ? [
                `# Imported from blocks for ${activeSprite}`,
                '',
                generated
            ].join('\n')
            : defaultSpriteCode(activeSprite);

        suppressBlockSyncRef.current = true;
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        applyEditorCode(imported, true);
        lastSyncedCodeRef.current = imported;
        setSyncStatus('Imported from blocks');
        setTimeout(() => {
            suppressBlockSyncRef.current = false;
        }, 1500);
    };

    const handleSyncToBlocks = () => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        const value = editorRef.current?.getValue() || code;
        runBlockSync(value, activeSprite);
    };

    if (!isVisible) return null;

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <span className={styles.title}>
                        Python — {activeSprite}
                    </span>
                    <span className={styles.hint}>
                        Type sprite. or # for suggestions · syncs to blocks
                    </span>
                </div>
                <div className={styles.controls}>
                    <button
                        type="button"
                        onClick={handleSyncToBlocks}
                        className={styles.syncBtn}
                        title="Update this sprite's blocks from Python now"
                    >
                        Sync to blocks
                    </button>
                    <button
                        type="button"
                        onClick={handleImportFromBlocks}
                        className={styles.importBtn}
                        title="Replace Python with code generated from blocks"
                    >
                        Import from blocks
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.closeBtn}
                    >
                        Close
                    </button>
                </div>
            </div>
            {syncStatus && (
                <div className={styles.syncStatus}>{syncStatus}</div>
            )}
            {isCompletionDebugEnabled() && (
                <div className={styles.syncStatus}>
                    Completion debug on — open browser console, type #, pick an event
                </div>
            )}
            {!pyodideReady && (
                <div className={styles.loading}>
                    Python runtime loads when you first open this panel or run a Python block.
                </div>
            )}
            {!editorReady && (
                <div className={styles.loading}>Loading editor...</div>
            )}
            <div
                ref={containerRef}
                className={styles.editor}
            />
            <ScriptsLibraryPanel
                scriptsLibrary={getSqueezeState()?.scriptsLibrary}
                currentCode={code}
                onLoadScript={loaded => applyEditorCode(loaded, true)}
            />
        </div>
    );
};

export default MonacoPanel;
