/* eslint-disable no-undef */
import {getPyodideUrls, loadPyodideScript} from './pyodide-loader';
import {createWorkerBridge} from './bridge-client';

let pyodide = null;
let bridge = null;
let globals = {};

const PYTHON_API = `
import _scratch_bridge as _b

class Sprite:
    def __init__(self, name):
        self._name = name

    def move(self, steps): _b.call('move', self._name, steps)
    def go_to(self, target): _b.call('go_to', self._name, target)
    def turn_right(self, deg): _b.call('turn_right', self._name, deg)
    def turn_left(self, deg): _b.call('turn_left', self._name, deg)
    def go_to_xy(self, x, y): _b.call('go_to_xy', self._name, x, y)
    def glide_to_xy(self, x, y, secs): _b.call('glide_to_xy', self._name, x, y, secs)
    def glide_to(self, target, secs): _b.call('glide_to', self._name, target, secs)
    def set_x(self, x): _b.call('set_x', self._name, x)
    def set_y(self, y): _b.call('set_y', self._name, y)
    def change_x(self, dx): _b.call('change_x', self._name, dx)
    def change_y(self, dy): _b.call('change_y', self._name, dy)
    def point_in_direction(self, deg): _b.call('point_in_direction', self._name, deg)
    def point_towards(self, target): _b.call('point_towards', self._name, target)
    def if_on_edge_bounce(self): _b.call('if_on_edge_bounce', self._name)

    @property
    def x(self): return _b.get('x', self._name)
    @property
    def y(self): return _b.get('y', self._name)
    @property
    def direction(self): return _b.get('direction', self._name)
    @property
    def size(self): return _b.get('size', self._name)
    @property
    def volume(self): return _b.get('volume', self._name)

    def say(self, text, secs=None): _b.call('say', self._name, text, secs)
    def think(self, text, secs=None): _b.call('think', self._name, text, secs)
    def show(self): _b.call('show', self._name)
    def hide(self): _b.call('hide', self._name)
    def set_costume(self, costume): _b.call('set_costume', self._name, costume)
    def next_costume(self): _b.call('next_costume', self._name)
    def set_size(self, pct): _b.call('set_size', self._name, pct)
    def change_size(self, dpct): _b.call('change_size', self._name, dpct)
    def set_effect(self, effect, val): _b.call('set_effect', self._name, effect, val)
    def change_effect(self, effect, delta): _b.call('change_effect', self._name, effect, delta)
    def clear_effects(self): _b.call('clear_effects', self._name)
    def go_to_layer(self, layer): _b.call('go_to_layer', self._name, layer)
    def go_layers(self, n): _b.call('go_layers', self._name, n)

    def play_sound(self, name): _b.call('play_sound', self._name, name)
    def stop_all_sounds(self): _b.call('stop_all_sounds', self._name)
    def set_volume(self, pct): _b.call('set_volume', self._name, pct)
    def change_volume(self, delta): _b.call('change_volume', self._name, delta)

    def wait(self, secs): _b.call('wait', self._name, secs)
    def create_clone(self, of=None): _b.call('create_clone', self._name, of)
    def delete_clone(self): _b.call('delete_clone', self._name)
    def broadcast(self, message): _b.call('broadcast', self._name, message)
    def reset_timer(self): _b.call('reset_timer', self._name)

    def touching(self, target): return _b.get('touching', self._name, target)
    def distance_to(self, target): return _b.get('distance_to', self._name, target)
    @property
    def mouse_x(self): return _b.get('mouse_x', self._name)
    @property
    def mouse_y(self): return _b.get('mouse_y', self._name)
    @property
    def mouse_down(self): return _b.get('mouse_down', self._name)
    @property
    def timer(self): return _b.get('timer', self._name)
    @property
    def answer(self): return _b.get('answer', self._name)
    @property
    def days_since_2000(self): return _b.get('days_since_2000', self._name)
    def key_pressed(self, key): return _b.get('key_pressed', self._name, key)

    def get_var(self, name): return _b.get_var(self._name, name)
    def set_var(self, name, val): _b.set_var(self._name, name, val)
    def change_var(self, name, delta): _b.change_var(self._name, name, delta)

    def list_add(self, list_name, item): _b.call('list_add', self._name, list_name, item)
    def list_delete(self, list_name, index): _b.call('list_delete', self._name, list_name, index)
    def list_delete_all(self, list_name): _b.call('list_delete_all', self._name, list_name)
    def list_insert(self, list_name, index, item): _b.call('list_insert', self._name, list_name, index, item)
    def list_replace(self, list_name, index, item): _b.call('list_replace', self._name, list_name, index, item)
    def list_item(self, list_name, index): return _b.get('list_item', self._name, list_name, index)
    def list_length(self, list_name): return _b.get('list_length', self._name, list_name)
    def list_contains(self, list_name, item): return _b.get('list_contains', self._name, list_name, item)
    def list_contents(self, list_name): return _b.get('list_contents', self._name, list_name)

class Stage:
    def set_backdrop(self, name): _b.call('set_backdrop', '_stage_', name)
    def next_backdrop(self): _b.call('next_backdrop', '_stage_', None)
    def play_sound(self, name): _b.call('play_sound', '_stage_', name)
    def get_var(self, name): return _b.get_var('_stage_', name)
    def set_var(self, name, val): _b.set_var('_stage_', name, val)

stage = Stage()
_sprites = {}

def get_sprite(name):
    if name not in _sprites:
        _sprites[name] = Sprite(name)
    return _sprites[name]
`;

async function initPyodide (buffers) {
    bridge = createWorkerBridge(buffers);
    pyodide = await loadPyodideScript(getPyodideUrls());
    pyodide.registerJsModule('_scratch_bridge', bridge);
    await pyodide.runPythonAsync(PYTHON_API);
    postMessage({type: 'ready'});
}

self.onmessage = async event => {
    const {type, code, spriteName, requestId, buffers} = event.data;

    if (type === 'init') {
        try {
            await initPyodide(buffers);
        } catch (err) {
            postMessage({
                type: 'init_error',
                error: err?.message || String(err)
            });
        }
        return;
    }

    if (type === 'run') {
        try {
            const safeName = JSON.stringify(spriteName);
            await pyodide.runPythonAsync(`
sprite = get_sprite(${safeName})
`);
            await pyodide.runPythonAsync(code);
            postMessage({type: 'done', requestId});
        } catch (err) {
            postMessage({type: 'error', requestId, error: err.message || String(err)});
        }
        return;
    }

    if (type === 'stop') {
        pyodide = null;
        bridge = null;
        postMessage({type: 'stopped'});
        return;
    }

    if (type === 'set_global') {
        globals[event.data.name] = event.data.value;
        if (pyodide) {
            await pyodide.runPythonAsync(`${event.data.name} = ${JSON.stringify(event.data.value)}`);
        }
        return;
    }

    if (type === 'get_global') {
        postMessage({type: 'global_value', requestId, value: globals[event.data.name] ?? null});
    }
};
