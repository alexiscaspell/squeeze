export function isCompletionDebugEnabled () {
    return Boolean(window.__squeezeDebugCompletions);
}

export function completionDebugLog (...args) {
    if (isCompletionDebugEnabled()) {
        console.log('[Squeeze completions]', ...args);
    }
}

/**
 * Monaco sometimes leaves "## When ..." after accepting an event hat suggestion.
 * Remove the duplicate "#" when that pattern appears.
 */
export function fixDoubleEventHash (editor, monaco) {
    const model = editor.getModel();
    if (!model) return false;

    const edits = [];
    for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
        const line = model.getLineContent(lineNumber);
        const match = line.match(/^(\s*)##(\s+When\b.*)$/i);
        if (!match) continue;

        const secondHashColumn = match[1].length + 2;
        edits.push({
            range: new monaco.Range(lineNumber, secondHashColumn, lineNumber, secondHashColumn + 1),
            text: ''
        });
    }

    if (!edits.length) return false;

    completionDebugLog('fixed duplicate #', edits.map(e => ({
        line: e.range.startLineNumber,
        col: e.range.startColumn
    })));
    editor.executeEdits('squeeze-fix-double-hash', edits);
    return true;
}
