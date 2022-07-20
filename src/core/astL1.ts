import { Name, AccessName, Direction, ContainerDirection, Align, } from "./astC1.ts"
import { EdgeNumber } from "./astC0.ts"

export type AstL1 = {
    nodes: Node[];
    links: Link[];
    attr?: RootAttr;
}

export type Node = Group | Unit | Cell;
export type Container = AstL1 | Group | Unit;
export type Box = Group | Cell;
export type Group = {
    type: "Group";
    name: Name;
    nodes: Node[];
    attr?: GroupAttr;
}
export type Unit = {
    type: "Unit";
    name: Name;
    nodes: Node[];
    attr?: UnitAttr;
}
export type Cell = {
    type: "Cell";
    name: string;
    attr?: CellAttr;
};
export type Link = {
    // Box and Direction is be specified tupple with from and to.
    box: [AccessName, AccessName];
    direction?: [Direction, Direction];
    attr?: LinkAttr;
}

export type NodeAttr = GroupAttr | UnitAttr | CellAttr;
export type ContainerAttr = RootAttr | GroupAttr | UnitAttr
export type BoxAttr = GroupAttr | CellAttr;
export type RootAttr = {
    css?: null | string;
    direction?: null | ContainerDirection;
    cell_padding?: null | EdgeNumber;  // TODO
    cell_border?: null | EdgeNumber;  // TODO
    cell_margin?: null | EdgeNumber;  // TODO
    unit_margin?: null | EdgeNumber;  // TODO
    group_padding?: null | EdgeNumber;  // TODO
    group_border?: null | EdgeNumber;  // TODO
    group_margin?: null | EdgeNumber;  // TODO
    gate_gap?: null | EdgeNumber;
    lane_width?: null | [number, number];  // TODO
    lane_min?: null | number;  // TODO
    char_width?: null | number;  // TODO
    char_height?: null | number;  // TODO
    link_border?: null | number;  // TODO
    alignItems?: null | Align;
};
export type GroupAttr = {
    direction?: null | ContainerDirection;
    disp?: null | string;
    name?: null | string;
    tag?: null | string[];
    alignItems?: null | Align;
    alignSelf?: null | Align;
    padding?: null | [number | null, number | null, number | null, number | null];
    border?: null | [number | null, number | null, number | null, number | null];
    margin?: null | [number | null, number | null, number | null, number | null];
    class?: null | string;  // TODO
    style?: null | string;  // TODO
};
export type UnitAttr = {
    direction?: null | ContainerDirection;
    alignItems?: null | Align;
    alignSelf?: null | Align;
    margin?: null | [number | null, number | null, number | null, number | null];
    class?: null | string;  // TODO
    style?: null | string;  // TODO
};
export type CellAttr = {
    disp?: null | string;
    name?: null | string;
    tag?: null | string[];
    alignSelf?: null | Align;
    padding?: null | [number | null, number | null, number | null, number | null];
    border?: null | [number | null, number | null, number | null, number | null];
    margin?: null | [number | null, number | null, number | null, number | null];
    width?: null | number;
    height?: null | number;
    class?: null | string;  // TODO
    style?: null | string;  // TODO
};
export type LinkAttr = {
    disp?: null | string;
    border?: null | string;  // TODO
    class?: null | string;  // TODO
    style?: null | string;  // TODO
};
