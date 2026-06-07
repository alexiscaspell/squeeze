import React, {useState, useEffect} from 'react';
import styles from './ScriptsLibraryPanel.css';

const ScriptsLibraryPanel = ({scriptsLibrary, currentCode, onLoadScript}) => {
    const [name, setName] = useState('');
    const [scripts, setScripts] = useState([]);

    const refresh = () => {
        if (!scriptsLibrary) return;
        setScripts(scriptsLibrary.list());
    };

    useEffect(() => {
        refresh();
    }, [scriptsLibrary]);

    const handleSave = () => {
        if (!name.trim() || !scriptsLibrary) return;
        scriptsLibrary.save(name.trim(), currentCode || '');
        setName('');
        refresh();
    };

    const handleDelete = scriptName => {
        if (!scriptsLibrary) return;
        scriptsLibrary.delete(scriptName);
        refresh();
    };

    return (
        <div className={styles.panel}>
            <div className={styles.title}>Scripts Library</div>
            <div className={styles.saveRow}>
                <input
                    className={styles.input}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Script name"
                />
                <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
            <ul className={styles.list}>
                {scripts.map(scriptName => (
                    <li
                        key={scriptName}
                        className={styles.item}
                    >
                        <button
                            type="button"
                            className={styles.loadBtn}
                            onClick={() => onLoadScript?.(scriptsLibrary.load(scriptName))}
                        >
                            {scriptName}
                        </button>
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(scriptName)}
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ScriptsLibraryPanel;
