import { isContainerDirection } from "./astC1.ts"
import { AstL1, UnitAttr, GroupAttr, CellAttr, LinkAttr } from "./astL1.ts"

export const parseUnitAttr = (map: Map<string, string | null>): UnitAttr => {
    const ret: UnitAttr = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
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
    const attr = ast.attr || {}
    const css = map.get('css');
    if (css) {
        attr.css = css;
        ast.attr = attr;
    }
    const direction = getDirection(map);
    if (direction) {
        attr.direction = direction;
        ast.attr = attr;
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
