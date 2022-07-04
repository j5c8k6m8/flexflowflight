import { NodeId, EdgeNumber } from "./astC0.ts"
import { AstL1, Group as GroupL1, Unit as UnitL1, Cell as CellL1, Link as LinkL1 } from "./astL1.ts"
import { Group as GroupL2, Unit as UnitL2, Cell as CellL2, Link as LinkL2 } from "./astL2.ts"
import { DocAttr, GroupAttr as GroupAttrL2, UnitAttr as UnitAttrL2, CellAttr as CellAttrL2, LinkAttr as LinkAttrL2, LaneAttr as LaneAttrL2 } from "./astL2.ts"

export const parseDocAttr = (l1: AstL1): DocAttr => {
    let css = null;
    let cell_padding: EdgeNumber = [6, 6, 6, 6];
    let cell_border: EdgeNumber = [2, 2, 2, 2];
    let cell_margin: EdgeNumber = [10, 10, 10, 10];
    let unit_margin: EdgeNumber = [0, 0, 0, 0];
    let group_padding: EdgeNumber = [4, 4, 4, 4];
    let group_border: EdgeNumber = [2, 2, 2, 2];
    let group_margin: EdgeNumber = [4, 4, 4, 4];
    let gate_gap: EdgeNumber = [8, 8, 8, 8];
    let char_width = 14;
    let char_height = 8;
    let link_border = 2;
    if ('attr' in l1 && l1.attr) {
        if ('css' in l1.attr && l1.attr.css) {
            css = l1.attr.css;
        }
        if ('cell_padding' in l1.attr && l1.attr.cell_padding) {
            cell_padding = l1.attr.cell_padding;
        }
        if ('cell_border' in l1.attr && l1.attr.cell_border) {
            cell_border = l1.attr.cell_border;
        }
        if ('cell_margin' in l1.attr && l1.attr.cell_margin) {
            cell_margin = l1.attr.cell_margin;
        }
        if ('unit_margin' in l1.attr && l1.attr.unit_margin) {
            unit_margin = l1.attr.unit_margin;
        }
        if ('group_padding' in l1.attr && l1.attr.group_padding) {
            group_padding = l1.attr.group_padding;
        }
        if ('group_border' in l1.attr && l1.attr.group_border) {
            group_border = l1.attr.group_border;
        }
        if ('group_margin' in l1.attr && l1.attr.group_margin) {
            group_margin = l1.attr.group_margin;
        }
        if ('char_width' in l1.attr && l1.attr.char_width) {
            char_width = l1.attr.char_width;
        }
        if ('char_height' in l1.attr && l1.attr.char_height) {
            char_height = l1.attr.char_height;
        }
        if ('link_border' in l1.attr && l1.attr.link_border) {
            link_border = l1.attr.link_border;
        }
        if ('gate_gap' in l1.attr && l1.attr.gate_gap) {
            gate_gap = l1.attr.gate_gap;
        }
    }
    return {
        css: css,
        cell_padding: cell_padding,
        cell_border: cell_border,
        cell_margin: cell_margin,
        unit_margin: unit_margin,
        group_padding: group_padding,
        group_border: group_border,
        group_margin: group_margin,
        char_width: char_width,
        char_height: char_height,
        link_border: link_border,
        gate_gap: gate_gap,
    };
}

export const parseRootUnitAttr = (l1: AstL1, nodeId: NodeId): UnitAttrL2 => {
    let direction = null;
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Unit',
        name: '',
        direction: direction,
        margin: [0, 0, 0, 0],
    };
}

export const parseGroupAttr = (l1: GroupL1, nodeId: NodeId, docAttr: DocAttr): GroupAttrL2 => {
    let direction = null;
    let disp = null;
    let resource = null;
    let tag: Array<string> = [];
    let padding = docAttr.group_padding;
    let border = docAttr.group_border;
    let margin = docAttr.group_margin;
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
        if ('resource' in l1.attr && l1.attr.resource) {
            resource = l1.attr.resource;
        }
        if ('tag' in l1.attr && l1.attr.tag) {
            tag = l1.attr.tag;
        }
        if ('padding' in l1.attr && l1.attr.padding) {
            padding = l1.attr.padding;
        }
        if ('border' in l1.attr && l1.attr.border) {
            border = l1.attr.border;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Group',
        name: l1.name,
        direction: direction,
        disp: disp,
        resource: resource,
        tag: tag,
        padding: padding,
        border: border,
        margin: margin,
    };
}

export const parseUnitAttr = (l1: UnitL1, nodeId: NodeId, docAttr: DocAttr): UnitAttrL2 => {
    let direction = null;
    let margin = docAttr.unit_margin;
    if ('attr' in l1 && l1.attr) {
        if ('direction' in l1.attr && l1.attr.direction) {
            direction = l1.attr.direction;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Unit',
        name: l1.name,
        direction: direction,
        margin: margin,
    };
}

export const parseCellAttr = (l1: CellL1, nodeId: NodeId, docAttr: DocAttr): CellAttrL2 => {
    let disp = l1.name;
    let resource = null;
    let tag: Array<string> = [];
    let padding = docAttr.cell_padding;
    let border = docAttr.cell_border;
    let margin = docAttr.cell_margin;
    if ('attr' in l1 && l1.attr) {
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
        if ('resource' in l1.attr && l1.attr.resource) {
            resource = l1.attr.resource;
        }
        if ('tag' in l1.attr && l1.attr.tag) {
            tag = l1.attr.tag;
        }
        if ('padding' in l1.attr && l1.attr.padding) {
            padding = l1.attr.padding;
        }
        if ('border' in l1.attr && l1.attr.border) {
            border = l1.attr.border;
        }
        if ('margin' in l1.attr && l1.attr.margin) {
            margin = l1.attr.margin;
        }
    }
    return {
        nodeId: nodeId,
        type: 'Cell',
        name: l1.name,
        disp: disp,
        resource: resource,
        tag: tag,
        padding: padding,
        border: border,
        margin: margin,
    };
}

export const parseLinkAttr = (l1: LinkL1, l2: LinkL2): LinkAttrL2 => {
    let disp = null;
    if ('attr' in l1 && l1.attr) {
        if ('disp' in l1.attr && l1.attr.disp) {
            disp = l1.attr.disp;
        }
    }
    return {
        linkId: l2.linkId,
        disp: disp,
        node: l1.box,
    };
}
export const parseLaneAttr = (l1: AstL1): LaneAttrL2 => {
    let lane_width:[number, number] = [12, 12];
    let lane_min = 0;
    if ('attr' in l1 && l1.attr) {
        if ('lane_width' in l1.attr && l1.attr.lane_width) {
            lane_width = l1.attr.lane_width;
        }
        if ('lane_min' in l1.attr && l1.attr.lane_min) {
            lane_min = l1.attr.lane_min;
        }
    }
    return {
        lane_width: lane_width,
        lane_min: lane_min,
    };
}
