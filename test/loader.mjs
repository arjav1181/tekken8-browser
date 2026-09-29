import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || 'js');

function resolveId(fromId, spec) {
    if (!spec.startsWith('.')) return null;
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), spec));
    for (const c of [rel, rel + '.js', rel + '/index.js']) {
        const f = path.join(ROOT, c);
        if (fs.existsSync(f) && fs.statSync(f).isFile()) return c;
    }
    throw new Error(`cannot resolve "${spec}" from "${fromId}"`);
}

const cache = new Map();
const loading = new Set();

function transform(src) {
    const exported = [];

    src = src.replace(
        /^\s*import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"];?\s*$/gm,
        (m, clause, spec) => {
            const names = [];
            const braced = clause.match(/\{([\s\S]*)\}/);
            if (braced) {
                for (const part of braced[1].split(',')) {
                    const t = part.trim();
                    if (!t) continue;
                    const [orig, alias] = t.split(/\s+as\s+/).map(s => s.trim());
                    names.push(alias ? `${orig}: ${alias}` : orig);
                }
            }
            const ns = clause.match(/^\*\s+as\s+([\w$]+)/);
            if (ns) return `const ${ns[1]} = require(${JSON.stringify(spec)});`;
            const def = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
            if (def) names.push(`${def[1]}: ${def[1]}`);
            return names.length ? `const { ${names.join(', ')} } = require(${JSON.stringify(spec)});` : '';
        }
    );

    src = src.replace(/^\s*import\s*['"][^'"]+['"];?\s*$/gm, '');

    src = src.replace(
        /^(\s*)export\s+(async\s+)?(function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
        (m, indent, asyncKw, kind, name) => {
            exported.push(name);
            return `${indent}${asyncKw || ''}${kind} ${name}`;
        }
    );

    src = src.replace(/^\s*export\s*\{([^}]*)\};?\s*$/gm, (m, names) => {
        for (const part of names.split(',')) {
            const t = part.trim();
            if (!t) continue;
            const [orig, alias] = t.split(/\s+as\s+/).map(s => s.trim());
            exported.push(alias || orig);
        }
        return '';
    });

    src = src.replace(/^\s*export\s+default\s+/gm, 'module.exports.default = ');

    if (exported.length) {
        src += `\n;for (const __n of ${JSON.stringify(exported)}) { exports[__n] = eval(__n); }\n`;
    }

    return src;
}

export function load(id) {
    if (cache.has(id)) return cache.get(id);

    const file = path.join(ROOT, id);
    const src = transform(fs.readFileSync(file, 'utf8'));
    const exportsObj = {};
    cache.set(id, exportsObj);
    loading.add(id);

    const req = (spec) => load(resolveId(id, spec));

    let fn;
    try {
        fn = new Function('exports', 'require', 'module', '__filename', '__dirname', src);
    } catch (e) {
        e.message = `${id}: ${e.message}`;
        throw e;
    }

    fn.call(exportsObj, exportsObj, req, { exports: exportsObj }, file, path.dirname(file));

    loading.delete(id);
    return cache.get(id) || exportsObj;
}

export const modules = { cache, loading };
