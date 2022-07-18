export type Name = string;
export type Path = string[];
// AccessName include tagName selecter and attrName selecter.
export type AccessName = string;

const direction = ['main', 'cross', 'main_reverse', 'cross_reverse'] as const;
export type Direction = typeof direction[number];
// deno-lint-ignore no-explicit-any
export const isDirection = (c: any): c is Direction => {
    return direction.includes(c);
}

const containerDirection = ['main', 'cross', 'row', 'column', 'row_reverse', 'column_reverse'] as const;
export type ContainerDirection = typeof containerDirection[number];
// deno-lint-ignore no-explicit-any
export const isContainerDirection = (c: any): c is ContainerDirection => {
    return containerDirection.includes(c);
}

const align = ['start', 'center', 'end'] as const;
export type Align = typeof align[number];
// deno-lint-ignore no-explicit-any
export const isAlign = (c: any): c is Align => {
    return align.includes(c);
}


