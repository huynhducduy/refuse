import type { ComponentProps, ComponentRef, RefuseComponent, RefuseFiber } from "./render.js";
export declare function useState<T = Exclude<unknown, Function>>(initialValue: T): [T, (newValue: T | ((prevState: T) => T)) => void];
type effectCallback = () => (() => void) | void;
export declare function useEffect(callback: effectCallback, deps: RefuseFiber['effects'][number]['deps'], isLayout?: boolean): void;
export declare const useLayoutEffect: (callback: effectCallback, deps: RefuseFiber['effects'][number]['deps']) => void;
export declare function useMemo<T>(factory: () => T, deps: RefuseFiber['memos'][number]['deps']): T;
export declare function useCallback<T = any>(callback: T, deps: any[]): T;
export type Ref<T = any> = {
    current: T | null;
};
export declare function useRef<T = any>(initialValue: T): Ref<T>;
export declare function memo<T extends RefuseComponent = RefuseComponent>(component: T, areEqual?: ((prevProps: ComponentProps<T> | null, nextProps: ComponentProps<T>) => boolean)): (props: ComponentProps<T>, ref: ComponentRef<T>) => import("./render.js").RefuseElement;
export {};
