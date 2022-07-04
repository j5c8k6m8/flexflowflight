import { NodeId, LinkId, Compass, Direct, Size, EdgeNumber } from "./astC0.ts"
import { Name, AccessName, ContainerDirection } from "./astC1.ts"

export type AstL2 = {
    // Id is always equal to array index.
    // Id is numbered by depth-first search.
    // The root node is always accessible with index 0.
    nodes: Node[];
    links: Link[];
    laneAttr: LaneAttr;
    nodeAttrs: NodeAttr[];
    linkAttrs: LinkAttr[];
    docAttr: DocAttr;
}

export type Node = Group | Unit | Cell;
export type Container = Group | Unit;
export type Box = Group | Cell;
export type Group = {
    nodeId: NodeId;
    type: "Group";
    compass: Compass;
    parents: NodeId[];
    children: NodeId[];
    siblings: NodeId[];
    links: [LinkId[], LinkId[]];
    // bnParents is 'b'oundary 'n'umber of parents.
    bnParents: EdgeNumber;
    space: EdgeNumber;
};

export type Unit = {
    nodeId: NodeId;
    type: "Unit";
    compass: Compass;
    parents: NodeId[];
    children: NodeId[];
    siblings: NodeId[];
    // bnParents is 'b'oundary 'n'umber of parents.
    bnParents: EdgeNumber;
    space: EdgeNumber;
};
export type Cell = {
    nodeId: NodeId;
    type: "Cell";
    compass: Compass;
    parents: NodeId[];
    siblings: NodeId[];
    links: [LinkId[],LinkId[]];
    // bnParents is boundary number of parents.
    bnParents: EdgeNumber;
    size: Size;
};
export type Link = {
    linkId: LinkId;
    box: [NodeId, NodeId];
    edge: [Direct, Direct];
};

export type NodeAttr = GroupAttr | UnitAttr | CellAttr;
export type ContainerAttr = GroupAttr | UnitAttr
export type BoxAttr = GroupAttr | CellAttr;
export type DocAttr = {
    css: null | string;
    cell_padding: EdgeNumber;
    cell_border: EdgeNumber;
    cell_margin: EdgeNumber;
    unit_margin: EdgeNumber;
    group_padding: EdgeNumber;
    group_border: EdgeNumber;
    group_margin: EdgeNumber;
    gate_gap: EdgeNumber;
    char_width: number;
    char_height: number;
    link_border: number;
}
export type GroupAttr = {
    nodeId: NodeId;
    type: "Group";
    name: Name;
    direction: null | ContainerDirection;
    disp: null | string;
    resource: null | string;
    tag: string[];
    padding: EdgeNumber;
    border: EdgeNumber;
    margin: EdgeNumber;
}
export type UnitAttr = {
    nodeId: NodeId;
    type: "Unit";
    name: Name;
    direction: null | ContainerDirection;
    margin: EdgeNumber;
}
export type CellAttr = {
    nodeId: NodeId;
    type: "Cell";
    name: Name;
    disp: null | string;
    resource: null | string;
    tag: string[];
    padding: EdgeNumber;
    border: EdgeNumber;
    margin: EdgeNumber;
};
export type LinkAttr = {
    linkId: LinkId;
    disp: null | string;
    node: [AccessName, AccessName];
};
export type LaneAttr = {
    // RoadMain width ,RoadCross width
    lane_width: [number, number];
    lane_min: number;
};
