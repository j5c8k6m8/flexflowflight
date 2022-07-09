import { ItemId, Direct, GateNo, XY, getCompassAxis, getCompassFull } from "./astC0.ts"
import { NodeAttr, DocAttr } from "./astL2.ts"
import { Item } from "./astL4.ts"
import { AstL5 } from "./astL5.ts"
import { AstL6, ItemLoca, Canvas, GroupDisp, CellDisp, LinkDisp } from "./astL6.ts"

type Options = {
    pre?: (astL5: AstL5) => Promise<AstL5>,
    post?: (astL6: AstL6) => Promise<AstL6>,
}

// FILE ERROR ID = '06'
export const parse = async (astL5: AstL5, { pre, post, }: Options = {}): Promise<AstL6> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL5 = await pre(astL5);
    }
    const itemLocas: ItemLoca[] = [];
    const groupDisps: GroupDisp[] = [];
    const cellDisps: CellDisp[] = [];
    const linkDisps: LinkDisp[] = [];
    astL5.itemLocas.forEach(itemLocaL5 => {
        const item = astL5.items[itemLocaL5.itemId];
        const xy: [number, number] = [0, 0];
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
            xy: xy,
        });
    });

    const canvas: Canvas = {
        size: itemLocas[0].size,
    }

    astL5.items.forEach(item => {
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
                text: groupAttr.disp,
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
                text: cellAttr.disp,
            });

        } else if (itemType === 'Road' || itemType === 'Unit') {
            // pass
        } else {
            const _: never = itemType;
            return _;
        }
    });

    astL5.linkItems.forEach(linkItem => {
        const xys: XY[] = [];
        let currentXY = getGateXY(linkItem.box[0], linkItem.edge[0], linkItem.gate[0], astL5.items, itemLocas, astL5.nodeAttrs, astL5.i2n, astL5.docAttr);
        xys.push(currentXY);
        linkItem.route.forEach((itemId, i) => {
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
                    itemLoca.xy[1] + (itemLoca.size[1] / 2),
                ]
            } else {
                currentXY = [
                    itemLoca.xy[0] + (itemLoca.size[0] / 2),
                    currentXY[1],
                ]
            }
            xys.push(currentXY);
            if (i === linkItem.route.length - 1) {
                const lastXY = getGateXY(linkItem.box[1], linkItem.edge[1], linkItem.gate[1], astL5.items, itemLocas, astL5.nodeAttrs, astL5.i2n, astL5.docAttr);
                if (compassAxis[0] !== item.axis) {
                    currentXY = [
                        lastXY[0],
                        currentXY[1],
                    ]
                } else {
                    currentXY = [
                        currentXY[0],
                        lastXY[1],
                    ]
                }
                xys.push(currentXY);
                xys.push(lastXY);
            }
        });
        linkDisps.push({
            xys: xys,
        });
    });

    let astL6: AstL6 = {
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
        linkDisps: linkDisps,
    }
    if (post) {
        astL6 = await post(astL6);
    }
    return astL6;
}

const getGateXY = (itemId: ItemId, direct: Direct, gate: GateNo, items: Item[], itemLocas: ItemLoca[], nodeAttrs: NodeAttr[], i2n: Array<ItemId | null>, docAttr: DocAttr): XY => {
    // FUNCTION ERROR ID = '02'
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
    const targetGateLen = (gate === 0 ? 0 : (gate - 1) * docAttr.gate_gap[direct]);
    if (direct === 0) {
        return [
            itemLoca.xy[0] + itemLoca.size[0] - nodeAttr.margin[direct],
            itemLoca.xy[1] + Math.floor((itemLoca.size[1] - allGateLen) / 2) + targetGateLen,
        ]
    } else if (direct === 1) {
        return [
            itemLoca.xy[0] + Math.floor((itemLoca.size[0] - allGateLen) / 2) + targetGateLen,
            itemLoca.xy[1] + itemLoca.size[1] - nodeAttr.margin[direct],
        ]
    } else if (direct === 2) {
        return [
            itemLoca.xy[0] + nodeAttr.margin[direct],
            itemLoca.xy[1] + Math.floor((itemLoca.size[1] - allGateLen) / 2) + targetGateLen,
        ]
    } else if (direct === 3) {
        return [
            itemLoca.xy[0] + Math.floor((itemLoca.size[0] - allGateLen) / 2) + targetGateLen,
            itemLoca.xy[1] + nodeAttr.margin[direct],
        ]
    } else {
        const _: never = direct;
        return _;
    }
}