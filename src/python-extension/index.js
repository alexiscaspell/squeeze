/* global Scratch */
(function (Scratch) {
    class SqueezeExtension {
        constructor (runtime) {
            this.runtime = runtime;
            this.workerManager = null;
        }

        getInfo () {
            return {
                id: 'squeeze',
                name: 'Python',
                color1: '#3572A5',
                color2: '#2B5C8A',
                color3: '#1E4060',
                blocks: [
                    {
                        opcode: 'runSpritePython',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'run sprite Python'
                    },
                    {
                        opcode: 'runPythonScript',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'run Python script [SCRIPT]',
                        arguments: {
                            SCRIPT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'my_script'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'setPythonVar',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set Python variable [VAR] to [VAL]',
                        arguments: {
                            VAR: {type: Scratch.ArgumentType.STRING, defaultValue: 'x'},
                            VAL: {type: Scratch.ArgumentType.STRING, defaultValue: '0'}
                        }
                    },
                    {
                        opcode: 'getPythonVar',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'Python variable [VAR]',
                        arguments: {
                            VAR: {type: Scratch.ArgumentType.STRING, defaultValue: 'x'}
                        }
                    },
                    '---',
                    {
                        opcode: 'openPythonEditor',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'open Python editor'
                    }
                ]
            };
        }

        _getSpriteCode (spriteName) {
            return window.__squeeze?.getSpriteCode?.(spriteName)
                || this.runtime.squeezeSpriteCode?.[spriteName]
                || '';
        }

        async runSpritePython (args, util) {
            if (!this.workerManager) return;
            const spriteName = util.target.getName();
            const code = this._getSpriteCode(spriteName);
            if (!code.trim()) return;
            window.dispatchEvent(new CustomEvent('squeeze:ensure-pyodide'));
            await this.workerManager.runCode(code, spriteName);
        }

        async runPythonScript (args, util) {
            if (!this.workerManager) return;
            const script = this.runtime.squeezeScripts?.[args.SCRIPT];
            if (!script) return;
            const spriteName = util.target.getName();
            await this.workerManager.runCode(script, spriteName);
        }

        setPythonVar (args) {
            if (!this.workerManager) return;
            this.workerManager.setGlobal(args.VAR, args.VAL);
        }

        async getPythonVar (args) {
            if (!this.workerManager) return 0;
            const value = await this.workerManager.getGlobal(args.VAR);
            return value ?? 0;
        }

        openPythonEditor () {
            this.runtime.emit('OPEN_PYTHON_EDITOR');
        }
    }

    const extension = new SqueezeExtension(Scratch.vm.runtime);
    Scratch.extensions.register(extension);
    window.__squeezeExtension = extension;
})(Scratch);
