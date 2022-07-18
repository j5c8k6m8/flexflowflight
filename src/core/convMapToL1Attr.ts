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
    setMargin(ret, map);
    return ret;
}

export const parseGroupAttr = (map: Map<string, string | null>): GroupAttr => {
    const ret: GroupAttr = {};
    if (map.has('direction')) {
        ret.direction = getDirection(map);
    }
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('name')) {
        ret.name = map.get('name');
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
    setMargin(ret, map);
    setPadding(ret, map);
    setBorder(ret, map);
    return ret;
}

export const parseCellAttr = (map: Map<string, string | null>): CellAttr => {
    const ret: CellAttr = {};
    if (map.has('disp')) {
        ret.disp = map.get('disp');
    }
    if (map.has('name')) {
        ret.name = map.get('name');
    }
    if (map.has('tag')) {
        ret.tag = map.get('tag')?.split(/[\s,]/);
    }
    if (map.has('align_self')) {
        ret.alignSelf = getAlign('align_self', map);
    }
    setMargin(ret, map);
    setPadding(ret, map);
    setBorder(ret, map);
    return ret;
}

export const parseLinkAttr = (map: Map<string, string | null>): LinkAttr => {
    const ret: LinkAttr = {};
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

const getNumber = (key: string, map: Map<string, string | null>) => {
    const t = map.get(key);
    const n = Number(t)
    if (n != null) {
        return n;
    } else {
        return null;
    }
}

const setMargin = (ret: { margin?: null | [number | null, number | null, number | null, number | null] }, map: Map<string, string | null>) => {
    if (map.has('m')) {
        const m = getNumber('m', map);
        ret.margin = [m, m, m, m];

    }
    if (map.has('margin')) {
        const m = getNumber('margin', map);
        ret.margin = [m, m, m, m];

    }
    if (map.has('mx')) {
        const mx = getNumber('mx', map);
        if (ret.margin == null) {
            ret.margin = [mx, null, mx, null];
        } else {
            ret.margin[0] = mx;
            ret.margin[2] = mx;
        }
    }
    if (map.has('my')) {
        const my = getNumber('my', map);
        if (ret.margin == null) {
            ret.margin = [null, my, null, my];
        } else {
            ret.margin[1] = my;
            ret.margin[3] = my;
        }
    }
    if (map.has('mt')) {
        const mt = getNumber('mt', map);
        if (ret.margin == null) {
            ret.margin = [null, mt, null, null];
        } else {
            ret.margin[1] = mt;
        }
    }
    if (map.has('margin_top')) {
        const mt = getNumber('margin_top', map);
        if (ret.margin == null) {
            ret.margin = [null, mt, null, null];
        } else {
            ret.margin[1] = mt;
        }
    }
    if (map.has('mr')) {
        const mr = getNumber('mr', map);
        if (ret.margin == null) {
            ret.margin = [null, null, mr, null];
        } else {
            ret.margin[2] = mr;
        }
    }
    if (map.has('margin_right')) {
        const mr = getNumber('margin_right', map);
        if (ret.margin == null) {
            ret.margin = [null, null, mr, null];
        } else {
            ret.margin[2] = mr;
        }
    }
    if (map.has('mb')) {
        const mb = getNumber('mb', map);
        if (ret.margin == null) {
            ret.margin = [null, null, null, mb];
        } else {
            ret.margin[3] = mb;
        }
    }
    if (map.has('margin_bottom')) {
        const mb = getNumber('margin_bottom', map);
        if (ret.margin == null) {
            ret.margin = [null, null, null, mb];
        } else {
            ret.margin[3] = mb;
        }
    }
    if (map.has('ml')) {
        const ml = getNumber('ml', map);
        if (ret.margin == null) {
            ret.margin = [ml, null, null, null];
        } else {
            ret.margin[0] = ml;
        }
    }
    if (map.has('margin_left')) {
        const ml = getNumber('margin_left', map);
        if (ret.margin == null) {
            ret.margin = [ml, null, null, null];
        } else {
            ret.margin[0] = ml;
        }
    }
}

const setPadding = (ret: { padding?: null | [number | null, number | null, number | null, number | null] }, map: Map<string, string | null>) => {
    if (map.has('p')) {
        const p = getNumber('p', map);
        ret.padding = [p, p, p, p];

    }
    if (map.has('padding')) {
        const p = getNumber('padding', map);
        ret.padding = [p, p, p, p];

    }
    if (map.has('px')) {
        const px = getNumber('px', map);
        if (ret.padding == null) {
            ret.padding = [px, null, px, null];
        } else {
            ret.padding[0] = px;
            ret.padding[2] = px;
        }
    }
    if (map.has('py')) {
        const py = getNumber('py', map);
        if (ret.padding == null) {
            ret.padding = [null, py, null, py];
        } else {
            ret.padding[1] = py;
            ret.padding[3] = py;
        }
    }
    if (map.has('pt')) {
        const pt = getNumber('pt', map);
        if (ret.padding == null) {
            ret.padding = [null, pt, null, null];
        } else {
            ret.padding[1] = pt;
        }
    }
    if (map.has('padding_top')) {
        const pt = getNumber('padding_top', map);
        if (ret.padding == null) {
            ret.padding = [null, pt, null, null];
        } else {
            ret.padding[1] = pt;
        }
    }
    if (map.has('pr')) {
        const pr = getNumber('pr', map);
        if (ret.padding == null) {
            ret.padding = [null, null, pr, null];
        } else {
            ret.padding[2] = pr;
        }
    }
    if (map.has('padding_right')) {
        const pr = getNumber('padding_right', map);
        if (ret.padding == null) {
            ret.padding = [null, null, pr, null];
        } else {
            ret.padding[2] = pr;
        }
    }
    if (map.has('pb')) {
        const pb = getNumber('pb', map);
        if (ret.padding == null) {
            ret.padding = [null, null, null, pb];
        } else {
            ret.padding[3] = pb;
        }
    }
    if (map.has('padding_bottom')) {
        const pb = getNumber('padding_bottom', map);
        if (ret.padding == null) {
            ret.padding = [null, null, null, pb];
        } else {
            ret.padding[3] = pb;
        }
    }
    if (map.has('pl')) {
        const pl = getNumber('pl', map);
        if (ret.padding == null) {
            ret.padding = [pl, null, null, null];
        } else {
            ret.padding[0] = pl;
        }
    }
    if (map.has('padding_left')) {
        const pl = getNumber('padding_left', map);
        if (ret.padding == null) {
            ret.padding = [pl, null, null, null];
        } else {
            ret.padding[0] = pl;
        }
    }
}

const setBorder = (ret: { border?: null | [number | null, number | null, number | null, number | null] }, map: Map<string, string | null>) => {
    if (map.has('border')) {
        const border = getNumber('border', map);
        ret.border = [border, border, border, border];

    }
    if (map.has('border_top')) {
        const border_top = getNumber('border_top', map);
        if (ret.border == null) {
            ret.border = [null, border_top, null, null];
        } else {
            ret.border[1] = border_top;
        }
    }
    if (map.has('border_right')) {
        const border_right = getNumber('border_right', map);
        if (ret.border == null) {
            ret.border = [null, null, border_right, null];
        } else {
            ret.border[2] = border_right;
        }
    }
    if (map.has('border_bottom')) {
        const border_bottom = getNumber('border_bottom', map);
        if (ret.border == null) {
            ret.border = [null, null, null, border_bottom];
        } else {
            ret.border[3] = border_bottom;
        }
    }
    if (map.has('border_left')) {
        const border_left = getNumber('border_left', map);
        if (ret.border == null) {
            ret.border = [border_left, null, null, null];
        } else {
            ret.border[0] = border_left;
        }
    }
}
