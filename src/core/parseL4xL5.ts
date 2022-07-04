import { AstL4, Item } from "./astL4.ts"
import { AstL5, ItemLoca } from "./astL5.ts"
import { calcLoca as calcLocaV1 } from "./calcLocaV1.ts"

type Options = {
    pre?: (astL1: AstL4) => Promise<AstL4>,
    post?: (astL2: AstL5) => Promise<AstL5>,
    calc?: (items: Item[], astL4: AstL4) => Promise<ItemLoca[]>,
}

// FILE ERROR ID = '05'
export const parse = async (astL4: AstL4, { pre, post, calc, }: Options = {}): Promise<AstL5> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL4 = await pre(astL4);
    }
    const items = astL4.items;

    let itemLocas: ItemLoca[];
    if (calc) {
        itemLocas = await calc(items, astL4);
    } else {
        itemLocas = await calcLocaV1(items);
    }
    // TODO calc result Consistency check

    let astL5: AstL5 = {
        nodes: astL4.nodes,
        nodeAttrs: astL4.nodeAttrs,
        links: astL4.links,
        linkAttrs: astL4.linkAttrs,
        docAttr: astL4.docAttr,
        laneAttr: astL4.laneAttr,
        n2i: astL4.n2i,
        i2n: astL4.i2n,
        items: astL4.items,
        linkItems: astL4.linkItems,
        itemLocas: itemLocas,
    }
    if (post) {
        astL5 = await post(astL5);
    }
    return astL5;
}
