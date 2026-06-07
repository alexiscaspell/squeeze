const STORAGE_KEY = 'squeeze.scripts';

export class ScriptsLibrary {
    constructor (vm) {
        this.vm = vm;
        this.vm.runtime.squeezeScripts = {};
    }

    save (name, code) {
        this.vm.runtime.squeezeScripts[name] = code;
        const all = this.getAll();
        all[name] = code;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }

    load (name) {
        return this.vm.runtime.squeezeScripts[name];
    }

    getAll () {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }

    delete (name) {
        delete this.vm.runtime.squeezeScripts[name];
        const all = this.getAll();
        delete all[name];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }

    loadAllFromStorage () {
        const all = this.getAll();
        Object.assign(this.vm.runtime.squeezeScripts, all);
    }

    list () {
        return Object.keys(this.vm.runtime.squeezeScripts);
    }
}
