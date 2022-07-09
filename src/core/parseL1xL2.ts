import { NodeId, LinkId, Direct, Compass, getMappingCompassFull, EdgeNumber } from "./astC0.ts"
import { AccessName, Path, Direction } from "./astC1.ts"
import { AstL1, Container as ContainerL1, Group as GroupL1, Unit as UnitL1, Cell as CellL1 } from "./astL1.ts"
import { AstL2, NodeAttr, LinkAttr, GroupAttr, UnitAttr, CellAttr } from "./astL2.ts"
import { Container as ContainerL2, Group as GroupL2, Unit as UnitL2, Cell as CellL2, Link as LinkL2, Node as NodeL2 } from "./astL2.ts"
import { parseDocAttr, parseRootUnitAttr, parseGroupAttr, parseUnitAttr, parseCellAttr, parseLinkAttr, parseLaneAttr, TextSizeFunc } from "./convL1AttrToL2Attr.ts"

type IdGen = {
    nodeId: NodeId;
    linkId: LinkId;
}

type State = {
    l1: ContainerL1;
    l2: ContainerL2;
    siblingIndex: number;
    parents: Array<number>;
    nameMap: NameMap;
}

type NameMap = {
    container: ContainerL2,
    childNum: number,  // for calc railNum
    childMap: Map<string, NameMap | CellL2>;
}

type Options = {
    pre?: (astL1: AstL1) => Promise<AstL1>,
    post?: (astL2: AstL2) => Promise<AstL2>,
    textSize?: TextSizeFunc,
}

// FILE ERROR ID = '02'
export const parse = async (astL1: AstL1, { pre, post, textSize }: Options = {}): Promise<AstL2> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL1 = await pre(astL1);
    }

    const nodes: Array<NodeL2> = [];
    const nodeAttrs: Array<NodeAttr> = [];
    const links: Array<LinkL2> = [];
    const linkAttrs: Array<LinkAttr> = [];
    const docAttr = parseDocAttr(astL1);
    const laneAttr = parseLaneAttr(astL1);

    const idGen: IdGen = {
        nodeId: 0,
        linkId: 0,
    }

    const rootId = getNodeId(idGen)
    const rootAttr = parseRootUnitAttr(astL1, rootId);
    nodeAttrs.push(rootAttr);
    const rootL2 = parseRootUnit(astL1, rootId);
    nodes.push(rootL2);
    const nameMap: NameMap = {
        container: rootL2,
        childNum: astL1.nodes.length,
        childMap: new Map(),
    }
    const statePath: Array<State> = [{
        l1: astL1,
        l2: rootL2,
        siblingIndex: 0,
        parents: [rootL2.nodeId],
        nameMap: nameMap,
    }];
    const resourceMap: Map<string, Array<GroupL2 | CellL2>> = new Map();
    const tagMap: Map<string, Array<GroupL2 | CellL2>> = new Map();
    while (statePath.length) {
        const currentState = statePath[statePath.length - 1];
        const currentL1 = currentState.l1;
        if (currentL1.nodes.length <= currentState.siblingIndex) {
            statePath.pop();
            continue;
        }
        const currentL2 = currentState.l2;
        const parents = currentState.parents;
        const siblingIndex = currentState.siblingIndex
        const nextL1 = currentL1.nodes[siblingIndex];
        currentState.siblingIndex++;
        const type = nextL1.type;
        if (type === 'Group') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = parseGroupAttr(nextL1, currentL1, nodeId, docAttr);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = parseGroup(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId, nextL2Attr);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);

            setResourceMap(resourceMap, nextL2, nextL2Attr);
            setTagMap(tagMap, nextL2, nextL2Attr);
            statePath.push({
                l1: nextL1,
                l2: nextL2,
                siblingIndex: 0,
                parents: parents.concat(nextL2.nodeId),
                nameMap: getSetNameMap(currentState.nameMap, nextL2, nextL1, nextL2Attr),
            });
        } else if (type === 'Unit') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = parseUnitAttr(nextL1, currentL1, nodeId, docAttr);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = parseUnit(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId, nextL2Attr);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);

            statePath.push({
                l1: nextL1,
                l2: nextL2,
                siblingIndex: 0,
                parents: parents.concat(nextL2.nodeId),
                nameMap: getSetNameMap(currentState.nameMap, nextL2, nextL1, nextL2Attr),
            });
        } else if (type === 'Cell') {
            const nodeId = getNodeId(idGen);
            const nextL2Attr = await parseCellAttr(nextL1, currentL1, nodeId, docAttr, textSize);
            nodeAttrs.push(nextL2Attr);
            const nextL2 = await parseCell(nextL1, currentL2, parents, siblingIndex, currentState.nameMap.childNum, nodeId);
            currentState.l2.children.push(nextL2.nodeId);
            nodes.push(nextL2);
            setResourceMap(resourceMap, nextL2, nextL2Attr);
            setTagMap(tagMap, nextL2, nextL2Attr);
            setNameMap(currentState.nameMap, nextL2, nextL2Attr);
        } else {
            const _: never = type;
            return _;
        }
    }

    astL1.links.forEach(link => {
        const from = getNodes(link.box[0], resourceMap, tagMap, nameMap);
        const to = getNodes(link.box[1], resourceMap, tagMap, nameMap);
        from.forEach(f => {
            to.forEach(t => {
                const link2: LinkL2 = {
                    linkId: getLinkId(idGen),
                    box: [f.nodeId, t.nodeId],
                    edge: link.direction ? getLinkDirect(link.direction) : [0, 2],
                }
                links.push(link2);
                const linkAttr = parseLinkAttr(link, link2)
                linkAttrs.push(linkAttr);
                const fnode = nodes[f.nodeId];
                if (fnode.type === 'Unit') {
                    // unreachable code
                    throw new Error(`[E_] .`);
                } else {
                    fnode.links[0].push(link2.linkId);
                }
                const tnode = nodes[t.nodeId];
                if (tnode.type === 'Unit') {
                    // unreachable code
                    throw new Error(`[E_] .`);
                } else {
                    tnode.links[1].push(link2.linkId);
                }
            });
        })
    });

    let astL2: AstL2 = {
        nodes: nodes,
        nodeAttrs: nodeAttrs,
        links: links,
        linkAttrs: linkAttrs,
        docAttr: docAttr,
        laneAttr: laneAttr,
    }
    if (post) {
        astL2 = await post(astL2);
    }
    return astL2;
}

export const parseRootUnit = (l1: AstL1, nodeId: NodeId): UnitL2 => {
    // FUNCTION ERROR ID = '11'
    return {
        nodeId: nodeId,
        type: "Unit",
        compassItems: getRootCompass(l1),
        compassSelf: [0, 1],
        parents: [],
        children: [],
        siblings: [0],
        bnParents: [0, 0, 0, 0],
    }
}

const parseGroup = (l1: GroupL1, parent: ContainerL2, parents: Array<number>, siblingIndex: number, parentChildNum: number, nodeId: NodeId, groupAttr: GroupAttr): GroupL2 => {
    // FUNCTION ERROR ID = '12'
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
        links: [[], []],
        bnParents: edge,
    };
}

const parseUnit = (l1: UnitL1, parent: ContainerL2, parents: Array<number>, siblingIndex: number, parentChildNum: number, nodeId: NodeId, unitAttr: UnitAttr): UnitL2 => {
    // FUNCTION ERROR ID = '13'
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
        bnParents: edge,
    };
}

const parseCell = (l1: CellL1, parent: ContainerL2, parents: Array<number>, siblingIndex: number, parentChildNum: number, nodeId: NodeId): CellL2 => {
    // FUNCTION ERROR ID = '14'
    const edge = getEdge(parent.compassItems, siblingIndex, parent.compassSelf, parentChildNum, parent.bnParents);
    return {
        nodeId: nodeId,
        type: "Cell",
        compassSelf: parent.compassItems,
        parents: parents,
        siblings: parent.children,
        links: [[], []],
        bnParents: edge,
    };
}

const getNodes = (accessName: AccessName, resourceMap: Map<string, Array<GroupL2 | CellL2>>, tagMap: Map<string, Array<GroupL2 | CellL2>>, nameMap: NameMap): Array<GroupL2 | CellL2> => {
    // FUNCTION ERROR ID = '21'
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
        let tmp: NameMap | CellL2 = nameMap;
        path.forEach(name => {
            if ('type' in tmp) {  // CellL2
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
        if ('type' in tmp) {  // CellL2
            return [tmp];
        } else {
            const container = tmp.container;
            if (container.type === 'Unit') {
                throw new Error(`[E022106] link can not connect Unit. access name: ${accessName}.`);
            }
            return [container];
        }
    }
}

const getNodeId = (idGen: IdGen): NodeId => {
    const ret = idGen.nodeId;
    idGen.nodeId++;
    return ret;
}

const getLinkId = (idGen: IdGen): LinkId => {
    const ret = idGen.linkId;
    idGen.linkId++;
    return ret;
}

const setResourceMap = (resourceMap: Map<string, Array<GroupL2 | CellL2>>, node: GroupL2 | CellL2, attr: GroupAttr | CellAttr): void => {
    const resource = attr.resource;
    if (resource) {
        let tmp: Array<GroupL2 | CellL2> | undefined = resourceMap.get(resource);
        if (!tmp) {
            tmp = [];
        }
        tmp.push(node);
    }
}

const setTagMap = (tagMap: Map<string, Array<GroupL2 | CellL2>>, node: GroupL2 | CellL2, attr: GroupAttr | CellAttr): void => {
    attr.tag.forEach(t => {
        let tmp: Array<GroupL2 | CellL2> | undefined = tagMap.get(t);
        if (!tmp) {
            tmp = [];
        }
        tmp.push(node);

    });
}

const getSetNameMap = (nameMap: NameMap, node: ContainerL2, nodeL1: ContainerL1, attr: NodeAttr): NameMap => {
    if (nameMap.childMap.get(attr.name)) {
        throw new Error(`[E_] duplicated name.`);
    }
    const ret: NameMap = {
        container: node,
        childNum: nodeL1.nodes.length,
        childMap: new Map(),
    }
    nameMap.childMap.set(attr.name, ret);
    return ret;
}

const setNameMap = (nameMap: NameMap, node: CellL2, attr: CellAttr): void => {
    if (nameMap.childMap.get(attr.name)) {
        throw new Error(`[E_] duplicated name.`);
    }
    nameMap.childMap.set(attr.name, node);
}

const accessNameToPath = (accessName: AccessName): Path => {
    const ret: Path = [];
    let i = 0;
    while (accessName.length > i) {
        const cur = accessName[i];
        if (cur === '"') {
            i++;
            let close = false;
            let escape = false;
            let j = i;
            while (accessName.length > j) {
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
                    j++
                }
            }
            if (!close) {
                throw new Error(`[E_] invalid escape access name.`);
            }
        } else {
            let find = false;
            let j = i;
            while (accessName.length > j) {
                const cur2 = accessName[j];
                if (cur2 === ".") {
                    ret.push(accessName.substring(i, j));
                    j++;
                    find = true;
                    break;
                } else if (/\w/.test(cur2)) {
                    j++
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
}

const getRootCompass = (Group: AstL1): Compass => {
    if (Group.attr?.direction === 'column' || Group.attr?.direction === 'cross') {
        return [1, 0];
    } else if (Group.attr?.direction === 'row_reverse') {
        return [2, 1];
    } else if (Group.attr?.direction === 'column_reverse') {
        return [3, 0];
    } else {
        // default or 'same' or 'row'
        return [0, 1];
    }
}

const getGroupCompass = (Group: GroupL1, parent: ContainerL2): Compass => {
    if (Group.attr?.direction === 'main') {
        return parent.compassItems;
    } else if (Group.attr?.direction === 'row') {
        return [0, 1];
    } else if (Group.attr?.direction === 'column') {
        return [1, 0];
    } else if (Group.attr?.direction === 'row_reverse') {
        return [2, 1];
    } else if (Group.attr?.direction === 'column_reverse') {
        return [3, 0];
    } else {
        // default or 'another'
        // for typescript compiler.
        const first = parent.compassItems[0];
        if (first === 0 || first === 2) {
            const second = parent.compassItems[1];
            return [second, first];
        } else if (first === 1 || first === 3) {
            const second = parent.compassItems[1];
            return [second, first];
        } else {
            const _: never = first;
            return _;
        }
    }
    /* // TODO switchable?
    if (Group.attr?.direction === 'cross') {
        // for typescript compiler.
        const first = parent.compass[0];
        if (first === 0 || first === 2) {
            const second = parent.compass[1];
            return [second, first];
        } else if (first === 1 || first === 3) {
            const second = parent.compass[1];
            return [second, first];
        } else {
            const _: never = first;
            return _;
        }
    } else if (Group.attr?.direction === 'row') {
        return [0, 1];
    } else if (Group.attr?.direction === 'column') {
        return [1, 0];
    } else if (Group.attr?.direction === 'row_reverse') {
        return [2, 1];
    } else if (Group.attr?.direction === 'column_reverse') {
        return [3, 0];
    } else {
        // default or 'same'
        return parent.compass;
    }
    */
}

const getUnitCompass = (Unit: UnitL1, parent: ContainerL2): Compass => {
    if (Unit.attr?.direction === 'main') {
        return parent.compassItems;
    } else if (Unit.attr?.direction === 'row') {
        return [0, 1];
    } else if (Unit.attr?.direction === 'column') {
        return [1, 0];
    } else if (Unit.attr?.direction === 'row_reverse') {
        return [2, 1];
    } else if (Unit.attr?.direction === 'column_reverse') {
        return [3, 0];
    } else {
        // default or 'another'
        // for typescript compiler.
        const first = parent.compassItems[0];
        if (first === 0 || first === 2) {
            const second = parent.compassItems[1];
            return [second, first];
        } else if (first === 1 || first === 3) {
            const second = parent.compassItems[1];
            return [second, first];
        } else {
            const _: never = first;
            return _;
        }
    }
}

const getLinkDirect = (direction: [Direction, Direction]): [Direct, Direct] => {
    return [getDirect(direction[0]), getDirect(direction[1])];
}

const getDirect = (direction: Direction): Direct => {
    if (direction === 'main') {
        return 0;
    } else if (direction === 'cross') {
        return 1;
    } else if (direction === 'main_reverse') {
        return 2;
    } else if (direction === 'cross_reverse') {
        return 3;
    } else {
        const _: never = direction;
        return _;
    }
}

const getEdge = (compass: Compass, siblingIndex: number, parentCompass: Compass, parentChildNum: number, parentEdge: EdgeNumber): EdgeNumber => {
    const mappingCompassFull = getMappingCompassFull(parentCompass, compass);
    if (parentChildNum === 1) {
        return [
            parentEdge[mappingCompassFull[0]] + 1,
            parentEdge[mappingCompassFull[1]] + 1,
            parentEdge[mappingCompassFull[2]] + 1,
            parentEdge[mappingCompassFull[3]] + 1,
        ];
    } else if (siblingIndex === 0) {  //first
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
}
