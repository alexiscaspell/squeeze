import {PythonToBlocks} from './PythonToBlocks.js';

/**
 * Replace the active sprite's block scripts with blocks generated from Python.
 */
export function syncPythonToBlocks (vm, spriteName, pythonCode) {
    const target = vm.runtime.targets.find(
        t => t.getName() === spriteName && !t.isStage
    );
    if (!target) {
        return {ok: false, error: `Sprite not found: ${spriteName}`};
    }

    const parsed = PythonToBlocks.parse(pythonCode, target);
    if (!parsed.ok) return parsed;

    const scriptIds = [...target.blocks.getScripts()];
    scriptIds.forEach(scriptId => target.blocks.deleteBlock(scriptId));

    Object.values(parsed.blocks).forEach(block => {
        target.blocks.createBlock({...block});
    });

    target.blocks.resetCache();

    if (vm.editingTarget && vm.editingTarget.getName() === spriteName) {
        vm.emitWorkspaceUpdate();
    } else {
        vm.runtime.emitProjectChanged();
    }

    return {ok: true, warnings: parsed.warnings};
}
