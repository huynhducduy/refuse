import { Ref } from "./hooks.js";
import './getEventListeners.js';
interface HtmlFiber {
    renderType?: string;
    renderProps: Props;
    child: Fiber[];
    ref?: Ref;
    DOMNode?: Element | DocumentFragment;
}
export interface RefuseFiber extends HtmlFiber {
    isProcessed: boolean;
    isDirty: boolean;
    type: RefuseComponent;
    props: Props;
    state: any[];
    stateIndex: number;
    effects: {
        deps: unknown[] | undefined;
        callback: () => void | (() => void);
        cleanup: void | (() => void);
        run: boolean;
        isLayout: boolean;
    }[];
    effectIndex: number;
    memos: {
        deps: unknown[] | undefined;
        factory: () => any;
        value: any;
    }[];
    memoIndex: number;
}
interface Props {
    [key: string]: any;
}
export type Fiber = RefuseFiber | HtmlFiber | string | number | false | null | undefined;
export type RefuseElement = Fiber | Fiber[] | RefuseElement[];
type Fuse = (strings: TemplateStringsArray, ...rest: any[]) => RefuseElement;
export type RefuseComponent<T extends Props = Props> = (props: T, ref?: Ref) => RefuseElement;
export type ComponentProps<T extends RefuseComponent> = T extends (props: infer P, ...args: any[]) => ReturnType<T> ? P : never;
export type ComponentRef<T extends RefuseComponent> = T extends (arg0: any, ref: infer P, ...args: any[]) => ReturnType<T> ? P : never;
declare let currentFiber: RefuseFiber;
declare let batchUpdate: Function[];
declare let batchUpdateTimer: {
    value: number | undefined;
};
declare function Fragment({ children }: {
    children: RefuseFiber['child'];
}): Fiber[];
declare const fuse: Fuse;
declare function rerender(): void;
declare function render(component: RefuseComponent, element: Element | null): void;
export { render, fuse, Fragment, currentFiber, batchUpdate, batchUpdateTimer, rerender };
