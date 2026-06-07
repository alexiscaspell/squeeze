import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {initSqueeze, getSqueezeState} from 'squeeze/squeeze-init.js';
import MonacoPanel from 'squeeze/monaco-panel/MonacoPanel.jsx';
import {SQUEEZE_FULL_LOGO} from '../lib/squeeze-brand.js';

class SqueezeContainer extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            pythonPanelVisible: false,
            spriteCode: {},
            pyodideReady: false,
            pyodideError: null,
            showSplash: false
        };
        this._squeezeState = null;
        this.handleCodeChange = this.handleCodeChange.bind(this);
    }

    componentDidMount () {
        this._squeezeState = initSqueeze(this.props.vm);
        this._onPyodideReady = () => this.setState({pyodideReady: true, showSplash: false, pyodideError: null});
        this._onPyodideError = e => this.setState({
            pyodideError: e.detail?.message || String(e.detail) || 'Pyodide failed',
            showSplash: false
        });
        this._onOpenEditor = () => this.openPythonPanel();
        this._onProjectReset = () => this.setState({spriteCode: {}});
        this._onSpriteCodeLoaded = e => this.setState({spriteCode: {...e.detail}});
        this._onEnsurePyodide = () => this.ensurePyodideReady();
        window.addEventListener('squeeze:pyodide-ready', this._onPyodideReady);
        window.addEventListener('squeeze:ensure-pyodide', this._onEnsurePyodide);
        window.addEventListener('squeeze:pyodide-error', this._onPyodideError);
        window.addEventListener('squeeze:project-reset', this._onProjectReset);
        window.addEventListener('squeeze:sprite-code-loaded', this._onSpriteCodeLoaded);
        this.props.vm.runtime.on('OPEN_PYTHON_EDITOR', this._onOpenEditor);
        window.__squeezeTogglePythonPanel = () => this.togglePythonPanel();
        if (this._squeezeState.pyodideStatus === 'ready') {
            this.setState({pyodideReady: true, showSplash: false});
        } else if (this._squeezeState.pyodideStatus === 'loading') {
            this.setState({showSplash: true});
        }
    }

    componentWillUnmount () {
        window.removeEventListener('squeeze:pyodide-ready', this._onPyodideReady);
        window.removeEventListener('squeeze:pyodide-error', this._onPyodideError);
        window.removeEventListener('squeeze:project-reset', this._onProjectReset);
        window.removeEventListener('squeeze:sprite-code-loaded', this._onSpriteCodeLoaded);
        window.removeEventListener('squeeze:ensure-pyodide', this._onEnsurePyodide);
        this.props.vm.runtime.off('OPEN_PYTHON_EDITOR', this._onOpenEditor);
        delete window.__squeezeTogglePythonPanel;
    }

    openPythonPanel () {
        this.setState({pythonPanelVisible: true});
        this.ensurePyodideReady();
    }

    togglePythonPanel () {
        this.setState(prev => {
            const nextVisible = !prev.pythonPanelVisible;
            if (nextVisible) this.ensurePyodideReady();
            return {pythonPanelVisible: nextVisible};
        });
    }

    ensurePyodideReady () {
        const state = getSqueezeState();
        if (!state || state.pyodideStatus === 'ready' || state.pyodideStatus === 'loading') return;

        state.pyodideStatus = 'loading';
        this.setState({showSplash: true, pyodideError: null});
        state.workerManager.init()
            .then(() => {
                state.pyodideStatus = 'ready';
                window.dispatchEvent(new CustomEvent('squeeze:pyodide-ready'));
            })
            .catch(err => {
                state.pyodideStatus = 'error';
                window.dispatchEvent(new CustomEvent('squeeze:pyodide-error', {detail: err}));
            });
    }

    handleCodeChange (spriteName, code) {
        if (this.state.spriteCode[spriteName] === code) return;
        this.setState(prev => ({
            spriteCode: {...prev.spriteCode, [spriteName]: code}
        }));
        const state = getSqueezeState();
        if (state) state.spriteCode[spriteName] = code;
        if (window.__squeeze) window.__squeeze.setSpriteCode(spriteName, code);
    }

    handleLoadScript (code) {
        const spriteName = this.props.vm.editingTarget?.getName?.() || 'Sprite1';
        this.handleCodeChange(spriteName, code);
    }

    render () {
        const state = getSqueezeState();
        if (!state) return null;

        return (
            <React.Fragment>
                {this.state.showSplash && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 16,
                            right: 16,
                            background: '#1e2d3e',
                            color: '#fff',
                            padding: '10px 14px',
                            borderRadius: 8,
                            zIndex: 600,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                        }}
                    >
                        <img
                            src={SQUEEZE_FULL_LOGO}
                            alt="Squeeze"
                            width={40}
                            height={40}
                            style={{objectFit: 'contain'}}
                        />
                        Loading Python runtime...
                    </div>
                )}
                {this.state.pyodideError && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: 16,
                            right: 16,
                            background: '#5c2b2b',
                            color: '#fff',
                            padding: '8px 14px',
                            borderRadius: 6,
                            zIndex: 600,
                            fontSize: 13,
                            maxWidth: 320
                        }}
                    >
                        Pyodide: {this.state.pyodideError}
                    </div>
                )}
                <MonacoPanel
                    vm={this.props.vm}
                    workerManager={state.workerManager}
                    isVisible={this.state.pythonPanelVisible}
                    onClose={() => this.setState({pythonPanelVisible: false})}
                    spriteCodeStore={this.state.spriteCode}
                    onCodeChange={this.handleCodeChange}
                />
            </React.Fragment>
        );
    }
}

SqueezeContainer.propTypes = {
    vm: PropTypes.instanceOf(VM).isRequired
};

export default SqueezeContainer;
