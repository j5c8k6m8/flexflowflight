import { NodeId, ItemId, Direct, Compass, Axis, getMappingCompassFull, isSameAxisDirect, getSameAxisByDirect, getAnotherAxisByDirect, getReverse, getCompassFull, XY, CrossAvenue } from "./astC0.ts"
import { AstL2, Node, Container, Link } from "./astL2.ts"
import { AstL3 } from "./astL3.ts"
import { AstL4 } from "./astL4.ts"
import { AstL5 } from "./astL5.ts"
import { AstL6, ItemLoca } from "./astL6.ts"
import { LinkRoute, Road } from "./astL3.ts"
import { parse as parseL3xL4 } from "./parseL3xL4.ts"
import { parse as parseL4xL5 } from "./parseL4xL5.ts"
import { parse as parseL5xL6 } from "./parseL5xL6.ts"

// FILE ERROR ID = '22'
export const calcRoute = async (nodes: Node[], links: Link[], astL2: AstL2): Promise<LinkRoute[]> => {
    // FUNCTION ERROR ID = '01'

    const dummyAstL3: AstL3 = {
        nodes: astL2.nodes,
        nodeAttrs: astL2.nodeAttrs,
        links: [],  // Dare to empty
        linkAttrs: astL2.linkAttrs,
        docAttr: astL2.docAttr,
        locaAttr: astL2.locaAttr,
        linkRoutes: [],
    }
    const dummyAstL4: AstL4 = await parseL3xL4(dummyAstL3, { mainLaneMin: 1, crossLaneMin: 1 });
    const dummyAstL5: AstL5 = await parseL4xL5(dummyAstL4);
    const dummyAstL6: AstL6 = await parseL5xL6(dummyAstL5);

    const linkRoutes: LinkRoute[] = []

    links.forEach(link => {
        const fromNodeId = link.box[0];
        const toNodeId = link.box[1];
        const fromDirect = link.edge[0];
        const toDirect = link.edge[1];
        const fromNode = nodes[fromNodeId];
        const toNode = nodes[toNodeId];
        if (!fromNode) {
            throw new Error(`[E220101] asgR1 is invalid.`);
        }
        if (!toNode) {
            throw new Error(`[E220102] asgR1 is invalid.`);
        }
        const currentRoad = getRoad(fromNode, fromDirect, toNode, nodes);
        const fromXY = getRoadXY(getGateXY(fromNode, fromDirect, dummyAstL6), currentRoad, nodes, dummyAstL6.itemLocas, dummyAstL6.n2i);

        const toDummyRoad = getRoad(toNode, toDirect, fromNode, nodes);
        const toXY = getRoadXY(getGateXY(toNode, toDirect, dummyAstL6), toDummyRoad, nodes, dummyAstL6.itemLocas, dummyAstL6.n2i);

        const [route, _distance] = getRoutes(currentRoad, fromXY, toNode, toDirect, toXY, [], nodes, dummyAstL6, 1, null);
        if (route == null) {
            throw new Error(`[E220104] invalid.`);
        }

        linkRoutes.push({
            linkId: link.linkId,
            route: route,
        });
    });
    return linkRoutes;
}

const getRoutes = (currentRoad: Road, currentXY: XY, lastNode: Node, lastDirect: Direct, lastXY: XY, currentRoute: Road[], nodes: Node[], astL6: AstL6, callNum: number, limitDistance: number | null): [Road[], number] | [null, null] => {
    // FUNCTION ERROR ID = '02'
    // Avoid infinite loops.
    if (callNum > 100) {
        throw new Error(`[E220201] nest too deep.`);
    }
    callNum++;

    currentRoute = currentRoute.concat(currentRoad);
    if (isRoadReach(currentRoad, lastNode, lastDirect, nodes)) {
        const currentRoadCompass = getRoadCompass(currentRoad, nodes);
        const currentRoadAbsAxis = getAnotherAxisByDirect(currentRoadCompass[currentRoad.axis]);
        const retDistance = Math.abs(currentXY[currentRoadAbsAxis] - lastXY[currentRoadAbsAxis])
        if (limitDistance == null || retDistance < limitDistance) {
            return [currentRoute, retDistance];
        } else {
            return [null, null];
        }
    }
    const minDistance = Math.abs(currentXY[0] - lastXY[0]) + Math.abs(currentXY[1] - lastXY[1]);

    const extraLimitDistance = limitDistance == null ? null : limitDistance - minDistance;
    if (extraLimitDistance != null && extraLimitDistance < 0) {
        return [null, null];
    }

    const allCandidateRoads = getNextAllRoads(currentRoad, lastNode, nodes);
    const candidateRoads = allCandidateRoads.filter(c => {
        let notFindFlg = true;
        for (let i = 0; i < currentRoute.length; i++) {
            const road = currentRoute[i];
            if (road.containerId === c.containerId && road.axis === c.axis && road.avenue === c.avenue) {
                notFindFlg = false;
                break;
            }
        }
        return notFindFlg;
    });

    const innerCandidateRoads: Array<[Road, XY, number, number]> = [];
    const outerCandidateRoads: Array<[Road, XY, number, number]> = [];

    candidateRoads.forEach(candidateRoad => {
        const targetXY = getRoadXY(currentXY, candidateRoad, nodes, astL6.itemLocas, astL6.n2i);

        const roadXYAxis = getRoadAbsAxis(currentRoad, nodes);
        const distance = Math.abs(currentXY[roadXYAxis] - targetXY[roadXYAxis]);
        if (currentXY[roadXYAxis] <= lastXY[roadXYAxis]) {
            if (lastXY[roadXYAxis] < targetXY[roadXYAxis]) {
                const priorityDistance = targetXY[roadXYAxis] - lastXY[roadXYAxis];
                if (extraLimitDistance != null && priorityDistance * 2 > extraLimitDistance) {
                    return; // continue;
                }
                let findFlg = false;
                for (let i = 0; i < outerCandidateRoads.length; i++) {
                    if (outerCandidateRoads[i][3] > priorityDistance) {
                        outerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance]);
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    outerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            } else if (currentXY[roadXYAxis] > targetXY[roadXYAxis]) {
                const priorityDistance = currentXY[roadXYAxis] - targetXY[roadXYAxis];
                if (extraLimitDistance != null && priorityDistance * 2 > extraLimitDistance) {
                    return; // continue;
                }
                let findFlg = false;
                for (let i = 0; i < outerCandidateRoads.length; i++) {
                    if (outerCandidateRoads[i][3] > priorityDistance) {
                        outerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance]);
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    outerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            } else {
                const priorityDistance = lastXY[roadXYAxis] - targetXY[roadXYAxis];
                let findFlg = false;
                for (let i = 0; i < innerCandidateRoads.length; i++) {
                    if (innerCandidateRoads[i][3] > priorityDistance) {
                        innerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance])
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    innerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            }
        } else {
            if (lastXY[roadXYAxis] > targetXY[roadXYAxis]) {
                const priorityDistance = targetXY[roadXYAxis] - lastXY[roadXYAxis];
                if (extraLimitDistance != null && priorityDistance * 2 > extraLimitDistance) {
                    return; // continue;
                }
                let findFlg = false;
                for (let i = 0; i < outerCandidateRoads.length; i++) {
                    if (outerCandidateRoads[i][3] > priorityDistance) {
                        outerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance])
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    outerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            } else if (currentXY[roadXYAxis] < targetXY[roadXYAxis]) {
                const priorityDistance = targetXY[roadXYAxis] - currentXY[roadXYAxis];
                if (extraLimitDistance != null && priorityDistance * 2 > extraLimitDistance) {
                    return; // continue;
                }
                let findFlg = false;
                for (let i = 0; i < outerCandidateRoads.length; i++) {
                    if (outerCandidateRoads[i][3] > priorityDistance) {
                        outerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance]);
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    outerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            } else {
                const priorityDistance = targetXY[roadXYAxis] - lastXY[roadXYAxis];
                let findFlg = false;
                for (let i = 0; i < innerCandidateRoads.length; i++) {
                    if (innerCandidateRoads[i][3] > priorityDistance) {
                        innerCandidateRoads.splice(i, 0, [candidateRoad, targetXY, distance, priorityDistance])
                        findFlg = true;
                        break;
                    }
                }
                if (!findFlg) {
                    innerCandidateRoads.push([candidateRoad, targetXY, distance, priorityDistance]);
                }
            }
        }
    });
    let extraDistance: number | null = null;
    let ret: [Road[], number] | [null, null] = [null, null];
    for (let i = 0; i < innerCandidateRoads.length; i++) {
        const t = innerCandidateRoads[i];
        let argLimitDistance: number | null = null;
        if (extraDistance != null) {
            argLimitDistance = minDistance + extraDistance - t[2];
        } else if (limitDistance != null) {
            argLimitDistance = limitDistance - t[2];
        }
        const [tmpRoute, tmpDistance] = getRoutes(t[0], t[1], lastNode, lastDirect, lastXY, currentRoute, nodes, astL6, callNum, argLimitDistance);
        if (tmpRoute != null && tmpDistance != null) {
            const distance = tmpDistance + t[2];
            const tmpExtraDistance = distance - minDistance;
            if (tmpExtraDistance === 0) {
                return [tmpRoute, distance];
            } else if (extraDistance == null || extraDistance > tmpExtraDistance) {
                extraDistance = tmpExtraDistance;
                ret = [tmpRoute, distance];
            }
        }
    }
    for (let i = 0; i < outerCandidateRoads.length; i++) {
        const t = outerCandidateRoads[i];
        if (extraDistance != null && extraDistance < t[3] * 2) {
            break;
        }
        let argLimitDistance: number | null = null;
        if (extraDistance != null) {
            argLimitDistance = minDistance + extraDistance - t[2];
        } else if (limitDistance != null) {
            argLimitDistance = limitDistance - t[2];
        }
        const [tmpRoute, tmpDistance] = getRoutes(t[0], t[1], lastNode, lastDirect, lastXY, currentRoute, nodes, astL6, callNum, argLimitDistance);
        if (tmpRoute != null && tmpDistance != null) {
            const distance = tmpDistance + t[2];
            const tmpExtraDistance = distance - minDistance;
            if (extraDistance == null || extraDistance > tmpExtraDistance) {
                extraDistance = tmpExtraDistance;
                ret = [tmpRoute, distance];
            }
        }
    }
    return ret;
}

const getGateXY = (node: Node, direct: Direct, astL6: AstL6): XY => {
    // FUNCTION ERROR ID = '04'
    const itemLoca = astL6.itemLocas[astL6.n2i[node.nodeId]];
    const absDirect = getCompassFull(node.compassSelf)[direct];
    if (absDirect === 0) {
        return [
            itemLoca.xy[0] + itemLoca.size[0],
            itemLoca.xy[1] + Math.floor(itemLoca.size[1] / 2),
        ];
    } else if (absDirect === 1) {
        return [
            itemLoca.xy[0] + Math.floor(itemLoca.size[0] / 2),
            itemLoca.xy[1] + itemLoca.size[1],
        ];
    } else if (absDirect === 2) {
        return [
            itemLoca.xy[0],
            itemLoca.xy[1] + Math.floor(itemLoca.size[1] / 2),
        ];
    } else if (absDirect === 3) {
        return [
            itemLoca.xy[0] + Math.floor(itemLoca.size[0] / 2),
            itemLoca.xy[1],
        ];
    } else {
        const _: never = absDirect;
        return _;
    }
}

const getRoad = (fromNode: Node, fromDirect: Direct, toNode: Node, nodes: Node[]): Road => {
    // FUNCTION ERROR ID = '05'
    const fromParentsR = [...fromNode.parents].reverse();
    const toParentsR = [...toNode.parents].reverse();
    if (fromNode.parents.includes(toNode.nodeId)) {
        throw new Error(`[E220506] Direct descendants can not connect.`);
    }
    if (toNode.parents.includes(fromNode.nodeId)) {
        throw new Error(`[E220507] Direct descendants can not connect.`);
    }
    let parentIndex = -1;
    for (let i = 0; i < fromParentsR.length; i++) {
        const toCommonParentIndex = toParentsR.indexOf(fromParentsR[i]);
        if (toCommonParentIndex !== -1) {
            parentIndex = i;
            break;
        }
    }
    // fromNode and toNode are not rootNode.
    if (parentIndex == -1) {
        throw new Error(`[E220505] asgR1 is invalid.`);
    }

    let targetIndex: number;
    if (fromDirect === 0 && fromNode.siblings[fromNode.siblings.length - 1] !== fromNode.nodeId) {
        targetIndex = 0;
    } else if (fromDirect === 2 && fromNode.siblings[0] !== fromNode.nodeId) {
        targetIndex = 0;
    } else {
        if (fromNode.bnParents[fromDirect] - 1 >= parentIndex) {
            targetIndex = parentIndex;
        } else {
            targetIndex = fromNode.bnParents[fromDirect] - 1;
        }
    }
    const targetNodeId = fromParentsR[targetIndex];
    if (!targetNodeId == null) {
        throw new Error(`[E220501] asgR1 is invalid.`);
    }
    const targetNode = nodes[targetNodeId];
    if (!targetNode) {
        throw new Error(`[E220502] asgR1 is invalid.`);
    }
    if (targetNode.type !== 'Group' && targetNode.type !== 'Unit') {
        throw new Error(`[E220503] asgR1 is invalid.`);
    }
    const railDirect = getMappingCompassFull(fromNode.compassSelf, targetNode.compassItems)[fromDirect];
    const siblingIndex = targetNode.children.indexOf(targetIndex > 0 ? fromParentsR[targetIndex - 1] : fromNode.nodeId);
    if (railDirect === 0) {
        return {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex + 1,
        }
    } else if (railDirect === 1) {
        return {
            containerId: targetNodeId,
            axis: 1,
            avenue: 1,
        }
    } else if (railDirect === 2) {
        return {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex,
        }
    } else if (railDirect === 3) {
        return {
            containerId: targetNodeId,
            axis: 1,
            avenue: 0,
        }
    } else {
        const _: never = railDirect;
        return _;
    }

}

const isRoadReach = (currentRoad: Road, lastNode: Node, lastDirect: Direct, nodes: Node[]): boolean => {
    // FUNCTION ERROR ID = '06'
    const lastParentsR = [...lastNode.parents].reverse();
    const parentIndex = lastParentsR.indexOf(currentRoad.containerId);
    if (parentIndex === -1) {
        return false;
    }
    if (lastNode.bnParents[lastDirect] - 1 < parentIndex) {
        return false;
    }
    const roadContainer = nodes[currentRoad.containerId];
    if (!(roadContainer.type === 'Group' || roadContainer.type === 'Unit')) {
        throw new Error(`[E220601] road is invalid.`);
    }
    const railDirect = getMappingCompassFull(lastNode.compassSelf, roadContainer.compassItems)[lastDirect];
    if (railDirect === 0) {
        if (currentRoad.axis === 0) {
            const siblingIndex = roadContainer.children.indexOf(parentIndex > 0 ? lastParentsR[parentIndex - 1] : lastNode.nodeId);
            if (siblingIndex + 1 === currentRoad.avenue) {
                return true;
            }
        }
    } else if (railDirect === 1) {
        if (currentRoad.axis === 1 && currentRoad.avenue === 1) {
            return true;
        }
    } else if (railDirect === 2) {
        if (currentRoad.axis === 0) {
            const siblingIndex = roadContainer.children.indexOf(parentIndex > 0 ? lastParentsR[parentIndex - 1] : lastNode.nodeId);
            if (siblingIndex === currentRoad.avenue) {
                return true;
            }
        }
    } else if (railDirect === 3) {
        if (currentRoad.axis === 1 && currentRoad.avenue === 0) {
            return true;
        }
    }
    return false;
}

const getRoadCompass = (road: Road, nodes: Node[]): Compass => {
    // FUNCTION ERROR ID = '07'
    const container = nodes[road.containerId];
    if (container.type !== 'Group' && container.type !== 'Unit') {
        throw new Error(`[E220701] asgR1 is invalid.`);
    }
    return container.compassItems;
}

const getRoadAbsAxis = (road: Road, nodes: Node[]): Axis => {
    // FUNCTION ERROR ID = '07'
    const container = nodes[road.containerId];
    if (container.type !== 'Group' && container.type !== 'Unit') {
        throw new Error(`[E220701] asgR1 is invalid.`);
    }
    const compass = container.compassItems;
    return getAnotherAxisByDirect(compass[road.axis]);
}

const getNextAllRoads = (currentRoad: Road, lastNode: Node, nodes: Node[]): Road[] => {
    // FUNCTION ERROR ID = '08'
    let ret: Road[] = [];

    const container = nodes[currentRoad.containerId];
    if (!(container.type === 'Group' || container.type === 'Unit')) {
        throw new Error(`[E220801] invalid.`);
    }

    const roadAxis = currentRoad.axis;
    if (roadAxis === 0) {
        ret.push(getRoadByContainer(container, 1, 0, lastNode, nodes));
        ret.push(getRoadByContainer(container, 1, 1, lastNode, nodes));
        if (currentRoad.avenue !== 0) {
            ret = ret.concat(getNextAllRoadsEachNode(container.children[currentRoad.avenue - 1], container.compassItems, 0, lastNode, nodes));
        }
        if (currentRoad.avenue !== container.children.length) {
            ret = ret.concat(getNextAllRoadsEachNode(container.children[currentRoad.avenue], container.compassItems, 2, lastNode, nodes));
        }
    } else if (roadAxis === 1) {
        const roadAvenue = currentRoad.avenue;
        for (let i = 0; i < container.children.length + 1; i++) {
            ret.push(getRoadByContainer(container, 0, i, lastNode, nodes));
        }
        if (roadAvenue === 0) {
            container.children.forEach((child: NodeId) => {
                ret = ret.concat(getNextAllRoadsEachNode(child, container.compassItems, 3, lastNode, nodes));
            });
        } else if (roadAvenue === 1) {
            container.children.forEach((child: NodeId) => {
                ret = ret.concat(getNextAllRoadsEachNode(child, container.compassItems, 1, lastNode, nodes));
            });
        } else {
            const _: never = roadAvenue;
            return _;
        }
    } else {
        const _: never = roadAxis;
        return _
    }
    return ret;
}

// for blank group, not use getRoad
const getRoadByContainer = (container: Container, axis: Axis, avenue: number, toNode: Node, nodes: Node[]): Road => {
    // FUNCTION ERROR ID = '09'
    let itemsDirect: Direct;
    if (axis === 0) {
        if (avenue === 0) {
            itemsDirect = 2;
        } else if (avenue === container.children.length) {
            itemsDirect = 0;
        } else {
            return {
                containerId: container.nodeId,
                axis: axis,
                avenue: avenue,
            };
        }
    } else if (axis === 1) {
        if (avenue === 0) {
            itemsDirect = 3;
        } else if (avenue === 1) {
            itemsDirect = 1;
        } else {
            throw new Error(`[E220901] invalid.`);
        }
    } else {
        const _: never = axis;
        return _;
    }

    const containerParentsR = [...container.parents].reverse();
    const toParentsR = [...toNode.parents].reverse();
    if (container.parents.includes(toNode.nodeId)) {
        throw new Error(`[E220902] Direct descendants can not connect.`);
    }
    if (container.nodeId === 0 || toNode.parents.includes(container.nodeId)) {
        if (axis === 0) {
            return {
                containerId: container.nodeId,
                axis: 0,
                avenue: avenue,
            };
        } else if (axis === 1) {
            if (avenue === 0 || avenue === 1) {
                return {
                    containerId: container.nodeId,
                    axis: 1,
                    avenue: avenue,
                };
            } else {
                throw new Error(`[E220907] invalid.`);
            }
        } else {
            const _: never = axis;
            return _;
        }
    }

    let parentIndex = -1;
    for (let i = 0; i < containerParentsR.length; i++) {
        const toCommonParentIndex = toParentsR.indexOf(containerParentsR[i]);
        if (toCommonParentIndex !== -1) {
            parentIndex = i;
            break;
        }
    }
    // toNode are not rootNode.
    if (parentIndex == -1) {
        throw new Error(`[E220903] asgR1 is invalid.`);
    }

    const selfDirect = getMappingCompassFull(container.compassItems, container.compassSelf)[itemsDirect];
    let targetIndex: number;
    if (container.bnParents[selfDirect] - 1 >= parentIndex) {
        targetIndex = parentIndex;
    } else {
        targetIndex = container.bnParents[selfDirect] - 1;
    }
    const targetNodeId = containerParentsR[targetIndex];
    if (!targetNodeId == null) {
        throw new Error(`[E220904] asgR1 is invalid.`);
    }
    const targetNode = nodes[targetNodeId];
    if (!targetNode) {
        throw new Error(`[E220905] asgR1 is invalid.`);
    }

    if (targetNode.type !== 'Group' && targetNode.type !== 'Unit') {
        throw new Error(`[E220906] asgR1 is invalid.`);
    }
    const railDirect = getMappingCompassFull(container.compassSelf, targetNode.compassItems)[selfDirect];
    const siblingIndex = targetNode.children.indexOf(targetIndex > 0 ? containerParentsR[targetIndex - 1] : container.nodeId)
    if (railDirect === 0) {
        return {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex + 1,
        }
    } else if (railDirect === 1) {
        return {
            containerId: targetNodeId,
            axis: 1,
            avenue: 1,
        }
    } else if (railDirect === 2) {
        return {
            containerId: targetNodeId,
            axis: 0,
            avenue: siblingIndex,
        }
    } else if (railDirect === 3) {
        return {
            containerId: targetNodeId,
            axis: 1,
            avenue: 0,
        }
    } else {
        const _: never = railDirect;
        return _;
    }

}

const getNextAllRoadsEachNode = (nodeId: NodeId, compass: Compass, direct: Direct, toNode: Node, nodes: Node[]): Road[] => {
    let ret: Road[] = []
    if (nodeId === toNode.nodeId) {
        return ret;
    }
    const node = nodes[nodeId];
    if (node.type === 'Cell') {
        return ret;
    }
    const nodeCompass = node.compassItems;
    const nodeDirect = getMappingCompassFull(compass, nodeCompass)[direct];
    if (nodeDirect === 0) {
        if (node.children.length > 0) {
            ret = ret.concat(getNextAllRoadsEachNode(node.children[node.children.length - 1], compass, direct, toNode, nodes));
        }
    } else if (nodeDirect === 2) {
        if (node.children.length > 0) {
            ret = ret.concat(getNextAllRoadsEachNode(node.children[0], compass, direct, toNode, nodes));
        }
    } else if (nodeDirect === 1 || nodeDirect === 3) {
        for (let i = 0; i < node.children.length - 1; i++) {
            ret.push(getRoadByContainer(node, 0, i + 1, toNode, nodes));
        }
        node.children.forEach(child => {
            ret = ret.concat(getNextAllRoadsEachNode(child, compass, direct, toNode, nodes));
        });
    } else {
        const _: never = nodeDirect;
        return _;
    }
    return ret;
}

const getRoadXY = (xy: XY, road: Road, nodes: Node[], itemLocas: ItemLoca[], n2i: ItemId[]): XY => {
    const ret: [number, number] = [xy[0], xy[1]];
    const xyAxis = getSameAxisByDirect(getRoadCompass(road, nodes)[road.axis]);
    if (road.axis === 0) {
        const container = nodes[road.containerId];
        if (!(container.type === 'Group' || container.type === 'Unit')) {
            throw new Error(`[E220203] invalid.`);
        }
        if (container.compassItems[0] < 2) {
            if (road.avenue < container.children.length) {
                ret[xyAxis] = itemLocas[n2i[container.children[road.avenue]]].xy[xyAxis];
            } else {
                const itemLoca = itemLocas[n2i[container.children[container.children.length - 1]]];
                ret[xyAxis] = itemLoca.xy[xyAxis] + itemLoca.size[xyAxis];
            }
        } else {
            if (road.avenue === 0) {
                const itemLoca = itemLocas[n2i[container.children[container.children.length - 1]]];
                ret[xyAxis] = itemLoca.xy[xyAxis] + itemLoca.size[xyAxis];
            } else {
                ret[xyAxis] = itemLocas[n2i[container.children[container.children.length - road.avenue]]].xy[xyAxis];
            }
        }
    } else {
        const itemLoca = itemLocas[n2i[road.containerId]];
        const avenue = road.avenue;
        if (avenue === 0) {
            ret[xyAxis] = itemLoca.xy[xyAxis];
        } else if (avenue === 1) {
            ret[xyAxis] = itemLoca.xy[xyAxis] + itemLoca.size[xyAxis];
        } else {
            const _: never = avenue;
            return _;
        }
    }
    return ret;
}
