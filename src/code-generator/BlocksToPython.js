import {SCRATCH_OPCODE_COVERAGE} from './scratch-opcode-coverage.js';

export class BlocksToPython {
    constructor (vm) {
        this.vm = vm;
    }

    generate (target) {
        const blocks = target.blocks;
        const scripts = blocks.getScripts();
        const lines = [];

        for (const scriptId of scripts) {
            lines.push(...this._generateScript(blocks, scriptId));
            lines.push('');
        }

        return lines.join('\n');
    }

    _generateScript (blocks, blockId, indent = 0, visited = null) {
        const lines = [];
        let current = blockId;
        const seen = visited || new Set();

        while (current) {
            if (seen.has(current)) break;
            seen.add(current);

            const block = blocks.getBlock(current);
            if (!block) break;

            const line = this._generateBlock(blocks, block, indent, seen);
            if (line !== null) lines.push(...line);

            current = block.next;
        }

        return lines;
    }

    _shadowValue (shadow) {
        if (!shadow) return null;
        if (shadow.opcode === 'math_number') return shadow.fields.NUM?.value ?? '0';
        if (shadow.opcode === 'math_integer') return shadow.fields.NUM?.value ?? '0';
        if (shadow.opcode === 'math_whole_number') return shadow.fields.NUM?.value ?? '0';
        if (shadow.opcode === 'math_positive_number') return shadow.fields.NUM?.value ?? '0';
        if (shadow.opcode === 'text') return `"${shadow.fields.TEXT?.value ?? ''}"`;
        for (const field of Object.values(shadow.fields || {})) {
            if (field && typeof field.value === 'string') {
                return `"${field.value}"`;
            }
        }
        return null;
    }

    _generateBlock (blocks, block, indent, visited = null) {
        const pad = '    '.repeat(indent);
        const op = block.opcode;
        const seen = visited || new Set();

        const input = name => {
            const inp = block.inputs[name];
            if (!inp) return 'None';
            const shadow = blocks.getBlock(inp.block);
            const direct = this._shadowValue(shadow);
            if (direct !== null) return direct;
            if (!shadow) return 'None';
            if (seen.has(shadow.id)) return 'None';
            const generated = this._generateBlock(blocks, shadow, 0, seen);
            if (!generated?.length) return 'None';
            return generated[generated.length - 1].trim();
        };

        const field = name => {
            const val = block.fields[name]?.value;
            if (val === undefined || val === null) return '""';
            return `"${val}"`;
        };

        const unsupported = () => {
            const status = SCRATCH_OPCODE_COVERAGE[op];
            if (status === 'unsupported') {
                return [`${pad}# [${op}] not supported in Python mode`];
            }
            return [`${pad}# [${op}] partial support — may need manual Python`];
        };

        switch (op) {
        case 'event_whenflagclicked':
            return [`${pad}# When green flag clicked`];
        case 'event_whenkeypressed':
            return [`${pad}# When ${field('KEY_OPTION')} key pressed`];
        case 'event_whenthisspriteclicked':
            return [`${pad}# When this sprite clicked`];
        case 'event_whenbroadcastreceived':
            return [`${pad}# When I receive ${field('BROADCAST_OPTION')}`];
        case 'event_whentouchingobject':
            return [`${pad}# When touching ${input('TOUCHINGOBJECTMENU')}`];
        case 'event_whengreaterthan':
            return [`${pad}# When ${field('WHENGREATERTHANMENU')} > ${input('VALUE')}`];
        case 'event_broadcast':
            return [`${pad}sprite.broadcast(${input('BROADCAST_INPUT')})`];
        case 'event_broadcastandwait':
            return [`${pad}sprite.broadcast(${input('BROADCAST_INPUT')})  # and wait: partial`];

        case 'motion_movesteps':
            return [`${pad}sprite.move(${input('STEPS')})`];
        case 'motion_goto':
            return [`${pad}sprite.go_to(${input('TO')})`];
        case 'motion_gotoxy':
            return [`${pad}sprite.go_to_xy(${input('X')}, ${input('Y')})`];
        case 'motion_glideto':
            return [`${pad}sprite.glide_to(${input('TO')}, ${input('SECS')})`];
        case 'motion_glidesecstoxy':
            return [`${pad}sprite.glide_to_xy(${input('X')}, ${input('Y')}, ${input('SECS')})`];
        case 'motion_turnright':
            return [`${pad}sprite.turn_right(${input('DEGREES')})`];
        case 'motion_turnleft':
            return [`${pad}sprite.turn_left(${input('DEGREES')})`];
        case 'motion_pointindirection':
            return [`${pad}sprite.point_in_direction(${input('DIRECTION')})`];
        case 'motion_pointtowards':
            return [`${pad}sprite.point_towards(${input('TOWARDS')})`];
        case 'motion_changexby':
            return [`${pad}sprite.change_x(${input('DX')})`];
        case 'motion_setx':
            return [`${pad}sprite.set_x(${input('X')})`];
        case 'motion_changeyby':
            return [`${pad}sprite.change_y(${input('DY')})`];
        case 'motion_sety':
            return [`${pad}sprite.set_y(${input('Y')})`];
        case 'motion_ifonedgebounce':
            return [`${pad}sprite.if_on_edge_bounce()`];
        case 'motion_setrotationstyle':
            return [`${pad}# set rotation style ${field('STYLE')} — partial`];
        case 'motion_xposition':
            return [`sprite.x`];
        case 'motion_yposition':
            return [`sprite.y`];
        case 'motion_direction':
            return [`sprite.direction`];

        case 'looks_sayforsecs':
            return [`${pad}sprite.say(${input('MESSAGE')}, ${input('SECS')})`];
        case 'looks_say':
            return [`${pad}sprite.say(${input('MESSAGE')})`];
        case 'looks_thinkforsecs':
            return [`${pad}sprite.think(${input('MESSAGE')}, ${input('SECS')})`];
        case 'looks_think':
            return [`${pad}sprite.think(${input('MESSAGE')})`];
        case 'looks_show':
            return [`${pad}sprite.show()`];
        case 'looks_hide':
            return [`${pad}sprite.hide()`];
        case 'looks_setsizeto':
            return [`${pad}sprite.set_size(${input('SIZE')})`];
        case 'looks_changesizeby':
            return [`${pad}sprite.change_size(${input('CHANGE')})`];
        case 'looks_switchcostumeto':
            return [`${pad}sprite.set_costume(${input('COSTUME')})`];
        case 'looks_nextcostume':
            return [`${pad}sprite.next_costume()`];
        case 'looks_switchbackdropto':
            return [`${pad}stage.set_backdrop(${input('BACKDROP')})`];
        case 'looks_switchbackdroptoandwait':
            return [`${pad}stage.set_backdrop(${input('BACKDROP')})  # and wait: partial`];
        case 'looks_nextbackdrop':
            return [`${pad}stage.next_backdrop()`];
        case 'looks_changeeffectby':
            return [`${pad}sprite.change_effect(${field('EFFECT')}, ${input('CHANGE')})`];
        case 'looks_seteffectto':
            return [`${pad}sprite.set_effect(${field('EFFECT')}, ${input('VALUE')})`];
        case 'looks_cleargraphiceffects':
            return [`${pad}sprite.clear_effects()`];
        case 'looks_gotofrontback':
            return [`${pad}sprite.go_to_layer(${field('FRONT_BACK')})`];
        case 'looks_goforwardbackwardlayers':
            return [`${pad}sprite.go_layers(${input('NUM')})`];
        case 'looks_size':
            return [`sprite.size`];

        case 'sound_play':
            return [`${pad}sprite.play_sound(${input('SOUND_MENU')})`];
        case 'sound_playuntildone':
            return [`${pad}sprite.play_sound(${input('SOUND_MENU')})  # until done: partial`];
        case 'sound_stopallsounds':
            return [`${pad}sprite.stop_all_sounds()`];
        case 'sound_setvolumeto':
            return [`${pad}sprite.set_volume(${input('VOLUME')})`];
        case 'sound_changevolumeby':
            return [`${pad}sprite.change_volume(${input('VOLUME')})`];
        case 'sound_volume':
            return [`sprite.volume`];

        case 'control_wait':
            return [`${pad}sprite.wait(${input('DURATION')})`];
        case 'control_repeat': {
            const body = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            return [`${pad}for _ in range(int(${input('TIMES')})):`, ...body];
        }
        case 'control_forever': {
            const body = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            return [`${pad}while True:`, ...body];
        }
        case 'control_repeat_until': {
            const cond = input('CONDITION');
            const body = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            return [`${pad}while not (${cond}):`, ...body];
        }
        case 'control_while': {
            const cond = input('CONDITION');
            const body = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            return [`${pad}while ${cond}:`, ...body];
        }
        case 'control_wait_until':
            return [`${pad}while not (${input('CONDITION')}): sprite.wait(0.01)`];
        case 'control_if': {
            const cond = input('CONDITION');
            const body = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            return [`${pad}if ${cond}:`, ...body];
        }
        case 'control_if_else': {
            const cond = input('CONDITION');
            const body1 = this._generateScript(blocks, block.inputs.SUBSTACK?.block, indent + 1, seen);
            const body2 = this._generateScript(blocks, block.inputs.SUBSTACK2?.block, indent + 1, seen);
            return [`${pad}if ${cond}:`, ...body1, `${pad}else:`, ...body2];
        }
        case 'control_stop':
            return [`${pad}break  # stop ${field('STOP_OPTION')}`];
        case 'control_create_clone_of':
            return [`${pad}sprite.create_clone(${input('CLONE_OPTION')})`];
        case 'control_delete_this_clone':
            return [`${pad}sprite.delete_clone()`];

        case 'operator_add': return [`(${input('NUM1')} + ${input('NUM2')})`];
        case 'operator_subtract': return [`(${input('NUM1')} - ${input('NUM2')})`];
        case 'operator_multiply': return [`(${input('NUM1')} * ${input('NUM2')})`];
        case 'operator_divide': return [`(${input('NUM1')} / ${input('NUM2')})`];
        case 'operator_mod': return [`(${input('NUM1')} % ${input('NUM2')})`];
        case 'operator_random': return [`__import__('random').randint(int(${input('FROM')}), int(${input('TO')}))`];
        case 'operator_round': return [`round(${input('NUM')})`];
        case 'operator_mathop': return [`__import__('math').${field('OPERATOR').replace(/"/g, '')}(${input('NUM')})`];
        case 'operator_letter_of': return [`str(${input('STRING')})[int(${input('LETTER')}) - 1]`];
        case 'operator_gt': return [`(${input('OPERAND1')} > ${input('OPERAND2')})`];
        case 'operator_lt': return [`(${input('OPERAND1')} < ${input('OPERAND2')})`];
        case 'operator_equals': return [`(${input('OPERAND1')} == ${input('OPERAND2')})`];
        case 'operator_and': return [`(${input('OPERAND1')} and ${input('OPERAND2')})`];
        case 'operator_or': return [`(${input('OPERAND1')} or ${input('OPERAND2')})`];
        case 'operator_not': return [`(not ${input('OPERAND')})`];
        case 'operator_join': return [`(str(${input('STRING1')}) + str(${input('STRING2')}))`];
        case 'operator_length': return [`len(str(${input('STRING')}))`];
        case 'operator_contains': return [`(str(${input('STRING2')}) in str(${input('STRING1')}))`];

        case 'sensing_touchingobject':
            return [`sprite.touching(${input('TOUCHINGOBJECTMENU')})`];
        case 'sensing_touchingcolor':
            return [`# touching color ${input('COLOR')} — partial`];
        case 'sensing_distanceto':
            return [`sprite.distance_to(${input('DISTANCETOMENU')})`];
        case 'sensing_keypressed':
            return [`sprite.key_pressed(${field('KEY_OPTION')})`];
        case 'sensing_mousedown':
            return [`sprite.mouse_down`];
        case 'sensing_mousex':
            return [`sprite.mouse_x`];
        case 'sensing_mousey':
            return [`sprite.mouse_y`];
        case 'sensing_timer':
            return [`sprite.timer`];
        case 'sensing_resettimer':
            return [`${pad}sprite.reset_timer()`];
        case 'sensing_answer':
            return [`sprite.answer`];
        case 'sensing_askandwait':
            return [`${pad}# ask ${input('QUESTION')} and wait — partial`];
        case 'sensing_dayssince2000':
            return [`sprite.days_since_2000`];

        case 'data_setvariableto':
            return [`${pad}sprite.set_var(${field('VARIABLE')}, ${input('VALUE')})`];
        case 'data_changevariableby':
            return [`${pad}sprite.change_var(${field('VARIABLE')}, ${input('VALUE')})`];
        case 'data_variable':
            return [`sprite.get_var(${field('VARIABLE')})`];
        case 'data_addtolist':
            return [`${pad}sprite.list_add(${field('LIST')}, ${input('ITEM')})`];
        case 'data_deleteoflist':
            return [`${pad}sprite.list_delete(${field('LIST')}, ${input('INDEX')})`];
        case 'data_deletealloflist':
            return [`${pad}sprite.list_delete_all(${field('LIST')})`];
        case 'data_insertatlist':
            return [`${pad}sprite.list_insert(${field('LIST')}, ${input('INDEX')}, ${input('ITEM')})`];
        case 'data_replaceitemoflist':
            return [`${pad}sprite.list_replace(${field('LIST')}, ${input('INDEX')}, ${input('ITEM')})`];
        case 'data_itemoflist':
            return [`sprite.list_item(${field('LIST')}, ${input('INDEX')})`];
        case 'data_lengthoflist':
            return [`sprite.list_length(${field('LIST')})`];
        case 'data_listcontainsitem':
            return [`sprite.list_contains(${field('LIST')}, ${input('ITEM')})`];
        case 'data_listcontents':
            return [`sprite.list_contents(${field('LIST')})`];

        default:
            return unsupported();
        }
    }
}
