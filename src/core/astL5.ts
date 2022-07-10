import { ItemId, LinkId, Size, Coordinate } from "./astC0.ts"
import { AstL4 } from "./astL4.ts"

export type AstL5 = AstL4 & {
    itemLocas: ItemLoca[],
    gateLocas: GateLoca[],
}

export type ItemLoca = {
    itemId: ItemId,
    size: Size,
    coord: Coordinate,
}

export type GateLoca = {
    linkId: LinkId;
    // coords is from edge distance and to edge distance.
    coords: [number, number];
}
