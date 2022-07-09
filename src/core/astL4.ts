import { NodeId, LinkId, ItemId, GateNo, Compass, Direct, CrossAvenue, Size, EdgeNumber } from "./astC0.ts"
import { Align } from "./astC1.ts"
import { AstL2 } from "./astL2.ts"

export type AstL4 = AstL2 & {
    n2i: ItemId[];
    i2n: Array<NodeId | null>;
    items: Item[];
    linkItems: LinkItem[],
}

export type Item = GroupItem | UnitItem | CellItem | Road;
export type ContainerItem = GroupItem | UnitItem;
export type GroupItem = {
    itemId: ItemId;
    type: "Group";
    compassItems: Compass;
    compassSelf: Compass;
    parents: ItemId[];
    siblings: ItemId[];
    links: [LinkId[], LinkId[]];
    // bnGates is 'b'oundary 'n'umber of gates.
    bnGates: EdgeNumber;
    mainItems: ItemId[];
    crossItems: [ItemId[], ItemId[]];
    space: EdgeNumber;
    align: Align;
};

export type UnitItem = {
    itemId: ItemId;
    type: "Unit";
    compassItems: Compass;
    compassSelf: Compass;
    parents: ItemId[];
    siblings: ItemId[];
    mainItems: ItemId[];
    crossItems: [ItemId[], ItemId[]];
    space: EdgeNumber;
    align: Align;
};

export type CellItem = {
    itemId: ItemId;
    type: "Cell";
    compassSelf: Compass;
    parents: ItemId[];
    siblings: ItemId[];
    links: [LinkId[], LinkId[]];
    // bnGates is 'b'oundary 'n'umber of gates.
    bnGates: EdgeNumber;
    size: Size;
    align: Align;
};

export type Road = RoadMain | RoadCross;

export type RoadMain = {
    itemId: ItemId;
    type: "Road";
    axis: 0;
    // axisIndex is between 0 to children.length.
    avenue: number;
    lane: GateNo;
    parents: ItemId[];
    siblings: ItemId[];
    links: LinkId[];
    width: number;
};

export type RoadCross = {
    itemId: ItemId;
    type: "Road";
    axis: 1;
    avenue: CrossAvenue;
    lane: GateNo;
    parents: ItemId[];
    links: LinkId[];
    width: number;
};

export type LinkItem = {
    linkId: LinkId;
    box: [ItemId, ItemId];
    edge: [Direct, Direct];
    gate: [GateNo, GateNo];
    route: ItemId[];
};
