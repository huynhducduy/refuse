import { RefuseFiber } from "../render.js";
export default function isChildfulFiber(fiber: any): fiber is RefuseFiber | HTMLElement;
