import {ScratchBlockBuilder} from './ScratchBlockBuilder.js';

const HAT_PATTERNS = [
    {regex: /^#\s*When green flag clicked/i, opcode: 'event_whenflagclicked'},
    {regex: /^#\s*When this sprite clicked/i, opcode: 'event_whenthisspriteclicked'},
    {regex: /^#\s*When (.+) key pressed/i, opcode: 'event_whenkeypressed', field: 'KEY_OPTION', group: 1},
    {regex: /^#\s*When I receive (.+)/i, opcode: 'event_whenbroadcastreceived', field: 'BROADCAST_OPTION', group: 1},
    {regex: /^#\s*When touching (.+)/i, opcode: 'event_whentouchingobject', input: 'TOUCHINGOBJECTMENU', group: 1}
];

function stripQuotes (value) {
    const s = String(value).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        return s.slice(1, -1);
    }
    return s;
}

function splitArgs (argStr) {
    const args = [];
    let current = '';
    let inString = false;
    let quote = '';
    for (let i = 0; i < argStr.length; i++) {
        const c = argStr[i];
        if (!inString && (c === '"' || c === "'")) {
            inString = true;
            quote = c;
            current += c;
        } else if (inString && c === quote && argStr[i - 1] !== '\\') {
            inString = false;
            current += c;
        } else if (!inString && c === ',') {
            args.push(current.trim());
            current = '';
        } else {
            current += c;
        }
    }
    if (current.trim()) args.push(current.trim());
    return args;
}

function isSkippableLine (line) {
    const t = line.trim();
    return !t || (t.startsWith('#') && !parseHat(t));
}

function parseHat (line) {
    const t = line.trim();
    for (const pattern of HAT_PATTERNS) {
        const match = t.match(pattern.regex);
        if (!match) continue;
        if (pattern.field) {
            return {opcode: pattern.opcode, fields: {[pattern.field]: stripQuotes(match[pattern.group])}};
        }
        if (pattern.input) {
            return {opcode: pattern.opcode, menuInput: {name: pattern.input, value: stripQuotes(match[pattern.group])}};
        }
        return {opcode: pattern.opcode, fields: {}};
    }
    return null;
}

export class PythonToBlocks {
    constructor (target) {
        this.target = target;
        this.warnings = [];
    }

    static parse (code, target = null) {
        const parser = new PythonToBlocks(target);
        return parser.parse(code);
    }

    parse (code) {
        this.warnings = [];
        const scripts = this._splitScripts(code);
        const builder = new ScratchBlockBuilder();
        let scriptY = 50;

        scripts.forEach(script => {
            const hatId = this._buildHat(builder, script.hat, scriptY);
            const bodyIds = this._parseBody(builder, script.bodyLines, 0);
            if (bodyIds.length) {
                builder.blocks[hatId].next = bodyIds[0];
                builder.blocks[bodyIds[0]].parent = hatId;
                builder.chain(bodyIds);
            }
            scriptY += 160;
        });

        return {
            ok: true,
            blocks: builder.blocks,
            warnings: this.warnings
        };
    }

    _splitScripts (code) {
        const lines = code.split('\n');
        const scripts = [];
        let current = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const hat = parseHat(trimmed);
            if (hat) {
                if (current) scripts.push(current);
                current = {hat, bodyLines: []};
                continue;
            }

            if (isSkippableLine(line)) continue;

            if (!current) {
                current = {hat: {opcode: 'event_whenflagclicked', fields: {}}, bodyLines: []};
            }
            current.bodyLines.push(line);
        }

        if (current) scripts.push(current);
        if (!scripts.length) {
            scripts.push({hat: {opcode: 'event_whenflagclicked', fields: {}}, bodyLines: []});
        }
        return scripts;
    }

    _buildHat (builder, hat, y) {
        const fields = {};
        Object.entries(hat.fields || {}).forEach(([key, val]) => {
            fields[key] = this._resolveField(key, val);
        });
        const inputs = {};
        if (hat.menuInput) {
            const shadowId = builder.menuShadow(
                'sensing_touchingobjectmenu',
                'TOUCHINGOBJECTMENU',
                hat.menuInput.value
            );
            inputs.TOUCHINGOBJECTMENU = shadowId;
        }
        return builder.command(hat.opcode, fields, inputs, {topLevel: true, x: 50, y});
    }

    _resolveField (fieldName, value) {
        const clean = stripQuotes(value);
        if (fieldName === 'VARIABLE' || fieldName === 'LIST') {
            const id = this._ensureVarId(fieldName, clean);
            return {name: fieldName, value: clean, id};
        }
        if (fieldName === 'BROADCAST_OPTION') {
            const id = this._ensureBroadcastId(clean);
            return {name: fieldName, value: clean, id};
        }
        return clean;
    }

    _ensureVarId (fieldName, name) {
        if (!this.target) return undefined;
        if (fieldName === 'LIST') {
            const list = this.target.lookupOrCreateList(null, name);
            return list?.id;
        }
        const variable = this.target.lookupOrCreateVariable(null, name);
        return variable?.id;
    }

    _ensureBroadcastId (name) {
        if (!this.target) return undefined;
        const stage = this.target.runtime?.getTargetForStage?.() || this.target;
        const variable = stage.lookupBroadcastByInputValue?.(name);
        return variable?.id;
    }

    _parseBody (builder, lines, startIndex, baseIndent = 0) {
        const blockIds = [];
        let i = startIndex;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();
            if (!trimmed || (trimmed.startsWith('#') && !parseHat(trimmed))) {
                i++;
                continue;
            }

            const indent = line.match(/^(\s*)/)[1].length;
            if (indent < baseIndent) break;
            if (indent > baseIndent) {
                i++;
                continue;
            }

            const parsed = this._parseStatement(builder, lines, i, indent);
            if (parsed.blockId) blockIds.push(parsed.blockId);
            i = parsed.nextIndex;
        }

        return blockIds;
    }

    _parseStatement (builder, lines, index, indent) {
        const line = lines[index].trim();

        const ifMatch = line.match(/^if\s+(.+):\s*$/);
        if (ifMatch) {
            return this._parseIfElse(builder, lines, index, indent, ifMatch[1]);
        }

        const forMatch = line.match(/^for\s+_\s+in\s+range\s*\(\s*int\s*\(\s*(.+)\s*\)\s*\)\s*:\s*$/);
        if (forMatch) {
            const timesId = this._valueInput(builder, forMatch[1]);
            const blockId = builder.command('control_repeat', {}, {TIMES: timesId});
            const bodyLines = lines.slice(index + 1);
            const bodyIds = this._parseBody(builder, bodyLines, 0, indent + 4);
            builder.attachSubstack(blockId, 'SUBSTACK', bodyIds);
            return {blockId, nextIndex: index + 1 + this._countBodyLines(lines, index, indent)};
        }

        const whileTrue = line.match(/^while\s+True\s*:\s*$/);
        if (whileTrue) {
            const blockId = builder.command('control_forever', {}, {});
            const bodyIds = this._parseBody(builder, lines.slice(index + 1), 0, indent + 4);
            builder.attachSubstack(blockId, 'SUBSTACK', bodyIds);
            return {blockId, nextIndex: index + 1 + this._countBodyLines(lines, index, indent)};
        }

        const whileNot = line.match(/^while\s+not\s*\(\s*(.+?)\s*\)\s*:\s*$/);
        if (whileNot) {
            const condId = this._boolInput(builder, whileNot[1]);
            const blockId = builder.command('control_repeat_until', {}, {CONDITION: condId});
            const bodyIds = this._parseBody(builder, lines.slice(index + 1), 0, indent + 4);
            builder.attachSubstack(blockId, 'SUBSTACK', bodyIds);
            return {blockId, nextIndex: index + 1 + this._countBodyLines(lines, index, indent)};
        }

        const waitUntilLine = line.match(/^while\s+not\s*\(\s*(.+)\s*\)\s*:\s*sprite\.wait\(0\.01\)\s*$/);
        if (waitUntilLine) {
            const condId = this._boolInput(builder, waitUntilLine[1]);
            return {blockId: builder.command('control_wait_until', {}, {CONDITION: condId}), nextIndex: index + 1};
        }

        const whileMatch = line.match(/^while\s+(.+?)\s*:\s*$/);
        if (whileMatch && !whileTrue) {
            const condId = this._boolInput(builder, whileMatch[1]);
            const blockId = builder.command('control_while', {}, {CONDITION: condId});
            const bodyIds = this._parseBody(builder, lines.slice(index + 1), 0, indent + 4);
            builder.attachSubstack(blockId, 'SUBSTACK', bodyIds);
            return {blockId, nextIndex: index + 1 + this._countBodyLines(lines, index, indent)};
        }

        if (/^break\b/.test(line)) {
            return {blockId: builder.command('control_stop', {STOP_OPTION: 'this script'}, {}), nextIndex: index + 1};
        }

        const call = this._parseCall(line);
        if (call) {
            const blockId = this._callToBlock(builder, call);
            if (blockId) return {blockId, nextIndex: index + 1};
        }

        this.warnings.push(`Could not convert: ${line}`);
        return {blockId: null, nextIndex: index + 1};
    }

    _parseIfElse (builder, lines, index, indent, conditionExpr) {
        const condId = this._boolInput(builder, conditionExpr);
        const bodyLineCount = this._countBodyLines(lines, index, indent);
        const bodyLines = lines.slice(index + 1, index + 1 + bodyLineCount);
        const thenIds = this._parseBody(builder, bodyLines, 0, indent + 4);

        let elseStart = index + 1 + bodyLineCount;
        let elseIds = [];
        if (elseStart < lines.length) {
            const elseLine = lines[elseStart];
            const elseIndent = elseLine.match(/^(\s*)/)[1].length;
            if (elseIndent === indent && /^else\s*:\s*$/.test(elseLine.trim())) {
                const elseBodyCount = this._countBodyLines(lines, elseStart, indent);
                const elseBodyLines = lines.slice(elseStart + 1, elseStart + 1 + elseBodyCount);
                elseIds = this._parseBody(builder, elseBodyLines, 0, indent + 4);
                elseStart += 1 + elseBodyCount;
            } else {
                elseStart = index + 1 + bodyLineCount;
            }
        }

        let blockId;
        if (elseIds.length) {
            blockId = builder.command('control_if_else', {}, {CONDITION: condId});
            builder.attachSubstack(blockId, 'SUBSTACK', thenIds);
            builder.attachSubstack(blockId, 'SUBSTACK2', elseIds);
        } else {
            blockId = builder.command('control_if', {}, {CONDITION: condId});
            builder.attachSubstack(blockId, 'SUBSTACK', thenIds);
        }

        return {blockId, nextIndex: elseStart};
    }

    _countBodyLines (lines, headerIndex, headerIndent) {
        let count = 0;
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed) {
                count++;
                continue;
            }
            const indent = lines[i].match(/^(\s*)/)[1].length;
            if (indent <= headerIndent) break;
            count++;
        }
        return count;
    }

    _parseCall (line) {
        const method = line.match(/^(sprite|stage)\.(\w+)\((.*)\)\s*(?:#.*)?$/);
        if (!method) return null;
        return {
            receiver: method[1],
            name: method[2],
            args: splitArgs(method[3])
        };
    }

    _callToBlock (builder, call) {
        const {receiver, name, args} = call;
        const a = i => args[i] || '0';

        if (receiver === 'sprite') {
            switch (name) {
            case 'move':
                return builder.command('motion_movesteps', {}, {STEPS: this._valueInput(builder, a(0))});
            case 'go_to':
                return builder.command('motion_goto', {}, {TO: this._gotoMenuInput(builder, a(0))});
            case 'go_to_xy':
                return builder.command('motion_gotoxy', {}, {
                    X: this._valueInput(builder, a(0)),
                    Y: this._valueInput(builder, a(1))
                });
            case 'glide_to':
                return builder.command('motion_glideto', {}, {
                    TO: this._gotoMenuInput(builder, a(0)),
                    SECS: this._valueInput(builder, a(1))
                });
            case 'glide_to_xy':
                return builder.command('motion_glidesecstoxy', {}, {
                    X: this._valueInput(builder, a(0)),
                    Y: this._valueInput(builder, a(1)),
                    SECS: this._valueInput(builder, a(2))
                });
            case 'turn_right':
                return builder.command('motion_turnright', {}, {DEGREES: this._valueInput(builder, a(0))});
            case 'turn_left':
                return builder.command('motion_turnleft', {}, {DEGREES: this._valueInput(builder, a(0))});
            case 'point_in_direction':
                return builder.command('motion_pointindirection', {}, {DIRECTION: this._valueInput(builder, a(0))});
            case 'point_towards':
                return builder.command('motion_pointtowards', {}, {TOWARDS: this._towardsMenuInput(builder, a(0))});
            case 'change_x':
                return builder.command('motion_changexby', {}, {DX: this._valueInput(builder, a(0))});
            case 'set_x':
                return builder.command('motion_setx', {}, {X: this._valueInput(builder, a(0))});
            case 'change_y':
                return builder.command('motion_changeyby', {}, {DY: this._valueInput(builder, a(0))});
            case 'set_y':
                return builder.command('motion_sety', {}, {Y: this._valueInput(builder, a(0))});
            case 'if_on_edge_bounce':
                return builder.command('motion_ifonedgebounce', {}, {});
            case 'say':
                return args.length > 1
                    ? builder.command('looks_sayforsecs', {}, {
                        MESSAGE: this._valueInput(builder, a(0)),
                        SECS: this._valueInput(builder, a(1))
                    })
                    : builder.command('looks_say', {}, {MESSAGE: this._valueInput(builder, a(0))});
            case 'think':
                return args.length > 1
                    ? builder.command('looks_thinkforsecs', {}, {
                        MESSAGE: this._valueInput(builder, a(0)),
                        SECS: this._valueInput(builder, a(1))
                    })
                    : builder.command('looks_think', {}, {MESSAGE: this._valueInput(builder, a(0))});
            case 'show':
                return builder.command('looks_show', {}, {});
            case 'hide':
                return builder.command('looks_hide', {}, {});
            case 'set_size':
                return builder.command('looks_setsizeto', {}, {SIZE: this._valueInput(builder, a(0))});
            case 'change_size':
                return builder.command('looks_changesizeby', {}, {CHANGE: this._valueInput(builder, a(0))});
            case 'set_costume':
                return builder.command('looks_switchcostumeto', {}, {COSTUME: this._costumeMenuInput(builder, a(0))});
            case 'next_costume':
                return builder.command('looks_nextcostume', {}, {});
            case 'change_effect':
                return builder.command('looks_changeeffectby', {}, {
                    EFFECT: stripQuotes(a(0)),
                    CHANGE: this._valueInput(builder, a(1))
                });
            case 'set_effect':
                return builder.command('looks_seteffectto', {}, {
                    EFFECT: stripQuotes(a(0)),
                    VALUE: this._valueInput(builder, a(1))
                });
            case 'clear_effects':
                return builder.command('looks_cleargraphiceffects', {}, {});
            case 'go_to_layer':
                return builder.command('looks_gotofrontback', {}, {FRONT_BACK: stripQuotes(a(0))});
            case 'go_layers':
                return builder.command('looks_goforwardbackwardlayers', {}, {NUM: this._valueInput(builder, a(0))});
            case 'play_sound':
                return builder.command('sound_play', {}, {SOUND_MENU: this._soundMenuInput(builder, a(0))});
            case 'stop_all_sounds':
                return builder.command('sound_stopallsounds', {}, {});
            case 'set_volume':
                return builder.command('sound_setvolumeto', {}, {VOLUME: this._valueInput(builder, a(0))});
            case 'change_volume':
                return builder.command('sound_changevolumeby', {}, {VOLUME: this._valueInput(builder, a(0))});
            case 'wait':
                return builder.command('control_wait', {}, {DURATION: this._valueInput(builder, a(0))});
            case 'broadcast':
                return builder.command('event_broadcast', {}, {BROADCAST_INPUT: this._broadcastInput(builder, a(0))});
            case 'create_clone':
                return builder.command('control_create_clone_of', {}, {CLONE_OPTION: this._cloneMenuInput(builder, a(0))});
            case 'delete_clone':
                return builder.command('control_delete_this_clone', {}, {});
            case 'set_var':
                return builder.command('data_setvariableto', {
                    VARIABLE: this._resolveField('VARIABLE', a(0))
                }, {VALUE: this._valueInput(builder, a(1))});
            case 'change_var':
                return builder.command('data_changevariableby', {
                    VARIABLE: this._resolveField('VARIABLE', a(0))
                }, {VALUE: this._valueInput(builder, a(1))});
            case 'list_add':
                return builder.command('data_addtolist', {
                    LIST: this._resolveField('LIST', a(0))
                }, {ITEM: this._valueInput(builder, a(1))});
            case 'list_delete':
                return builder.command('data_deleteoflist', {
                    LIST: this._resolveField('LIST', a(0))
                }, {INDEX: this._valueInput(builder, a(1))});
            case 'list_delete_all':
                return builder.command('data_deletealloflist', {LIST: this._resolveField('LIST', a(0))}, {});
            case 'list_insert':
                return builder.command('data_insertatlist', {
                    LIST: this._resolveField('LIST', a(0))
                }, {
                    INDEX: this._valueInput(builder, a(1)),
                    ITEM: this._valueInput(builder, a(2))
                });
            case 'list_replace':
                return builder.command('data_replaceitemoflist', {
                    LIST: this._resolveField('LIST', a(0))
                }, {
                    INDEX: this._valueInput(builder, a(1)),
                    ITEM: this._valueInput(builder, a(2))
                });
            case 'reset_timer':
                return builder.command('sensing_resettimer', {}, {});
            default:
                return null;
            }
        }

        if (receiver === 'stage') {
            switch (name) {
            case 'set_backdrop':
                return builder.command('looks_switchbackdropto', {}, {BACKDROP: this._backdropMenuInput(builder, a(0))});
            case 'next_backdrop':
                return builder.command('looks_nextbackdrop', {}, {});
            default:
                return null;
            }
        }

        return null;
    }

    _valueInput (builder, expr) {
        const trimmed = expr.trim();
        if (/^["']/.test(trimmed)) return builder.textShadow(stripQuotes(trimmed));
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) return builder.numShadow(trimmed);
        const reporter = this._tryReporterBlock(builder, trimmed);
        if (reporter) return reporter;
        return builder.textShadow(trimmed);
    }

    _boolInput (builder, expr) {
        const reporter = this._tryReporterBlock(builder, expr.trim());
        if (reporter) return reporter;
        return builder.command('operator_equals', {}, {
            OPERAND1: builder.textShadow(expr),
            OPERAND2: builder.textShadow('True')
        });
    }

    _tryReporterBlock (builder, expr) {
        const touching = expr.match(/^sprite\.touching\((.+)\)$/);
        if (touching) {
            const menuId = builder.menuShadow('sensing_touchingobjectmenu', 'TOUCHINGOBJECTMENU', stripQuotes(touching[1]));
            return builder.command('sensing_touchingobject', {}, {TOUCHINGOBJECTMENU: menuId});
        }

        const keyPressed = expr.match(/^sprite\.key_pressed\((.+)\)$/);
        if (keyPressed) {
            return builder.command('sensing_keypressed', {KEY_OPTION: stripQuotes(keyPressed[1])}, {});
        }

        if (expr === 'sprite.mouse_down') return builder.command('sensing_mousedown', {}, {});

        const compare = expr.match(/^\((.+)\)\s*(==|>|<)\s*\((.+)\)$/);
        if (compare) {
            const opMap = {'>': 'operator_gt', '<': 'operator_lt', '==': 'operator_equals'};
            const opcode = opMap[compare[2]];
            return builder.command(opcode, {}, {
                OPERAND1: this._valueInput(builder, compare[1]),
                OPERAND2: this._valueInput(builder, compare[3])
            });
        }

        const logic = expr.match(/^\((.+)\)\s+(and|or)\s+\((.+)\)$/);
        if (logic) {
            const opcode = logic[2] === 'and' ? 'operator_and' : 'operator_or';
            return builder.command(opcode, {}, {
                OPERAND1: this._boolInput(builder, logic[1]),
                OPERAND2: this._boolInput(builder, logic[3])
            });
        }

        const notExpr = expr.match(/^not\s+(.+)$/);
        if (notExpr) {
            return builder.command('operator_not', {}, {OPERAND: this._boolInput(builder, notExpr[1])});
        }

        return null;
    }

    _gotoMenuInput (builder, expr) {
        return builder.menuShadow('motion_goto_menu', 'TO', stripQuotes(expr));
    }

    _towardsMenuInput (builder, expr) {
        return builder.menuShadow('motion_pointtowards_menu', 'TOWARDS', stripQuotes(expr));
    }

    _costumeMenuInput (builder, expr) {
        return builder.menuShadow('looks_costume', 'COSTUME', stripQuotes(expr));
    }

    _backdropMenuInput (builder, expr) {
        return builder.menuShadow('looks_backdrops', 'BACKDROP', stripQuotes(expr));
    }

    _soundMenuInput (builder, expr) {
        return builder.menuShadow('sound_sounds_menu', 'SOUND_MENU', stripQuotes(expr));
    }

    _cloneMenuInput (builder, expr) {
        return builder.menuShadow('control_create_clone_of_menu', 'CLONE_OPTION', stripQuotes(expr));
    }

    _broadcastInput (builder, expr) {
        const name = stripQuotes(expr);
        const field = this._resolveField('BROADCAST_OPTION', name);
        const blockId = builder.id();
        builder.blocks[blockId] = {
            id: blockId,
            opcode: 'event_broadcast_menu',
            fields: {BROADCAST_OPTION: field},
            inputs: {},
            next: null,
            parent: null,
            shadow: true
        };
        return blockId;
    }
}
