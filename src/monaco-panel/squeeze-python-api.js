/**
 * Squeeze Python API catalog for Monaco IntelliSense.
 * Each entry maps to a Scratch block (or hat) when synced.
 */

export const EVENT_HATS = [
    {
        label: 'When green flag clicked',
        insertText: '# When green flag clicked',
        block: 'event_whenflagclicked',
        detail: 'Event hat'
    },
    {
        label: 'When this sprite clicked',
        insertText: '# When this sprite clicked',
        block: 'event_whenthisspriteclicked',
        detail: 'Event hat'
    },
    {
        label: 'When key pressed',
        insertText: '# When "${1:space}" key pressed',
        block: 'event_whenkeypressed',
        detail: 'Event hat',
        snippet: true
    },
    {
        label: 'When I receive broadcast',
        insertText: '# When I receive "${1:message}"',
        block: 'event_whenbroadcastreceived',
        detail: 'Event hat',
        snippet: true
    },
    {
        label: 'When touching sprite',
        insertText: '# When touching "${1:Mouse}"',
        block: 'event_whentouchingobject',
        detail: 'Event hat',
        snippet: true
    }
];

export const CONTROL_SNIPPETS = [
    {
        label: 'repeat',
        insertText: 'for _ in range(int(${1:10})):\n    ${0}',
        block: 'control_repeat',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'forever',
        insertText: 'while True:\n    ${0}',
        block: 'control_forever',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'if',
        insertText: 'if ${1:sprite.touching("Mouse")}:\n    ${0}',
        block: 'control_if',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'if / else',
        insertText: 'if ${1:sprite.touching("Mouse")}:\n    ${2:pass}\nelse:\n    ${0}',
        block: 'control_if_else',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'repeat until',
        insertText: 'while not (${1:sprite.touching("Mouse")}):\n    ${0}',
        block: 'control_repeat_until',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'while',
        insertText: 'while ${1:sprite.key_pressed("space")}:\n    ${0}',
        block: 'control_while',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'wait until',
        insertText: 'while not (${1:sprite.touching("Mouse")}): sprite.wait(0.01)',
        block: 'control_wait_until',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'wait',
        insertText: 'sprite.wait(${1:1})',
        block: 'control_wait',
        detail: 'Control',
        snippet: true
    },
    {
        label: 'stop this script',
        insertText: 'break',
        block: 'control_stop',
        detail: 'Control'
    }
];

export const SPRITE_MEMBERS = [
    // Motion
    {name: 'move', insertText: 'move(${1:10})', params: ['steps'], block: 'motion_movesteps', category: 'Motion', doc: 'Move forward by the given number of steps.'},
    {name: 'go_to', insertText: 'go_to(${1:"Mouse"})', params: ['target'], block: 'motion_goto', category: 'Motion', doc: 'Go to sprite, mouse pointer, or random position.'},
    {name: 'go_to_xy', insertText: 'go_to_xy(${1:0}, ${2:0})', params: ['x', 'y'], block: 'motion_gotoxy', category: 'Motion', doc: 'Go to x/y coordinates on the stage.'},
    {name: 'glide_to', insertText: 'glide_to(${1:"Mouse"}, ${2:1})', params: ['target', 'secs'], block: 'motion_glideto', category: 'Motion', doc: 'Glide to a sprite or the mouse over seconds.'},
    {name: 'glide_to_xy', insertText: 'glide_to_xy(${1:0}, ${2:0}, ${3:1})', params: ['x', 'y', 'secs'], block: 'motion_glidesecstoxy', category: 'Motion', doc: 'Glide to x/y over seconds.'},
    {name: 'turn_right', insertText: 'turn_right(${1:15})', params: ['degrees'], block: 'motion_turnright', category: 'Motion', doc: 'Turn clockwise by degrees.'},
    {name: 'turn_left', insertText: 'turn_left(${1:15})', params: ['degrees'], block: 'motion_turnleft', category: 'Motion', doc: 'Turn counter-clockwise by degrees.'},
    {name: 'point_in_direction', insertText: 'point_in_direction(${1:90})', params: ['direction'], block: 'motion_pointindirection', category: 'Motion', doc: 'Point in a direction (0=up, 90=right).'},
    {name: 'point_towards', insertText: 'point_towards(${1:"Mouse"})', params: ['target'], block: 'motion_pointtowards', category: 'Motion', doc: 'Point towards a sprite or the mouse.'},
    {name: 'change_x', insertText: 'change_x(${1:10})', params: ['dx'], block: 'motion_changexby', category: 'Motion', doc: 'Change x position by dx.'},
    {name: 'set_x', insertText: 'set_x(${1:0})', params: ['x'], block: 'motion_setx', category: 'Motion', doc: 'Set x position.'},
    {name: 'change_y', insertText: 'change_y(${1:10})', params: ['dy'], block: 'motion_changeyby', category: 'Motion', doc: 'Change y position by dy.'},
    {name: 'set_y', insertText: 'set_y(${1:0})', params: ['y'], block: 'motion_sety', category: 'Motion', doc: 'Set y position.'},
    {name: 'if_on_edge_bounce', insertText: 'if_on_edge_bounce()', params: [], block: 'motion_ifonedgebounce', category: 'Motion', doc: 'Bounce if touching a stage edge.'},
    {name: 'x', insertText: 'x', params: [], block: 'motion_xposition', category: 'Motion', doc: 'X position (read-only property).', property: true},
    {name: 'y', insertText: 'y', params: [], block: 'motion_yposition', category: 'Motion', doc: 'Y position (read-only property).', property: true},
    {name: 'direction', insertText: 'direction', params: [], block: 'motion_direction', category: 'Motion', doc: 'Direction in degrees (read-only property).', property: true},

    // Looks
    {name: 'say', insertText: 'say(${1:"Hello!"})', params: ['message'], block: 'looks_say', category: 'Looks', doc: 'Show a speech bubble.'},
    {name: 'say', insertText: 'say(${1:"Hello!"}, ${2:2})', params: ['message', 'secs'], block: 'looks_sayforsecs', category: 'Looks', doc: 'Say something for a number of seconds.', variant: 'for_secs'},
    {name: 'think', insertText: 'think(${1:"Hmm..."})', params: ['message'], block: 'looks_think', category: 'Looks', doc: 'Show a thought bubble.'},
    {name: 'think', insertText: 'think(${1:"Hmm..."}, ${2:2})', params: ['message', 'secs'], block: 'looks_thinkforsecs', category: 'Looks', doc: 'Think something for seconds.', variant: 'for_secs'},
    {name: 'show', insertText: 'show()', params: [], block: 'looks_show', category: 'Looks', doc: 'Make the sprite visible.'},
    {name: 'hide', insertText: 'hide()', params: [], block: 'looks_hide', category: 'Looks', doc: 'Hide the sprite.'},
    {name: 'set_costume', insertText: 'set_costume(${1:"costume1"})', params: ['costume'], block: 'looks_switchcostumeto', category: 'Looks', doc: 'Switch to a costume by name.', dynamicArg: 'costumes'},
    {name: 'next_costume', insertText: 'next_costume()', params: [], block: 'looks_nextcostume', category: 'Looks', doc: 'Switch to the next costume.'},
    {name: 'set_size', insertText: 'set_size(${1:100})', params: ['size'], block: 'looks_setsizeto', category: 'Looks', doc: 'Set size as percent of original.'},
    {name: 'change_size', insertText: 'change_size(${1:10})', params: ['change'], block: 'looks_changesizeby', category: 'Looks', doc: 'Change size by percent.'},
    {name: 'set_effect', insertText: 'set_effect(${1:"ghost"}, ${2:50})', params: ['effect', 'value'], block: 'looks_seteffectto', category: 'Looks', doc: 'Set a graphic effect (color, fisheye, whirl, etc.).'},
    {name: 'change_effect', insertText: 'change_effect(${1:"ghost"}, ${2:10})', params: ['effect', 'change'], block: 'looks_changeeffectby', category: 'Looks', doc: 'Change a graphic effect.'},
    {name: 'clear_effects', insertText: 'clear_effects()', params: [], block: 'looks_cleargraphiceffects', category: 'Looks', doc: 'Clear all graphic effects.'},
    {name: 'go_to_layer', insertText: 'go_to_layer(${1:"front"})', params: ['layer'], block: 'looks_gotofrontback', category: 'Looks', doc: 'Go to front or back layer.'},
    {name: 'go_layers', insertText: 'go_layers(${1:1})', params: ['num'], block: 'looks_goforwardbackwardlayers', category: 'Looks', doc: 'Move forward (+) or backward (-) layers.'},
    {name: 'size', insertText: 'size', params: [], block: 'looks_size', category: 'Looks', doc: 'Size percent (read-only property).', property: true},

    // Sound
    {name: 'play_sound', insertText: 'play_sound(${1:"pop"})', params: ['sound'], block: 'sound_play', category: 'Sound', doc: 'Play a sound by name.', dynamicArg: 'sounds'},
    {name: 'stop_all_sounds', insertText: 'stop_all_sounds()', params: [], block: 'sound_stopallsounds', category: 'Sound', doc: 'Stop all sounds.'},
    {name: 'set_volume', insertText: 'set_volume(${1:100})', params: ['volume'], block: 'sound_setvolumeto', category: 'Sound', doc: 'Set volume percent.'},
    {name: 'change_volume', insertText: 'change_volume(${1:10})', params: ['volume'], block: 'sound_changevolumeby', category: 'Sound', doc: 'Change volume by percent.'},
    {name: 'volume', insertText: 'volume', params: [], block: 'sound_volume', category: 'Sound', doc: 'Volume percent (read-only property).', property: true},

    // Events & control
    {name: 'broadcast', insertText: 'broadcast(${1:"message"})', params: ['message'], block: 'event_broadcast', category: 'Events', doc: 'Broadcast a message to all sprites.', dynamicArg: 'broadcasts'},
    {name: 'wait', insertText: 'wait(${1:1})', params: ['secs'], block: 'control_wait', category: 'Control', doc: 'Wait for seconds.'},
    {name: 'create_clone', insertText: 'create_clone(${1:"myself"})', params: ['of'], block: 'control_create_clone_of', category: 'Control', doc: 'Create a clone of this sprite or another.', dynamicArg: 'sprites'},
    {name: 'delete_clone', insertText: 'delete_clone()', params: [], block: 'control_delete_this_clone', category: 'Control', doc: 'Delete this clone (only works on clones).'},

    // Sensing
    {name: 'touching', insertText: 'touching(${1:"Mouse"})', params: ['target'], block: 'sensing_touchingobject', category: 'Sensing', doc: 'True if touching sprite, edge, or mouse.', dynamicArg: 'touchTargets'},
    {name: 'distance_to', insertText: 'distance_to(${1:"Mouse"})', params: ['target'], block: 'sensing_distanceto', category: 'Sensing', doc: 'Distance to sprite or mouse.', dynamicArg: 'sprites'},
    {name: 'key_pressed', insertText: 'key_pressed(${1:"space"})', params: ['key'], block: 'sensing_keypressed', category: 'Sensing', doc: 'True if a key is pressed.', dynamicArg: 'keys'},
    {name: 'mouse_down', insertText: 'mouse_down', params: [], block: 'sensing_mousedown', category: 'Sensing', doc: 'True if mouse button is down (property).', property: true},
    {name: 'mouse_x', insertText: 'mouse_x', params: [], block: 'sensing_mousex', category: 'Sensing', doc: 'Mouse x position (property).', property: true},
    {name: 'mouse_y', insertText: 'mouse_y', params: [], block: 'sensing_mousey', category: 'Sensing', doc: 'Mouse y position (property).', property: true},
    {name: 'timer', insertText: 'timer', params: [], block: 'sensing_timer', category: 'Sensing', doc: 'Timer value in seconds (property).', property: true},
    {name: 'reset_timer', insertText: 'reset_timer()', params: [], block: 'sensing_resettimer', category: 'Sensing', doc: 'Reset the timer to 0.'},
    {name: 'answer', insertText: 'answer', params: [], block: 'sensing_answer', category: 'Sensing', doc: 'Answer from ask block (property).', property: true},
    {name: 'days_since_2000', insertText: 'days_since_2000', params: [], block: 'sensing_dayssince2000', category: 'Sensing', doc: 'Days since year 2000 (property).', property: true},

    // Data
    {name: 'get_var', insertText: 'get_var(${1:"my variable"})', params: ['name'], block: 'data_variable', category: 'Variables', doc: 'Get a variable value.', dynamicArg: 'variables'},
    {name: 'set_var', insertText: 'set_var(${1:"my variable"}, ${2:0})', params: ['name', 'value'], block: 'data_setvariableto', category: 'Variables', doc: 'Set a variable.', dynamicArg: 'variables'},
    {name: 'change_var', insertText: 'change_var(${1:"my variable"}, ${2:1})', params: ['name', 'delta'], block: 'data_changevariableby', category: 'Variables', doc: 'Change a variable by delta.', dynamicArg: 'variables'},
    {name: 'list_add', insertText: 'list_add(${1:"my list"}, ${2:"item"})', params: ['list', 'item'], block: 'data_addtolist', category: 'Lists', doc: 'Add item to a list.', dynamicArg: 'lists'},
    {name: 'list_delete', insertText: 'list_delete(${1:"my list"}, ${2:1})', params: ['list', 'index'], block: 'data_deleteoflist', category: 'Lists', doc: 'Delete item at index.', dynamicArg: 'lists'},
    {name: 'list_delete_all', insertText: 'list_delete_all(${1:"my list"})', params: ['list'], block: 'data_deletealloflist', category: 'Lists', doc: 'Delete all items in a list.', dynamicArg: 'lists'},
    {name: 'list_insert', insertText: 'list_insert(${1:"my list"}, ${2:1}, ${3:"item"})', params: ['list', 'index', 'item'], block: 'data_insertatlist', category: 'Lists', doc: 'Insert item at index.', dynamicArg: 'lists'},
    {name: 'list_replace', insertText: 'list_replace(${1:"my list"}, ${2:1}, ${3:"item"})', params: ['list', 'index', 'item'], block: 'data_replaceitemoflist', category: 'Lists', doc: 'Replace item at index.', dynamicArg: 'lists'},
    {name: 'list_item', insertText: 'list_item(${1:"my list"}, ${2:1})', params: ['list', 'index'], block: 'data_itemoflist', category: 'Lists', doc: 'Get list item at index.', dynamicArg: 'lists'},
    {name: 'list_length', insertText: 'list_length(${1:"my list"})', params: ['list'], block: 'data_lengthoflist', category: 'Lists', doc: 'Length of a list.', dynamicArg: 'lists'},
    {name: 'list_contains', insertText: 'list_contains(${1:"my list"}, ${2:"item"})', params: ['list', 'item'], block: 'data_listcontainsitem', category: 'Lists', doc: 'True if list contains item.', dynamicArg: 'lists'},
    {name: 'list_contents', insertText: 'list_contents(${1:"my list"})', params: ['list'], block: 'data_listcontents', category: 'Lists', doc: 'Full list contents.', dynamicArg: 'lists'}
];

export const STAGE_MEMBERS = [
    {name: 'set_backdrop', insertText: 'set_backdrop(${1:"backdrop1"})', params: ['backdrop'], block: 'looks_switchbackdropto', category: 'Looks', doc: 'Switch stage backdrop.', dynamicArg: 'backdrops'},
    {name: 'next_backdrop', insertText: 'next_backdrop()', params: [], block: 'looks_nextbackdrop', category: 'Looks', doc: 'Switch to next backdrop.'},
    {name: 'play_sound', insertText: 'play_sound(${1:"pop"})', params: ['sound'], block: 'sound_play', category: 'Sound', doc: 'Play a stage sound.', dynamicArg: 'stageSounds'},
    {name: 'get_var', insertText: 'get_var(${1:"my variable"})', params: ['name'], block: 'data_variable', category: 'Variables', doc: 'Get a stage variable.', dynamicArg: 'variables'},
    {name: 'set_var', insertText: 'set_var(${1:"my variable"}, ${2:0})', params: ['name', 'value'], block: 'data_setvariableto', category: 'Variables', doc: 'Set a stage variable.', dynamicArg: 'variables'}
];

export const GLOBAL_FUNCTIONS = [
    {
        name: 'get_sprite',
        insertText: 'get_sprite("${1:Sprite1}")',
        doc: 'Get the Sprite API object for a sprite by name.',
        dynamicArg: 'sprites'
    }
];

export const SCRATCH_KEYS = [
    'space', 'up arrow', 'down arrow', 'right arrow', 'left arrow',
    'enter', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

export const TOUCH_TARGETS = ['Mouse', '_edge_', '_random_'];

export const GRAPHIC_EFFECTS = ['color', 'fisheye', 'whirl', 'pixelate', 'mosaic', 'brightness', 'ghost'];

/**
 * Dedupe sprite members that share a name (e.g. say with/without secs).
 */
export function getSpriteMembersForCompletion () {
    const seen = new Set();
    return SPRITE_MEMBERS.filter(m => {
        const key = m.variant ? `${m.name}:${m.variant}` : m.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
