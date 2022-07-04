import { AstL6 } from "./astL6.ts"

type Options = {
    pre?: (astL6: AstL6) => Promise<AstL6>,
    post?: (svg: string) => Promise<string>,
}

// FILE ERROR ID = '07'
export const parse = async (astL6: AstL6, { pre, post, }: Options = {}): Promise<string> => {
    // FUNCTION ERROR ID = '01'
    if (pre) {
        astL6 = await pre(astL6);
    }
    const sb: string[] = [];
    sb.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${astL6.canvas.size[0]}" height="${astL6.canvas.size[1]}">`);
    astL6.groupDisps.forEach(groupDisp => {
        sb.push(`<rect x="${groupDisp.xy[0]}" y="${groupDisp.xy[1]}" width="${groupDisp.size[0]}" height="${groupDisp.size[1]}" fill="none" stroke="black" class="fl3-group"></rect>`);
        if (groupDisp.text != null) {
            sb.push(`<text x="${groupDisp.xy[0] + Math.floor(groupDisp.size[0] / 2)}" y="${groupDisp.xy[1]}" text-anchor="middle" dominant-baseline="middle" stroke="black">${groupDisp.text}</text>`);
        }
    });
    astL6.cellDisps.forEach(cellDisp => {
        sb.push(`<rect x="${cellDisp.xy[0]}" y="${cellDisp.xy[1]}" width="${cellDisp.size[0]}" height="${cellDisp.size[1]}" fill="none" stroke="black" class="fl3-cell"></rect>`);
        if (cellDisp.text != null) {
            sb.push(`<text x="${cellDisp.xy[0] + Math.floor(cellDisp.size[0] / 2)}" y="${cellDisp.xy[1] + Math.floor(cellDisp.size[1] / 2)}" text-anchor="middle" dominant-baseline="middle" stroke="black">${cellDisp.text}</text>`);
        }
    });
    astL6.linkDisps.forEach(linkDisp => {
        const pathSb: string[] = [];
        linkDisp.xys.forEach((xy, i) => {
            if (i === 0) {
                pathSb.push(`M ${xy[0]} ${xy[1]}`);
            } else {
                pathSb.push(` L ${xy[0]} ${xy[1]}`);
            }
        });
        sb.push(`<path d="${pathSb.join('')}" fill="none" stroke="black"/>`);
    });
    sb.push(`<style>`);
    sb.push(`.fl3-group{stroke-dasharray: 2}`);
    sb.push(`</style>`);
    sb.push(`</svg>`);

    let svg = sb.join("\n");
    if (post) {
        svg = await post(svg);
    }
    return svg;
}
