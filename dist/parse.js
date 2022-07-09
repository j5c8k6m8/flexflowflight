// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const containerDirection = [
    'main',
    'cross',
    'row',
    'column',
    'row_reverse',
    'column_reverse'
];
const isContainerDirection = (c)=>{
    return containerDirection.includes(c);
};
const align = [
    'start',
    'center',
    'end'
];
const isAlign = (c)=>{
    return align.includes(c);
};
const parseUnitAttr = (map)=>{
    const ret = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
    }
    if (map.has('align_items')) {
        ret.alignItems = getAlign('align_items', map);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
};
const parseGroupAttr = (map)=>{
    const ret = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
    }
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('resource')) {
        ret.disp = map.get('resource');
    }
    if (map.has('tag')) {
        ret.tag = map.get('tag')?.split(/[\s,]/);
    }
    if (map.has('align_items')) {
        ret.alignItems = getAlign('align_items', map);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
};
const parseCellAttr = (map)=>{
    const ret = {};
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('resource')) {
        ret.disp = map.get('resource');
    }
    if (map.has('tag')) {
        ret.tag = map.get('tag')?.split(/[\s,]/);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
};
const parseLinkAttr = (map)=>{
    const ret = {};
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    return ret;
};
const addRootAttr = (ast, map)=>{
    ast.attr = ast.attr || {};
    const css = map.get('css');
    if (css) {
        ast.attr.css = css;
    }
    const alignItems = map.get('align_items');
    if (alignItems) {
        ast.attr.alignItems = getAlign('align_items', map);
    }
    const direction = getDirection(map);
    if (direction) {
        ast.attr.direction = direction;
    }
};
const getDirection = (map)=>{
    const t = map.get('direction');
    if (isContainerDirection(t)) {
        return t;
    } else {
        return null;
    }
};
const getAlign = (key, map)=>{
    const t = map.get(key);
    if (isAlign(t)) {
        return t;
    } else {
        return null;
    }
};
const nameSymbol = Symbol();
const isNameCell = (c)=>{
    return c[nameSymbol];
};
const parse = async (fl3, { pre , post  } = {})=>{
    if (pre) {
        fl3 = await pre(fl3);
    }
    fl3 = fl3.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let ast = {
        nodes: [],
        links: []
    };
    const nameMap = {
        container: ast,
        childMap: new Map(),
        implicit: true
    };
    const state = {
        first: true,
        currentPath: [],
        currentContainer: ast,
        fpath: null,
        slink: null
    };
    const pos = {
        i: 0,
        l: 1,
        c: 1
    };
    parseGlobal(fl3, ast, state, pos, nameMap);
    if (post) {
        ast = await post(ast);
    }
    return ast;
};
const parseGlobal = (fl3, ast, state, pos, nameMap)=>{
    skipCommentAndBlank(fl3, pos);
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        switch(cur){
            case "[":
                nextChar(pos);
                parseUnit(fl3, ast, state, pos, nameMap);
                break;
            case "(":
                nextChar(pos);
                parseCell(fl3, ast, state, pos, nameMap);
                break;
            case "{":
                if (state.slink) {
                    throw new Error(`[E010101] invalid char at ${pos.l}:${pos.c}`);
                }
                nextChar(pos);
                parseLink(fl3, ast, state, pos);
                break;
            case "#":
                nextChar(pos);
                parseComment(fl3, pos);
                break;
            case "-":
                if (state.first) {
                    nextChar(pos);
                    let i = 1;
                    while(fl3.length > pos.i){
                        const cur = fl3[pos.i];
                        if (cur === "-") {
                            nextChar(pos);
                            i++;
                        } else {
                            break;
                        }
                    }
                    if (i < 3) {
                        throw new Error(`[E010102] invalid char at ${pos.l}:${pos.c}`);
                    }
                    parseRoot(fl3, ast, state, pos);
                } else {
                    parseSlink(fl3, state, pos);
                }
                break;
            case "|":
            case "?":
                parseSlink(fl3, state, pos);
                break;
            default:
                if (/\w/.test(cur)) {
                    if (state.currentPath.length === 0) {
                        parseRootAttr(fl3, ast, pos);
                    } else {
                        throw new Error(`[E010103] invalid char at ${pos.l}:${pos.c}`);
                    }
                } else if (/\s/.test(cur)) {
                    nextChar(pos);
                } else {
                    throw new Error(`[E010104] invalid char at ${pos.l}:${pos.c}`);
                }
        }
    }
};
const parseUnit = (fl3, ast, state, pos, nameMap)=>{
    const L = pos.l;
    const C = pos.c;
    if (fl3.length <= pos.i) {
        throw new Error(`[E010201] missing close Unit at ${L}:${C}`);
    }
    const pre = fl3[pos.i];
    if (pre === "[") {
        nextChar(pos);
        parseGroup(fl3, ast, state, pos, nameMap);
    } else {
        skipCommentAndBlank(fl3, pos);
        const path = parseAbsolutePath(fl3, state, pos);
        let closed = false;
        const attrMap = new Map();
        while(fl3.length > pos.i){
            const cur = fl3[pos.i];
            if (cur === "]") {
                nextChar(pos);
                closed = true;
                break;
            } else if (!/\s/.test(cur)) {
                throw new Error(`[E010202] need blank between name and attr at ${L}:${C}`);
            } else {
                skipCommentAndBlank(fl3, pos);
                const [k, v] = parseAttr(fl3, pos);
                attrMap.set(k, v);
            }
        }
        if (!closed) {
            throw new Error(`[E010203] missing close Unit at ${L}:${C}`);
        }
        const newLineFlg = skipCommentAndBlank(fl3, pos);
        addUnit(nameMap, path, attrMap, pos);
        if (state.fpath && state.slink) {
            addLink(ast, pathToAccessName(state.fpath), pathToAccessName(path), state.slink.direction, state.slink.attr);
        }
        if (newLineFlg) {
            if (state.first) {
                state.currentPath = path;
            }
            state.first = true;
            state.fpath = null;
            state.slink = null;
        } else {
            state.first = false;
            state.fpath = path;
            state.slink = null;
        }
    }
};
const parseGroup = (fl3, ast, state, pos, nameMap)=>{
    const L = pos.l;
    const C = pos.c;
    skipCommentAndBlank(fl3, pos);
    const path = parseAbsolutePath(fl3, state, pos);
    let closed = false;
    const attrMap = new Map();
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === "]") {
            nextChar(pos);
            if (fl3.length <= pos.i) {
                throw new Error(`[E010301] missing close Group at ${L}:${C}`);
            }
            const aft = fl3[pos.i];
            if (aft === "]") {
                nextChar(pos);
                closed = true;
                break;
            } else {
                throw new Error(`[E010302] missing close Group at ${L}:${C}`);
            }
        } else if (!/\s/.test(cur)) {
            throw new Error(`[E010303] need blank between name and attr at ${L}:${C}`);
        } else {
            skipCommentAndBlank(fl3, pos);
            const [k, v] = parseAttr(fl3, pos);
            attrMap.set(k, v);
        }
    }
    if (!closed) {
        throw new Error(`[E010304] missing close Unit at ${L}:${C}`);
    }
    const newLineFlg = skipCommentAndBlank(fl3, pos);
    addGroup(nameMap, path, attrMap, pos);
    if (state.fpath && state.slink) {
        addLink(ast, pathToAccessName(state.fpath), pathToAccessName(path), state.slink.direction, state.slink.attr);
    }
    if (newLineFlg) {
        if (state.first) {
            state.currentPath = path;
        }
        state.first = true;
        state.fpath = null;
        state.slink = null;
    } else {
        state.first = false;
        state.fpath = path;
        state.slink = null;
    }
};
const parseCell = (fl3, ast, state, pos, nameMap)=>{
    const L = pos.l;
    const C = pos.c;
    skipCommentAndBlank(fl3, pos);
    const path = parseRelativePath(fl3, state, pos);
    let closed = false;
    const attrMap = new Map();
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === ")") {
            nextChar(pos);
            closed = true;
            break;
        } else if (!/\s/.test(cur)) {
            throw new Error(`[E010401] need blank between name and attr at ${L}:${C}`);
        } else {
            skipCommentAndBlank(fl3, pos);
            const [k, v] = parseAttr(fl3, pos);
            attrMap.set(k, v);
        }
    }
    if (!closed) {
        throw new Error(`[E010402] missing close Unit at ${L}:${C}`);
    }
    const newLineFlg = skipCommentAndBlank(fl3, pos);
    addCell(nameMap, path, attrMap, pos);
    if (state.fpath && state.slink) {
        addLink(ast, pathToAccessName(state.fpath), pathToAccessName(path), state.slink.direction, state.slink.attr);
    }
    if (newLineFlg) {
        state.first = true;
        state.fpath = null;
        state.slink = null;
    } else {
        state.first = false;
        state.fpath = path;
        state.slink = null;
    }
};
const parseLink = (fl3, ast, state, pos)=>{
    if (state.slink) {
        throw new Error(`[E010501] invalid char at ${pos.l}:${pos.c}`);
    }
    const L = pos.l;
    const C = pos.c;
    skipCommentAndBlank(fl3, pos);
    const fref = parseRefName(fl3, state, pos);
    skipCommentAndBlank(fl3, pos);
    const direction = parseLinkType(fl3, pos);
    skipCommentAndBlank(fl3, pos);
    const tref = parseRefName(fl3, state, pos);
    let closed = false;
    const attrMap = new Map();
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === "}") {
            nextChar(pos);
            closed = true;
            break;
        } else if (!/\s/.test(cur)) {
            throw new Error(`[E010502] need blank between name and attr at ${L}:${C}`);
        } else {
            skipCommentAndBlank(fl3, pos);
            const [k, v] = parseAttr(fl3, pos);
            attrMap.set(k, v);
        }
    }
    if (!closed) {
        throw new Error(`[E010503] missing close Unit at ${L}:${C}`);
    }
    const newLineFlg = skipCommentAndBlank(fl3, pos);
    addLink(ast, fref, tref, direction, attrMap);
    if (newLineFlg) {
        state.first = true;
    } else {
        state.first = false;
    }
    state.fpath = null;
    state.slink = null;
};
const parseRoot = (fl3, ast, state, pos)=>{
    if (state.slink) {
        throw new Error(`[E010601] invalid char at ${pos.l}:${pos.c}`);
    }
    skipCommentAndBlank(fl3, pos);
    if (fl3.length <= pos.i) {
        const cur = fl3[pos.i];
        if (/\w/.test(cur)) {
            const attrMap = new Map();
            while(fl3.length > pos.i){
                const [k, v] = parseAttr(fl3, pos);
                attrMap.set(k, v);
                if (fl3.length <= pos.i) {
                    throw new Error(`[E010602] need blank between name and attr at ${pos.l}:${pos.c}`);
                }
                const cur = fl3[pos.i];
                if (!/\s/.test(cur)) {
                    throw new Error(`[E010602] need blank between name and attr at ${pos.l}:${pos.c}`);
                }
                const newLineFlg = skipCommentAndBlank(fl3, pos);
                if (newLineFlg) {
                    break;
                }
            }
            addRootAttr(ast, attrMap);
        }
    }
    state.currentPath = [];
    state.first = true;
    state.fpath = null;
    state.slink = null;
};
const parseRootAttr = (fl3, ast, pos)=>{
    const attrMap = new Map();
    while(fl3.length > pos.i){
        const [k, v] = parseAttr(fl3, pos);
        attrMap.set(k, v);
        if (fl3.length <= pos.i) {
            throw new Error(`[E010702] need blank between name and attr at ${pos.l}:${pos.c}`);
        }
        const cur = fl3[pos.i];
        if (!/\s/.test(cur)) {
            throw new Error(`[E010702] need blank between name and attr at ${pos.l}:${pos.c}`);
        }
        const newLineFlg = skipCommentAndBlank(fl3, pos);
        if (newLineFlg) {
            break;
        }
    }
    addRootAttr(ast, attrMap);
};
const parseSlink = (fl3, state, pos)=>{
    if (!state.fpath) {
        throw new Error(`[E010801] invalid char at ${pos.l}:${pos.c}`);
    }
    const direction = parseLinkType(fl3, pos);
    state.slink = {
        direction: direction,
        attr: new Map()
    };
};
const parseComment = (fl3, pos)=>{
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === "\n") {
            break;
        } else {
            nextChar(pos);
        }
    }
};
const parseAbsolutePath = (fl3, state, pos)=>{
    const ret = [];
    if (fl3.length <= pos.i) {
        throw new Error(`[E011101] invalid terminated at ${pos.l}:${pos.c}`);
    }
    const first = fl3[pos.i];
    if (first === '.') {
        ret.push(...state.currentPath);
        nextChar(pos);
    }
    while(fl3.length > pos.i){
        const t = parseName(fl3, pos);
        ret.push(t);
        if (fl3.length <= pos.i) {
            break;
        }
        const cur2 = fl3[pos.i];
        if (cur2 === '.') {
            nextChar(pos);
        } else {
            break;
        }
    }
    return ret;
};
const parseRelativePath = (fl3, state, pos)=>{
    const ret = state.currentPath.concat();
    while(fl3.length > pos.i){
        const t = parseName(fl3, pos);
        ret.push(t);
        if (fl3.length <= pos.i) {
            break;
        }
        const cur2 = fl3[pos.i];
        if (cur2 === '.') {
            nextChar(pos);
        } else {
            break;
        }
    }
    return ret;
};
const parseName = (fl3, pos)=>{
    if (fl3.length <= pos.i) {
        throw new Error(`[E011201] invalid terminated at ${pos.l}:${pos.c}`);
    }
    const cur = fl3[pos.i];
    if (/["']/.test(cur)) {
        nextChar(pos);
        const t = parseQuote(fl3, pos, cur);
        if (!t) {
            throw new Error(`[E011202] invalid name at ${pos.l}:${pos.c}`);
        }
        return t;
    } else {
        const t = parseSimpleName(fl3, pos);
        if (!t) {
            throw new Error(`[E011203] invalid name at ${pos.l}:${pos.c}`);
        }
        return t;
    }
};
const parseRefName = (fl3, state, pos)=>{
    if (fl3.length <= pos.i) {
        throw new Error(`[E011301] invalid terminated at ${pos.l}:${pos.c}`);
    }
    const first = fl3[pos.i];
    if (first === '&' || first === '$') {
        nextChar(pos);
        return first + parseSimpleName(fl3, pos);
    } else {
        const absPath = parseAbsolutePath(fl3, state, pos);
        return pathToAccessName(absPath);
    }
};
const parseSimpleName = (fl3, pos)=>{
    const start = pos.i;
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (/\w/.test(cur)) {
            nextChar(pos);
        } else {
            break;
        }
    }
    return fl3.substring(start, pos.i);
};
const parseSimpleValue = (fl3, pos)=>{
    const start = pos.i;
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (/[\w,]/.test(cur)) {
            nextChar(pos);
        } else {
            break;
        }
    }
    return fl3.substring(start, pos.i);
};
const parseQuote = (fl3, pos, quote)=>{
    const start = pos.i;
    const L = pos.l;
    const C = pos.c;
    let escape = false;
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === quote) {
            if (escape) {
                nextChar(pos);
                escape = false;
            } else {
                const ret = fl3.substring(start, pos.i);
                nextChar(pos);
                return ret.replace(/\\\\/g, "\\").replace(/\\'/g, "'").replace(/\\"/g, '"');
            }
        } else if (cur === "\\") {
            if (escape) {
                nextChar(pos);
                escape = false;
            } else {
                nextChar(pos);
                escape = true;
            }
        } else if (/["']/.test(cur)) {
            if (escape) {
                escape = false;
            }
            nextChar(pos);
        } else {
            if (escape) {
                throw new Error(`[E011501] invalid escape at ${pos.l}:${pos.c}`);
            }
            nextChar(pos);
        }
    }
    throw new Error(`[E011502] missing close quote at ${L}:${C}`);
};
const parseLinkType = (fl3, pos)=>{
    let ftypeInverse = false;
    let ttypeInverse = false;
    let firstChar = null;
    let secondChar = null;
    while(fl3.length > pos.i){
        const cur = fl3[pos.i];
        if (cur === "-" || cur === "|") {
            if (firstChar) {
                if (secondChar) {
                    throw new Error(`[E011601] invalid link relation at ${pos.l}:${pos.c}`);
                } else {
                    secondChar = cur;
                }
            } else {
                firstChar = cur;
            }
        } else if (cur === "!") {
            if (firstChar) {
                ttypeInverse = true;
                nextChar(pos);
                break;
            } else {
                if (ftypeInverse) {
                    throw new Error(`[E011602] invalid link relation at ${pos.l}:${pos.c}`);
                } else {
                    ftypeInverse = true;
                }
            }
        } else {
            break;
        }
        nextChar(pos);
    }
    if (!firstChar) {
        throw new Error(`[E011604] invalid link relation at ${pos.l}:${pos.c}`);
    }
    if (!secondChar) {
        secondChar = firstChar;
    }
    return [
        firstCharToDirection(firstChar, ftypeInverse),
        secondCharToDirection(secondChar, ttypeInverse), 
    ];
};
const parseAttr = (fl3, pos)=>{
    const k = parseSimpleName(fl3, pos);
    if (!k) {
        throw new Error(`[E011701] invalid attr at ${pos.l}:${pos.c}`);
    }
    if (fl3.length <= pos.i) {
        throw new Error(`[E011702] attr need '=' symbol at ${pos.l}:${pos.c}`);
    }
    const cur = fl3[pos.i];
    if (cur !== '=') {
        throw new Error(`[E011703] attr need '=' symbol at ${pos.l}:${pos.c}`);
    }
    nextChar(pos);
    if (fl3.length <= pos.i) {
        throw new Error(`[E011704] attr need value at ${pos.l}:${pos.c}`);
    }
    const cur2 = fl3[pos.i];
    if (/["']/.test(cur2)) {
        nextChar(pos);
        const v = parseQuote(fl3, pos, cur2);
        return [
            k,
            v
        ];
    } else {
        const v = parseSimpleValue(fl3, pos);
        if (!v) {
            throw new Error(`[E011705] attr need value at ${pos.l}:${pos.c}`);
        }
        return [
            k,
            v
        ];
    }
};
const skipCommentAndBlank = (fl3, pos)=>{
    let newLineFlg = false;
    while(fl3.length > pos.i){
        const cur1 = fl3[pos.i];
        if (cur1 === "#") {
            nextChar(pos);
            while(fl3.length > pos.i){
                const cur2 = fl3[pos.i];
                if (cur2 === "\n") {
                    nextLine(pos);
                    newLineFlg = true;
                    break;
                } else {
                    nextChar(pos);
                }
            }
        } else if (cur1 === "\n") {
            nextLine(pos);
            newLineFlg = true;
        } else {
            if (/\s/.test(cur1)) {
                nextChar(pos);
            } else {
                break;
            }
        }
    }
    return newLineFlg;
};
const addUnit = (nameMap, path, attrMap, pos)=>{
    let currentMap = nameMap;
    path.forEach((containerName, i)=>{
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {
                const tmpUnit = {
                    type: "Unit",
                    name: containerName,
                    nodes: []
                };
                if (attrMap.size !== 0) {
                    tmpUnit.attr = parseUnitAttr(attrMap);
                }
                currentMap.container.nodes.push(tmpUnit);
                nextMap = {
                    container: tmpUnit,
                    implicit: attrMap.size === 0,
                    childMap: new Map()
                };
                currentMap.childMap.set(containerName, nextMap);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {
                throw new Error(`[E013101] cannot override cell define at ${pos.l}:${pos.c}`);
            } else {
                throw new Error(`[E013102] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {
                if (attrMap.size !== 0) {
                    if ('type' in nextMap.container && nextMap.container.type === 'Group') {
                        throw new Error(`[E013103] cannot override Group define at ${pos.l}:${pos.c}`);
                    } else if (nextMap.implicit) {
                        nextMap.container.attr = parseUnitAttr(attrMap);
                    } else {
                        throw new Error(`[E013104] duplicated Unit attr define at ${pos.l}:${pos.c}`);
                    }
                }
            } else {
                currentMap = nextMap;
            }
        }
    });
};
const addGroup = (nameMap, path, attrMap, pos)=>{
    let currentMap = nameMap;
    path.forEach((containerName, i)=>{
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {
                const tmpGroup = {
                    type: "Group",
                    name: containerName,
                    nodes: []
                };
                if (attrMap.size !== 0) {
                    tmpGroup.attr = parseGroupAttr(attrMap);
                }
                currentMap.container.nodes.push(tmpGroup);
                nextMap = {
                    container: tmpGroup,
                    implicit: false,
                    childMap: new Map()
                };
                currentMap.childMap.set(containerName, nextMap);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {
                throw new Error(`[E013201] cannot override cell define at ${pos.l}:${pos.c}`);
            } else {
                throw new Error(`[E013202] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {
                if (attrMap.size !== 0) {
                    if ('type' in nextMap.container && nextMap.container.type === 'Group') {
                        throw new Error(`[E013203] duplicated Group define at ${pos.l}:${pos.c}`);
                    } else if (nextMap.implicit) {
                        nextMap.container.attr = parseGroupAttr(attrMap);
                    } else {
                        throw new Error(`[E013204] already exists Unit with attr define at ${pos.l}:${pos.c}`);
                    }
                }
            } else {
                currentMap = nextMap;
            }
        }
    });
};
const addCell = (nameMap, path, attrMap, pos)=>{
    let currentMap = nameMap;
    path.forEach((containerName, i)=>{
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {
                const cell = {
                    type: "Cell",
                    name: containerName
                };
                if (attrMap.size !== 0) {
                    cell.attr = parseCellAttr(attrMap);
                }
                currentMap.container.nodes.push(cell);
                const nameCell = {
                    [nameSymbol]: true,
                    cell: cell,
                    implicit: attrMap.size === 0
                };
                currentMap.childMap.set(containerName, nameCell);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {
                if (nextMap.implicit) {
                    nextMap.cell.attr = parseCellAttr(attrMap);
                } else {
                    throw new Error(`[E013301] duplicated cell attr define at ${pos.l}:${pos.c}`);
                }
            } else {
                throw new Error(`[E013302] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {
                if (attrMap.size !== 0) {
                    if ('type' in nextMap.container && nextMap.container.type === 'Group') {
                        throw new Error(`[E013303] already exists Group define at ${pos.l}:${pos.c}`);
                    } else {
                        throw new Error(`[E013304] already exists Unit define at ${pos.l}:${pos.c}`);
                    }
                }
            } else {
                currentMap = nextMap;
            }
        }
    });
};
const addLink = (ast, from, to, direction, attrMap)=>{
    const link = {
        box: [
            from,
            to
        ],
        direction: direction
    };
    if (attrMap.size !== 0) {
        link.attr = parseLinkAttr(attrMap);
    }
    ast.links.push(link);
};
const addImplicitUnit = (containerName, currentMap)=>{
    const tmpUnit = {
        type: "Unit",
        name: containerName,
        nodes: []
    };
    currentMap.container.nodes.push(tmpUnit);
    const nextMap = {
        container: tmpUnit,
        implicit: true,
        childMap: new Map()
    };
    currentMap.childMap.set(containerName, nextMap);
    return nextMap;
};
const nextLine = (pos)=>{
    pos.l++;
    pos.c = 1;
    pos.i++;
};
const nextChar = (pos)=>{
    pos.c++;
    pos.i++;
};
const pathToAccessName = (path)=>{
    return path.map((name)=>{
        if (/^\w+$/.test(name)) {
            return name;
        } else {
            return '"' + name.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        }
    }).join(".");
};
const firstCharToDirection = (__char, inverse)=>{
    if (__char === '-') {
        return inverse ? 'main_reverse' : 'main';
    } else if (__char === '|') {
        return inverse ? 'cross_reverse' : 'cross';
    } else {
        const _ = __char;
        return _;
    }
};
const secondCharToDirection = (__char, inverse)=>{
    if (__char === '-') {
        return inverse ? 'main' : 'main_reverse';
    } else if (__char === '|') {
        return inverse ? 'cross' : 'cross_reverse';
    } else {
        const _ = __char;
        return _;
    }
};
function getReverse(direct) {
    if (direct === 0) {
        return 2;
    } else if (direct === 1) {
        return 3;
    } else if (direct === 2) {
        return 0;
    } else if (direct === 3) {
        return 1;
    } else {
        const _ = direct;
        return _;
    }
}
const getCompassFull = (compass)=>{
    const mainDirection = compass[0];
    if (mainDirection === 0) {
        const crossDirection = compass[1];
        if (crossDirection === 1) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else if (crossDirection === 3) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else {
            const _ = crossDirection;
            return _;
        }
    } else if (mainDirection === 1) {
        const crossDirection = compass[1];
        if (crossDirection === 0) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else if (crossDirection === 2) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else {
            const _ = crossDirection;
            return _;
        }
    } else if (mainDirection === 2) {
        const crossDirection = compass[1];
        if (crossDirection === 1) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else if (crossDirection === 3) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else {
            const _ = crossDirection;
            return _;
        }
    } else if (mainDirection === 3) {
        const crossDirection = compass[1];
        if (crossDirection === 0) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else if (crossDirection === 2) {
            return [
                mainDirection,
                crossDirection,
                getReverse(mainDirection),
                getReverse(crossDirection)
            ];
        } else {
            const _ = crossDirection;
            return _;
        }
    } else {
        const _ = mainDirection;
        return _;
    }
};
const getCompassAxis = (compass)=>{
    const mainDirection = compass[0];
    if (mainDirection === 0 || mainDirection === 2) {
        return [
            0,
            1
        ];
    } else if (mainDirection === 1 || mainDirection === 3) {
        return [
            1,
            0
        ];
    } else {
        const _ = mainDirection;
        return _;
    }
};
const getMappingCompass = (c1, c2)=>{
    if (c1[0] === c2[0]) {
        if (c1[1] === c2[1]) {
            return [
                0,
                1
            ];
        } else {
            return [
                0,
                3
            ];
        }
    } else if (c1[0] === getReverse(c2[0])) {
        if (c1[1] === c2[1]) {
            return [
                2,
                1
            ];
        } else {
            return [
                2,
                3
            ];
        }
    } else if (c1[0] === c2[1]) {
        if (c1[1] === c2[0]) {
            return [
                1,
                0
            ];
        } else {
            return [
                1,
                2
            ];
        }
    } else {
        if (c1[1] === c2[0]) {
            return [
                3,
                0
            ];
        } else {
            return [
                3,
                2
            ];
        }
    }
};
const getMappingCompassFull = (c1, c2)=>{
    return getCompassFull(getMappingCompass(c1, c2));
};
const isSameAxisDirect = (d1, d2)=>{
    if (d1 === 0 || d1 === 2) {
        if (d2 === 0 || d2 === 2) {
            return true;
        } else if (d2 === 1 || d2 === 3) {
            return false;
        } else {
            const _ = d2;
            return _;
        }
    } else if (d1 === 1 || d1 === 3) {
        if (d2 === 0 || d2 === 2) {
            return false;
        } else if (d2 === 1 || d2 === 3) {
            return true;
        } else {
            const _ = d2;
            return _;
        }
    } else {
        const _ = d1;
        return _;
    }
};
const getAnotherAxisByDirect = (d)=>{
    if (d === 0 || d === 2) {
        return 1;
    } else if (d === 1 || d === 3) {
        return 0;
    } else {
        const _ = d;
        return _;
    }
};
const parseDocAttr = (l1)=>{
    let css = null;
    let cell_padding = [
        6,
        2,
        6,
        2
    ];
    let cell_border = [
        2,
        2,
        2,
        2
    ];
    let cell_margin = [
        10,
        10,
        10,
        10
    ];
    let unit_margin = [
        0,
        0,
        0,
        0
    ];
    let group_padding = [
        2,
        2,
        2,
        2
    ];
    let group_border = [
        2,
        2,
        2,
        2
    ];
    let group_margin = [
        4,
        4,
        4,
        4
    ];
    let gate_gap = [
        8,
        8,
        8,
        8
    ];
    let char_width = 14;
    let char_height = 8;
    let link_border = 2;
    if ('attr' in l1 && l1.attr) {
        if ('css' in l1.attr && l1.attr.css) {
            css = l1.attr.css;
        }
        if ('cell_padding' in l1.attr && l1.attr.cell_padding) {
            cell_padding = l1.attr.cell_padding;
        }
        if ('cell_border' in l1.attr && l1.attr.cell_border) {
            cell_border = l1.attr.cell_border;
        }
        if ('cell_margin' in l1.attr && l1.attr.cell_margin) {
            cell_margin = l1.attr.cell_margin;
        }
        if ('unit_margin' in l1.attr && l1.attr.unit_margin) {
            unit_margin = l1.attr.unit_margin;
        }
        if ('group_padding' in l1.attr && l1.attr.group_padding) {
            group_padding = l1.attr.group_padding;
        }
        if ('group_border' in l1.attr && l1.attr.group_border) {
            group_border = l1.attr.group_border;
        }
        if ('group_margin' in l1.attr && l1.attr.group_margin) {
            group_margin = l1.attr.group_margin;
        }
        if ('char_width' in l1.attr && l1.attr.char_width) {
            char_width = l1.attr.char_width;
        }
        if ('char_height' in l1.attr && l1.attr.char_height) {
            char_height = l1.attr.char_height;
        }
        if ('link_border' in l1.attr && l1.attr.link_border) {
            link_border = l1.attr.link_border;
        }
        if ('gate_gap' in l1.attr && l1.attr.gate_gap) {
            gate_gap = l1.attr.gate_gap;
        }
    }
    return {
        css: css,
        cell_padding: cell_padding,
        cell_border: cell_border,
        cell_margin: cell_margin,
        unit_margin: unit_margin,
        group_padding: group_padding,
        group_border: group_border,
        group_margin: group_margin,
        char_width: char_width,
        char_height: char_height,
        link_border: link_border,
        gate_gap: gate_gap
    };
};
const parseRootUnitAttr = (l1, nodeId)=>{
    let direction = null;
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Unit',
        name: '',
        direction: direction,
        margin: [
            0,
            0,
            0,
            0
        ],
        space: [
            0,
            0,
            0,
            0
        ],
        align: 'start'
    };
};
const parseGroupAttr1 = (l1, parentL1, nodeId, docAttr)=>{
    let direction = null;
    let disp = null;
    let resource = null;
    let tag = [];
    let padding = docAttr.group_padding;
    let border = docAttr.group_border;
    let margin = docAttr.group_margin;
    let align1 = parentL1.attr?.alignItems || 'start';
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
        if ('resource' in l1.attr && l1.attr.resource) {
            resource = l1.attr.resource;
        }
        if ('tag' in l1.attr && l1.attr.tag) {
            tag = l1.attr.tag;
        }
        if ('padding' in l1.attr && l1.attr.padding) {
            padding = l1.attr.padding;
        }
        if ('border' in l1.attr && l1.attr.border) {
            border = l1.attr.border;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
        if ('alignSelf' in l1.attr && l1.attr.alignSelf) {
            align1 = l1.attr.alignSelf;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Group',
        name: l1.name,
        direction: direction,
        disp: disp,
        resource: resource,
        tag: tag,
        padding: padding,
        border: border,
        margin: margin,
        space: [
            padding[0] + border[0] + margin[0],
            padding[1] + border[1] + margin[1],
            padding[2] + border[2] + margin[2],
            padding[3] + border[3] + margin[3], 
        ],
        align: align1
    };
};
const parseUnitAttr1 = (l1, parentL1, nodeId, docAttr)=>{
    let direction = null;
    let margin = docAttr.unit_margin;
    let align2 = parentL1.attr?.alignItems || 'start';
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
        if ('alignSelf' in l1.attr && l1.attr.alignSelf) {
            align2 = l1.attr.alignSelf;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Unit',
        name: l1.name,
        direction: direction,
        margin: margin,
        space: margin,
        align: align2
    };
};
const parseCellAttr1 = async (l1, parentL1, nodeId, docAttr, userDefineTextSizeFunc)=>{
    let disp = l1.name;
    let resource = null;
    let tag = [];
    let padding = docAttr.cell_padding;
    let border = docAttr.cell_border;
    let margin = docAttr.cell_margin;
    let align3 = parentL1.attr?.alignItems || 'start';
    if ('attr' in l1 && l1.attr) {
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
        if ('resource' in l1.attr && l1.attr.resource) {
            resource = l1.attr.resource;
        }
        if ('tag' in l1.attr && l1.attr.tag) {
            tag = l1.attr.tag;
        }
        if ('padding' in l1.attr && l1.attr.padding) {
            padding = l1.attr.padding;
        }
        if ('border' in l1.attr && l1.attr.border) {
            border = l1.attr.border;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
        if ('alignSelf' in l1.attr && l1.attr.alignSelf) {
            align3 = l1.attr.alignSelf;
        }
    }
    const size = await getCellSize(l1, padding, border, margin, docAttr, userDefineTextSizeFunc);
    return {
        nodeId: nodeId,
        type: 'Cell',
        name: l1.name,
        disp: disp,
        resource: resource,
        tag: tag,
        padding: padding,
        border: border,
        margin: margin,
        size: size,
        align: align3
    };
};
const getCellSize = async (l1, padding, border, margin, docAttr, userDefineTextSizeFunc)=>{
    let width = l1.attr?.width;
    let height = l1.attr?.height;
    if (width == null || height == null) {
        let textSize;
        if (userDefineTextSizeFunc) {
            textSize = await userDefineTextSizeFunc(l1.name, l1, docAttr);
        } else {
            textSize = defaultTextSizeFunc(l1.name, docAttr);
        }
        if (width == null) {
            width = textSize[0] + padding[0] + padding[2] + border[0] + border[2];
        }
        if (height == null) {
            height = textSize[1] + padding[1] + padding[3] + border[1] + border[3];
        }
    }
    return [
        width + margin[0] + margin[2],
        height + margin[1] + margin[3], 
    ];
};
const defaultTextSizeFunc = (name, docAttr)=>{
    const nameLine = name.split("\n");
    let charNum = 0;
    nameLine.forEach((l)=>{
        const len = [
            ...l
        ].length;
        if (len > charNum) {
            charNum = len;
        }
    });
    const width = charNum * docAttr.char_width;
    const height = nameLine.length * docAttr.char_height;
    return [
        width,
        height
    ];
};
const parseLinkAttr1 = (l1, l2)=>{
    let disp = null;
    if ('attr' in l1 && l1.attr) {
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
    }
    return {
        linkId: l2.linkId,
        disp: disp,
        node: l1.box
    };
};
const parseLaneAttr = (l1)=>{
    let laneWidth = [
        12,
        12
    ];
    let laneMin = 0;
    if ('attr' in l1 && l1.attr) {
        if ('lane_width' in l1.attr && l1.attr.lane_width) {
            laneWidth = l1.attr.lane_width;
        }
        if ('lane_min' in l1.attr && l1.attr.lane_min) {
            laneMin = l1.attr.lane_min;
        }
    }
    return {
        laneWidth: laneWidth,
        laneMin: laneMin
    };
};
const parse1 = async (astL1, { pre , post , textSize  } = {})=>{
    if (pre) {
        astL1 = await pre(astL1);
    }
    const nodes = [];
    const nodeAttrs = [];
    const links = [];
    const linkAttrs = [];
    const docAttr = parseDocAttr(astL1);
    const laneAttr = parseLaneAttr(astL1);
    const idGen = {
        nodeId: 0,
        linkId: 0
    };
    const rootId = getNodeId(idGen);
    const rootAttr = parseRootUnitAttr(astL1, rootId);
    nodeAttrs.push(rootAttr);
    const rootL2 = parseRootUnit(astL1, rootId);
    nodes.push(rootL2);
    const nameMap = {
        container: rootL2,
        childNum: astL1.nodes.length,
        childMap: new Map()
    };
    const statePath = [
        {
            l1: astL1,
            l2: rootL2,
            siblingIndex: 0,
            parents: [
                rootL2.nodeId
            ],
            nameMap: nameMap
        }
    ];
    const resourceMap = new Map();
    const tagMap = new Map();
    while(statePath.length){
        const currentState = statePath[statePath.length - 1];
        const currentL1 = currentState.l1;
        if (currentL1.nodes.length <= currentState.siblingIndex) {
            statePath.pop();
            continue;
        }
        const currentL2 = currentState.l2;
        const parents = currentState.parents;
        const siblingIndex = currentState.siblingIndex;
        const nextL1 = currentL1.nodes[siblingIndex];
        currentState.siblingIndex++;
        const type = nextL1.type;
        if (type === 'Group') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = parseGroupAttr1(nextL1, currentL1, nodeId, docAttr);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = parseGroup1(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId, nextL2Attr);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);
            setResourceMap(resourceMap, nextL2, nextL2Attr);
            setTagMap(tagMap, nextL2, nextL2Attr);
            statePath.push({
                l1: nextL1,
                l2: nextL2,
                siblingIndex: 0,
                parents: parents.concat(nextL2.nodeId),
                nameMap: getSetNameMap(currentState.nameMap, nextL2, nextL1, nextL2Attr)
            });
        } else if (type === 'Unit') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = parseUnitAttr1(nextL1, currentL1, nodeId, docAttr);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = parseUnit1(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId, nextL2Attr);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);
            statePath.push({
                l1: nextL1,
                l2: nextL2,
                siblingIndex: 0,
                parents: parents.concat(nextL2.nodeId),
                nameMap: getSetNameMap(currentState.nameMap, nextL2, nextL1, nextL2Attr)
            });
        } else if (type === 'Cell') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = await parseCellAttr1(nextL1, currentL1, nodeId, docAttr, textSize);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = await parseCell1(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);
            setResourceMap(resourceMap, nextL2, nextL2Attr);
            setTagMap(tagMap, nextL2, nextL2Attr);
            setNameMap(currentState.nameMap, nextL2, nextL2Attr);
        } else {
            const _ = type;
            return _;
        }
    }
    astL1.links.forEach((link)=>{
        const from = getNodes(link.box[0], resourceMap, tagMap, nameMap);
        const to = getNodes(link.box[1], resourceMap, tagMap, nameMap);
        from.forEach((f)=>{
            to.forEach((t)=>{
                const link2 = {
                    linkId: getLinkId(idGen),
                    box: [
                        f.nodeId,
                        t.nodeId
                    ],
                    edge: link.direction ? getLinkDirect(link.direction) : [
                        0,
                        2
                    ]
                };
                links.push(link2);
                const linkAttr = parseLinkAttr1(link, link2);
                linkAttrs.push(linkAttr);
                const fnode = nodes[f.nodeId];
                if (fnode.type === 'Unit') {
                    throw new Error(`[E_] .`);
                } else {
                    fnode.links[0].push(link2.linkId);
                }
                const tnode = nodes[t.nodeId];
                if (tnode.type === 'Unit') {
                    throw new Error(`[E_] .`);
                } else {
                    tnode.links[1].push(link2.linkId);
                }
            });
        });
    });
    let astL2 = {
        nodes: nodes,
        nodeAttrs: nodeAttrs,
        links: links,
        linkAttrs: linkAttrs,
        docAttr: docAttr,
        laneAttr: laneAttr
    };
    if (post) {
        astL2 = await post(astL2);
    }
    return astL2;
};
const parseRootUnit = (l1, nodeId)=>{
    return {
        nodeId: nodeId,
        type: "Unit",
        compassItems: getRootCompass(l1),
        compassSelf: [
            0,
            1
        ],
        parents: [],
        children: [],
        siblings: [
            0
        ],
        bnParents: [
            0,
            0,
            0,
            0
        ]
    };
};
const parseGroup1 = (l1, parent, parents, siblingIndex, parentChildNum, nodeId, groupAttr)=>{
    const compass = getGroupCompass(l1, parent);
    const edge = getEdge(parent.compassItems, siblingIndex, parent.compassSelf, parentChildNum, parent.bnParents);
    return {
        nodeId: nodeId,
        type: "Group",
        compassItems: compass,
        compassSelf: parent.compassItems,
        parents: parents,
        children: [],
        siblings: parent.children,
        links: [
            [],
            []
        ],
        bnParents: edge
    };
};
const parseUnit1 = (l1, parent, parents, siblingIndex, parentChildNum, nodeId, unitAttr)=>{
    const compass = getUnitCompass(l1, parent);
    const edge = getEdge(parent.compassItems, siblingIndex, parent.compassSelf, parentChildNum, parent.bnParents);
    return {
        nodeId: nodeId,
        type: "Unit",
        compassItems: compass,
        compassSelf: parent.compassItems,
        parents: parents,
        children: [],
        siblings: parent.children,
        bnParents: edge
    };
};
const parseCell1 = (l1, parent, parents, siblingIndex, parentChildNum, nodeId)=>{
    const edge = getEdge(parent.compassItems, siblingIndex, parent.compassSelf, parentChildNum, parent.bnParents);
    return {
        nodeId: nodeId,
        type: "Cell",
        compassSelf: parent.compassItems,
        parents: parents,
        siblings: parent.children,
        links: [
            [],
            []
        ],
        bnParents: edge
    };
};
const getNodes = (accessName, resourceMap, tagMap, nameMap)=>{
    if (accessName.length === 0) {
        throw new Error(`[E022101] blank link access id is invalid.`);
    } else if (accessName[0] === '&') {
        const ret = resourceMap.get(accessName.substring(1));
        if (ret) {
            return ret;
        } else {
            throw new Error(`[E022102] node not found. access name: ${accessName}.`);
        }
    } else if (accessName[0] === '$') {
        const ret = tagMap.get(accessName.substring(1));
        if (ret) {
            return ret;
        } else {
            throw new Error(`[E022103] node not found. access name: ${accessName}.`);
        }
    } else {
        const path = accessNameToPath(accessName);
        let tmp = nameMap;
        path.forEach((name)=>{
            if ('type' in tmp) {
                throw new Error(`[E022104] node not found. access name: ${accessName}.`);
            } else {
                const next = tmp.childMap.get(name);
                if (next) {
                    tmp = next;
                } else {
                    throw new Error(`[E022105] node not found. access name: ${accessName}.`);
                }
            }
        });
        if ('type' in tmp) {
            return [
                tmp
            ];
        } else {
            const container = tmp.container;
            if (container.type === 'Unit') {
                throw new Error(`[E022106] link can not connect Unit. access name: ${accessName}.`);
            }
            return [
                container
            ];
        }
    }
};
const getNodeId = (idGen)=>{
    const ret = idGen.nodeId;
    idGen.nodeId++;
    return ret;
};
const getLinkId = (idGen)=>{
    const ret = idGen.linkId;
    idGen.linkId++;
    return ret;
};
const setResourceMap = (resourceMap, node, attr)=>{
    const resource = attr.resource;
    if (resource) {
        let tmp = resourceMap.get(resource);
        if (!tmp) {
            tmp = [];
        }
        tmp.push(node);
    }
};
const setTagMap = (tagMap, node, attr)=>{
    attr.tag.forEach((t)=>{
        let tmp = tagMap.get(t);
        if (!tmp) {
            tmp = [];
        }
        tmp.push(node);
    });
};
const getSetNameMap = (nameMap, node, nodeL1, attr)=>{
    if (nameMap.childMap.get(attr.name)) {
        throw new Error(`[E_] duplicated name.`);
    }
    const ret = {
        container: node,
        childNum: nodeL1.nodes.length,
        childMap: new Map()
    };
    nameMap.childMap.set(attr.name, ret);
    return ret;
};
const setNameMap = (nameMap, node, attr)=>{
    if (nameMap.childMap.get(attr.name)) {
        throw new Error(`[E_] duplicated name.`);
    }
    nameMap.childMap.set(attr.name, node);
};
const accessNameToPath = (accessName)=>{
    const ret = [];
    let i = 0;
    while(accessName.length > i){
        const cur = accessName[i];
        if (cur === '"') {
            i++;
            let close = false;
            let escape = false;
            let j = i;
            while(accessName.length > j){
                const cur2 = accessName[j];
                if (cur2 === '"') {
                    if (escape) {
                        j++;
                        escape = false;
                    } else {
                        ret.push(accessName.substring(i, j).replace(/\\\\/g, "\\").replace(/\\"/g, '"'));
                        i = j + 1;
                        close = true;
                        break;
                    }
                } else if (cur2 === "\\") {
                    if (escape) {
                        escape = false;
                    } else {
                        escape = true;
                    }
                    j++;
                } else {
                    if (escape) {
                        throw new Error(`[E_] invalid escape access name.`);
                    }
                    j++;
                }
            }
            if (!close) {
                throw new Error(`[E_] invalid escape access name.`);
            }
        } else {
            let find = false;
            let j = i;
            while(accessName.length > j){
                const cur2 = accessName[j];
                if (cur2 === ".") {
                    ret.push(accessName.substring(i, j));
                    j++;
                    find = true;
                    break;
                } else if (/\w/.test(cur2)) {
                    j++;
                } else {
                    throw new Error(`[E_] invalid escape access name.`);
                }
            }
            if (!find) {
                ret.push(accessName.substring(i, j + 1));
            }
            i = j;
        }
    }
    return ret;
};
const getRootCompass = (Group)=>{
    if (Group.attr?.direction === 'column' || Group.attr?.direction === 'cross') {
        return [
            1,
            0
        ];
    } else if (Group.attr?.direction === 'row_reverse') {
        return [
            2,
            1
        ];
    } else if (Group.attr?.direction === 'column_reverse') {
        return [
            3,
            0
        ];
    } else {
        return [
            0,
            1
        ];
    }
};
const getGroupCompass = (Group, parent)=>{
    if (Group.attr?.direction === 'main') {
        return parent.compassItems;
    } else if (Group.attr?.direction === 'row') {
        return [
            0,
            1
        ];
    } else if (Group.attr?.direction === 'column') {
        return [
            1,
            0
        ];
    } else if (Group.attr?.direction === 'row_reverse') {
        return [
            2,
            1
        ];
    } else if (Group.attr?.direction === 'column_reverse') {
        return [
            3,
            0
        ];
    } else {
        const first = parent.compassItems[0];
        if (first === 0 || first === 2) {
            const second = parent.compassItems[1];
            return [
                second,
                first
            ];
        } else if (first === 1 || first === 3) {
            const second = parent.compassItems[1];
            return [
                second,
                first
            ];
        } else {
            const _ = first;
            return _;
        }
    }
};
const getUnitCompass = (Unit, parent)=>{
    if (Unit.attr?.direction === 'main') {
        return parent.compassItems;
    } else if (Unit.attr?.direction === 'row') {
        return [
            0,
            1
        ];
    } else if (Unit.attr?.direction === 'column') {
        return [
            1,
            0
        ];
    } else if (Unit.attr?.direction === 'row_reverse') {
        return [
            2,
            1
        ];
    } else if (Unit.attr?.direction === 'column_reverse') {
        return [
            3,
            0
        ];
    } else {
        const first = parent.compassItems[0];
        if (first === 0 || first === 2) {
            const second = parent.compassItems[1];
            return [
                second,
                first
            ];
        } else if (first === 1 || first === 3) {
            const second = parent.compassItems[1];
            return [
                second,
                first
            ];
        } else {
            const _ = first;
            return _;
        }
    }
};
const getLinkDirect = (direction)=>{
    return [
        getDirect(direction[0]),
        getDirect(direction[1])
    ];
};
const getDirect = (direction)=>{
    if (direction === 'main') {
        return 0;
    } else if (direction === 'cross') {
        return 1;
    } else if (direction === 'main_reverse') {
        return 2;
    } else if (direction === 'cross_reverse') {
        return 3;
    } else {
        const _ = direction;
        return _;
    }
};
const getEdge = (compass, siblingIndex, parentCompass, parentChildNum, parentEdge)=>{
    const mappingCompassFull = getMappingCompassFull(parentCompass, compass);
    if (parentChildNum === 1) {
        return [
            parentEdge[mappingCompassFull[0]] + 1,
            parentEdge[mappingCompassFull[1]] + 1,
            parentEdge[mappingCompassFull[2]] + 1,
            parentEdge[mappingCompassFull[3]] + 1, 
        ];
    } else if (siblingIndex === 0) {
        return [
            1,
            parentEdge[mappingCompassFull[1]] + 1,
            parentEdge[mappingCompassFull[2]] + 1,
            parentEdge[mappingCompassFull[3]] + 1, 
        ];
    } else if (siblingIndex === parentChildNum - 1) {
        return [
            parentEdge[mappingCompassFull[0]] + 1,
            parentEdge[mappingCompassFull[1]] + 1,
            1,
            parentEdge[mappingCompassFull[3]] + 1, 
        ];
    } else {
        return [
            1,
            parentEdge[mappingCompassFull[1]] + 1,
            1,
            parentEdge[mappingCompassFull[3]] + 1, 
        ];
    }
};
const calcRoute = async (nodes, links, _laneAttr)=>{
    const linkRoutes = [];
    const nodeEntryLaneMap = new Map();
    const nodeMainLaneMap = new Map();
    const nodeCrossLaneMap = new Map();
    links.forEach((link)=>{
        const fromNodeId = link.box[0];
        const toNodeId = link.box[1];
        const fromNode = nodes[fromNodeId];
        const toNode = nodes[toNodeId];
        if (!fromNode) {
            throw new Error(`[E030101] asgR1 is invalid.`);
        }
        if (!toNode) {
            throw new Error(`[E030102] asgR1 is invalid.`);
        }
        if (fromNode.parents.includes(toNodeId)) {
            throw new Error(`[E030103] between parents link is invalid.`);
        }
        if (toNode.parents.includes(fromNodeId)) {
            throw new Error(`[E030104] between parents link is invalid.`);
        }
        const fromParentsR = [
            ...fromNode.parents
        ].reverse();
        const toParentsR = [
            ...toNode.parents
        ].reverse();
        let fromCommonParentIndex = -1;
        let toCommonParentIndex = -1;
        for(let i = 0; i < fromParentsR.length; i++){
            toCommonParentIndex = toParentsR.indexOf(fromParentsR[i]);
            if (toCommonParentIndex !== -1) {
                fromCommonParentIndex = i;
                break;
            }
        }
        if (fromCommonParentIndex == -1) {
            throw new Error(`[E030105] asgR1 is invalid.`);
        }
        const fromRoutes = [
            null,
            null,
            null,
            null
        ];
        const toRoutes = [
            null,
            null,
            null,
            null
        ];
        getRoutesWithoutLane(fromNode, link.edge[0], fromCommonParentIndex, [], fromRoutes, [
            0,
            1,
            2,
            3
        ], nodes, 1);
        getRoutesWithoutLane(toNode, link.edge[1], toCommonParentIndex, [], toRoutes, [
            2,
            3,
            0,
            1
        ], nodes, 1);
        const routeWithoutLane = getBestRouteWithoutLane(fromRoutes, toRoutes, fromNodeId, toNodeId);
        const route = routeWithoutLane.map((railWithoutLane)=>{
            const axis = railWithoutLane.axis;
            if (axis === 0) {
                let indexMap = nodeMainLaneMap.get(railWithoutLane.containerId);
                if (!indexMap) {
                    indexMap = new Map();
                    nodeMainLaneMap.set(railWithoutLane.containerId, indexMap);
                }
                const lane = indexMap.get(railWithoutLane.axisIndex);
                if (lane != null) {
                    indexMap.set(railWithoutLane.axisIndex, lane + 1);
                    return {
                        containerId: railWithoutLane.containerId,
                        axis: railWithoutLane.axis,
                        avenue: railWithoutLane.axisIndex,
                        lane: lane
                    };
                } else {
                    indexMap.set(railWithoutLane.axisIndex, 1);
                    return {
                        containerId: railWithoutLane.containerId,
                        axis: railWithoutLane.axis,
                        avenue: railWithoutLane.axisIndex,
                        lane: 0
                    };
                }
            } else if (axis === 1) {
                let lanes = nodeCrossLaneMap.get(railWithoutLane.containerId);
                if (!lanes) {
                    lanes = [
                        1,
                        1
                    ];
                    nodeCrossLaneMap.set(railWithoutLane.containerId, lanes);
                }
                const lane = lanes[railWithoutLane.axisIndex];
                lanes[railWithoutLane.axisIndex] = lane + 1;
                return {
                    containerId: railWithoutLane.containerId,
                    axis: railWithoutLane.axis,
                    avenue: railWithoutLane.axisIndex,
                    lane: lane
                };
            } else {
                const _ = axis;
                return _;
            }
        });
        let frNodeEntryLane = nodeEntryLaneMap.get(link.box[0]);
        if (!frNodeEntryLane) {
            frNodeEntryLane = [
                1,
                1,
                1,
                1
            ];
            nodeEntryLaneMap.set(link.box[0], frNodeEntryLane);
        }
        const frLane = frNodeEntryLane[link.edge[0]];
        frNodeEntryLane[link.edge[0]] += 1;
        let toNodeEntryLane = nodeEntryLaneMap.get(link.box[1]);
        if (!toNodeEntryLane) {
            toNodeEntryLane = [
                1,
                1,
                1,
                1
            ];
            nodeEntryLaneMap.set(link.box[1], toNodeEntryLane);
        }
        const toLane = toNodeEntryLane[link.edge[1]];
        toNodeEntryLane[link.edge[1]] += 1;
        linkRoutes.push({
            linkId: link.linkId,
            gate: [
                frLane,
                toLane
            ],
            route: route
        });
    });
    return linkRoutes;
};
const getRoutesWithoutLane = (node, direct, parentIndex, currentRoute, routes, directPriority, nodeMap, callNum)=>{
    if (callNum > 100) {
        throw new Error(`[E030201] nest too deep.`);
    }
    callNum++;
    const parentNodeId = node.parents[node.parents.length - 1];
    const parentNode = nodeMap[parentNodeId];
    if (!parentNode) {
        throw new Error(`[E030205] asgR1 is invalid.`);
    }
    if (parentNode.type !== 'Group' && parentNode.type !== 'Unit') {
        throw new Error(`[E030206] asgR1 is invalid.`);
    }
    let targetIndex;
    if (node.bnParents[direct] - 1 >= parentIndex) {
        targetIndex = parentIndex;
    } else {
        targetIndex = node.bnParents[direct] - 1;
    }
    const targetNodeId = [
        ...node.parents
    ].reverse()[targetIndex];
    if (!targetNodeId == null) {
        throw new Error(`[E030202] asgR1 is invalid.`);
    }
    const targetNode = nodeMap[targetNodeId];
    if (!targetNode) {
        throw new Error(`[E030203] asgR1 is invalid.`);
    }
    if (targetNode.type !== 'Group' && targetNode.type !== 'Unit') {
        throw new Error(`[E030204] asgR1 is invalid.`);
    }
    const railDirect = getMappingCompassFull(parentNode.compassItems, targetNode.compassItems)[direct];
    let siblingIndex;
    if (targetIndex > 0) {
        const targetChildNodeId = [
            ...node.parents
        ].reverse()[targetIndex - 1];
        siblingIndex = targetNode.children.indexOf(targetChildNodeId);
    } else {
        siblingIndex = node.siblings.indexOf(node.nodeId);
    }
    let railWithoutLane;
    if (railDirect === 0) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 0,
            axisIndex: siblingIndex + 1
        };
    } else if (railDirect === 1) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 1,
            axisIndex: 1
        };
    } else if (railDirect === 2) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 0,
            axisIndex: siblingIndex
        };
    } else if (railDirect === 3) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 1,
            axisIndex: 0
        };
    } else {
        const _ = railDirect;
        return _;
    }
    currentRoute = currentRoute.concat(railWithoutLane);
    if (node.bnParents[direct] - 1 >= parentIndex) {
        const lastRoutes = routes[railDirect];
        if (lastRoutes == null || lastRoutes.length > currentRoute.length) {
            routes[railDirect] = currentRoute;
        }
        return;
    } else {
        const targetParentNodeId = targetNode.parents[targetNode.parents.length - 1];
        const targetParentNode = nodeMap[targetParentNodeId];
        if (!targetParentNode) {
            throw new Error(`[E030207] asgR1 is invalid.`);
        }
        if (targetParentNode.type !== 'Group' && targetParentNode.type !== 'Unit') {
            throw new Error(`[E030208] asgR1 is invalid.`);
        }
        const nextMappingCompassFull = getMappingCompassFull(targetNode.compassItems, targetParentNode.compassItems);
        directPriority.forEach((d)=>{
            if (!isSameAxisDirect(d, railDirect)) {
                getRoutesWithoutLane(targetNode, nextMappingCompassFull[d], parentIndex - targetIndex - 1, currentRoute, routes, directPriority, nodeMap, callNum + 1);
            }
        });
    }
};
const getBestRouteWithoutLane = (fromRoutes, toRoutes, fromLinkNodeId, toLinkNodeId)=>{
    const allDirect = [
        0,
        1,
        2,
        3
    ];
    let ret = null;
    let retScore = Number.MAX_SAFE_INTEGER;
    allDirect.forEach((i)=>{
        const fromRoute = fromRoutes[i];
        allDirect.forEach((j)=>{
            const toRoute = toRoutes[j];
            if (fromRoute == null) {
                return;
            }
            if (toRoute == null) {
                return;
            }
            const fromLastRoute = fromRoute[fromRoute.length - 1];
            const toLastRoute = toRoute[toRoute.length - 1];
            if (i === j) {
                if (fromLastRoute.axisIndex === toLastRoute.axisIndex) {
                    const tmpScore = (fromRoute.length + toRoute.length - 1) * 10 + 4;
                    if (tmpScore < retScore) {
                        retScore = tmpScore;
                        ret = fromRoute.concat([
                            ...toRoute
                        ].slice(0, -1).reverse());
                    }
                } else {
                    const tmpScore = (fromRoute.length + toRoute.length + 1) * 10 + 6;
                    if (tmpScore < retScore) {
                        retScore = tmpScore;
                        ret = fromRoute.concat({
                            containerId: fromLastRoute.containerId,
                            axis: getAnotherAxisByDirect(i),
                            axisIndex: 0
                        }).concat([
                            ...toRoute
                        ].reverse());
                    }
                }
            } else {
                if (i === getReverse(j)) {
                    if (fromLastRoute.axisIndex === toLastRoute.axisIndex) {
                        const tmpScore = (fromRoute.length + toRoute.length - 1) * 10;
                        if (tmpScore < retScore) {
                            retScore = tmpScore;
                            ret = fromRoute.concat([
                                ...toRoute
                            ].slice(0, -1).reverse());
                        }
                    } else {
                        const fromSecondNodeId = fromRoute.length === 1 ? fromLinkNodeId : fromRoute[fromRoute.length - 2].containerId;
                        const toSecondNodeId = toRoute.length === 1 ? toLinkNodeId : toRoute[toRoute.length - 2].containerId;
                        const addPoint = i < j && fromSecondNodeId < toSecondNodeId || i > j && fromSecondNodeId > toSecondNodeId ? 2 : 8;
                        const tmpScore = (fromRoute.length + toRoute.length + 1) * 10 + addPoint;
                        if (tmpScore < retScore) {
                            retScore = tmpScore;
                            ret = fromRoute.concat({
                                containerId: fromLastRoute.containerId,
                                axis: getAnotherAxisByDirect(i),
                                axisIndex: 0
                            }).concat([
                                ...toRoute
                            ].reverse());
                        }
                    }
                } else {
                    const tmpScore = (fromRoute.length + toRoute.length - 1) * 10 + 5;
                    if (tmpScore < retScore) {
                        retScore = tmpScore;
                        ret = fromRoute.concat([
                            ...toRoute
                        ].reverse());
                    }
                }
            }
        });
    });
    if (!ret) {
        throw new Error(`[E030301] asgR1 is invalid.`);
    }
    return ret;
};
const parse2 = async (astL2, { pre , post , calc  } = {})=>{
    if (pre) {
        astL2 = await pre(astL2);
    }
    const nodes = astL2.nodes;
    const links = astL2.links;
    const laneAttr = astL2.laneAttr;
    let linkRoutes;
    if (calc) {
        linkRoutes = await calc(nodes, links, laneAttr, astL2);
    } else {
        linkRoutes = await calcRoute(nodes, links, laneAttr);
    }
    let astL3 = {
        nodes: astL2.nodes,
        nodeAttrs: astL2.nodeAttrs,
        links: astL2.links,
        linkAttrs: astL2.linkAttrs,
        docAttr: astL2.docAttr,
        laneAttr: astL2.laneAttr,
        linkRoutes: linkRoutes
    };
    if (post) {
        astL3 = await post(astL3);
    }
    return astL3;
};
const parse3 = async (astL3, { pre , post , mainLaneMin , crossLaneMin  } = {})=>{
    if (pre) {
        astL3 = await pre(astL3);
    }
    const mainLaneMinNum = mainLaneMin || 0;
    const crossLaneMinNum = crossLaneMin || 0;
    const nodes = astL3.nodes;
    const nodeAttrs = astL3.nodeAttrs;
    const links1 = astL3.links;
    const linkRoutes = astL3.linkRoutes;
    const n2i = [];
    const i2n = [];
    const items = [];
    const linkItems = [];
    const idGen = {
        itemId: 0,
        n2i: n2i,
        i2n: i2n
    };
    const nodeMainMaxLaneMap = new Map();
    const nodeCrossMaxLaneMap = new Map();
    linkRoutes.forEach((linkRoute)=>{
        linkRoute.route.forEach((road)=>{
            const axis = road.axis;
            if (axis === 0) {
                let nodeMainMaxLane = nodeMainMaxLaneMap.get(road.containerId);
                if (!nodeMainMaxLane) {
                    nodeMainMaxLane = new Map();
                    nodeMainMaxLaneMap.set(road.containerId, nodeMainMaxLane);
                }
                let branchMap = nodeMainMaxLane.get(road.avenue);
                if (!branchMap) {
                    branchMap = new Map();
                    nodeMainMaxLane.set(road.avenue, branchMap);
                }
                let links = branchMap.get(road.lane);
                if (!links) {
                    links = [];
                    branchMap.set(road.lane, links);
                }
                links.push(linkRoute.linkId);
            } else if (axis === 1) {
                let nodeCrossMaxLane = nodeCrossMaxLaneMap.get(road.containerId);
                if (!nodeCrossMaxLane) {
                    nodeCrossMaxLane = [
                        new Map(),
                        new Map()
                    ];
                    nodeCrossMaxLaneMap.set(road.containerId, nodeCrossMaxLane);
                }
                const branchMap = nodeCrossMaxLane[road.avenue];
                let links = branchMap.get(road.lane);
                if (!links) {
                    links = [];
                    branchMap.set(road.lane, links);
                }
                links.push(linkRoute.linkId);
            } else {
                const _ = axis;
                return _;
            }
        });
    });
    setNodeMap(0, items, nodes, nodeAttrs, links1, linkRoutes, astL3.laneAttr, idGen, n2i, nodeMainMaxLaneMap, nodeCrossMaxLaneMap, [], mainLaneMinNum, crossLaneMinNum);
    links1.forEach((link)=>{
        const linkRoute = linkRoutes[link.linkId];
        const route = linkRoute.route.map((r)=>{
            const item = items[n2i[r.containerId]];
            const type = item.type;
            const axis = r.axis;
            if (type !== "Group" && type !== "Unit") {
                throw new Error(`[E040101] invalid.`);
            }
            if (axis === 0) {
                for(let i = 0; i < item.mainItems.length; i++){
                    const tmp = items[item.mainItems[i]];
                    if (tmp.type === "Road" && tmp.avenue === r.avenue && tmp.lane === r.lane) {
                        return tmp.itemId;
                    }
                }
            } else if (axis === 1) {
                const avenue = r.avenue;
                if (avenue === 0) {
                    for(let i = 0; i < item.crossItems[0].length; i++){
                        const tmp = items[item.crossItems[0][i]];
                        if (tmp.type === "Road" && tmp.lane === r.lane) {
                            return tmp.itemId;
                        }
                    }
                } else if (avenue === 1) {
                    for(let i = 0; i < item.crossItems[1].length; i++){
                        const tmp = items[item.crossItems[1][i]];
                        if (tmp.type === "Road" && tmp.lane === r.lane) {
                            return tmp.itemId;
                        }
                    }
                } else {
                    const _ = avenue;
                    return _;
                }
            } else {
                const _ = axis;
                return _;
            }
            throw new Error(`[E040102] invalid.`);
        });
        linkItems[linkRoute.linkId] = {
            linkId: linkRoute.linkId,
            box: [
                n2i[link.box[0]],
                n2i[link.box[1]]
            ],
            edge: link.edge,
            gate: linkRoute.gate,
            route: route
        };
    });
    items.forEach((item)=>{
        if (item.type === "Group" || item.type === "Unit") {
            const mainItems = item.mainItems;
            mainItems.forEach((childItemId)=>{
                const childItem = items[childItemId];
                if (childItem.type === "Road") {
                    if (childItem.axis === 0) {
                        childItem.siblings = mainItems;
                    } else {
                        throw new Error(`[E040103] invalid unreachable code.`);
                    }
                } else {
                    childItem.siblings = mainItems;
                }
            });
        }
    });
    let astL4 = {
        nodes: nodes,
        nodeAttrs: nodeAttrs,
        links: links1,
        linkAttrs: astL3.linkAttrs,
        docAttr: astL3.docAttr,
        laneAttr: astL3.laneAttr,
        items: items,
        linkItems: linkItems,
        n2i: n2i,
        i2n: i2n
    };
    if (post) {
        astL4 = await post(astL4);
    }
    return astL4;
};
const setNodeMap = (nodeId, items, nodes, nodeAttrs, allLinks, linkRoutes, laneAttr, idGen, n2i, nodeMainMaxLaneMap, nodeCrossMaxLaneMap, mainItems, mainLaneMinNum, crossLaneMinNum)=>{
    const node = nodes[nodeId];
    const nodeAttr = nodeAttrs[nodeId];
    const nodeType = node.type;
    if (nodeType === "Group" || nodeType === "Unit") {
        let nodeMainMaxLane = nodeMainMaxLaneMap.get(nodeId);
        if (!nodeMainMaxLane) {
            nodeMainMaxLane = new Map();
        }
        let nodeCrossMaxLane = nodeCrossMaxLaneMap.get(nodeId);
        if (!nodeCrossMaxLane) {
            nodeCrossMaxLane = [
                new Map(),
                new Map()
            ];
        }
        const mainItems = [];
        const crossItems = [
            [],
            []
        ];
        const itemId = getItemId(idGen, nodeId);
        let nodeItem;
        if (nodeType === "Group") {
            if (nodeAttr.type !== "Group") {
                throw new Error(`[E040202] invalid unreachable code.`);
            }
            nodeItem = {
                itemId: itemId,
                type: node.type,
                compassItems: node.compassItems,
                compassSelf: node.compassSelf,
                parents: node.parents.map((p)=>n2i[p]
                ),
                siblings: [],
                links: node.links,
                bnGates: getBnGates(node.links, allLinks, linkRoutes),
                mainItems: mainItems,
                crossItems: crossItems,
                space: nodeAttr.space,
                align: nodeAttr.align
            };
        } else if (nodeType === "Unit") {
            if (nodeAttr.type !== "Unit") {
                throw new Error(`[E040203] invalid unreachable code.`);
            }
            nodeItem = {
                itemId: itemId,
                type: node.type,
                compassItems: node.compassItems,
                compassSelf: node.compassSelf,
                parents: node.parents.map((p)=>n2i[p]
                ),
                siblings: [],
                mainItems: mainItems,
                crossItems: crossItems,
                space: nodeAttr.space,
                align: nodeAttr.align
            };
        } else {
            const _ = nodeType;
            return _;
        }
        items.push(nodeItem);
        const parents = nodeItem.parents;
        if (parents.length > 0) {
            const parentItem = items[parents[parents.length - 1]];
            if (parentItem.type == 'Group' || parentItem.type == 'Unit') {
                parentItem.mainItems.push(nodeItem.itemId);
            } else {
                throw new Error(`[E040201] invalid unreachable code.`);
            }
        }
        let crossFirstLength = crossLaneMinNum;
        for (const key of nodeCrossMaxLane[0].keys()){
            if (key + 1 > crossFirstLength) {
                crossFirstLength = key + 1;
            }
        }
        for(let i = 0; i < crossFirstLength; i++){
            const itemId = getItemId(idGen, null);
            const links = nodeCrossMaxLane[0].get(i) || [];
            const load = {
                itemId: itemId,
                type: "Road",
                axis: 1,
                avenue: 0,
                lane: i,
                parents: node.parents.map((p)=>n2i[p]
                ).concat(n2i[node.nodeId]),
                links: links,
                width: laneAttr.laneWidth[1]
            };
            items.push(load);
            crossItems[0].push(load.itemId);
        }
        for(let i1 = 0; i1 < node.children.length; i1++){
            let mainLength = mainLaneMinNum;
            const laneMap = nodeMainMaxLane.get(i1);
            if (laneMap) {
                for (const key of laneMap.keys()){
                    if (key + 1 > mainLength) {
                        mainLength = key + 1;
                    }
                }
            }
            for(let j = 0; j < mainLength; j++){
                const itemId = getItemId(idGen, null);
                const links = laneMap?.get(j) || [];
                const load = {
                    itemId: itemId,
                    type: "Road",
                    axis: 0,
                    avenue: i1,
                    lane: j,
                    parents: node.parents.map((p)=>n2i[p]
                    ).concat(n2i[node.nodeId]),
                    siblings: [],
                    links: links,
                    width: laneAttr.laneWidth[0]
                };
                items.push(load);
                mainItems.push(load.itemId);
            }
            setNodeMap(node.children[i1], items, nodes, nodeAttrs, allLinks, linkRoutes, laneAttr, idGen, n2i, nodeMainMaxLaneMap, nodeCrossMaxLaneMap, mainItems, mainLaneMinNum, crossLaneMinNum);
        }
        let mainLength = mainLaneMinNum;
        const laneMap = nodeMainMaxLane.get(node.children.length);
        if (laneMap) {
            for (const key of laneMap.keys()){
                if (key + 1 > mainLength) {
                    mainLength = key + 1;
                }
            }
        }
        for(let j = 0; j < mainLength; j++){
            const itemId = getItemId(idGen, null);
            const links = laneMap?.get(j) || [];
            const load = {
                itemId: itemId,
                type: "Road",
                axis: 0,
                avenue: node.children.length,
                lane: j,
                parents: node.parents.map((p)=>n2i[p]
                ).concat(n2i[node.nodeId]),
                siblings: [],
                links: links,
                width: laneAttr.laneWidth[0]
            };
            items.push(load);
            mainItems.push(load.itemId);
        }
        let crossLastLength = crossLaneMinNum;
        for (const key1 of nodeCrossMaxLane[1].keys()){
            if (key1 + 1 > crossLastLength) {
                crossLastLength = key1 + 1;
            }
        }
        for(let i2 = 0; i2 < crossLastLength; i2++){
            const itemId = getItemId(idGen, null);
            const links = nodeCrossMaxLane[1].get(i2) || [];
            const load = {
                itemId: itemId,
                type: "Road",
                axis: 1,
                avenue: 1,
                lane: i2,
                parents: node.parents.map((p)=>n2i[p]
                ).concat(n2i[node.nodeId]),
                links: links,
                width: laneAttr.laneWidth[1]
            };
            items.push(load);
            crossItems[1].push(load.itemId);
        }
    } else if (nodeType === "Cell") {
        if (nodeAttr.type !== "Cell") {
            throw new Error(`[E040204] invalid unreachable code.`);
        }
        const nodeItemId = getItemId(idGen, nodeId);
        const nodeItem = {
            itemId: nodeItemId,
            type: node.type,
            compassSelf: node.compassSelf,
            parents: node.parents.map((p)=>n2i[p]
            ),
            siblings: [],
            links: node.links,
            bnGates: getBnGates(node.links, allLinks, linkRoutes),
            size: nodeAttr.size,
            align: nodeAttr.align
        };
        items.push(nodeItem);
        mainItems.push(nodeItem.itemId);
    } else {
        const _ = nodeType;
        return _;
    }
};
const getBnGates = (links, allLink, linkRoutes)=>{
    const ret = [
        0,
        0,
        0,
        0
    ];
    links[0].forEach((linkId)=>{
        const link = allLink[linkId];
        const linkRoute = linkRoutes[linkId];
        if (!link) {
            throw new Error(`[E040201] asgR2 is invalid.`);
        }
        if (ret[link.edge[0]] < linkRoute.gate[0]) {
            ret[link.edge[0]] = linkRoute.gate[0];
        }
    });
    links[1].forEach((linkId)=>{
        const link = allLink[linkId];
        const linkRoute = linkRoutes[linkId];
        if (!link) {
            throw new Error(`[E040202] asgR2 is invalid.`);
        }
        if (ret[link.edge[1]] < linkRoute.gate[1]) {
            ret[link.edge[1]] = linkRoute.gate[1];
        }
    });
    return ret;
};
const getItemId = (idGen, nodeId)=>{
    const itemId = idGen.itemId;
    if (nodeId != null) {
        idGen.i2n[itemId] = nodeId;
        idGen.n2i[nodeId] = itemId;
    } else {
        idGen.i2n[itemId] = null;
    }
    idGen.itemId++;
    return itemId;
};
const calcLoca = async (items)=>{
    const sizes = [];
    getCalcSizeRecursive(0, items, sizes);
    const itemLocas = [];
    const rootSize = sizes[0];
    itemLocas[0] = {
        itemId: 0,
        size: rootSize,
        coord: [
            0,
            0
        ]
    };
    getCalcItemCoordRecursive(0, items, sizes, itemLocas);
    return itemLocas;
};
const getCalcSizeRecursive = (itemId1, items, sizes)=>{
    const item1 = items[itemId1];
    const itemType1 = item1.type;
    if (itemType1 === 'Cell') {
        const size = item1.size;
        sizes[itemId1] = size;
        return size;
    } else if (itemType1 === 'Road') {
        throw new Error(`[E310201] invalid unreachable code.`);
    } else if (itemType1 === 'Group' || itemType1 === 'Unit') {
        let maxMainItemWidth = 0;
        const size = [
            0,
            0
        ];
        const compassAxis = getCompassAxis(item1.compassItems);
        item1.crossItems.forEach((eachCrossItem)=>{
            eachCrossItem.forEach((itemId)=>{
                const item = items[itemId];
                if (item.type !== 'Road') {
                    throw new Error(`[E310201] invalid unreachable code.`);
                }
                size[compassAxis[1]] += item.width;
            });
        });
        item1.mainItems.forEach((itemId)=>{
            const item = items[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                size[compassAxis[0]] += item.width;
            } else if (itemType === 'Cell' || itemType === 'Group' || itemType === 'Unit') {
                const itemSize = getCalcSizeRecursive(item.itemId, items, sizes);
                size[compassAxis[0]] += itemSize[compassAxis[0]];
                if (maxMainItemWidth < itemSize[compassAxis[1]]) {
                    maxMainItemWidth = itemSize[compassAxis[1]];
                }
            } else {
                const _ = itemType;
                return _;
            }
        });
        size[compassAxis[1]] += maxMainItemWidth;
        size[0] += item1.space[0] + item1.space[2];
        size[1] += item1.space[1] + item1.space[3];
        sizes[itemId1] = size;
        item1.mainItems.forEach((itemId)=>{
            const item = items[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                const mainItemSize = [
                    0,
                    0
                ];
                mainItemSize[compassAxis[0]] = item.width;
                mainItemSize[compassAxis[1]] = maxMainItemWidth;
                sizes[itemId] = mainItemSize;
            } else if (itemType === 'Cell' || itemType === 'Group' || itemType === 'Unit') {} else {
                const _ = itemType;
                return _;
            }
        });
        item1.crossItems.forEach((eachCrossItem)=>{
            eachCrossItem.forEach((itemId)=>{
                const item = items[itemId];
                if (item.type !== 'Road') {
                    throw new Error(`[E310201] invalid unreachable code.`);
                }
                const crossItemSize = [
                    0,
                    0
                ];
                crossItemSize[compassAxis[0]] = size[compassAxis[0]];
                crossItemSize[compassAxis[1]] = item.width;
                sizes[itemId] = crossItemSize;
            });
        });
        return size;
    } else {
        const _ = itemType1;
        return _;
    }
};
const getCalcItemCoordRecursive = (itemId2, items, sizes, itemLocas)=>{
    const item2 = items[itemId2];
    const itemType2 = item2.type;
    if (itemType2 === 'Group' || itemType2 === 'Unit') {
        const compassAxis = getCompassAxis(item2.compassItems);
        const mainCood = item2.space[compassAxis[0]];
        let crossCood = item2.space[compassAxis[1]];
        item2.crossItems[0].forEach((itemId)=>{
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType !== 'Road') {
                throw new Error(`[E310201] invalid unreachable code.`);
            }
            itemLocas[itemId] = {
                itemId: itemId,
                size: size,
                coord: [
                    mainCood,
                    crossCood
                ]
            };
            crossCood += size[compassAxis[1]];
        });
        let mainItemMainCood = mainCood;
        const mainItemCrossCood = crossCood;
        let maxMainItemWidth = 0;
        item2.mainItems.forEach((itemId)=>{
            const size = sizes[itemId];
            if (maxMainItemWidth < size[compassAxis[1]]) {
                maxMainItemWidth = size[compassAxis[1]];
            }
        });
        crossCood += maxMainItemWidth;
        item2.crossItems[1].forEach((itemId)=>{
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType !== 'Road') {
                throw new Error(`[E310201] invalid unreachable code.`);
            }
            itemLocas[itemId] = {
                itemId: itemId,
                size: size,
                coord: [
                    mainCood,
                    crossCood
                ]
            };
            crossCood += size[compassAxis[1]];
        });
        item2.mainItems.forEach((itemId)=>{
            const item = items[itemId];
            const size = sizes[itemId];
            const itemType = item.type;
            if (itemType === 'Road') {
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [
                        mainItemMainCood,
                        mainItemCrossCood
                    ]
                };
                mainItemMainCood += size[compassAxis[0]];
            } else if (itemType === 'Cell') {
                let cellCrossCood;
                if (item.align === 'start') {
                    cellCrossCood = mainItemCrossCood;
                } else if (item.align === 'center') {
                    cellCrossCood = mainItemCrossCood + Math.floor((maxMainItemWidth - size[compassAxis[1]]) / 2);
                } else if (item.align === 'end') {
                    cellCrossCood = mainItemCrossCood + maxMainItemWidth - size[compassAxis[1]];
                } else {
                    const _ = item.align;
                    return _;
                }
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [
                        mainItemMainCood,
                        cellCrossCood
                    ]
                };
                mainItemMainCood += size[compassAxis[0]];
            } else if (itemType === 'Group' || itemType === 'Unit') {
                let cellCrossCood;
                if (item.align === 'start') {
                    cellCrossCood = mainItemCrossCood;
                } else if (item.align === 'center') {
                    cellCrossCood = mainItemCrossCood + Math.floor((maxMainItemWidth - size[compassAxis[1]]) / 2);
                } else if (item.align === 'end') {
                    cellCrossCood = mainItemCrossCood + maxMainItemWidth - size[compassAxis[1]];
                } else {
                    const _ = item.align;
                    return _;
                }
                itemLocas[itemId] = {
                    itemId: itemId,
                    size: size,
                    coord: [
                        mainItemMainCood,
                        cellCrossCood
                    ]
                };
                getCalcItemCoordRecursive(itemId, items, sizes, itemLocas);
                mainItemMainCood += size[compassAxis[0]];
            } else {
                const _ = itemType;
                return _;
            }
        });
    } else if (itemType2 === 'Cell' || itemType2 === 'Road') {} else {
        const _ = itemType2;
        return _;
    }
};
const parse4 = async (astL4, { pre , post , calc  } = {})=>{
    if (pre) {
        astL4 = await pre(astL4);
    }
    const items = astL4.items;
    let itemLocas;
    if (calc) {
        itemLocas = await calc(items, astL4);
    } else {
        itemLocas = await calcLoca(items);
    }
    let astL5 = {
        nodes: astL4.nodes,
        nodeAttrs: astL4.nodeAttrs,
        links: astL4.links,
        linkAttrs: astL4.linkAttrs,
        docAttr: astL4.docAttr,
        laneAttr: astL4.laneAttr,
        n2i: astL4.n2i,
        i2n: astL4.i2n,
        items: astL4.items,
        linkItems: astL4.linkItems,
        itemLocas: itemLocas
    };
    if (post) {
        astL5 = await post(astL5);
    }
    return astL5;
};
const parse5 = async (astL5, { pre , post  } = {})=>{
    if (pre) {
        astL5 = await pre(astL5);
    }
    const itemLocas = [];
    const groupDisps = [];
    const cellDisps = [];
    const linkDisps = [];
    astL5.itemLocas.forEach((itemLocaL5)=>{
        const item = astL5.items[itemLocaL5.itemId];
        const xy = [
            0,
            0
        ];
        if (item.parents.length !== 0) {
            const parentItemId = item.parents[item.parents.length - 1];
            const parentItemLoca = itemLocas[parentItemId];
            const parentItem = astL5.items[parentItemId];
            const parentItemType = parentItem.type;
            if (!(parentItemType === 'Group' || parentItemType === "Unit")) {
                throw new Error(`[E060101] invalid unreachable code.`);
            }
            const compass = parentItem.compassItems;
            const compassAxis = getCompassAxis(compass);
            if (compass[0] <= 1) {
                xy[compassAxis[0]] = parentItemLoca.xy[compassAxis[0]] + itemLocaL5.coord[0];
            } else {
                xy[compassAxis[0]] = parentItemLoca.xy[compassAxis[0]] + parentItemLoca.size[compassAxis[0]] - itemLocaL5.coord[0];
            }
            if (compass[1] <= 1) {
                xy[compassAxis[1]] = parentItemLoca.xy[compassAxis[1]] + itemLocaL5.coord[1];
            } else {
                xy[compassAxis[1]] = parentItemLoca.xy[compassAxis[1]] + parentItemLoca.size[compassAxis[1]] - itemLocaL5.coord[1];
            }
        }
        itemLocas.push({
            itemId: itemLocaL5.itemId,
            size: itemLocaL5.size,
            coord: itemLocaL5.coord,
            xy: xy
        });
    });
    const canvas = {
        size: itemLocas[0].size
    };
    astL5.items.forEach((item)=>{
        const itemType = item.type;
        if (itemType === 'Group') {
            const nodeId = astL5.i2n[item.itemId];
            if (nodeId == null) {
                throw new Error(`[E060102] invalid unreachable code.`);
            }
            const groupAttr = astL5.nodeAttrs[nodeId];
            const groupAttrType = groupAttr.type;
            if (groupAttrType !== 'Group') {
                throw new Error(`[E060103] invalid unreachable code.`);
            }
            const itemLoca = itemLocas[item.itemId];
            groupDisps.push({
                xy: [
                    itemLoca.xy[0] + groupAttr.margin[0],
                    itemLoca.xy[1] + groupAttr.margin[1], 
                ],
                size: [
                    itemLoca.size[0] - (groupAttr.margin[0] + groupAttr.margin[2]),
                    itemLoca.size[1] - (groupAttr.margin[1] + groupAttr.margin[3]), 
                ],
                text: groupAttr.disp
            });
        } else if (itemType === 'Cell') {
            const nodeId = astL5.i2n[item.itemId];
            if (nodeId == null) {
                throw new Error(`[E060104] invalid unreachable code.`);
            }
            const cell = astL5.nodes[nodeId];
            const cellType = cell.type;
            if (cellType !== 'Cell') {
                throw new Error(`[E060105] invalid unreachable code.`);
            }
            const cellAttr = astL5.nodeAttrs[nodeId];
            const cellAttrType = cellAttr.type;
            if (cellAttrType !== 'Cell') {
                throw new Error(`[E060106] invalid unreachable code.`);
            }
            const itemLoca = itemLocas[item.itemId];
            cellDisps.push({
                xy: [
                    itemLoca.xy[0] + cellAttr.margin[0],
                    itemLoca.xy[1] + cellAttr.margin[1], 
                ],
                size: [
                    itemLoca.size[0] - (cellAttr.margin[0] + cellAttr.margin[2]),
                    itemLoca.size[1] - (cellAttr.margin[1] + cellAttr.margin[3]), 
                ],
                text: cellAttr.disp
            });
        } else if (itemType === 'Road' || itemType === 'Unit') {} else {
            const _ = itemType;
            return _;
        }
    });
    astL5.linkItems.forEach((linkItem)=>{
        const xys = [];
        let currentXY = getGateXY(linkItem.box[0], linkItem.edge[0], linkItem.gate[0], astL5.items, itemLocas, astL5.nodeAttrs, astL5.i2n, astL5.docAttr);
        xys.push(currentXY);
        linkItem.route.forEach((itemId, i)=>{
            const item = astL5.items[itemId];
            const itemLoca = itemLocas[itemId];
            if (item.type !== 'Road') {
                throw new Error(`[E060107] invalid unreachable code.`);
            }
            const parentItemId = item.parents[item.parents.length - 1];
            const parentItem = astL5.items[parentItemId];
            if (!(parentItem.type === 'Group' || parentItem.type === 'Unit')) {
                throw new Error(`[E060108] invalid unreachable code.`);
            }
            const compassAxis = getCompassAxis(parentItem.compassItems);
            if (compassAxis[0] !== item.axis) {
                currentXY = [
                    currentXY[0],
                    itemLoca.xy[1] + itemLoca.size[1] / 2, 
                ];
            } else {
                currentXY = [
                    itemLoca.xy[0] + itemLoca.size[0] / 2,
                    currentXY[1], 
                ];
            }
            xys.push(currentXY);
            if (i === linkItem.route.length - 1) {
                const lastXY = getGateXY(linkItem.box[1], linkItem.edge[1], linkItem.gate[1], astL5.items, itemLocas, astL5.nodeAttrs, astL5.i2n, astL5.docAttr);
                if (compassAxis[0] !== item.axis) {
                    currentXY = [
                        lastXY[0],
                        currentXY[1], 
                    ];
                } else {
                    currentXY = [
                        currentXY[0],
                        lastXY[1], 
                    ];
                }
                xys.push(currentXY);
                xys.push(lastXY);
            }
        });
        linkDisps.push({
            xys: xys
        });
    });
    let astL6 = {
        nodes: astL5.nodes,
        nodeAttrs: astL5.nodeAttrs,
        links: astL5.links,
        linkAttrs: astL5.linkAttrs,
        docAttr: astL5.docAttr,
        laneAttr: astL5.laneAttr,
        n2i: astL5.n2i,
        i2n: astL5.i2n,
        items: astL5.items,
        linkItems: astL5.linkItems,
        itemLocas: itemLocas,
        canvas: canvas,
        groupDisps: groupDisps,
        cellDisps: cellDisps,
        linkDisps: linkDisps
    };
    if (post) {
        astL6 = await post(astL6);
    }
    return astL6;
};
const getGateXY = (itemId, direct, gate, items, itemLocas, nodeAttrs, i2n, docAttr)=>{
    const item = items[itemId];
    const parentItem = items[item.parents[item.parents.length - 1]];
    if (!(parentItem.type === 'Group' || parentItem.type === 'Unit')) {
        throw new Error(`[E060201] invalid unreachable code.`);
    }
    const compass = getCompassFull(parentItem.compassItems);
    direct = compass[direct];
    const itemLoca = itemLocas[itemId];
    const itemType = item.type;
    if (!(itemType === 'Group' || itemType === 'Cell')) {
        throw new Error(`[E060202] invalid unreachable code.`);
    }
    const nodeId = i2n[itemId];
    if (nodeId == null) {
        throw new Error(`[E060203] invalid unreachable code.`);
    }
    const nodeAttr = nodeAttrs[nodeId];
    if (!(nodeAttr.type === 'Group' || nodeAttr.type === 'Cell')) {
        throw new Error(`[E060204] invalid unreachable code.`);
    }
    const gateNum = item.bnGates[direct];
    const allGateLen = gateNum === 0 ? 0 : (gateNum - 1) * docAttr.gate_gap[direct];
    const targetGateLen = gate === 0 ? 0 : (gate - 1) * docAttr.gate_gap[direct];
    if (direct === 0) {
        return [
            itemLoca.xy[0] + itemLoca.size[0] - nodeAttr.margin[direct],
            itemLoca.xy[1] + Math.floor((itemLoca.size[1] - allGateLen) / 2) + targetGateLen, 
        ];
    } else if (direct === 1) {
        return [
            itemLoca.xy[0] + Math.floor((itemLoca.size[0] - allGateLen) / 2) + targetGateLen,
            itemLoca.xy[1] + itemLoca.size[1] - nodeAttr.margin[direct], 
        ];
    } else if (direct === 2) {
        return [
            itemLoca.xy[0] + nodeAttr.margin[direct],
            itemLoca.xy[1] + Math.floor((itemLoca.size[1] - allGateLen) / 2) + targetGateLen, 
        ];
    } else if (direct === 3) {
        return [
            itemLoca.xy[0] + Math.floor((itemLoca.size[0] - allGateLen) / 2) + targetGateLen,
            itemLoca.xy[1] + nodeAttr.margin[direct], 
        ];
    } else {
        const _ = direct;
        return _;
    }
};
const parse6 = async (astL6, { pre , post  } = {})=>{
    if (pre) {
        astL6 = await pre(astL6);
    }
    const sb = [];
    sb.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${astL6.canvas.size[0]}" height="${astL6.canvas.size[1]}">`);
    astL6.groupDisps.forEach((groupDisp)=>{
        sb.push(`<rect x="${groupDisp.xy[0]}" y="${groupDisp.xy[1]}" width="${groupDisp.size[0]}" height="${groupDisp.size[1]}" fill="none" stroke="black" class="fl3-group"></rect>`);
        if (groupDisp.text != null) {
            sb.push(`<text x="${groupDisp.xy[0] + Math.floor(groupDisp.size[0] / 2)}" y="${groupDisp.xy[1]}" text-anchor="middle" dominant-baseline="middle" stroke="black">${groupDisp.text}</text>`);
        }
    });
    astL6.cellDisps.forEach((cellDisp)=>{
        sb.push(`<rect x="${cellDisp.xy[0]}" y="${cellDisp.xy[1]}" width="${cellDisp.size[0]}" height="${cellDisp.size[1]}" fill="none" stroke="black" class="fl3-cell"></rect>`);
        if (cellDisp.text != null) {
            sb.push(`<text x="${cellDisp.xy[0] + Math.floor(cellDisp.size[0] / 2)}" y="${cellDisp.xy[1] + Math.floor(cellDisp.size[1] / 2)}" text-anchor="middle" dominant-baseline="middle" stroke="black">${cellDisp.text}</text>`);
        }
    });
    const laneWidth = astL6.laneAttr.laneWidth.map((x)=>Math.floor(x * 0.6)
    );
    const laneWidthDouble = laneWidth.map((x)=>Math.floor(x * 2)
    );
    astL6.linkDisps.forEach((linkDisp)=>{
        const pathSb = [];
        linkDisp.xys.forEach((xy, i)=>{
            if (i === 0) {
                pathSb.push(`M ${xy[0]} ${xy[1]}`);
            } else if (i === linkDisp.xys.length - 1) {
                pathSb.push(` L ${xy[0]} ${xy[1]}`);
            } else {
                const bef = linkDisp.xys[i - 1].concat();
                const aft = linkDisp.xys[i + 1].concat();
                [
                    bef,
                    aft
                ].forEach((target)=>{
                    let targetAxis;
                    if (xy[0] === target[0]) {
                        targetAxis = 1;
                    } else if (xy[1] === target[1]) {
                        targetAxis = 0;
                    } else {
                        throw new Error(`[E070102] invalid astL6.`);
                    }
                    if (xy[targetAxis] > target[targetAxis]) {
                        if (xy[targetAxis] - laneWidthDouble[targetAxis] > target[targetAxis]) {
                            target[targetAxis] = xy[targetAxis] - laneWidth[targetAxis];
                        } else {
                            target[targetAxis] = Math.floor((xy[targetAxis] + target[targetAxis]) / 2);
                        }
                    } else if (xy[targetAxis] < target[targetAxis]) {
                        if (xy[targetAxis] + laneWidthDouble[targetAxis] < target[targetAxis]) {
                            target[targetAxis] = xy[targetAxis] + laneWidth[targetAxis];
                        } else {
                            target[targetAxis] = Math.floor((xy[targetAxis] + target[targetAxis]) / 2);
                        }
                    } else {
                        return;
                    }
                });
                pathSb.push(` L ${bef[0]} ${bef[1]} Q ${xy[0]} ${xy[1]} ${aft[0]} ${aft[1]}`);
            }
        });
        sb.push(`<path d="${pathSb.join('')}" fill="none" stroke="black"/>`);
    });
    sb.push(`<style>`);
    sb.push(`.fl3-group{stroke-dasharray: 2}`);
    sb.push(`</style>`);
    sb.push(`</svg>`);
    let svg = sb.join("\n");
    if (post) {
        svg = await post(svg);
    }
    return svg;
};
const parse7 = async (fl31, { debug , textSize , calcRoute: calcRoute1 , calcLoca: calcLoca1  } = {})=>{
    const astL11 = await parse(fl31, {
        pre: async (fl3)=>{
            if (debug) {
                console.log("<fl3>");
                console.log(fl3);
            }
            return fl3;
        },
        post: async (astL1)=>{
            if (debug) {
                console.log("<astL1>");
                console.log(astL1);
            }
            return astL1;
        }
    });
    const svg = await parseJson(astL11, {
        debug: debug,
        textSize: textSize,
        calcRoute: calcRoute1,
        calcLoca: calcLoca1
    });
    return svg;
};
const parseJson = async (json, { debug , textSize , calcRoute: calcRoute2 , calcLoca: calcLoca2  } = {})=>{
    const astL21 = await parse1(json, {
        textSize: textSize,
        post: async (astL2)=>{
            if (debug) {
                console.log("<astL2>");
                console.log(astL2);
            }
            return astL2;
        }
    });
    const astL31 = await parse2(astL21, {
        calc: calcRoute2,
        post: async (astL3)=>{
            if (debug) {
                console.log("<astL3>");
                console.log(astL3);
            }
            return astL3;
        }
    });
    const astL41 = await parse3(astL31, {
        post: async (astL4)=>{
            if (debug) {
                console.log("<astL4>");
                console.log(astL4);
            }
            return astL4;
        }
    });
    const astL51 = await parse4(astL41, {
        calc: calcLoca2,
        post: async (astL5)=>{
            if (debug) {
                console.log("<astL5>");
                console.log(astL5);
            }
            return astL5;
        }
    });
    const astL61 = await parse5(astL51, {
        post: async (astL6)=>{
            if (debug) {
                console.log("<astL6>");
                console.log(astL6);
            }
            return astL6;
        }
    });
    const svg1 = await parse6(astL61, {
        post: async (svg)=>{
            if (debug) {
                console.log("<svg>");
                console.log(svg);
            }
            return svg;
        }
    });
    return svg1;
};
export { parse7 as parse };
export { parseJson as parseJson };
