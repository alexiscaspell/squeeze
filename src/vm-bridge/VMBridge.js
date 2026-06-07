import {encodeBridgeResult, decodeBridgeRequest, BridgeFlags} from './BridgeProtocol';

const LIST_TYPE = 'list';

export class VMBridge {
    constructor (scratchVM, buffers) {
        this.vm = scratchVM;
        this.callBuffer = buffers.callBuffer;
        this.resultBuffer = buffers.resultBuffer;
        this.flagBuffer = buffers.flagBuffer;
        this.callArray = new Uint8Array(this.callBuffer);
        this.resultArray = new Uint8Array(this.resultBuffer);
        this.flagArray = new Int32Array(this.flagBuffer);
    }

    handlePendingRequest () {
        const request = decodeBridgeRequest(this.callArray);
        let result = null;

        if (request.action === 'call') {
            this.call(request.spriteName, request.args[0], ...request.args.slice(1));
        } else if (request.action === 'get') {
            result = this.get(request.args[0], request.spriteName, ...request.args.slice(1));
        } else if (request.action === 'get_var') {
            result = this.getVar(request.spriteName, request.args[0]);
        } else if (request.action === 'set_var') {
            this.setVar(request.spriteName, request.args[0], request.args[1]);
        } else if (request.action === 'change_var') {
            this.changeVar(request.spriteName, request.args[0], request.args[1]);
        }

        encodeBridgeResult(this.resultArray, result);
        Atomics.store(this.flagArray, 0, BridgeFlags.RESPONSE);
        Atomics.notify(this.flagArray, 0);
    }

    call (spriteName, action, ...args) {
        const target = this._getTarget(spriteName);
        if (!target && spriteName !== '_stage_') return;

        switch (action) {
        case 'move': {
            const steps = Number(args[0]);
            const radians = (90 - target.direction) * Math.PI / 180;
            target.setXY(
                target.x + steps * Math.cos(radians),
                target.y + steps * Math.sin(radians)
            );
            break;
        }
        case 'go_to': {
            const pos = this._resolvePosition(args[0], target);
            if (pos) target.setXY(pos[0], pos[1]);
            break;
        }
        case 'glide_to': {
            const pos = this._resolvePosition(args[0], target);
            if (pos) this._glideTo(target, pos[0], pos[1], Number(args[1]));
            break;
        }
        case 'go_to_xy':
            target.setXY(Number(args[0]), Number(args[1]));
            break;
        case 'glide_to_xy':
            this._glideTo(target, Number(args[0]), Number(args[1]), Number(args[2]));
            break;
        case 'set_x':
            target.setXY(Number(args[0]), target.y);
            break;
        case 'set_y':
            target.setXY(target.x, Number(args[0]));
            break;
        case 'change_x':
            target.setXY(target.x + Number(args[0]), target.y);
            break;
        case 'change_y':
            target.setXY(target.x, target.y + Number(args[0]));
            break;
        case 'turn_right':
            target.setDirection(target.direction + Number(args[0]));
            break;
        case 'turn_left':
            target.setDirection(target.direction - Number(args[0]));
            break;
        case 'point_in_direction':
            target.setDirection(Number(args[0]));
            break;
        case 'point_towards': {
            const pos = this._resolvePosition(args[0], target);
            if (!pos) break;
            const dx = pos[0] - target.x;
            const dy = pos[1] - target.y;
            target.setDirection(90 - Math.atan2(dy, dx) * 180 / Math.PI);
            break;
        }
        case 'if_on_edge_bounce':
            target.keepInFence();
            break;
        case 'say':
            this._bubble(target, 'say', args[0], args[1]);
            break;
        case 'think':
            this._bubble(target, 'think', args[0], args[1]);
            break;
        case 'show':
            target.setVisible(true);
            break;
        case 'hide':
            target.setVisible(false);
            break;
        case 'set_costume':
            this._setCostume(target, args[0]);
            break;
        case 'next_costume':
            target.setCostume((target.currentCostume + 1) % target.sprite.costumes.length);
            break;
        case 'set_size':
            target.setSize(Number(args[0]));
            break;
        case 'change_size':
            target.setSize(target.size + Number(args[0]));
            break;
        case 'set_effect':
            target.setEffect(String(args[0]), Number(args[1]));
            break;
        case 'change_effect':
            target.setEffect(String(args[0]), target.effects[String(args[0])] + Number(args[1]));
            break;
        case 'clear_effects':
            target.clearEffects();
            break;
        case 'go_to_layer':
            if (args[0] === 'front') target.goToFront();
            else target.goToBack();
            break;
        case 'go_layers':
            if (Number(args[0]) > 0) target.goForwardLayers(Number(args[0]));
            else target.goBackwardLayers(Math.abs(Number(args[0])));
            break;
        case 'play_sound':
            this._playSound(target, args[0]);
            break;
        case 'stop_all_sounds':
            this.vm.runtime.allTargets().forEach(t => t.sprite.soundBank?.stopAllSounds?.(t));
            break;
        case 'set_volume':
            target.volume = Number(args[0]);
            break;
        case 'change_volume':
            target.volume = (target.volume || 100) + Number(args[0]);
            break;
        case 'wait':
            this._waitMs(Number(args[0]) * 1000);
            break;
        case 'create_clone': {
            const cloneOf = args[0] ? String(args[0]) : spriteName;
            const source = this.vm.runtime.getSpriteTargetByName(cloneOf);
            if (source) this.vm.runtime.cloneSprite(source);
            break;
        }
        case 'delete_clone':
            if (target.isClone) target.dispose();
            break;
        case 'broadcast':
            this.vm.runtime.startHats('event_whenbroadcastreceived', {
                BROADCAST_OPTION: String(args[0])
            });
            break;
        case 'reset_timer':
            this.vm.runtime.ioDevices.clock.resetProjectTimer();
            break;
        case 'list_add':
            this._getList(spriteName, args[0])?.value.push(args[1]);
            break;
        case 'list_delete':
            this._listDelete(spriteName, args[0], Number(args[1]));
            break;
        case 'list_delete_all':
            this._getList(spriteName, args[0])?.value.splice(0);
            break;
        case 'list_insert':
            this._getList(spriteName, args[0])?.value.splice(Number(args[1]) - 1, 0, args[2]);
            break;
        case 'list_replace':
            this._getList(spriteName, args[0])?.value.splice(Number(args[1]) - 1, 1, args[2]);
            break;
        case 'set_backdrop': {
            const stage = this.vm.runtime.getTargetForStage();
            this._setCostume(stage, args[0]);
            break;
        }
        case 'next_backdrop': {
            const stage = this.vm.runtime.getTargetForStage();
            stage.setCostume((stage.currentCostume + 1) % stage.sprite.costumes.length);
            break;
        }
        default:
            break;
        }

        this.vm.runtime.requestRedraw();
    }

    get (prop, spriteName, ...args) {
        const target = this._getTarget(spriteName);
        if (!target && spriteName !== '_stage_') return null;

        switch (prop) {
        case 'x': return target.x;
        case 'y': return target.y;
        case 'direction': return target.direction;
        case 'size': return target.size;
        case 'visible': return target.visible;
        case 'volume': return target.volume;
        case 'costume': return target.sprite.costumes[target.currentCostume]?.name;
        case 'mouse_x': return this.vm.runtime.ioDevices.mouse.getScratchX();
        case 'mouse_y': return this.vm.runtime.ioDevices.mouse.getScratchY();
        case 'mouse_down': return this.vm.runtime.ioDevices.mouse.getIsDown();
        case 'timer': return this.vm.runtime.ioDevices.clock.projectTimer();
        case 'answer': return this.vm.runtime.ext_scratch3_sensing?._answer ?? '';
        case 'username': return this.vm.runtime.ioDevices.userData.getUsername();
        case 'key_pressed':
            return this.vm.runtime.ioDevices.keyboard.getKeyIsDown(String(args[0]));
        case 'touching':
            return target.isTouchingObject(String(args[0]));
        case 'distance_to': {
            if (args[0] === '_mouse_') {
                const mx = this.vm.runtime.ioDevices.mouse.getScratchX();
                const my = this.vm.runtime.ioDevices.mouse.getScratchY();
                return Math.hypot(target.x - mx, target.y - my);
            }
            const other = this._getTarget(args[0]) || this.vm.runtime.getSpriteTargetByName(String(args[0]));
            if (!other) return 0;
            return Math.hypot(target.x - other.x, target.y - other.y);
        }
        case 'list_item': {
            const list = this._getList(spriteName, args[0]);
            const index = Number(args[1]) - 1;
            return list?.value[index] ?? '';
        }
        case 'list_length': {
            const list = this._getList(spriteName, args[0]);
            return list?.value.length ?? 0;
        }
        case 'list_contains': {
            const list = this._getList(spriteName, args[0]);
            return list?.value.includes(args[1]) ?? false;
        }
        case 'list_contents': {
            const list = this._getList(spriteName, args[0]);
            return list ? [...list.value] : [];
        }
        case 'days_since_2000': {
            const ms = Date.now() - Date.UTC(2000, 0, 1);
            return ms / 86400000;
        }
        default:
            return null;
        }
    }

    getVar (spriteName, name) {
        const target = spriteName === '_stage_'
            ? this.vm.runtime.getTargetForStage()
            : this._getTarget(spriteName);
        return target?.lookupVariableByNameAndType(name, '')?.value;
    }

    setVar (spriteName, name, val) {
        const target = spriteName === '_stage_'
            ? this.vm.runtime.getTargetForStage()
            : this._getTarget(spriteName);
        const v = target?.lookupVariableByNameAndType(name, '');
        if (v) v.value = val;
    }

    changeVar (spriteName, name, delta) {
        const current = this.getVar(spriteName, name) || 0;
        this.setVar(spriteName, name, Number(current) + Number(delta));
    }

    _bubble (target, type, text, secs) {
        this.vm.runtime.emit('SAY', target, type, String(text ?? ''));
        if (secs != null && secs !== '' && Number(secs) > 0) {
            this._waitMs(Number(secs) * 1000);
            this.vm.runtime.emit('SAY', target, type, '');
        }
    }

    _playSound (target, soundName) {
        const sounds = target.sprite.sounds;
        if (!sounds.length || !target.sprite.soundBank) return;
        let index = sounds.findIndex(s => s.name === String(soundName));
        if (index === -1) {
            const n = parseInt(soundName, 10);
            if (!isNaN(n)) index = Math.max(0, Math.min(sounds.length - 1, n - 1));
        }
        if (index >= 0) {
            target.sprite.soundBank.playSound(target, sounds[index].soundId);
        }
    }

    _setCostume (target, requested) {
        const name = String(requested);
        const index = target.getCostumeIndexByName(name);
        if (index !== -1) {
            target.setCostume(index);
        } else if (name === 'next costume') {
            target.setCostume(target.currentCostume + 1);
        } else if (name === 'previous costume') {
            target.setCostume(target.currentCostume - 1);
        } else if (!isNaN(Number(name))) {
            target.setCostume(Number(name) - 1);
        }
    }

    _resolvePosition (targetName, utilTarget) {
        const name = String(targetName);
        if (name === '_mouse_') {
            return [
                this.vm.runtime.ioDevices.mouse.getScratchX(),
                this.vm.runtime.ioDevices.mouse.getScratchY()
            ];
        }
        if (name === '_random_') {
            const w = this.vm.runtime.stageWidth;
            const h = this.vm.runtime.stageHeight;
            return [Math.round(w * (Math.random() - 0.5)), Math.round(h * (Math.random() - 0.5))];
        }
        const other = this.vm.runtime.getSpriteTargetByName(name);
        return other ? [other.x, other.y] : null;
    }

    _glideTo (target, endX, endY, secs) {
        if (secs <= 0) {
            target.setXY(endX, endY);
            return;
        }
        const startX = target.x;
        const startY = target.y;
        const steps = Math.max(1, Math.ceil(secs * 30));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            target.setXY(
                startX + (endX - startX) * t,
                startY + (endY - startY) * t
            );
            this.vm.runtime.requestRedraw();
            this._waitMs(secs * 1000 / steps);
        }
    }

    _getList (spriteName, listName) {
        const target = spriteName === '_stage_'
            ? this.vm.runtime.getTargetForStage()
            : this._getTarget(spriteName);
        return target?.lookupVariableByNameAndType(String(listName), LIST_TYPE);
    }

    _listDelete (spriteName, listName, index) {
        const list = this._getList(spriteName, listName);
        if (!list) return;
        if (index === 'all' || index === 'last') {
            if (index === 'all') list.value.splice(0);
            else list.value.pop();
            return;
        }
        list.value.splice(index - 1, 1);
    }

    _getTarget (name) {
        if (name === '_stage_') return this.vm.runtime.getTargetForStage();
        return this.vm.runtime.targets.find(t => t.getName() === name && !t.isStage);
    }

    _waitMs (ms) {
        const buffer = new SharedArrayBuffer(4);
        const arr = new Int32Array(buffer);
        Atomics.wait(arr, 0, 0, ms);
    }
}
