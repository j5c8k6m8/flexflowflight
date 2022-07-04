/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="deno.ns" />
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
                const svg = await parse(elem.textContent || '', { debug: window.flexflowflight.debug });
                elem.insertAdjacentHTML("afterend", svg);
            });
        }
    },
    false
);
