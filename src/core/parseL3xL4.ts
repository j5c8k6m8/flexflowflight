import { ItemId, NodeId, LinkId, GateNo, EdgeNumber } from "./astC0.ts"
import { Node, NodeAttr, Link, LaneAttr } from "./astL2.ts"
import { AstL3, LinkRoute } from "./astL3.ts"
import { AstL4, Item, GroupItem, UnitItem, CellItem, RoadMain, RoadCross, LinkItem } from "./astL4.ts"

type itemIdGen = {
    itemId: ItemId;
    n2i: ItemId[];
    i2n: Array<NodeId | null>;
}

type Options = {
    pre?: (arg: AstL3) => Promise<AstL3>,
    post?: (arg: AstL4) => Promise<AstL4>,
}

// FILE ERROR ID = '04'
export const parse = async (astL3: AstL3, { pre, post }: Options = {}): Promise<AstL4> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL3 = await pre(astL3);
    }

    const nodes = astL3.nodes;
    const nodeAttrs = astL3.nodeAttrs;
    const links = astL3.links;
    const linkRoutes: LinkRoute[] = astL3.linkRoutes;

    const n2i: ItemId[] = [];
    const i2n: NodeId[] = [];
    const items: Item[] = [];
    const linkItems: LinkItem[] = [];

    const idGen: itemIdGen = {
        itemId: 0,
        n2i: n2i,
        i2n: i2n,
    }
    const nodeMainMaxLaneMap: Map<NodeId, Map<number, Map<GateNo, LinkId[]>>> = new Map();
    const nodeCrossMaxLaneMap: Map<NodeId, [Map<GateNo, LinkId[]>, Map<GateNo, LinkId[]>]> = new Map();

    linkRoutes.forEach(linkRoute => {
        linkRoute.route.forEach(road => {
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
                    nodeCrossMaxLane = [new Map(), new Map()];
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
                const _: never = axis;
                return _;
            }
        });
    });

    setNodeMap(
        0,
        items,
        nodes,
        nodeAttrs,
        links,
        linkRoutes,
        astL3.laneAttr,
        idGen,
        n2i,
        nodeMainMaxLaneMap,
        nodeCrossMaxLaneMap,
        [],
    );

    links.forEach(link => {
        const linkRoute = linkRoutes[link.linkId];
        const route = linkRoute.route.map(r => {
            const item = items[n2i[r.containerId]];
            const type = item.type;
            const axis = r.axis;
            if (type !== "Group" && type !== "Unit") {
                throw new Error(`[E040101] invalid.`);
            }
            if (axis === 0) {
                for (let i = 0; i < item.mainItems.length; i++) {
                    const tmp = items[item.mainItems[i]];
                    if (tmp.type === "Road" && tmp.avenue === r.avenue && tmp.lane === r.lane) {
                        return tmp.itemId
                    }
                }
            } else if (axis === 1) {
                const avenue = r.avenue;
                if (avenue === 0) {
                    for (let i = 0; i < item.crossItems[0].length; i++) {
                        const tmp = items[item.crossItems[0][i]];
                        if (tmp.type === "Road" && tmp.lane === r.lane) {
                            return tmp.itemId
                        }
                    }
                } else if (avenue === 1) {
                    for (let i = 0; i < item.crossItems[1].length; i++) {
                        const tmp = items[item.crossItems[1][i]];
                        if (tmp.type === "Road" && tmp.lane === r.lane) {
                            return tmp.itemId
                        }
                    }
                } else {
                    const _: never = avenue;
                    return _;
                }
            } else {
                const _: never = axis;
                return _;
            }
            throw new Error(`[E040102] invalid.`);
        });
        linkItems[linkRoute.linkId] = {
            linkId: linkRoute.linkId,
            box: [n2i[link.box[0]], n2i[link.box[1]]],
            edge: link.edge,
            gate: linkRoute.gate,
            route: route,
        }
    });
    // set siblings
    items.forEach(item => {
        if (item.type === "Group" || item.type === "Unit") {
            const mainItems = item.mainItems;
            mainItems.forEach(childItemId => {
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
    let astL4: AstL4 = {
        nodes: nodes,
        nodeAttrs: nodeAttrs,
        links: links,
        linkAttrs: astL3.linkAttrs,
        docAttr: astL3.docAttr,
        laneAttr: astL3.laneAttr,
        items: items,
        linkItems: linkItems,
        n2i: n2i,
        i2n: i2n,
    }
    if (post) {
        astL4 = await post(astL4);
    }
    return astL4;
}

const setNodeMap = (
    nodeId: NodeId,
    items: Item[],
    nodes: Node[],
    nodeAttrs: NodeAttr[],
    allLinks: Link[],
    linkRoutes: LinkRoute[],
    laneAttr: LaneAttr,
    idGen: itemIdGen,
    n2i: ItemId[],
    nodeMainMaxLaneMap: Map<NodeId, Map<number, Map<GateNo, LinkId[]>>>,
    nodeCrossMaxLaneMap: Map<NodeId, [Map<GateNo, LinkId[]>, Map<GateNo, LinkId[]>]>,
    mainItems: ItemId[]
): void => {
    // FUNCTION ERROR ID = '01'
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
            nodeCrossMaxLane = [new Map(), new Map()];
        }
        const mainItems: ItemId[] = [];
        const crossItems: [ItemId[], ItemId[]] = [[], []];
        const itemId = getItemId(idGen, nodeId);
        let nodeItem: GroupItem | UnitItem;
        if (nodeType === "Group") {
            if (nodeAttr.type !== "Group") {
                throw new Error(`[E040202] invalid unreachable code.`);
            }
            nodeItem = {
                itemId: itemId,
                type: node.type,
                compass: node.compass,
                parents: node.parents.map(p => n2i[p]),
                siblings: [],  // set after
                links: node.links,
                bnGates: getBnGates(node.links, allLinks, linkRoutes),
                mainItems: mainItems,
                crossItems: crossItems,
                space: nodeAttr.space,
                align: nodeAttr.align,
            }
        } else if (nodeType === "Unit") {
            if (nodeAttr.type !== "Unit") {
                throw new Error(`[E040203] invalid unreachable code.`);
            }
            nodeItem = {
                itemId: itemId,
                type: node.type,
                compass: node.compass,
                parents: node.parents.map(p => n2i[p]),
                siblings: [],  // set after
                mainItems: mainItems,
                crossItems: crossItems,
                space: nodeAttr.space,
                align: nodeAttr.align,
            }
        } else {
            const _: never = nodeType;
            return _;
        }
        items.push(nodeItem);
        const parents = nodeItem.parents;
        if (parents.length > 0) {
            const parentItem = items[parents[parents.length - 1]];
            if (parentItem.type == 'Group' || parentItem.type == 'Unit') {
                parentItem.mainItems.push(nodeItem.itemId)
            } else {
                throw new Error(`[E040201] invalid unreachable code.`);
            }
        }
        // TODO
        let crossFirstLength = 0;
        for (const key of nodeCrossMaxLane[0].keys()) {
            if (key > crossFirstLength) {
                crossFirstLength = key;
            }
        }
        for (let i = 0; i < crossFirstLength + 1; i++) {
            const itemId = getItemId(idGen, null);
            const links = nodeCrossMaxLane[0].get(i) || [];
            const load: RoadCross = {
                itemId: itemId,
                type: "Road",
                axis: 1,
                avenue: 0,
                lane: i,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                links: links,
                width: laneAttr.laneWidth[1],
            }
            items.push(load);
            crossItems[0].push(load.itemId)
        }
        for (let i = 0; i < node.children.length; i++) {
            let mainLength = 0;
            const laneMap = nodeMainMaxLane.get(i);
            if (laneMap) {
                for (const key of laneMap.keys()) {
                    if (key > mainLength) {
                        mainLength = key;
                    }
                }
            }
            for (let j = 0; j < mainLength + 1; j++) {
                const itemId = getItemId(idGen, null);
                const links = laneMap?.get(j) || [];
                const load: RoadMain = {
                    itemId: itemId,
                    type: "Road",
                    axis: 0,
                    avenue: i,
                    lane: j,
                    parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                    siblings: [],  // set after
                    links: links,
                    width: laneAttr.laneWidth[0],
                }
                items.push(load);
                mainItems.push(load.itemId)
            }

            setNodeMap(
                node.children[i],
                items,
                nodes,
                nodeAttrs,
                allLinks,
                linkRoutes,
                laneAttr,
                idGen,
                n2i,
                nodeMainMaxLaneMap,
                nodeCrossMaxLaneMap,
                mainItems,
            );
        }
        // TODO
        let mainLength = 0;
        const laneMap = nodeMainMaxLane.get(node.children.length);
        if (laneMap) {
            for (const key of laneMap.keys()) {
                if (key > mainLength) {
                    mainLength = key;
                }
            }
        }
        for (let j = 0; j < mainLength + 1; j++) {
            const itemId = getItemId(idGen, null);
            const links = laneMap?.get(j) || [];
            const load: RoadMain = {
                itemId: itemId,
                type: "Road",
                axis: 0,
                avenue: node.children.length,
                lane: j,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                siblings: [],  // set after
                links: links,
                width: laneAttr.laneWidth[0],
            }
            items.push(load);
            mainItems.push(load.itemId)
        }
        let crossLastLength = 0;
        for (const key of nodeCrossMaxLane[1].keys()) {
            if (key > crossLastLength) {
                crossLastLength = key;
            }
        }
        for (let i = 0; i < crossLastLength + 1; i++) {
            const itemId = getItemId(idGen, null);
            const links = nodeCrossMaxLane[1].get(i) || [];
            const load: RoadCross = {
                itemId: itemId,
                type: "Road",
                axis: 1,
                avenue: 1,
                lane: i,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                links: links,
                width: laneAttr.laneWidth[1],
            }
            items.push(load);
            crossItems[1].push(load.itemId)
        }
    } else if (nodeType === "Cell") {

        if (nodeAttr.type !== "Cell") {
            throw new Error(`[E040204] invalid unreachable code.`);
        }

        const nodeItemId = getItemId(idGen, nodeId);
        const nodeItem: CellItem = {
            itemId: nodeItemId,
            type: node.type,
            parents: node.parents.map(p => n2i[p]),
            siblings: [],  // set after
            links: node.links,
            bnGates: getBnGates(node.links, allLinks, linkRoutes),
            size: nodeAttr.size,
            align: nodeAttr.align,
        }
        items.push(nodeItem);
        mainItems.push(nodeItem.itemId)
    } else {
        const _: never = nodeType;
        return _;
    }
}

const getBnGates = (links: [LinkId[], LinkId[]], allLink: Link[], linkRoutes: LinkRoute[]): EdgeNumber => {
    // FUNCTION ERROR ID = '02'
    const ret: EdgeNumber = [0, 0, 0, 0];
    links[0].forEach(linkId => {
        const link = allLink[linkId];
        const linkRoute = linkRoutes[linkId];
        if (!link) {
            throw new Error(`[E040201] asgR2 is invalid.`);
        }
        if (ret[link.edge[0]] < linkRoute.gate[0]) {
            ret[link.edge[0]] = linkRoute.gate[0];
        }
    });
    links[1].forEach(linkId => {
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
}

const getItemId = (idGen: itemIdGen, nodeId: NodeId | null): ItemId => {
    const itemId = idGen.itemId;
    if (nodeId != null) {
        idGen.i2n[itemId] = nodeId;
        idGen.n2i[nodeId] = itemId;
    } else {
        idGen.i2n[itemId] = null;
    }
    idGen.itemId++;
    return itemId;
}