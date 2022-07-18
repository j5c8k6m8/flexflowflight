import { ItemId, NodeId, LinkId, LaneNo, EdgeNumber } from "./astC0.ts"
import { Node, NodeAttr, Link, LocaAttr } from "./astL2.ts"
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
    mainLaneMin?: number,
    crossLaneMin?: number,

}

// FILE ERROR ID = '04'
export const parse = async (astL3: AstL3, { pre, post, mainLaneMin, crossLaneMin }: Options = {}): Promise<AstL4> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL3 = await pre(astL3);
    }
    const mainLaneMinNum: number = mainLaneMin || 0;
    const crossLaneMinNum: number = crossLaneMin || 0;

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
    const nodeMainRoadsMap: Map<NodeId, Map<number, LinkId[]>> = new Map();
    const nodeCrossRoadsMap: Map<NodeId, [LinkId[], LinkId[]]> = new Map();

    linkRoutes.forEach(linkRoute => {
        linkRoute.route.forEach(road => {
            const axis = road.axis;
            if (axis === 0) {
                let nodeMainRoads = nodeMainRoadsMap.get(road.containerId);
                if (!nodeMainRoads) {
                    nodeMainRoads = new Map();
                    nodeMainRoadsMap.set(road.containerId, nodeMainRoads);
                }
                let links = nodeMainRoads.get(road.avenue);
                if (links == null) {
                    links = [];
                    nodeMainRoads.set(road.avenue, links);
                }
                links.push(linkRoute.linkId);
            } else if (axis === 1) {
                let nodeCrossRoads = nodeCrossRoadsMap.get(road.containerId);
                if (!nodeCrossRoads) {
                    nodeCrossRoads = [[], []];
                    nodeCrossRoadsMap.set(road.containerId, nodeCrossRoads);
                }
                nodeCrossRoads[road.avenue].push(linkRoute.linkId);
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
        astL3.locaAttr,
        idGen,
        n2i,
        nodeMainRoadsMap,
        nodeCrossRoadsMap,
        [],
        mainLaneMinNum,
        crossLaneMinNum,
    );

    const currentMainLanesMap: Map<ItemId, Map<number, LaneNo>> = new Map();
    const currentCrossLanesMap: Map<ItemId, [LaneNo, LaneNo]> = new Map();

    links.forEach(link => {
        const linkRoute = linkRoutes[link.linkId];
        const route = linkRoute.route.map(r => {
            const itemId = n2i[r.containerId];
            const item = items[itemId];
            const type = item.type;
            const axis = r.axis;
            if (type !== "Group" && type !== "Unit") {
                throw new Error(`[E040101] invalid.`);
            }
            if (axis === 0) {
                const avenue = r.avenue;
                let currentMainLanes = currentMainLanesMap.get(itemId);
                if (!currentMainLanes) {
                    currentMainLanes = new Map();
                    currentMainLanesMap.set(itemId, currentMainLanes);
                }
                let currentMainLane = currentMainLanes.get(avenue);
                if (currentMainLane == null) {
                    currentMainLane = 0;
                }
                currentMainLanes.set(avenue, currentMainLane + 1);

                for (let i = 0; i < item.mainItems.length; i++) {
                    const tmp = items[item.mainItems[i]];
                    if (tmp.type === "Road" && tmp.avenue === avenue && tmp.lane === currentMainLane) {
                        return tmp.itemId
                    }
                }
            } else if (axis === 1) {
                const avenue = r.avenue;
                let currentCrossLanes = currentCrossLanesMap.get(itemId);
                if (!currentCrossLanes) {
                    currentCrossLanes = [0, 0];
                    currentCrossLanesMap.set(itemId, currentCrossLanes);
                }

                const currentCrossLane = currentCrossLanes[avenue];
                currentCrossLanes[avenue] = currentCrossLane + 1;
                if (avenue === 0) {
                    for (let i = 0; i < item.crossItems[0].length; i++) {
                        const tmp = items[item.crossItems[0][i]];
                        if (tmp.type === "Road" && tmp.lane === currentCrossLane) {
                            return tmp.itemId
                        }
                    }
                } else if (avenue === 1) {
                    for (let i = 0; i < item.crossItems[1].length; i++) {
                        const tmp = items[item.crossItems[1][i]];
                        if (tmp.type === "Road" && tmp.lane === currentCrossLane) {
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
        locaAttr: astL3.locaAttr,
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
    laneAttr: LocaAttr,
    idGen: itemIdGen,
    n2i: ItemId[],
    nodeMainRoadsMap: Map<NodeId, Map<number, LinkId[]>>,
    nodeCrossRoadsMap: Map<NodeId, [LinkId[], LinkId[]]>,
    mainItems: ItemId[],
    mainLaneMinNum: number,
    crossLaneMinNum: number,
): void => {
    // FUNCTION ERROR ID = '02'
    const node = nodes[nodeId];
    const nodeAttr = nodeAttrs[nodeId];
    const nodeType = node.type;
    if (nodeType === "Group" || nodeType === "Unit") {
        let nodeMainRoads = nodeMainRoadsMap.get(nodeId);
        if (!nodeMainRoads) {
            nodeMainRoads = new Map();
            nodeMainRoadsMap.set(nodeId, nodeMainRoads);
        }
        let nodeCrossRoads = nodeCrossRoadsMap.get(nodeId);
        if (!nodeCrossRoads) {
            nodeCrossRoads = [[], []];
            nodeCrossRoadsMap.set(nodeId, nodeCrossRoads);
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
                compassItems: node.compassItems,
                compassSelf: node.compassSelf,
                parents: node.parents.map(p => n2i[p]),
                siblings: [],  // set after
                links: node.links,
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
                compassItems: node.compassItems,
                compassSelf: node.compassSelf,
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
        const targetCrossFirstRoads = nodeCrossRoads[0];
        let crossFirstLength = targetCrossFirstRoads.length;
        if (crossFirstLength < crossLaneMinNum) {
            crossFirstLength = crossLaneMinNum;
        }
        for (let i = 0; i < crossFirstLength; i++) {
            const itemId = getItemId(idGen, null);
            const load: RoadCross = {
                itemId: itemId,
                type: "Road",
                compassSelf: node.compassItems,
                axis: 1,
                avenue: 0,
                lane: i,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                link: targetCrossFirstRoads[i] || null,
                width: laneAttr.laneWidth[1],
            }
            items.push(load);
            crossItems[0].push(load.itemId)
        }
        for (let i = 0; i < node.children.length; i++) {
            let targetMainRoads = nodeMainRoads.get(i);
            if (targetMainRoads == null) {
                targetMainRoads = [];
            }
            let mainLength = targetMainRoads.length;
            if (mainLength < mainLaneMinNum) {
                mainLength = mainLaneMinNum;
            }
            for (let j = 0; j < mainLength; j++) {
                const itemId = getItemId(idGen, null);
                const load: RoadMain = {
                    itemId: itemId,
                    type: "Road",
                    compassSelf: node.compassItems,
                    axis: 0,
                    avenue: i,
                    lane: j,
                    parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                    siblings: [],  // set after
                    link: targetMainRoads[j] || null,
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
                nodeMainRoadsMap,
                nodeCrossRoadsMap,
                mainItems,
                mainLaneMinNum,
                crossLaneMinNum,
            );
        }
        let targetMainRoads = nodeMainRoads.get(node.children.length);
        if (targetMainRoads == null) {
            targetMainRoads = [];
        }
        let mainLength = targetMainRoads.length;
        if (mainLength < mainLaneMinNum) {
            mainLength = mainLaneMinNum;
        }
        for (let j = 0; j < mainLength; j++) {
            const itemId = getItemId(idGen, null);
            const load: RoadMain = {
                itemId: itemId,
                type: "Road",
                compassSelf: node.compassItems,
                axis: 0,
                avenue: node.children.length,
                lane: j,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                siblings: [],  // set after
                link: targetMainRoads[j] || null,
                width: laneAttr.laneWidth[0],
            }
            items.push(load);
            mainItems.push(load.itemId)
        }
        const targetCrossLastRoads = nodeCrossRoads[1];
        let crossLastLength = targetCrossLastRoads.length;
        if (crossLastLength < crossLaneMinNum) {
            crossLastLength = crossLaneMinNum;
        }
        for (let i = 0; i < crossLastLength; i++) {
            const itemId = getItemId(idGen, null);
            const load: RoadCross = {
                itemId: itemId,
                type: "Road",
                compassSelf: node.compassItems,
                axis: 1,
                avenue: 1,
                lane: i,
                parents: node.parents.map(p => n2i[p]).concat(n2i[node.nodeId]),
                link: targetCrossLastRoads[i] || null,
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
            compassSelf: node.compassSelf,
            parents: node.parents.map(p => n2i[p]),
            siblings: [],  // set after
            links: node.links,
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