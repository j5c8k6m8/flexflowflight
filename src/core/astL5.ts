import { ItemId, Size, Coordinate } from "./astC0.ts"
import { AstL4 } from "./astL4.ts"

export type AstL5 = AstL4 & {
    itemLocas: ItemLoca[],
}

export type ItemLoca = {
    itemId: ItemId,
    size: Size,
    coord: Coordinate,
}