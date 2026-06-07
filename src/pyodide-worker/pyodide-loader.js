const DEFAULT_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/';

export function getPyodideUrls () {
    const urls = [];
    const envUrl = typeof process !== 'undefined' && process.env && process.env.REACT_APP_PYODIDE_URL;
    if (envUrl) urls.push(envUrl);
    urls.push('/pyodide/');
    if (!envUrl || !envUrl.includes('jsdelivr.net')) {
        urls.push(DEFAULT_CDN);
    }
    return [...new Set(urls.map(url => (url.endsWith('/') ? url : `${url}/`)))];
}

export async function loadPyodideScript (urls) {
    let lastError = null;
    for (const baseUrl of urls) {
        try {
            // importScripts is not re-entrant; only load the script once.
            if (typeof loadPyodide !== 'function') {
                importScripts(`${baseUrl}pyodide.js`);
            }
            if (typeof loadPyodide === 'function') {
                return await loadPyodide({indexURL: baseUrl});
            }
            lastError = new Error(`Pyodide loader missing at ${baseUrl}`);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Failed to load Pyodide from CDN and self-hosted fallback');
}
