import { NodeId, LinkId, CrossAvenue } from "./astC0.ts"
import { AstL2 } from "./astL2.ts"

export type AstL3 = AstL2 & {
    linkRoutes: LinkRoute[],
};
export type LinkRoute = {
    linkId: LinkId;
    route: Road[];
};

export type Road = RoadMain | RoadCross;
export type RoadMain = {
    containerId: NodeId;
    axis: 0;
    // avenue is between 0 to children.length.
    avenue: number;
};
export type RoadCross = {
    containerId: NodeId;
    axis: 1;
    avenue: CrossAvenue;
};
