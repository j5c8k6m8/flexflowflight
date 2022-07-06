/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
import { Name } from "./core/astC1.ts"
import { Cell as CellL1 } from "./core/astL1.ts"
import { DocAttr } from "./core/astL2.ts"
import { Parse, parse } from "./parse.ts"
interface Window {
    flexflowflight: {
        onload: boolean;
        debug: boolean;
        parse: Parse;
    }
}
declare let window: Window
window.flexflowflight = {
    onload: true,
    debug: false,
    parse: parse,
};
addEventListener(
    'load',
    function (_e) {
        if (window.flexflowflight.onload) {
            const elems = document.querySelectorAll<HTMLElement>(".flexflowflight");
            elems.forEach(async elem => {
                elem.style.display = "none";
                elem.insertAdjacentHTML("afterend", '<svg id="_flexflowflight_work" xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"></svg>');
                const tmpElem = document.getElementById('_flexflowflight_work');
                // deno-lint-ignore require-await
                const getTextSize = async (name: Name, _cellL1: CellL1): Promise<[number, number]> => {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.textContent = name;
                    tmpElem?.appendChild(text);
                    const domRect = text.getBoundingClientRect()
                    return [domRect.width, domRect.height];
                }
                const svg = await parse(elem.textContent || '', { textSize: getTextSize, debug: window.flexflowflight.debug });
                tmpElem?.remove()
                elem.insertAdjacentHTML("afterend", svg);
            });
        }
    },
    false
);
