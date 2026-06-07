import JSZip from 'jszip';

export const SQUEEZE_VERSION = '1.0';

export function injectSqueezeMetadata (projectJSON, squeezeData) {
    const projectData = typeof projectJSON === 'string' ? JSON.parse(projectJSON) : projectJSON;
    projectData.squeeze = {
        version: SQUEEZE_VERSION,
        scripts: squeezeData.scripts || {},
        spriteCode: squeezeData.spriteCode || {}
    };
    return JSON.stringify(projectData);
}

export const saveProjectWithPython = async (vm, squeezeData) => {
    const projectJSON = vm.toJSON();
    const enrichedJSON = injectSqueezeMetadata(projectJSON, squeezeData);

    const zip = new JSZip();
    zip.file('project.json', enrichedJSON);

    const projectData = JSON.parse(enrichedJSON);
    const assetIds = new Set();
    for (const target of projectData.targets || []) {
        for (const costume of target.costumes || []) {
            if (costume.assetId) assetIds.add(`${costume.assetId}.${costume.dataFormat}`);
        }
        for (const sound of target.sounds || []) {
            if (sound.assetId) assetIds.add(`${sound.assetId}.${sound.dataFormat}`);
        }
    }

    for (const asset of vm.assets || []) {
        const assetData = await asset.decodePromise;
        zip.file(`${asset.assetId}.${asset.dataFormat}`, assetData);
    }

    return zip.generateAsync({type: 'blob'});
};

export const loadProjectWithPython = async (zipBlob, vm, scriptsLibrary, onSpriteCodeLoaded) => {
    const zip = await JSZip.loadAsync(zipBlob);
    const projectJSON = await zip.file('project.json').async('string');
    const projectData = JSON.parse(projectJSON);

    if (projectData.squeeze?.scripts && scriptsLibrary) {
        Object.entries(projectData.squeeze.scripts).forEach(([name, code]) => {
            scriptsLibrary.save(name, code);
        });
    }

    if (projectData.squeeze?.spriteCode && onSpriteCodeLoaded) {
        onSpriteCodeLoaded(projectData.squeeze.spriteCode);
    }

    await vm.loadProject(projectJSON);
    return projectData.squeeze || null;
};

export const extractSqueezeFromProject = projectJSON => {
    const projectData = typeof projectJSON === 'string' ? JSON.parse(projectJSON) : projectJSON;
    return projectData.squeeze || null;
};
