/**
 * Builds scratch-vm block objects (runtime format) for PythonToBlocks.
 */
export class ScratchBlockBuilder {
    constructor () {
        this.blocks = {};
        this._idCounter = 0;
    }

    id () {
        this._idCounter += 1;
        return `sq${this._idCounter}`;
    }

    numShadow (value) {
        const blockId = this.id();
        this.blocks[blockId] = {
            id: blockId,
            opcode: 'math_number',
            fields: {NUM: {name: 'NUM', value: String(value)}},
            inputs: {},
            next: null,
            parent: null,
            shadow: true
        };
        return blockId;
    }

    textShadow (value) {
        const blockId = this.id();
        this.blocks[blockId] = {
            id: blockId,
            opcode: 'text',
            fields: {TEXT: {name: 'TEXT', value: String(value)}},
            inputs: {},
            next: null,
            parent: null,
            shadow: true
        };
        return blockId;
    }

    menuShadow (opcode, fieldName, value) {
        const blockId = this.id();
        this.blocks[blockId] = {
            id: blockId,
            opcode,
            fields: {[fieldName]: {name: fieldName, value: String(value)}},
            inputs: {},
            next: null,
            parent: null,
            shadow: true
        };
        return blockId;
    }

    command (opcode, fields = {}, inputs = {}, opts = {}) {
        const blockId = this.id();
        const resolvedFields = {};
        Object.entries(fields).forEach(([key, val]) => {
            resolvedFields[key] = typeof val === 'object' && val !== null && 'name' in val
                ? val
                : {name: key, value: String(val)};
        });
        const resolvedInputs = {};
        Object.entries(inputs).forEach(([key, shadowId]) => {
            if (shadowId) {
                resolvedInputs[key] = {name: key, block: shadowId, shadow: shadowId};
            }
        });
        this.blocks[blockId] = {
            id: blockId,
            opcode,
            fields: resolvedFields,
            inputs: resolvedInputs,
            next: null,
            parent: opts.parent || null,
            topLevel: Boolean(opts.topLevel),
            x: opts.x,
            y: opts.y,
            shadow: false
        };
        return blockId;
    }

    hat (opcode, fields = {}, y = 50) {
        return this.command(opcode, fields, {}, {topLevel: true, x: 50, y});
    }

    chain (blockIds) {
        const ids = blockIds.filter(Boolean);
        for (let i = 0; i < ids.length - 1; i++) {
            const current = this.blocks[ids[i]];
            const next = this.blocks[ids[i + 1]];
            if (current && next) {
                current.next = ids[i + 1];
                next.parent = ids[i];
            }
        }
        return ids[0] || null;
    }

    attachSubstack (parentId, inputName, childIds) {
        const ids = childIds.filter(Boolean);
        if (!ids.length || !this.blocks[parentId]) return;
        this.blocks[parentId].inputs[inputName] = {
            name: inputName,
            block: ids[0],
            shadow: null
        };
        this.blocks[ids[0]].parent = parentId;
        this.chain(ids);
    }
}
