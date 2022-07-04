import { Path, AccessName, Direction } from "./astC1.ts"
import { AstL1, Container, Group, Unit, Cell, Link } from "./astL1.ts"
import { addRootAttr, parseUnitAttr, parseGroupAttr, parseCellAttr, parseLinkAttr } from "./convMapToL1Attr.ts"

type State = {
    first: boolean,  // Beginning of line
    currentPath: Path,
    currentContainer: Container,
    fpath: Path | null,  // for short link
    slink: {  // short link
        direction: [Direction, Direction];
        attr: Map<string, string>;
    } | null,
}
type Pos = {
    i: number;
    l: number;
    c: number;
}
type NameMap = {
    container: Container;
    implicit: boolean;
    childMap: Map<string, NameMap | NameCell>;
}
const nameSymbol = Symbol();
type NameCell = {
    [nameSymbol]: true,
    cell: Cell;
    implicit: boolean;
}

// deno-lint-ignore no-explicit-any
export const isNameCell = (c: any): c is NameCell => {
    return c[nameSymbol];
}

type Options = {
    pre?: (fl3: string) => Promise<string>,
    post?: (astL1: AstL1) => Promise<AstL1>,
}

// FILE ERROR ID = '01'
export const parse = async (fl3: string, { pre, post }: Options = {}): Promise<AstL1> => {
    // File is potentially using EOL CRLF
    if (pre) {
        fl3 = await pre(fl3);
    }
    fl3 = fl3.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let ast: AstL1 = {
        nodes: [],
        links: [],
    };
    const nameMap: NameMap = {
        container: ast,
        childMap: new Map<string, NameMap>(),
        implicit: true,  // root not use
    };
    const state: State = {
        first: true,
        currentPath: [],
        currentContainer: ast,
        fpath: null,
        slink: null,
    }
    const pos: Pos = {
        i: 0,
        l: 1,
        c: 1,
    }
    parseGlobal(fl3, ast, state, pos, nameMap);
    if (post) {
        ast = await post(ast);
    }
    return ast;
}

const parseGlobal = (fl3: string, ast: AstL1, state: State, pos: Pos, nameMap: NameMap): void => {
    // FUNCTION ERROR ID = '01'
    skipCommentAndBlank(fl3, pos);
    while (fl3.length > pos.i) {
        const cur = fl3[pos.i];
        switch (cur) {
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
                    while (fl3.length > pos.i) {
                        const cur = fl3[pos.i];
                        if (cur === "-") {
                            nextChar(pos);
                            i++
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
}

const parseUnit = (fl3: string, ast: AstL1, state: State, pos: Pos, nameMap: NameMap): void => {
    // FUNCTION ERROR ID = '02'
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
        const attrMap = new Map<string, string>();
        while (fl3.length > pos.i) {
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
            // Unit link is invalid but will be checked later.
            addLink(ast, pathToAccessName(state.fpath), pathToAccessName(path), state.slink.direction, state.slink.attr);
        }
        if (newLineFlg) {
            if (state.first) {  // only before and after both beginning of line
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
}

const parseGroup = (fl3: string, ast: AstL1, state: State, pos: Pos, nameMap: NameMap): void => {
    // FUNCTION ERROR ID = '03'
    const L = pos.l;
    const C = pos.c;
    skipCommentAndBlank(fl3, pos);
    const path = parseAbsolutePath(fl3, state, pos);
    let closed = false;
    const attrMap = new Map<string, string>();
    while (fl3.length > pos.i) {
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
        // Unit link is invalid but will be checked later.
        addLink(ast, pathToAccessName(state.fpath), pathToAccessName(path), state.slink.direction, state.slink.attr);
    }
    if (newLineFlg) {
        if (state.first) {  // only before and after both beginning of line
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

const parseCell = (fl3: string, ast: AstL1, state: State, pos: Pos, nameMap: NameMap): void => {
    // FUNCTION ERROR ID = '04'
    const L = pos.l;
    const C = pos.c;
    skipCommentAndBlank(fl3, pos);
    const path = parseRelativePath(fl3, state, pos);
    let closed = false;
    const attrMap = new Map<string, string>();
    while (fl3.length > pos.i) {
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
        // Unit link is invalid but will be checked later.
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
}

const parseLink = (fl3: string, ast: AstL1, state: State, pos: Pos): void => {
    // FUNCTION ERROR ID = '05'
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
    const attrMap = new Map<string, string>();
    while (fl3.length > pos.i) {
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
}

const parseRoot = (fl3: string, ast: AstL1, state: State, pos: Pos) => {
    // FUNCTION ERROR ID = '06'
    if (state.slink) {
        throw new Error(`[E010601] invalid char at ${pos.l}:${pos.c}`);
    }
    skipCommentAndBlank(fl3, pos);
    if (fl3.length <= pos.i) {
        const cur = fl3[pos.i];
        if (/\w/.test(cur)) {
            const attrMap = new Map<string, string>();
            while (fl3.length > pos.i) {
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
}

const parseRootAttr = (fl3: string, ast: AstL1, pos: Pos) => {
    // FUNCTION ERROR ID = '07'
    const attrMap = new Map<string, string>();
    while (fl3.length > pos.i) {
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
}

const parseSlink = (fl3: string, state: State, pos: Pos): void => {
    // FUNCTION ERROR ID = '08'
    if (!state.fpath) {
        throw new Error(`[E010801] invalid char at ${pos.l}:${pos.c}`);
    }
    const direction = parseLinkType(fl3, pos);
    state.slink = {
        direction: direction,
        attr: new Map<string, string>(),
    };
}

const parseComment = (fl3: string, pos: Pos) => {
    // FUNCTION ERROR ID = '09'
    while (fl3.length > pos.i) {
        const cur = fl3[pos.i];
        if (cur === "\n") {
            break;
        } else {
            nextChar(pos);
        }
    }
}

const parseAbsolutePath = (fl3: string, state: State, pos: Pos): Path => {
    // FUNCTION ERROR ID = '11'
    const ret: Path = [];
    if (fl3.length <= pos.i) {
        throw new Error(`[E011101] invalid terminated at ${pos.l}:${pos.c}`);
    }
    const first = fl3[pos.i];
    if (first === '.') {
        ret.push(...state.currentPath);
        nextChar(pos);
    }
    while (fl3.length > pos.i) {
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
}

const parseRelativePath = (fl3: string, state: State, pos: Pos): Path => {
    // FUNCTION ERROR ID = '18'
    const ret: Path = state.currentPath.concat();
    while (fl3.length > pos.i) {
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
}

const parseName = (fl3: string, pos: Pos): string => {
    // FUNCTION ERROR ID = '12'
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
}

const parseRefName = (fl3: string, state: State, pos: Pos): string => {
    // FUNCTION ERROR ID = '13'
    if (fl3.length <= pos.i) {
        throw new Error(`[E011301] invalid terminated at ${pos.l}:${pos.c}`);
    }
    const first = fl3[pos.i];
    if (first === '&' || first === '$') {
        nextChar(pos);
        return first + parseSimpleName(fl3, pos);
    } else {
        const absPath = parseAbsolutePath(fl3, state, pos)
        return pathToAccessName(absPath);
    }
}

const parseSimpleName = (fl3: string, pos: Pos): string => {
    // FUNCTION ERROR ID = '14'
    const start = pos.i;
    while (fl3.length > pos.i) {
        const cur = fl3[pos.i];
        if (/\w/.test(cur)) {
            nextChar(pos);
        } else {
            break;
        }
    }
    return fl3.substring(start, pos.i);
}

const parseSimpleValue = (fl3: string, pos: Pos): string => {
    // FUNCTION ERROR ID = '19'
    const start = pos.i;
    while (fl3.length > pos.i) {
        const cur = fl3[pos.i];
        if (/[\w,]/.test(cur)) {
            nextChar(pos);
        } else {
            break;
        }
    }
    return fl3.substring(start, pos.i);
}

const parseQuote = (fl3: string, pos: Pos, quote: string): string => {
    // FUNCTION ERROR ID = '15'
    const start = pos.i;
    const L = pos.l;
    const C = pos.c;
    let escape = false;
    while (fl3.length > pos.i) {
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
        } else if (/["']/.test(cur)) {  // another quote
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
}

const parseLinkType = (fl3: string, pos: Pos): [Direction, Direction] => {
    // FUNCTION ERROR ID = '16'
    let ftypeInverse = false;
    let ttypeInverse = false;
    let firstChar: '-' | '|' | null = null;
    let secondChar: '-' | '|' | null = null;
    while (fl3.length > pos.i) {
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
            //throw new Error(`[E011603] invalid link relation at ${pos.l}:${pos.c}`);
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
}

const parseAttr = (fl3: string, pos: Pos): [string, string] => {
    // FUNCTION ERROR ID = '17'
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
    nextChar(pos)
    if (fl3.length <= pos.i) {
        throw new Error(`[E011704] attr need value at ${pos.l}:${pos.c}`);
    }
    const cur2 = fl3[pos.i];
    if (/["']/.test(cur2)) {
        nextChar(pos);
        const v = parseQuote(fl3, pos, cur2);
        return [k, v];
    } else {
        const v = parseSimpleValue(fl3, pos);
        if (!v) {
            throw new Error(`[E011705] attr need value at ${pos.l}:${pos.c}`);
        }
        return [k, v];
    }
}

const skipCommentAndBlank = (fl3: string, pos: Pos): boolean => {
    // FUNCTION ERROR ID = '21'
    let newLineFlg = false;
    while (fl3.length > pos.i) {
        const cur1 = fl3[pos.i];
        if (cur1 === "#") {
            nextChar(pos);
            while (fl3.length > pos.i) {
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
}

const addUnit = (nameMap: NameMap, path: Path, attrMap: Map<string, string>, pos: Pos): void => {
    // FUNCTION ERROR ID = '31'
    let currentMap = nameMap;
    path.forEach((containerName, i) => {
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {  // last
                const tmpUnit: Unit = {
                    type: "Unit",
                    name: containerName,
                    nodes: [],
                };
                if (attrMap.size !== 0) {
                    tmpUnit.attr = parseUnitAttr(attrMap);
                }
                currentMap.container.nodes.push(tmpUnit);
                nextMap = {
                    container: tmpUnit,
                    implicit: attrMap.size === 0,
                    childMap: new Map<string, NameMap>(),
                }
                currentMap.childMap.set(containerName, nextMap);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {  // last
                throw new Error(`[E013101] cannot override cell define at ${pos.l}:${pos.c}`);
            } else {
                throw new Error(`[E013102] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {  // last
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
}

const addGroup = (nameMap: NameMap, path: Path, attrMap: Map<string, string>, pos: Pos): void => {
    // FUNCTION ERROR ID = '32'
    let currentMap = nameMap;
    path.forEach((containerName, i) => {
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {  // last
                const tmpGroup: Group = {
                    type: "Group",
                    name: containerName,
                    nodes: [],
                };
                if (attrMap.size !== 0) {
                    tmpGroup.attr = parseGroupAttr(attrMap);
                }
                currentMap.container.nodes.push(tmpGroup);
                nextMap = {
                    container: tmpGroup,
                    implicit: false,
                    childMap: new Map<string, NameMap>(),
                }
                currentMap.childMap.set(containerName, nextMap);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {  // last
                throw new Error(`[E013201] cannot override cell define at ${pos.l}:${pos.c}`);
            } else {
                throw new Error(`[E013202] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {  // last
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
}

const addCell = (nameMap: NameMap, path: Path, attrMap: Map<string, string>, pos: Pos): void => {
    // FUNCTION ERROR ID = '33'
    let currentMap = nameMap;
    path.forEach((containerName, i) => {
        let nextMap = currentMap.childMap.get(containerName);
        if (nextMap == null) {
            if (i === path.length - 1) {  // last
                const cell: Cell = {
                    type: "Cell",
                    name: containerName,
                };
                if (attrMap.size !== 0) {
                    cell.attr = parseCellAttr(attrMap);
                }
                currentMap.container.nodes.push(cell);
                const nameCell: NameCell = {
                    [nameSymbol]: true,
                    cell: cell,
                    implicit: attrMap.size === 0,
                }
                currentMap.childMap.set(containerName, nameCell);
            } else {
                nextMap = addImplicitUnit(containerName, currentMap);
                currentMap = nextMap;
            }
        } else if (isNameCell(nextMap)) {
            if (i === path.length - 1) {  // last
                if (nextMap.implicit) {
                    nextMap.cell.attr = parseCellAttr(attrMap);
                } else {
                    throw new Error(`[E013301] duplicated cell attr define at ${pos.l}:${pos.c}`);
                }
            } else {
                throw new Error(`[E013302] invalid path. already exists cell at ${pos.l}:${pos.c}`);
            }
        } else {
            if (i === path.length - 1) {  // last
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
}

const addLink = (ast: AstL1, from: AccessName, to: AccessName, direction: [Direction, Direction], attrMap: Map<string, string>): void => {
    // FUNCTION ERROR ID = '34'
    const link: Link = {
        box: [from, to],
        direction: direction,
    };
    if (attrMap.size !== 0) {
        link.attr = parseLinkAttr(attrMap);
    }
    ast.links.push(link);
}

const addImplicitUnit = (containerName: string, currentMap: NameMap): NameMap => {
    // FUNCTION ERROR ID = '35'
    const tmpUnit: Unit = {
        type: "Unit",
        name: containerName,
        nodes: [],
    };
    currentMap.container.nodes.push(tmpUnit);
    const nextMap = {
        container: tmpUnit,
        implicit: true,
        childMap: new Map<string, NameMap>(),
    }
    currentMap.childMap.set(containerName, nextMap);
    return nextMap;
}

const nextLine = (pos: Pos) => {
    pos.l++;
    pos.c = 1;
    pos.i++;
}

const nextChar = (pos: Pos) => {
    pos.c++;
    pos.i++;
}

const pathToAccessName = (path: Path): AccessName => {
    return path.map(name => {
        if (/^\w+$/.test(name)) {
            return name;
        } else {
            return '"' + name.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
        }
    }).join(".");
}

const firstCharToDirection = (char: '-' | '|', inverse: boolean): Direction => {
    if (char === '-') {
        return inverse ? 'main_reverse' : 'main';
    } else if (char === '|') {
        return inverse ? 'cross_reverse' : 'cross';
    } else {
        const _: never = char;
        return _;
    }
}

const secondCharToDirection = (char: '-' | '|', inverse: boolean): Direction => {
    if (char === '-') {
        return inverse ? 'main' : 'main_reverse';
    } else if (char === '|') {
        return inverse ? 'cross' : 'cross_reverse';
    } else {
        const _: never = char;
        return _;
    }
}
