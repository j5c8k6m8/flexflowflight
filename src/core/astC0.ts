export type NodeId = number;
export type LinkId = number;
export type ItemId = number;
export type GateNo = number;
export type LaneNo = number;

// Direct is in principle relative.
export type MainForwardDirect = 0;
export type CrossForwardDirect = 1;
export type MainBackwardDirect = 2;
export type CrossBackwardDirect = 3;
export type MainDirect = 0 | 2;
export type CrossDirect = 1 | 3;
export type Direct = MainDirect | CrossDirect;

export type MainAxis = 0;
export type CrossAxis = 1;
export type Axis = MainAxis | CrossAxis;

// Compass is flex-direction.
// Compass is always absolute direct.
// Absolute Direct default -> TOP: 3(cross_reverse), RIGHT: 0(main), BOTTOM: 1(cross), LEFT:2(main_reverse)
export type Compass = [MainDirect, CrossDirect] | [CrossDirect, MainDirect];
export type CompassFull = [0, 1, 2, 3] | [1, 0, 3, 2] | [0, 3, 2, 1] | [1, 2, 3, 0] | [2, 1, 0, 3] | [3, 0, 1, 2] | [2, 3, 0, 1] | [3, 2, 1, 0];
export type CompassAxis = [0, 1] | [1, 0]


export type Size = [number, number];
// Coordinate is relative position by parent Container.
export type Coordinate = [number, number];
// XY is absolute position for svg drawing.
export type XY = [number, number];

export type EdgeNumber = [number, number, number, number];

export type CrossAvenue = 0 | 1;

export function getReverse(direct: 0): 2;
export function getReverse(direct: 1): 3;
export function getReverse(direct: 2): 0;
export function getReverse(direct: 3): 1;
export function getReverse(direct: MainDirect): MainDirect;
export function getReverse(direct: CrossDirect): CrossDirect;
export function getReverse(direct: Direct): Direct;
export function getReverse(direct: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
    if (direct === 0) {
        return 2;
    } else if (direct === 1) {
        return 3;
    } else if (direct === 2) {
        return 0;
    } else if (direct === 3) {
        return 1;
    } else {
        const _: never = direct;
        return _;
    }
}

export const getCompassFull = (compass: Compass): CompassFull => {
    const mainDirection = compass[0];
    if (mainDirection === 0) {
        const crossDirection = compass[1];
        if (crossDirection === 1) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else if (crossDirection === 3) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else {
            const _: never = crossDirection;
            return _;
        }
    } else if (mainDirection === 1) {
        const crossDirection = compass[1];
        if (crossDirection === 0) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else if (crossDirection === 2) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else {
            const _: never = crossDirection;
            return _;
        }
    } else if (mainDirection === 2) {
        const crossDirection = compass[1];
        if (crossDirection === 1) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else if (crossDirection === 3) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else {
            const _: never = crossDirection;
            return _;
        }
    } else if (mainDirection === 3) {
        const crossDirection = compass[1];
        if (crossDirection === 0) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else if (crossDirection === 2) {
            return [mainDirection, crossDirection, getReverse(mainDirection), getReverse(crossDirection)];
        } else {
            const _: never = crossDirection;
            return _;
        }
    } else {
        const _: never = mainDirection;
        return _;
    }
}

export const getCompassAxis = (compass: Compass): CompassAxis => {
    const mainDirection = compass[0];
    if (mainDirection === 0 || mainDirection === 2) {
        return [0, 1];
    } else if (mainDirection === 1 || mainDirection === 3) {
        return [1, 0];
    } else {
        const _: never = mainDirection;
        return _;
    }
}

export const getMappingCompass = (c1: Compass, c2: Compass): Compass => {
    if (c1[0] === c2[0]) {
        if (c1[1] === c2[1]) {
            return [0, 1];
        } else {
            return [0, 3];
        }
    } else if (c1[0] === getReverse(c2[0])) {
        if (c1[1] === c2[1]) {
            return [2, 1];
        } else {
            return [2, 3];
        }
    } else if (c1[0] === c2[1]) {
        if (c1[1] === c2[0]) {
            return [1, 0];
        } else {
            return [1, 2];
        }
    } else {
        if (c1[1] === c2[0]) {
            return [3, 0];
        } else {
            return [3, 2];
        }
    }
}

export const getMappingCompassFull = (c1: Compass, c2: Compass): CompassFull => {
    return getCompassFull(getMappingCompass(c1, c2));
}

export function getCrossAxisIndex(crossDirect: 1): 0;
export function getCrossAxisIndex(crossDirect: 3): 1;
export function getCrossAxisIndex(crossDirect: CrossDirect): CrossAvenue;
export function getCrossAxisIndex(crossDirect: 1 | 3): 0 | 1 {
    if (crossDirect === 1) {
        return 0;
    } else if (crossDirect === 3) {
        return 1;
    } else {
        const _: never = crossDirect;
        return _;
    }
}

export const isSameAxisDirect = (d1: Direct, d2: Direct): boolean => {
    if (d1 === 0 || d1 === 2) {
        if (d2 === 0 || d2 === 2) {
            return true;
        } else if (d2 === 1 || d2 === 3) {
            return false;
        } else {
            const _: never = d2;
            return _;
        }
    } else if (d1 === 1 || d1 === 3) {
        if (d2 === 0 || d2 === 2) {
            return false;
        } else if (d2 === 1 || d2 === 3) {
            return true;
        } else {
            const _: never = d2;
            return _;
        }
    } else {
        const _: never = d1;
        return _;
    }
}

export const getSameAxisByDirect = (d: Direct): Axis => {
    if (d === 0 || d === 2) {
        return 0;
    } else if (d === 1 || d === 3) {
        return 1;
    } else {
        const _: never = d;
        return _;
    }
}

export const getAnotherAxisByDirect = (d: Direct): Axis => {
    if (d === 0 || d === 2) {
        return 1;
    } else if (d === 1 || d === 3) {
        return 0;
    } else {
        const _: never = d;
        return _;
    }
}

export const getSignedDistance = (d: Direct, distance: number): number => {
    if (d === 0 || d === 1) {
        return distance;
    } else if (d === 2 || d === 3) {
        return - distance;
    } else {
        const _: never = d;
        return _;
    }
}
