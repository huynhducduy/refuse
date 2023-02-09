// @ts-ignore
import htm from '../node_modules/htm/src/index.mjs'
// @ts-ignore
import morphdom from '../node_modules/morphdom/dist/morphdom-esm.js'

import {isStatefulFiber} from "./utils.mjs";
// @ts-ignore
import clone from './rfdc.js'

let rootElement: HTMLElement | DocumentFragment,
	rootComponent: RefuseComponent,
	rootFiber: Fiber,
	currentFiber: CallableFiber // for hooks to access data
let batchUpdate: Function[] = []
let unmountedFibers: Fiber[] = []
let batchUpdateTimer: number

const originalConsoleLog = console.log

interface GeneralFiber {
	// Data that use to create DOM element
	renderType?: string
	renderProps?: Record<string, any>
	ref?: any
}

// Don't need to process its child
interface HtmlFiber extends GeneralFiber {
	child: (string | number)[]
}

export interface RefuseFiber extends GeneralFiber {
	child: Child
	isDirty: boolean // Mark fiber as dirty, dirty fiber will be re-rendered
	// Data using to construct fiber
	type: {
		<T = Record<string, any>>(props: T): Fiber | string | string[] | number | number[] | false | null | undefined
	}
	props: Record<string, any>
	// Fiber state
	state: any[]
	stateIndex: number
	effects: {
		deps: any[]
		callback: () => void | (() => void)
		cleanup: void | (() => void)
		run: boolean
		isLayout: boolean
	}[]
	effectIndex: number
	memos: {
		deps: any[]
		factory: () => any
		value: any
	}[]
	memoIndex: number
}

export interface FragmentFiber extends Omit<RefuseFiber, 'type' | 'child'> {
	isDirty: false
	type: typeof Fragment
	child: Child
}

type Child = Fiber[] | HtmlFiber["child"]

export type Fiber = RefuseFiber | FragmentFiber | HtmlFiber | false
export type CallableFiber = RefuseFiber | FragmentFiber
export type RefuseComponent = RefuseFiber['type']
export type RefuseElement = ReturnType<RefuseComponent>

function addComponentToElement(thing: Child[number], element: HTMLElement | DocumentFragment) {
	if (thing !== false) {
		if (typeof thing !== "string" && typeof thing !== "number") {
			element.appendChild(toDOMElement(thing)) // add child element to element
		} else {
			thing = String(thing)
			if (element instanceof HTMLElement) element.innerText += thing // add text to element
			else element.appendChild(document.createTextNode(thing))
		}
	}
}

function toDOMElement(fiber: Fiber) {
	let element: HTMLElement | DocumentFragment = new DocumentFragment()

	if (fiber) {
		if (fiber.renderType !== undefined) {
			element = document.createElement(fiber.renderType as string) // create element of type 'type'

			for (let key in fiber.renderProps) {
				if (key === 'ref' && fiber.renderProps.ref){
					fiber.renderProps.ref.current = element
				} else if (typeof fiber.renderProps[key] !== "function") {
					element.setAttribute(key, fiber.renderProps[key]) // add attributes to element
				} else {
					element.addEventListener(key.slice(2), fiber.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
				}
			}
		}

		if (fiber?.props?.ref) {
			fiber.props.ref.current = element
		}

		fiber.child.forEach(child => {
			if (Array.isArray(child)) {
				child.forEach(c => {
					addComponentToElement(c, element)
				})
			} else {
				addComponentToElement(child, element)
			}
		})
	}

	return element
}

function createDefaultFiber(type: any, props?: RefuseFiber["props"] | GeneralFiber["renderProps"], child?: RefuseFiber['child'], renderType?: GeneralFiber['renderType'], renderProps?: GeneralFiber['renderProps']): Fiber {
	return {
		type: type,
		props: props ?? {},
		child: child ?? [],
		isDirty: true,
		state: [],
		stateIndex: 0,
		effects: [],
		effectIndex: 0,
		memos: [],
		memoIndex: 0,
		renderType: renderType,
		renderProps: renderProps ?? {},
	}
}

function reconcile(parentFiberIsDirty: boolean | undefined, oldFiber: Fiber | undefined, fiber: Fiber) {

	if (fiber) {

		let oldChild = oldFiber?.child

		if (typeof fiber.type === "function" && fiber.type !== Fragment) {

			let isReuse = false

			if (oldFiber && oldFiber.type === fiber.type) {
				console.log('Reusing', clone(oldFiber))
				isReuse = true
				fiber.isDirty = oldFiber.isDirty
			} else {
				console.log('Not reuse')
				console.log('oldFiber:', oldFiber)
			}

			if (parentFiberIsDirty) fiber.isDirty = true

			if (fiber.isDirty) {

				console.log(fiber.type.name, 'is dirty')
				let newProps = fiber.props

				if (parentFiberIsDirty) { // If parent fiber is dirty, then props probably changed
					// Save the reference to new props and children
					newProps = {...fiber.props, children: fiber.child ?? []}
				}

				if (isReuse) {
					fiber = oldFiber
				}

				// Save props for next render
				fiber.props = newProps
				const ref = fiber.props.ref
				// TODO: using delete here will affect perfomance, find a better way
				delete fiber.props.ref

				currentFiber = fiber
				const result = fiber.type({...fiber.props}, ref)

				if ([null, undefined, false].includes(result)) {
					// Stop reconcile child if result is null, undefined, or false
					return
				} else if (Array.isArray(result)) {
					// Array of text, string
					fiber.child = result
				} else if (typeof result !== 'object') {
					fiber.child = [result]
				} else {
					fiber.renderType = result.renderType
					fiber.renderProps = result.renderProps
					fiber.child = result.child
				}
				console.log('Result:', fiber.type.name, clone(fiber)) // No child state
			} else {
				console.log(fiber.type.name, 'is clean')
				fiber = oldFiber
			}
		}

		reconcileChild(fiber.isDirty, oldChild, fiber.child)

	}

	return fiber
}

function* getNextRefuseFiber(fiber: Fiber): Generator<[RefuseFiber, number]> {
	if (fiber === undefined) return
	for (const i in fiber?.child) {
		if (typeof fiber.child[i]?.type === 'function') {
			yield [fiber, i]
		} else if (typeof fiber.child[i] !== 'number' && typeof fiber.child[i] !== 'string') {
			for (let j of getNextRefuseFiber(fiber.child[i])) {
				yield j
			}
		}
	}
}

function reconcileChild(parentFiberIsDirty: boolean, oldChild: Fiber[], child: Fiber[]) {
	for (const i in child) {
		if (typeof child[i]?.type === 'function') {
			// If there are some component passed as children to this child, then we need to reconcile them first
			for (const j in child[i].child) {
				if (typeof child[i].child[j]?.type === 'function') {
					child[i].child[j] = reconcile(parentFiberIsDirty, oldChild?.[i]?.child?.[j], child[i].child[j])
				}
			}
			// Then we can reconcile the child itself
			child[i] = reconcile(parentFiberIsDirty, oldChild?.[i], child[i])
		} else if (typeof child[i] !== 'number' && typeof child[i] !== 'string') {
			const nextOldChild = getNextRefuseFiber(oldChild?.[i])
			const nextChild = getNextRefuseFiber(child[i])
			for (const j of nextChild) {
				const oldChildNext = nextOldChild.next().value
				j[0].child[j[1]] = reconcile(parentFiberIsDirty, oldChildNext?.[0]?.child?.[oldChildNext[1]], j[0].child[j[1]])
			}
		}
	}
}


function createElement(type: any, props: any, ...child: any[]): Fiber {
	// @ts-ignore
	this[0] = 3 // disable cache

	if (typeof type === 'function') { // Capturing phase

		return createDefaultFiber(type, props, child)
	} else {
		return {
			renderType: type,
			renderProps: props,
			child: child,
		}
	}
}

export const html: (strings: TemplateStringsArray, ...rest: any[]) => RefuseElement = htm.bind(createElement)

function resetFiber(fiber: Fiber | Fiber[] | string | number | null | undefined) {
	console.log(fiber)
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isStatefulFiber(fiber)) {
				fiber.stateIndex = 0
				fiber.effectIndex = 0
				fiber.memoIndex = 0
				fiber.isDirty = false
			}

			fiber.child.forEach(f => {
				if (typeof f === "object") {
					resetFiber(f)
				}
			})
		} else {
			fiber.forEach(f => resetFiber(f))
		}
	}
}

function runEffects(fiber: Fiber | Fiber[] | string | number | null | undefined, isLayout = false) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isStatefulFiber(fiber)) {
				fiber.child.forEach(child => {
					if (typeof child === "object") {
						runEffects(child, isLayout)
					}
				})

				for (let i = 0; i < fiber.effects.length; i++) {
					if (fiber.effects[i].run && fiber.effects[i].isLayout === isLayout) {
						fiber.effects[i].cleanup?.()
						fiber.effects[i].cleanup = fiber.effects[i].callback()
						fiber.effects[i].run = false
					}
				}
			}
		} else {
			fiber.forEach(f => runEffects(f))
		}
	}
}

function cleanUpEffects(fiber: Fiber | Fiber[] | string | number | null | undefined) {
	// Called in a bottom-up fashion, run children's effects first
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isStatefulFiber(fiber)) {
				fiber.child.forEach(child => {
					if (typeof child === "object") {
						cleanUpEffects(child)
					}
				})

				for (let i = 0; i < fiber.effects.length; i++) {
					fiber.effects[i].cleanup?.()
				}
			}
		} else {
			fiber.forEach(f => runEffects(f))
		}
	}
}

function rerender() {
	console.log('----------------------------------------------------------------')
	// Batch update state changes
	console.log('@@@@@@@ Batch updating...')
	console.log = (...args) => originalConsoleLog('[State change]', ...args)
	while (batchUpdate.length) {
		batchUpdate.pop()!()
	}
	console.log = originalConsoleLog

	// Render phase, and schedule effects to run later
	console.log('@@@@@@@ Rendering...')
	console.log = (...args) => originalConsoleLog('[Render]', ...args)
	const newRootFiber = createDefaultFiber(rootComponent)
	const result = reconcile(undefined, rootFiber, newRootFiber)
	resetFiber(result) // Reset fiber to prepare for next render
	rootFiber = result
	console.log('Result:', clone(rootFiber))
	console.log = originalConsoleLog

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	// const newRootElement = rootElement.cloneNode()
	// newRootElement.appendChild(toDOMElement(result))
	// morphdom(rootElement, newRootElement, {
	// 	// getNodeKey: (node: HTMLElement) => {
	// 	// 	return node.id;
	// 	// }
	// })
	rootElement.textContent = ''
	rootElement.appendChild(toDOMElement(rootFiber))


	// Layout Effects goes here and block browser paint
	// After running all layout effects at once, if changes are made, trigger re-render again before browser paint
	// using requestAnimationFrame
	const channel = new MessageChannel()

	function runEffectsFunc() {
		// Run effects and cleanup effects of unmounted components
		// 1: if changes are made in layout effects: run before browser paint
		// 2: if no changes are made in layout effects: run after browser painted to the screen
		console.log('@@@@@@ Running effects...')
		console.log = (...args) => originalConsoleLog('[Effect]', ...args)
		runEffects(rootFiber)
		console.log = originalConsoleLog

		// Clean up unmounted components last
		console.log('@@@@@@ Cleaning up unmounted components...')
		console.log = (...args) => originalConsoleLog('[Effect cleanup]', ...args)
		while (unmountedFibers.length) {
			cleanUpEffects(unmountedFibers.pop()!)
		}
		console.log = originalConsoleLog
	}

	requestAnimationFrame(function () {

		console.log('@@@@@@ Running layout effects before repaint...')
		console.log = (...args) => originalConsoleLog('[Layout effect]', ...args)
		runEffects(rootFiber, true)
		console.log = originalConsoleLog

		if (batchUpdate.length) {
			runEffectsFunc()
			clearTimeout(batchUpdateTimer)
			rerender()
		} else {
			channel.port1.onmessage = runEffectsFunc
			channel.port2.postMessage(undefined) // Guarantee to postMessage after paint
			console.log('@@@@@@ Browser painted to the screen')
		}
	})
}

export function render(component: CallableFiber['type'], element: HTMLElement | null) {
	if (element) {
		rootElement = element
	} else {
		rootElement = document.createDocumentFragment()
		document.body.prepend(rootElement)
	}

	rootComponent = component

	rerender()
}

// -----------------------------------------------------------------------------
// API implementation
// -----------------------------------------------------------------------------

export function Fragment(props: any) {
	return props.children
}

export function useState<T = Exclude<any, Function>>(initialValue: T): [T, (newValue: T | ((prevState: T) => T)) => void] {
	const thisFiber = currentFiber as RefuseFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.stateIndex++ // this change overtime too

	thisFiber.state[thisIndex] ??= initialValue

	function setState(newState:  T | ((prevState: T) => T)) {
		if (!batchUpdate.length) batchUpdateTimer = setTimeout(rerender, 0)

		batchUpdate.push(function() {

			if (typeof newState === 'function') {
				newState = (newState as (newValue: T) => T)(thisFiber.state[thisIndex])
			}

			if (thisFiber.state[thisIndex] !== newState) {
				console.log('Update from', thisFiber.state[thisIndex], 'to', newState, 'in', (thisFiber.type as RefuseFiber['type']).name)
				thisFiber.state[thisIndex] = newState
				thisFiber.isDirty = true
			}
		})
	}

	return [thisFiber.state[thisIndex], setState]
}

export function useEffect(callback: () => (() => void) | void, deps: any[], isLayout = false) {
	const thisFiber = currentFiber as RefuseFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.effectIndex++ // this change overtime too

	let run = false

	// No dependency, run every rerender
	if (!deps) {
		run = true
	}
	// Has dependency, run if dependency changed
	else if (!thisFiber.effects[thisIndex] || deps.length !== thisFiber.effects[thisIndex].deps.length
			|| deps.some((dep, i) => dep !== thisFiber.effects[thisIndex].deps[i])) {
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

export const useLayoutEffect = (callback: () => (() => void) | void, deps: any[]) => useEffect(callback, deps, true)

export function useMemo<T>(factory: () => T, deps: any[]) {
	const thisFiber = currentFiber as RefuseFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.memoIndex++ // this change overtime too

	let update = false

	// No dependency, run every rerender
	if (!deps) {
		update = true
	}
	// Has dependency, run if dependency changed
	else if (!thisFiber.memos[thisIndex] || deps.length !== thisFiber.memos[thisIndex].deps.length
		|| deps.some((dep, i) => dep !== thisFiber.memos[thisIndex].deps[i])) {
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

export function useRef<T = any>(initialValue: T) {
	return useMemo(() => ({ current: initialValue }), [])
}

export type Ref<T> = ReturnType<typeof useRef<T>>

function shallowEqual(prevProps: any, nextProps: any): boolean {
	if (prevProps === undefined) return false

	const prevKeys = Object.keys(prevProps)
	const nextKeys = Object.keys(nextProps)

	if (prevKeys.length !== nextKeys.length) return false
	if (prevKeys.length === 0) return true

	for (let i = 0; i < prevKeys.length; i++) {
		if (prevKeys[i] !== 'children' && prevProps[prevKeys[i]] !== nextProps[prevKeys[i]]) return false
	}

	return shallowEqual(prevProps.children, nextProps.children)
}

export function memo(component: RefuseComponent, areEqual: ((prevProps: any, nextProps: any) => boolean) = shallowEqual) {
	const memoComponent = function(props: any) {
		const prevProps = useRef(undefined)
		useEffect(() => {
			prevProps.current = props
		}, [props])
		console.log('[Memo check]', areEqual(prevProps.current, props), prevProps.current, props)

		return areEqual(prevProps.current, props) ? currentFiber : component(props)
	}

	// Name the memo component for debugging purpose
	Object.defineProperty(memoComponent, 'name', {value: component.name, writable: false});
	return memoComponent
}
