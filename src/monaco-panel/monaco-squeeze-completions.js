import {completionDebugLog} from './monaco-completion-fix.js';
import {
    EVENT_HATS,
    CONTROL_SNIPPETS,
    STAGE_MEMBERS,
    GLOBAL_FUNCTIONS,
    SCRATCH_KEYS,
    TOUCH_TARGETS,
    GRAPHIC_EFFECTS,
    getSpriteMembersForCompletion
} from './squeeze-python-api.js';

let contextGetter = () => ({vm: null, spriteName: 'Sprite1'});

export function setCompletionContext (getter) {
    contextGetter = getter;
}

function getProjectContext (vm, spriteName) {
    if (!vm) {
        return {
            sprites: ['Sprite1'],
            costumes: [],
            sounds: [],
            stageSounds: [],
            backdrops: [],
            variables: [],
            lists: [],
            broadcasts: [],
            keys: SCRATCH_KEYS,
            touchTargets: TOUCH_TARGETS
        };
    }

    const target = vm.runtime.targets.find(t => t.getName() === spriteName && !t.isStage);
    const stage = vm.runtime.getTargetForStage?.();

    const costumes = target?.sprite?.costumes?.map(c => c.name) || [];
    const sounds = target?.sprite?.sounds?.map(s => s.name) || [];
    const stageSounds = stage?.sprite?.sounds?.map(s => s.name) || [];
    const backdrops = stage?.sprite?.costumes?.map(c => c.name) || [];
    const sprites = vm.runtime.targets.filter(t => !t.isStage).map(t => t.getName());

    const variables = new Set();
    const lists = new Set();
    const broadcasts = new Set();

    const collectVars = t => {
        if (!t?.variables) return;
        Object.values(t.variables).forEach(v => {
            if (v.type === 'list') lists.add(v.name);
            else if (v.type === 'broadcast_msg') broadcasts.add(v.name);
            else variables.add(v.name);
        });
    };

    collectVars(target);
    collectVars(stage);

    return {
        sprites: sprites.length ? sprites : ['Sprite1'],
        costumes,
        sounds,
        stageSounds,
        backdrops,
        variables: [...variables],
        lists: [...lists],
        broadcasts: [...broadcasts],
        keys: SCRATCH_KEYS,
        touchTargets: [...TOUCH_TARGETS, ...sprites.filter(n => n !== spriteName)]
    };
}

function detectContext (model, position) {
    const line = model.getLineContent(position.lineNumber);
    const before = line.substring(0, position.column - 1);

    const spriteMember = before.match(/(?:^|[^\w])sprite\.(\w*)$/);
    if (spriteMember) return {kind: 'sprite-member', prefix: spriteMember[1]};

    const stageMember = before.match(/(?:^|[^\w])stage\.(\w*)$/);
    if (stageMember) return {kind: 'stage-member', prefix: stageMember[1]};

    const getSprite = before.match(/get_sprite\s*\(\s*["']([^"']*)$/);
    if (getSprite) return {kind: 'dynamic', dynamicKey: 'sprites', prefix: getSprite[1]};

    const dynamicMatchers = [
        {regex: /sprite\.set_costume\s*\(\s*["']([^"']*)$/, key: 'costumes'},
        {regex: /sprite\.play_sound\s*\(\s*["']([^"']*)$/, key: 'sounds'},
        {regex: /stage\.play_sound\s*\(\s*["']([^"']*)$/, key: 'stageSounds'},
        {regex: /stage\.set_backdrop\s*\(\s*["']([^"']*)$/, key: 'backdrops'},
        {regex: /sprite\.(?:go_to|glide_to|point_towards|distance_to)\s*\(\s*["']([^"']*)$/, key: 'touchTargets'},
        {regex: /sprite\.touching\s*\(\s*["']([^"']*)$/, key: 'touchTargets'},
        {regex: /sprite\.key_pressed\s*\(\s*["']([^"']*)$/, key: 'keys'},
        {regex: /sprite\.broadcast\s*\(\s*["']([^"']*)$/, key: 'broadcasts'},
        {regex: /sprite\.(?:get_var|set_var|change_var)\s*\(\s*["']([^"']*)$/, key: 'variables'},
        {regex: /stage\.(?:get_var|set_var)\s*\(\s*["']([^"']*)$/, key: 'variables'},
        {regex: /sprite\.list_\w+\s*\(\s*["']([^"']*)$/, key: 'lists'},
        {regex: /sprite\.set_effect\s*\(\s*["']([^"']*)$/, key: 'effects'},
        {regex: /sprite\.change_effect\s*\(\s*["']([^"']*)$/, key: 'effects'},
        {regex: /sprite\.create_clone\s*\(\s*["']([^"']*)$/, key: 'sprites'}
    ];

    for (const matcher of dynamicMatchers) {
        const match = before.match(matcher.regex);
        if (match) return {kind: 'dynamic', dynamicKey: matcher.key, prefix: match[1]};
    }

    const eventComment = before.match(/^(\s*)#(.*)$/);
    if (eventComment) {
        const afterHash = eventComment[2];
        const isEventTyping = afterHash === '' ||
            /^\s*\w*$/.test(afterHash) ||
            /^\s*when\b/i.test(afterHash.trimStart());
        if (isEventTyping) {
            const hashColumn = eventComment[1].length + 1;
            const prefix = afterHash.trim();
            return {
                kind: 'events',
                prefix,
                hashColumn,
                hasPartial: prefix.length > 0,
                lineNumber: position.lineNumber,
                endColumn: position.column
            };
        }
    }

    if (/^\s*$/.test(before)) {
        return {kind: 'statements', prefix: ''};
    }

    return {kind: 'general', prefix: ''};
}

function makeItem (monaco, {
    label,
    insertText,
    detail,
    documentation,
    kind,
    sortText,
    snippet = false,
    filterText,
    range
}) {
    const item = {
        label,
        kind: kind || monaco.languages.CompletionItemKind.Snippet,
        insertText,
        detail,
        documentation: documentation || undefined,
        sortText: sortText || label,
        filterText: filterText || label
    };
    if (range) {
        item.range = range;
    }
    if (snippet) {
        item.insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    }
    return item;
}

function memberDoc (member) {
    const block = member.block ? ` → ${member.block}` : '';
    return `${member.doc}${block}`;
}

function eventHatBody (hat) {
    return hat.insertText.replace(/^#\s*/, '');
}

function eventHatCompletion (monaco, hat, ctx) {
    const body = eventHatBody(hat);
    const fullLine = `# ${body}`;

    if (!ctx.hasPartial) {
        // User already typed "#" — insert only the remainder at the cursor.
        return {
            insertText: ` ${body}`,
            range: new monaco.Range(
                ctx.lineNumber,
                ctx.endColumn,
                ctx.lineNumber,
                ctx.endColumn
            )
        };
    }

    // Partial text after "#" — replace "#..." through cursor with one "#" + event text.
    return {
        insertText: fullLine,
        range: new monaco.Range(ctx.lineNumber, ctx.hashColumn, ctx.lineNumber, ctx.endColumn)
    };
}

function filterByPrefix (items, prefix) {
    if (!prefix) return items;
    const lower = prefix.toLowerCase();
    return items.filter(item => {
        const label = (item.label || '').toLowerCase();
        const filter = (item.filterText || label).toLowerCase();
        return label.startsWith(lower) || filter.startsWith(lower);
    });
}

function buildSuggestions (monaco, ctx, project) {
    const suggestions = [];

    if (ctx.kind === 'events') {
        EVENT_HATS.forEach((hat, i) => {
            const completion = eventHatCompletion(monaco, hat, ctx);
            suggestions.push(makeItem(monaco, {
                label: hat.label,
                insertText: completion.insertText,
                detail: `${hat.detail} · ${hat.block}`,
                documentation: `Creates a ${hat.block} hat block when synced.`,
                kind: monaco.languages.CompletionItemKind.Event,
                sortText: `00_event_${i}`,
                snippet: hat.snippet,
                range: completion.range
            }));
        });
        return filterByPrefix(suggestions, ctx.prefix);
    }

    if (ctx.kind === 'sprite-member') {
        getSpriteMembersForCompletion().forEach((member, i) => {
            const label = member.variant ? `${member.name} (${member.variant})` : member.name;
            suggestions.push(makeItem(monaco, {
                label,
                insertText: member.insertText,
                detail: `${member.category} · ${member.block}`,
                documentation: memberDoc(member),
                kind: member.property
                    ? monaco.languages.CompletionItemKind.Property
                    : monaco.languages.CompletionItemKind.Method,
                sortText: `01_${member.category}_${i}`,
                snippet: !member.property,
                filterText: member.name
            }));
        });
        return filterByPrefix(suggestions, ctx.prefix);
    }

    if (ctx.kind === 'stage-member') {
        STAGE_MEMBERS.forEach((member, i) => {
            suggestions.push(makeItem(monaco, {
                label: member.name,
                insertText: member.insertText,
                detail: `${member.category} · ${member.block}`,
                documentation: memberDoc(member),
                kind: monaco.languages.CompletionItemKind.Method,
                sortText: `01_stage_${i}`,
                snippet: true,
                filterText: member.name
            }));
        });
        return filterByPrefix(suggestions, ctx.prefix);
    }

    if (ctx.kind === 'dynamic') {
        let values = project[ctx.dynamicKey] || [];
        if (ctx.dynamicKey === 'effects') values = GRAPHIC_EFFECTS;
        if (ctx.dynamicKey === 'sprites') values = [...values, 'myself'];
        values.forEach((value, i) => {
            suggestions.push(makeItem(monaco, {
                label: value,
                insertText: value,
                detail: ctx.dynamicKey,
                kind: monaco.languages.CompletionItemKind.Value,
                sortText: `00_val_${i}`
            }));
        });
        return filterByPrefix(suggestions, ctx.prefix);
    }

    if (ctx.kind === 'statements') {
        CONTROL_SNIPPETS.forEach((snippet, i) => {
            suggestions.push(makeItem(monaco, {
                label: snippet.label,
                insertText: snippet.insertText,
                detail: `${snippet.detail} · ${snippet.block}`,
                documentation: `Inserts control flow that syncs to ${snippet.block}.`,
                kind: monaco.languages.CompletionItemKind.Snippet,
                sortText: `02_ctrl_${i}`,
                snippet: snippet.snippet
            }));
        });

        getSpriteMembersForCompletion()
            .filter(m => !m.property)
            .slice(0, 12)
            .forEach((member, i) => {
                suggestions.push(makeItem(monaco, {
                    label: `sprite.${member.name}`,
                    insertText: `sprite.${member.insertText}`,
                    detail: `${member.category} · ${member.block}`,
                    documentation: memberDoc(member),
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    sortText: `03_stmt_${i}`,
                    snippet: true
                }));
            });

        // Event hats are only offered in `events` context (after user types "#").
        // Listing them here too caused stale picks to insert a second "#".

        return suggestions;
    }

    // General — top-level helpers
    GLOBAL_FUNCTIONS.forEach((fn, i) => {
        suggestions.push(makeItem(monaco, {
            label: fn.name,
            insertText: fn.insertText,
            detail: 'Squeeze API',
            documentation: fn.doc,
            kind: monaco.languages.CompletionItemKind.Function,
            sortText: `05_fn_${i}`,
            snippet: true
        }));
    });

    suggestions.push(makeItem(monaco, {
        label: 'sprite',
        insertText: 'sprite',
        detail: 'Current sprite API object',
        documentation: 'Use sprite.move(), sprite.say(), etc. Type sprite. for methods.',
        kind: monaco.languages.CompletionItemKind.Variable,
        sortText: '05_sprite'
    }));

    suggestions.push(makeItem(monaco, {
        label: 'stage',
        insertText: 'stage',
        detail: 'Stage API object',
        documentation: 'Use stage.set_backdrop(), stage.next_backdrop(), etc.',
        kind: monaco.languages.CompletionItemKind.Variable,
        sortText: '05_stage'
    }));

    return suggestions;
}

function findMemberDoc (word) {
    const spriteMatch = word.match(/^sprite\.(\w+)$/);
    if (spriteMatch) {
        const members = getSpriteMembersForCompletion().filter(m => m.name === spriteMatch[1]);
        if (members.length) return members.map(memberDoc).join('\n\n');
    }
    const stageMatch = word.match(/^stage\.(\w+)$/);
    if (stageMatch) {
        const member = STAGE_MEMBERS.find(m => m.name === stageMatch[1]);
        if (member) return memberDoc(member);
    }
    const hat = EVENT_HATS.find(h => h.insertText.toLowerCase().includes(word.toLowerCase().replace(/^#\s*/, '')));
    if (hat) return `Event hat → ${hat.block}`;
    return null;
}

let registration = null;

export function registerSqueezeCompletions (monaco) {
    if (registration) return registration;

    const completionDisposable = monaco.languages.registerCompletionItemProvider('python', {
        // Do not use '#' — Monaco can duplicate it when accepting a suggestion.
        triggerCharacters: ['.', '"', "'", ' '],
        provideCompletionItems (model, position, _token, context) {
            const {vm, spriteName} = contextGetter();
            const ctx = detectContext(model, position);
            const project = getProjectContext(vm, spriteName);
            const suggestions = buildSuggestions(monaco, ctx, project);

            completionDebugLog('provide', {
                line: model.getLineContent(position.lineNumber),
                column: position.column,
                trigger: context?.triggerCharacter || null,
                kind: ctx.kind,
                hasPartial: ctx.hasPartial,
                prefix: ctx.prefix,
                samples: suggestions.slice(0, 3).map(s => ({
                    label: s.label,
                    insertText: s.insertText,
                    range: s.range
                        ? `${s.range.startColumn}-${s.range.endColumn}`
                        : null
                }))
            });

            return {suggestions, incomplete: false};
        }
    });

    const hoverDisposable = monaco.languages.registerHoverProvider('python', {
        provideHover (model, position) {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const line = model.getLineContent(position.lineNumber);
            const before = line.substring(0, word.startColumn - 1);
            const fullWord = before.endsWith('sprite.') || before.endsWith('stage.')
                ? `${before.endsWith('sprite.') ? 'sprite.' : 'stage.'}${word.word}`
                : word.word;

            if (line.trim().startsWith('#') && line.toLowerCase().includes('when')) {
                const doc = findMemberDoc(line.trim());
                if (doc) {
                    return {contents: [{value: `**Event hat**\n\n${doc}`}]};
                }
            }

            const doc = findMemberDoc(fullWord);
            if (doc) {
                return {contents: [{value: doc}]};
            }

            return null;
        }
    });

    registration = {
        dispose () {
            completionDisposable.dispose();
            hoverDisposable.dispose();
            registration = null;
        }
    };

    return registration;
}
