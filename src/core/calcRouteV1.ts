import { NodeId, Direct, getMappingCompassFull, isSameAxisDirect, getAnotherAxisByDirect, getReverse } from "./astC0.ts"
import { Node, Link } from "./astL2.ts"
import { LinkRoute, Road } from "./astL3.ts"

// FILE ERROR ID = '21'
// deno-lint-ignore require-await
export const calcRoute = async (nodes: Node[], links: Link[]): Promise<LinkRoute[]> => {
    // FUNCTION ERROR ID = '01'
    const linkRoutes: LinkRoute[] = []

    links.forEach(link => {
        const fromNodeId = link.box[0];
        const toNodeId = link.box[1];
        const fromNode = nodes[fromNodeId];
        const toNode = nodes[toNodeId];
        if (!fromNode) {
            throw new Error(`[E210101] asgR1 is invalid.`);
        }
        if (!toNode) {
            throw new Error(`[E210102] asgR1 is invalid.`);
        }
        if (fromNode.parents.includes(toNodeId)) {
            throw new Error(`[E210103] between parents link is invalid.`);
        }
        if (toNode.parents.includes(fromNodeId)) {
            throw new Error(`[E210104] between parents link is invalid.`);
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
        // fromNode and toNode are not rootNode.
        if (fromCommonParentIndex == -1) {
            throw new Error(`[E210105] asgR1 is invalid.`);
        }
        const fromRoutes: [Road[] | null, Road[] | null, Road[] | null, Road[] | null] = [null, null, null, null];
        const toRoutes: [Road[] | null, Road[] | null, Road[] | null, Road[] | null] = [null, null, null, null];
        getRoutes(fromNode, link.edge[0], fromCommonParentIndex, [], fromRoutes, [0, 1, 2, 3], nodes, 1);
        getRoutes(toNode, link.edge[1], toCommonParentIndex, [], toRoutes, [2, 3, 0, 1], nodes, 1);
        const route = getBestRoute(fromRoutes, toRoutes, fromNodeId, toNodeId);

        linkRoutes.push({
            linkId: link.linkId,
            route: route,
        });
    });
    return linkRoutes;
}

const getRoutes = (node: Node, direct: Direct, parentIndex: number, currentRoute: Road[], routes: [Road[] | null, Road[] | null, Road[] | null, Road[] | null], directPriority: [Direct, Direct, Direct, Direct], nodeMap: Node[], callNum: number): void => {
    // FUNCTION ERROR ID = '02'
    // Avoid infinite loops.
    if (callNum > 1000) {
        throw new Error(`[E210201] nest too deep.`);
    }
    callNum++;

    // TODO refactor reference v2 getRoad
    let targetIndex: number;
    if (node.bnParents[direct] - 1 >= parentIndex) {
        targetIndex = parentIndex;
    } else {
        targetIndex = node.bnParents[direct] - 1;
    }
    const targetNodeId = [...node.parents].reverse()[targetIndex];
    if (!targetNodeId == null) {
        throw new Error(`[E210202] asgR1 is invalid.`);
    }
    const targetNode = nodeMap[targetNodeId];
    if (!targetNode) {
        throw new Error(`[E210203] asgR1 is invalid.`);
    }
    if (targetNode.type !== 'Group' && targetNode.type !== 'Unit') {
        throw new Error(`[E030204] asgR1 is invalid.`);
    }
    const railDirect = getMappingCompassFull(node.compassSelf, targetNode.compassItems)[direct];
    const siblingIndex = targetNode.children.indexOf(targetIndex > 0 ? [...node.parents].reverse()[targetIndex - 1] : node.nodeId);
    let road: Road;
    if (railDirect === 0) {
        road = {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex + 1,
        }
    } else if (railDirect === 1) {
        road = {
            containerId: targetNodeId,
            axis: 1,
            avenue: 1,
        }
    } else if (railDirect === 2) {
        road = {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex,
        }
    } else if (railDirect === 3) {
        road = {
            containerId: targetNodeId,
            axis: 1,
            avenue: 0,
        }
    } else {
        const _: never = railDirect;
        return _;
    }
    currentRoute = currentRoute.concat(road);
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
            throw new Error(`[E210207] asgR1 is invalid.`);
        }
        if (targetParentNode.type !== 'Group' && targetParentNode.type !== 'Unit') {
            throw new Error(`[E210208] asgR1 is invalid.`);
        }
        const nextMappingCompassFull = getMappingCompassFull(targetNode.compassItems, targetParentNode.compassItems);
        directPriority.forEach(d => {
            if (!isSameAxisDirect(d, railDirect)) {
                // recursive call
                getRoutes(targetNode, nextMappingCompassFull[d], parentIndex - targetIndex - 1, currentRoute, routes, directPriority, nodeMap, callNum + 1);
            }
        });
    }
}

const getBestRoute = (fromRoutes: [Road[] | null, Road[] | null, Road[] | null, Road[] | null], toRoutes: [Road[] | null, Road[] | null, Road[] | null, Road[] | null], fromLinkNodeId: NodeId, toLinkNodeId: NodeId): Road[] => {
    // FUNCTION ERROR ID = '03'
    const allDirect: Direct[] = [0, 1, 2, 3];
    let ret: Road[] | null = null;
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
                if (fromLastRoute.avenue === toLastRoute.avenue) {
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
                            avenue: 0,
                        }).concat([...toRoute].reverse());
                    }
                }
            } else {
                if (i === getReverse(j)) {
                    if (fromLastRoute.avenue === toLastRoute.avenue) {
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
                                avenue: 0,
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
        throw new Error(`[E210301] asgR1 is invalid.`);
    }
    return ret;
}