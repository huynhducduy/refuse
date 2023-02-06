// @ts-ignore
import htm from '../node_modules/htm/src/index.mjs'
// @ts-ignore
import morphdom from '../node_modules/morphdom/dist/morphdom-esm.js'

import {isStatefulFiber} from "./utils.mjs";
// @ts-ignore
import clone from './rfdc.js'

let rootElement: HTMLElement, rootFiber: RefuseComponent, currentFiber: RefuseComponent | FragmentComponent
let batchUpdate: Function[] = []
let unmountedComponents: Component[] = []
let batchUpdateTimer: number

const originalConsoleLog = console.log

interface FunctionalComponent {
	(props: RefuseComponent['props']): Component
}

interface GeneralComponent {
	// Data that use to create DOM element
	renderType?: string
	renderProps?: Record<string, any>
	toDOMElement: () => HTMLElement | DocumentFragment
	shouldSkip?: boolean
}

interface HtmlComponent extends GeneralComponent { // These component get call later in the process
	child: (string | number)[]
}

export interface RefuseComponent extends GeneralComponent {
	child: Component[]
	isDirty: boolean // Mark fiber as dirty, dirty fiber will be re-rendered
	// Data using to construct component
	type: FunctionalComponent | typeof Fragment
	props: Record<string, any>
	children?: (Component | Component[])[] // jsx children
	// Component state
	childIndex: number
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

export interface FragmentComponent extends Omit<RefuseComponent, 'type' | 'child'> {
	type: typeof Fragment
	child: Child
	isDirty: false
}

type Child = RefuseComponent['child'] | HtmlComponent['child']

export type Component = FragmentComponent | RefuseComponent | HtmlComponent | false

function toDOMElement(this: Component) {
	let element: HTMLElement | DocumentFragment = document.createDocumentFragment()

	if (this) {
		if (this.renderType !== undefined) {
			element = document.createElement(this.renderType as string) // create element of type 'type'

			for (let key in this.renderProps) {
				if (typeof this.renderProps[key] !== "function") {
					element.setAttribute(key, this.renderProps[key]) // add attributes to element
				} else {
					element.addEventListener(key.slice(2), this.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
				}
			}
		}

		function addComponentToElement(thing: Child[number], element: HTMLElement | DocumentFragment) {
			if (thing !== false) {
				if (typeof thing !== "string" && typeof thing !== "number" && "toDOMElement" in thing) {
					element.appendChild(thing.toDOMElement()) // add child element to element
				} else {
					thing = String(thing)
					if (element instanceof HTMLElement) element.innerText += thing // add text to element
					else element.appendChild(document.createTextNode(thing))
				}
			}
		}

		this.child.forEach(child => {
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

function createComponent(type: any, props?: RefuseComponent["props"] | GeneralComponent["renderProps"], child?: RefuseComponent['child'], renderType?: GeneralComponent['renderType'], renderProps?: GeneralComponent['renderProps']): Component {
	return {
		type: type,
		props: props ?? {},
		child: child ?? [],
		childIndex: 0,
		isDirty: true,
		state: [],
		stateIndex: 0,
		effects: [],
		effectIndex: 0,
		memos: [],
		memoIndex: 0,
		renderType: renderType,
		renderProps: renderProps ?? {},
		toDOMElement: toDOMElement,
	}
}

function doDirtyCheck(parentFiber: RefuseComponent | FragmentComponent, component: Component | Component[], props: RefuseComponent['props'] | GeneralComponent['renderProps']) {
	if (Array.isArray(component)) {
		component.forEach((c) => doDirtyCheck(parentFiber, c, c !== false && "props" in c ? c.props : {}))
	} else {
		if (!component) return

		if (isStatefulFiber(component)) {
			console.log('Dirty checking', component.type.name)
			if (component.isDirty) { // Is RefuseComponent and dirty
				console.log('Result: dirty')
				currentFiber = component
				const result = component.type({...props, children: component.children}) // process jsx of this component as well as it's children

				if (component.type !== Fragment) {
					component.renderType = result.renderType
					component.renderProps = result.renderProps
					component.child = result.child
					console.log(component.type.name, 'rendered to', component.renderType, component.renderProps, component.child)
				} else {
					component.renderType = undefined
				}
				currentFiber = parentFiber // Restore parent fiber to process siblings of thisFiber
			} else {
				console.log('Result: clean')
				component.child.forEach((c) => {
					if (typeof c !== 'string' && typeof c !== 'number')
						doDirtyCheck(component, c, c !== false && "props" in c ? c.props : {})
				})
			}
		}
	}
}

function createElement(type: any, props: RefuseComponent["props"] | GeneralComponent["renderProps"], ...child: any[]): Component {
	// @ts-ignore
	this[0] = 3 // disable cache

	const elementName = typeof type === "function" ? type.name : type
	console.log("Processing:", elementName, "props", clone(props), "child", clone(child))

	// No need to render component with type false

	if (type === Fragment) return createComponent(type, props, child, undefined, props)

	if (typeof type === 'function') { // Capturing phase

		const parentFiber = currentFiber // Saved for later use
		let thisFiber

		// Avoid parent fiber TODO: to update
		while (parentFiber.childIndex < parentFiber.child.length && (
			!isStatefulFiber(parentFiber.child[parentFiber.childIndex])
		)) {
			// console.log(isStatefulFiber(parentFiber.child[parentFiber.childIndex]) || (parentFiber.child[parentFiber.childIndex] !== false && parentFiber.child[parentFiber.childIndex].shouldSkip !== true), clone(parentFiber.child[parentFiber.childIndex]))
			parentFiber.childIndex++
		}

		let fiberToGetFrom = parentFiber;
		let oldChild = fiberToGetFrom.child[fiberToGetFrom.childIndex] as RefuseComponent | undefined

		// Skip element that don't have data
		if (oldChild?.shouldSkip) {
			console.log('Skipped empty parent')
			fiberToGetFrom = fiberToGetFrom.child[fiberToGetFrom.childIndex] as RefuseComponent
			oldChild = fiberToGetFrom.child[fiberToGetFrom.childIndex] as RefuseComponent | undefined
		}

		if (oldChild?.type !== type) {
			console.log('Reinitialized:', elementName)
			// If saved child and this child is not the same type, don't reuse data from previous render
			if (oldChild) unmountedComponents.push(oldChild)
			fiberToGetFrom.child[fiberToGetFrom.childIndex] = createComponent(type, props, child)
		} else {
			console.log('Reused:', elementName)
		}

		thisFiber = fiberToGetFrom.child[fiberToGetFrom.childIndex++] as RefuseComponent

		thisFiber.props = props as RefuseComponent['props']
		thisFiber.children = clone(child) // Need to deep clone because htm will change the content of it

		if (parentFiber.isDirty) thisFiber.isDirty = true

		doDirtyCheck(parentFiber, thisFiber, props)

		return thisFiber
	} else {
		let shouldSkip = false
		if (child.length > 0 && typeof child[0] === 'object') {
			shouldSkip = true
		}
		return {
			shouldSkip,
			renderType: type,
			renderProps: props as GeneralComponent['renderProps'],
			child: child,
			toDOMElement: toDOMElement,
		}
	}
}

export const html = htm.bind(createElement)

function resetFiber(fiber: Component | Component[] | string | number | null | undefined) {
	if (typeof fiber === "object" && fiber) {
		if (!Array.isArray(fiber)) {
			if (isStatefulFiber(fiber)) {
				fiber.childIndex = 0
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

function runEffects(fiber: Component | Component[] | string | number | null | undefined, isLayout = false) {
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

function cleanUpEffects(fiber: Component | Component[] | string | number | null | undefined) {
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
	currentFiber = rootFiber
	const result = rootFiber.type({})
	resetFiber(rootFiber) // Reset fiber to prepare for next render
	console.log(clone(rootFiber))
	console.log = originalConsoleLog

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	const newRootElement = rootElement.cloneNode()
	newRootElement.appendChild(result.toDOMElement())
	morphdom(rootElement, newRootElement, {
		getNodeKey: (node: HTMLElement) => {
			return node.id;
		}
	})

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
		while (unmountedComponents.length) {
			cleanUpEffects(unmountedComponents.pop()!)
		}
		console.log = originalConsoleLog
	}

	channel.port1.onmessage = function() {
		console.log('@@@@@@ Browser painted to the screen')
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
		}
		channel.port2.postMessage(undefined)
	})
}

export function render(component: FunctionalComponent, element: HTMLElement | null) {
	if (element) {
		rootElement = element
	}

	rootFiber = createComponent(() => html`<${component}/>`) as RefuseComponent

	rerender()
}

// -----------------------------------------------------------------------------
// API implementation
// -----------------------------------------------------------------------------

export function Fragment(props: any) {
	return props.children
}

export function useState<T = Exclude<any, Function>>(initialValue: T): [T, (newValue: T | ((prevState: T) => T)) => void] {
	const thisFiber = currentFiber as RefuseComponent // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = thisFiber.stateIndex++ // this change overtime too

	thisFiber.state[thisIndex] ??= initialValue

	function setState(newState:  T | ((prevState: T) => T)) {
		if (!batchUpdate.length) batchUpdateTimer = setTimeout(rerender, 0)

		batchUpdate.push(function() {

			if (typeof newState === 'function') {
				newState = (newState as (newValue: T) => T)(thisFiber.state[thisIndex])
			}

			if (thisFiber.state[thisIndex] !== newState) {
				console.log('Update from', thisFiber.state[thisIndex], 'to', newState, 'in', (thisFiber.type as FunctionalComponent).name)
				thisFiber.state[thisIndex] = newState
				thisFiber.isDirty = true
			}
		})
	}

	return [thisFiber.state[thisIndex], setState]
}

export function useEffect(callback: () => (() => void) | void, deps: any[], isLayout = false) {
	const thisFiber = currentFiber as RefuseComponent // because currentFiber change overtime, we must preserve it inside useState
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
	const thisFiber = currentFiber as RefuseComponent // because currentFiber change overtime, we must preserve it inside useState
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

export function memo(component: FunctionalComponent, areEqual: ((prevProps: any, nextProps: any) => boolean) = shallowEqual) {
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
