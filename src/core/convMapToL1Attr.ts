import { isContainerDirection, isAlign } from "./astC1.ts"
import { AstL1, UnitAttr, GroupAttr, CellAttr, LinkAttr } from "./astL1.ts"

export const parseUnitAttr = (map: Map<string, string | null>): UnitAttr => {
    const ret: UnitAttr = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
    }
    if (map.has('align_items')) {
        ret.alignItems = getAlign('align_items', map);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
}

export const parseGroupAttr = (map: Map<string, string | null>): GroupAttr => {
    const ret : GroupAttr = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
    }
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('resource')) {
        ret.disp = map.get('resource');
    }
    if (map.has('tag')) {
        ret.tag = map.get('tag')?.split(/[\s,]/);
    }
    if (map.has('align_items')) {
        ret.alignItems = getAlign('align_items', map);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
}

export const parseCellAttr = (map: Map<string, string | null>): CellAttr => {
    const ret: CellAttr = {};
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('resource')) {
        ret.disp = map.get('resource');
    }
    if (map.has('tag')) {
        ret.tag = map.get('tag')?.split(/[\s,]/);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    return ret;
}

export const parseLinkAttr = (map: Map<string, string | null>): LinkAttr => {
    const ret : LinkAttr = {};
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    return ret;
}

export const addRootAttr = (ast: AstL1, map: Map<string, string>): void => {
    ast.attr = ast.attr || {}
    const css = map.get('css');
    if (css) {
        ast.attr.css = css;
    }
    const alignItems = map.get('align_items');
    if (alignItems) {
        ast.attr.alignItems = getAlign('align_items', map);
    }
    const direction = getDirection(map);
    if (direction) {
        ast.attr.direction = direction;
    }
}

const getDirection = (map: Map<string, string | null>) => {
    const t = map.get('direction');
    if (isContainerDirection(t)) {
        return t;
    } else {
        return null;
    }
}

const getAlign = (key: string, map: Map<string, string | null>) => {
    const t = map.get(key);
    if (isAlign(t)) {
        return t;
    } else {
        return null;
    }
}
