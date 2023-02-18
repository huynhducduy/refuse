import type {ComponentProps, ComponentRef, RefuseComponent, RefuseFiber} from "./render.js";
import {batchUpdate, batchUpdateTimer, currentFiber, rerender} from "./render.js";

export function useState<T = Exclude<unknown, Function>>(initialValue: T): [T, (newValue: T | ((prevState: T) => T)) => void] {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.stateIndex++ // this change overtime too

	thisFiber.state[thisIndex] ??= initialValue

	function setState(newState:  T | ((prevState: T) => T)) {
		if (!batchUpdate.length) requestAnimationFrame(rerender)

		batchUpdate.push(function() {

			if (typeof newState === 'function') {
				newState = (newState as (newValue: T) => T)(thisFiber.state[thisIndex])
			}

			if (thisFiber.state[thisIndex] !== newState) {
				thisFiber.state[thisIndex] = newState
				thisFiber.isDirty = true
			}
		})
	}

	return [thisFiber.state[thisIndex], setState]
}

type effectCallback = () => (() => void) | void

export function useEffect(callback: effectCallback, deps: RefuseFiber['effects'][number]['deps'], isLayout = false) {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.effectIndex++ // this change overtime too

	let run = false

	// No dependency, run every rerender
	if (!deps) {
		run = true
	}
	// Has dependency, run if dependency changed
	else if (!thisFiber.effects[thisIndex] || deps.length !== thisFiber.effects[thisIndex].deps?.length
		|| deps.some((dep, i) => dep !== thisFiber.effects[thisIndex].deps?.[i])) {
		run = true
	}

	if (run) {
		thisFiber.effects[thisIndex] = {
			...thisFiber.effects[thisIndex],
			deps,
			callback,
			run,
			isLayout,
		}
	}
}

export const useLayoutEffect = (callback: effectCallback, deps: RefuseFiber['effects'][number]['deps']) => useEffect(callback, deps, true)

export function useMemo<T>(factory: () => T, deps: RefuseFiber['memos'][number]['deps']): T {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.memoIndex++ // this change overtime too

	let update = false

	// No dependency, run every rerender
	if (!deps) {
		update = true
	}
	// Has dependency, run if dependency changed
	else if (!thisFiber.memos[thisIndex] || deps.length !== thisFiber.memos[thisIndex].deps?.length
		|| deps.some((dep, i) => dep !== thisFiber.memos[thisIndex].deps?.[i])) {
		update = true
	}

	if (update) {
		thisFiber.memos[thisIndex] = {
			...thisFiber.memos[thisIndex],
			deps,
			factory,
			value: factory(),
		}
	}

	return thisFiber.memos[thisIndex].value
}

export function useCallback<T = any>(callback: T, deps: any[]): T {
	return useMemo(() => callback, deps)
}

export type Ref<T = any> = {
	current: T | null
}

export function useRef<T = any>(initialValue: T): Ref<T> {
	return useMemo(() => ({ current: initialValue }), [])
}

function shallowEqual<T extends Record<string, any>>(prevProps: T | null, nextProps: T): boolean {
	if (prevProps === null) return false

	const prevKeys = Object.keys(prevProps)
	const nextKeys = Object.keys(nextProps)

	if (prevKeys.length !== nextKeys.length) return false
	if (prevKeys.length === 0) return true

	for (let i = 0; i < prevKeys.length; i++) {
		if (prevKeys[i] !== 'children' && prevProps[prevKeys[i]] !== nextProps[prevKeys[i]]) return false
	}

	return shallowEqual(prevProps.children, nextProps.children)
}

export function memo<T extends RefuseComponent = RefuseComponent>(component: T, areEqual: ((prevProps: ComponentProps<T> | null, nextProps: ComponentProps<T>) => boolean) = shallowEqual<ComponentProps<T>>) {
	const memoComponent = function(props: ComponentProps<T>, ref: ComponentRef<T>) {
		const prevProps = useRef<ComponentProps<T> | null>(null)
		useEffect(() => {
			prevProps.current = props
		}, [props])
		console.log('[Memo check]', areEqual(prevProps.current, props), prevProps.current, props)

		return areEqual(prevProps.current, props) ? currentFiber : component(props, ref)
	}

	// Name the memo component for debugging purpose
	Object.defineProperty(memoComponent, 'name', {value: component.name, writable: false});
	return memoComponent
}
