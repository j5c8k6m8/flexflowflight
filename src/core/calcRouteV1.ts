import { NodeId, GateNo, Direct, CrossAvenue, getMappingCompassFull, isSameAxisDirect, getAnotherAxisByDirect, getReverse } from "./astC0.ts"
import { Node, Link, LaneAttr } from "./astL2.ts"
import { LinkRoute, Road } from "./astL3.ts"

export type RailWithoutLane = RailMainWithoutLane | RailCrossWithoutLane;
export type RailMainWithoutLane = {
    containerId: number;
    axis: 0;
    // axisIndex is between 0 to children.length.
    axisIndex: number;
};
export type RailCrossWithoutLane = {
    containerId: number;
    axis: 1;
    // axisIndex is 0 or 1.
    axisIndex: CrossAvenue;
};

// FILE ERROR ID = '21'
// deno-lint-ignore require-await
export const calcRoute = async(nodes: Node[], links: Link[], _laneAttr: LaneAttr): Promise<LinkRoute[]> => {
    // FUNCTION ERROR ID = '01'
    const linkRoutes: LinkRoute[] = []

    const nodeEntryLaneMap: Map<NodeId, [GateNo, GateNo, GateNo, GateNo]> = new Map();
    const nodeMainLaneMap: Map<NodeId, Map<number, GateNo>> = new Map();
    const nodeCrossLaneMap: Map<NodeId, [GateNo, GateNo]> = new Map();

    links.forEach(link => {
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
        const fromParentsR = [...fromNode.parents].reverse();
        const toParentsR = [...toNode.parents].reverse();
        let fromCommonParentIndex = -1;
        let toCommonParentIndex = -1;
        for (let i = 0; i < fromParentsR.length; i++) {
            toCommonParentIndex = toParentsR.indexOf(fromParentsR[i]);
            if (toCommonParentIndex !== -1) {
                fromCommonParentIndex = i;
                break;
            }
        }
        if (fromCommonParentIndex == -1) {
            throw new Error(`[E030105] asgR1 is invalid.`);
        }
        const fromRoutes: [Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null] = [null, null, null, null];
        const toRoutes: [Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null] = [null, null, null, null];
        getRoutesWithoutLane(fromNode, link.edge[0], fromCommonParentIndex, [], fromRoutes, [0, 1, 2, 3], nodes, 1);
        getRoutesWithoutLane(toNode, link.edge[1], toCommonParentIndex, [], toRoutes, [2, 3, 0, 1], nodes, 1);
        const routeWithoutLane = getBestRouteWithoutLane(fromRoutes, toRoutes, fromNodeId, toNodeId);
        const route = routeWithoutLane.map((railWithoutLane): Road => {
            const axis = railWithoutLane.axis
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
                        lane: lane,
                    }
                } else {
                    indexMap.set(railWithoutLane.axisIndex, 1);
                    return {
                        containerId: railWithoutLane.containerId,
                        axis: railWithoutLane.axis,
                        avenue: railWithoutLane.axisIndex,
                        lane: 0,
                    }
                }
            } else if (axis === 1) {
                let lanes = nodeCrossLaneMap.get(railWithoutLane.containerId);
                if (!lanes) {
                    lanes = [1, 1];
                    nodeCrossLaneMap.set(railWithoutLane.containerId, lanes);
                }
                const lane = lanes[railWithoutLane.axisIndex];
                lanes[railWithoutLane.axisIndex] = lane + 1;
                return {
                    containerId: railWithoutLane.containerId,
                    axis: railWithoutLane.axis,
                    avenue: railWithoutLane.axisIndex,
                    lane: lane,
                }
            } else {
                const _: never = axis;
                return _;
            }
            
        });

        let frNodeEntryLane = nodeEntryLaneMap.get(link.box[0]);
        if (!frNodeEntryLane) {
            frNodeEntryLane = [1, 1, 1, 1];
            nodeEntryLaneMap.set(link.box[0], frNodeEntryLane)
        }
        const frLane = frNodeEntryLane[link.edge[0]];
        frNodeEntryLane[link.edge[0]] += 1;

        let toNodeEntryLane = nodeEntryLaneMap.get(link.box[1]);
        if (!toNodeEntryLane) {
            toNodeEntryLane = [1, 1, 1, 1];
            nodeEntryLaneMap.set(link.box[1], toNodeEntryLane)
        }
        const toLane = toNodeEntryLane[link.edge[1]];
        toNodeEntryLane[link.edge[1]] += 1;
        linkRoutes.push({
            linkId: link.linkId,
            gate: [frLane, toLane],
            route: route,
        });
    });
    return linkRoutes;
}

const getRoutesWithoutLane = (node: Node, direct: Direct, parentIndex: number, currentRoute: Array<RailWithoutLane>, routes: [Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null], directPriority: [Direct, Direct, Direct, Direct], nodeMap: Node[], callNum: number): void => {
    // FUNCTION ERROR ID = '02'
    // Avoid infinite loops.
    if (callNum > 100) {
        throw new Error(`[E030201] nest too deep.`);
    }
    callNum++;
    let targetIndex: number;
    if (node.bnParents[direct] - 1 >= parentIndex) {
        targetIndex = parentIndex;
    } else {
        targetIndex = node.bnParents[direct] - 1;
    }
    const targetNodeId = [...node.parents].reverse()[targetIndex];
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
    const railDirect = getMappingCompassFull(node.compass, targetNode.compass)[direct];
    let siblingIndex;
    if (targetIndex > 0) {
        const targetChildNodeId = [...node.parents].reverse()[targetIndex - 1];
        siblingIndex = targetNode.children.indexOf(targetChildNodeId);
    } else {
        siblingIndex = node.siblings.indexOf(node.nodeId);
    }
    let railWithoutLane: RailWithoutLane;
    if (railDirect === 0) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 0,
            axisIndex: siblingIndex + 1,
        }
    } else if (railDirect === 1) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 1,
            axisIndex: 1,
        }
    } else if (railDirect === 2) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 0,
            axisIndex: siblingIndex,
        }
    } else if (railDirect === 3) {
        railWithoutLane = {
            containerId: targetNodeId,
            axis: 1,
            axisIndex: 0,
        }
    } else {
        const _: never = railDirect;
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
        directPriority.forEach(d => {
            if (!isSameAxisDirect(d, railDirect)) {
                // recursive call
                getRoutesWithoutLane(targetNode, d, parentIndex - targetIndex - 1, currentRoute, routes, directPriority, nodeMap, callNum + 1);
            }
        });
    }
}
const getBestRouteWithoutLane = (fromRoutes: [Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null], toRoutes: [Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null, Array<RailWithoutLane> | null], fromLinkNodeId: NodeId, toLinkNodeId: NodeId): Array<RailWithoutLane> => {
    // FUNCTION ERROR ID = '03'
    const allDirect: Direct[] = [0, 1, 2, 3];
    let ret: Array<RailWithoutLane> | null = null;
    let retScore = Number.MAX_SAFE_INTEGER;
    allDirect.forEach(i => {
        const fromRoute = fromRoutes[i];
        allDirect.forEach(j => {
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
                        ret = fromRoute.concat([...toRoute].slice(0, -1).reverse());
                    }
                } else {
                    const tmpScore = (fromRoute.length + toRoute.length + 1) * 10 + 6;
                    if (tmpScore < retScore) {
                        retScore = tmpScore;
                        ret = fromRoute.concat({
                            containerId: fromLastRoute.containerId,
                            axis: getAnotherAxisByDirect(i),
                            axisIndex: 0,
                        }).concat([...toRoute].reverse());
                    }
                }
            } else {
                if (i === getReverse(j)) {
                    if (fromLastRoute.axisIndex === toLastRoute.axisIndex) {
                        const tmpScore = (fromRoute.length + toRoute.length - 1) * 10;
                        if (tmpScore < retScore) {
                            retScore = tmpScore;
                            ret = fromRoute.concat([...toRoute].slice(0, -1).reverse());
                        }
                    } else {
                        const fromSecondNodeId = fromRoute.length === 1 ? fromLinkNodeId : fromRoute[fromRoute.length - 2].containerId;
                        const toSecondNodeId = toRoute.length === 1 ? toLinkNodeId : toRoute[toRoute.length - 2].containerId;
                        const addPoint = ((i < j && fromSecondNodeId < toSecondNodeId) || (i > j && fromSecondNodeId > toSecondNodeId)) ? 2 : 8;
                        const tmpScore = (fromRoute.length + toRoute.length + 1) * 10 + addPoint;
                        if (tmpScore < retScore) {
                            retScore = tmpScore;
                            ret = fromRoute.concat({
                                containerId: fromLastRoute.containerId,
                                axis: getAnotherAxisByDirect(i),
                                axisIndex: 0,
                            }).concat([...toRoute].reverse());
                        }
                    }
                } else {
                    const tmpScore = (fromRoute.length + toRoute.length - 1) * 10 + 5;
                    if (tmpScore < retScore) {
                        retScore = tmpScore;
                        ret = fromRoute.concat([...toRoute].reverse());
                    }
                }
            }
        });
    });
    if (!ret) {
        throw new Error(`[E030301] asgR1 is invalid.`);
    }
    return ret;
}