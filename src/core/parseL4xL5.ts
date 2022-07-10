import { LocaAttr } from "./astL2.ts"
import { AstL4, Item, LinkItem } from "./astL4.ts"
import { AstL5, ItemLoca, GateLoca } from "./astL5.ts"
import { calcLoca as calcLocaV1 } from "./calcLocaV1.ts"

type Options = {
    pre?: (astL1: AstL4) => Promise<AstL4>,
    post?: (astL2: AstL5) => Promise<AstL5>,
    calc?: (items: Item[], linkItems: LinkItem[], locaAttr: LocaAttr, astL4: AstL4) => Promise<[ItemLoca[], GateLoca[]]>,
}

// FILE ERROR ID = '05'
export const parse = async (astL4: AstL4, { pre, post, calc, }: Options = {}): Promise<AstL5> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL4 = await pre(astL4);
    }
    const items = astL4.items;
    const linkItems = astL4.linkItems;
    const locaAttr = astL4.locaAttr;

    let itemLocas: ItemLoca[];
    let gateLocas: GateLoca[];
    if (calc) {
        [itemLocas, gateLocas] = await calc(items, linkItems, locaAttr, astL4);
    } else {
        [itemLocas, gateLocas] = await calcLocaV1(items, linkItems, locaAttr);
    }
    // TODO calc result Consistency check

    let astL5: AstL5 = {
        nodes: astL4.nodes,
        nodeAttrs: astL4.nodeAttrs,
        links: astL4.links,
        linkAttrs: astL4.linkAttrs,
        docAttr: astL4.docAttr,
        locaAttr: astL4.locaAttr,
        n2i: astL4.n2i,
        i2n: astL4.i2n,
        items: astL4.items,
        linkItems: linkItems,
        itemLocas: itemLocas,
        gateLocas: gateLocas,
    }
    if (post) {
        astL5 = await post(astL5);
    }
    return astL5;
}
