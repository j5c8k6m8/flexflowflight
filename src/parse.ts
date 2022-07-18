import { Name } from "./core/astC1.ts"
import { AstL1, Cell as CellL1 } from "./core/astL1.ts"
import { AstL2, Node, Link, LocaAttr, DocAttr } from "./core/astL2.ts"
import { AstL3, LinkRoute } from "./core/astL3.ts"
import { AstL4, Item, LinkItem } from "./core/astL4.ts"
import { AstL5, ItemLoca, GateLoca } from "./core/astL5.ts"
import { AstL6 } from "./core/astL6.ts"
import { parse as parseFl3xL1 } from "./core/parseFl3xL1.ts"
import { parse as parseL1xL2 } from "./core/parseL1xL2.ts"
import { parse as parseL2xL3 } from "./core/parseL2xL3.ts"
import { parse as parseL3xL4 } from "./core/parseL3xL4.ts"
import { parse as parseL4xL5 } from "./core/parseL4xL5.ts"
import { parse as parseL5xL6 } from "./core/parseL5xL6.ts"
import { parse as parseL6xSvg } from "./core/parseL6xSvg.ts"

type Options = {
    debug?: boolean,
    textSize?: (name: Name, cellL1: CellL1, docAttr: DocAttr) => Promise<[number, number]>,
    calcRoute?: (nodes: Node[], links: Link[], astL2: AstL2) => Promise<LinkRoute[]>,
    calcLoca?: (items: Item[], linkItems: LinkItem[], locaAttr: LocaAttr, astL4: AstL4) => Promise<[ItemLoca[], GateLoca[]]>,
    calcRouteVersion?: number,
}
export type Parse = (fl3: string, option: Options) => Promise<string>;

export const parse = async (fl3: string, { debug, textSize, calcRoute, calcLoca, calcRouteVersion }: Options = {}): Promise<string> => {
    const astL1 = await parseFl3xL1(fl3, {
        // deno-lint-ignore require-await
        pre: async (fl3: string): Promise<string> => {
            if (debug) {
                console.log("<fl3>");
                console.log(fl3);
            }
            return fl3;
        },
        // deno-lint-ignore require-await
        post: async (astL1: AstL1): Promise<AstL1> => {
            if (debug) {
                console.log("<astL1>");
                console.log(astL1);
            }
            return astL1;
        },
    });
    const svg = await parseJson(astL1, {debug: debug, textSize: textSize, calcRoute: calcRoute, calcLoca: calcLoca, calcRouteVersion: calcRouteVersion});
    return svg;
}


export const parseJson = async (json: AstL1, { debug, textSize, calcRoute, calcLoca, calcRouteVersion }: Options = {}): Promise<string> => {
    const astL2 = await parseL1xL2(json, {
        textSize: textSize,
        // deno-lint-ignore require-await
        post: async (astL2: AstL2): Promise<AstL2> => {
            if (debug) {
                console.log("<astL2>");
                console.log(astL2);
            }
            return astL2;
        },
    });
    const astL3 = await parseL2xL3(astL2, {
        calc: calcRoute,
        version: calcRouteVersion,
        // deno-lint-ignore require-await
        post: async (astL3: AstL3): Promise<AstL3> => {
            if (debug) {
                console.log("<astL3>");
                console.log(astL3);
            }
            return astL3;
        },
    });
    const astL4 = await parseL3xL4(astL3, {
        // deno-lint-ignore require-await
        post: async (astL4: AstL4): Promise<AstL4> => {
            if (debug) {
                console.log("<astL4>");
                console.log(astL4);
            }
            return astL4;
        },
    });
    const astL5 = await parseL4xL5(astL4, {
        calc: calcLoca,
        // deno-lint-ignore require-await
        post: async (astL5: AstL5): Promise<AstL5> => {
            if (debug) {
                console.log("<astL5>");
                console.log(astL5);
            }
            return astL5;
        },
    });
    const astL6 = await parseL5xL6(astL5, {
        // deno-lint-ignore require-await
        post: async (astL6: AstL6): Promise<AstL6> => {
            if (debug) {
                console.log("<astL6>");
                console.log(astL6);
            }
            return astL6;
        },
    });
    const svg = await parseL6xSvg(astL6, {
        // deno-lint-ignore require-await
        post: async (svg: string): Promise<string> => {
            if (debug) {
                console.log("<svg>");
                console.log(svg);
            }
            return svg;
        },
    });
    return svg;
}
