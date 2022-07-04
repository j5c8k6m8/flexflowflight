import { AstL2, Node, Link, LaneAttr } from "./astL2.ts"
import { AstL3, LinkRoute } from "./astL3.ts"
import { calcRoute as calcRouteV1} from "./calcRouteV1.ts"

type Options = {
    pre?: (astL2: AstL2) => Promise<AstL2>,
    post?: (astL3: AstL3) => Promise<AstL3>,
    calc?: (nodes: Node[], links: Link[], laneAttr: LaneAttr, astL2: AstL2) => Promise<LinkRoute[]>,
}

// FILE ERROR ID = '03'
export const parse = async (astL2: AstL2, { pre, post, calc, }: Options = {}): Promise<AstL3> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL2 = await pre(astL2);
    }
    const nodes = astL2.nodes;
    const links = astL2.links;
    const laneAttr = astL2.laneAttr;

    let linkRoutes:LinkRoute[];
    if (calc) {
        linkRoutes = await calc(nodes, links, laneAttr, astL2);
    } else {
        linkRoutes = await calcRouteV1(nodes, links, laneAttr);
    }
    // TODO calc result Consistency check

    let astL3: AstL3 = {
        nodes: astL2.nodes,
        nodeAttrs: astL2.nodeAttrs,
        links: astL2.links,
        linkAttrs: astL2.linkAttrs,
        docAttr: astL2.docAttr,
        laneAttr: astL2.laneAttr,
        linkRoutes: linkRoutes,
    }
    if (post) {
        astL3 = await post(astL3);
    }
    return astL3;
}
