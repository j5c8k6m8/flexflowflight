import { ItemId, Size, Coordinate, XY } from "./astC0.ts"
import { AstL4 } from "./astL4.ts"

export type AstL6 = AstL4 & {
    canvas: Canvas,
    itemLocas: ItemLoca[],
    groupDisps: GroupDisp[],
    cellDisps: CellDisp[],
    linkDisps: LinkDisp[],
}

export type Canvas = {
    size: Size,
}

export type ItemLoca = {
    itemId: ItemId,
    size: Size,
    coord: Coordinate,
    xy: XY,
}

export type GroupDisp = {
    xy: XY;
    size: Size;
    text: null | {
        disp: string,
        xy: XY,
        size: Size,
    };
}

export type CellDisp = {
    xy: XY,
    size: Size,
    text: null | {
        disp: string,
        xy: XY,
        size: Size,
    };
}

export type LinkDisp = {
    xys: XY[];
}
