// @ts-ignore
import htm from '../node_modules/htm/dist/htm.mjs'
// @ts-ignore
import morphdom from '../node_modules/morphdom/dist/morphdom-esm.js'

let rootElement: HTMLElement, rootFiber: Fiber, currentFiber: Fiber
let batchUpdate: Function[] = []
let unmountedComponents: Fiber[] = []
let batchUpdateTimer: number

const originalConsoleLog = console.log

interface FunctionalComponent {
	(props: Fiber['props']): Fiber
}

interface Fiber {
	[x: string]: any
	isRoot?: boolean // Mark fiber as root component, root component is always dirty
	isDirty: boolean // Mark fiber as dirty, dirty fiber will be re-rendered
	type: string | FunctionalComponent // Type of fiber, can be a string (html tag) or a function (component)
	props: Record<string, any>
	child: Fiber[]
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
	children?: Fiber[] // jsx children
	// Data that use to create DOM element
	renderType?: string
	renderProps?: Record<string, any>
	renderChild?: Fiber[]
	toDOMElement: () => HTMLElement
}

function deepClone(obj: any) {
	return JSON.parse(JSON.stringify(obj))
}

function toDOMElement(this: Fiber) {
	const element = document.createElement(this.renderType as string) // create element of type 'type'

	for (let key in this.renderProps) {
		if (typeof this.renderProps[key] !== "function") {
			element.setAttribute(key, this.renderProps[key]) // add attributes to element
		} else {
			element.addEventListener(key.slice(2), this.renderProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
		}
	}

	this.renderChild?.forEach(child => {
		if (typeof child !== "object") {
			element.innerHTML += child // add text to element
		} else if (child.toDOMElement) {
			element.appendChild(child.toDOMElement()) // add child element to element
		}
	})

	return element
}

function createFiber(type: Fiber["type"], props?: Fiber["props"], child?: Fiber["child"]): Fiber {
	return {
		isRoot: false,
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
		toDOMElement: toDOMElement,
	}
}

function createElement(type: Fiber["type"], props: Fiber["props"], ...child: Fiber[]): Fiber {
	// @ts-ignore
	this[0] = 3 // disable cache

	const parentFiber = currentFiber // Saved for later use
	let thisFiber, result

	console.log("Processing: type", typeof type === "function" ? type.name : type, "props", props, "child", child)

	const oldChild = parentFiber.child[parentFiber.childIndex]
	if (oldChild?.type !== type) {
		// If saved child and this child is not the same type, don't reuse data from previous render
		if (typeof oldChild?.type === "function") unmountedComponents.push(oldChild)
		parentFiber.child[parentFiber.childIndex] = createFiber(type, props, child)
	} else if (!parentFiber.isRoot) {
		// Update props and child
		parentFiber.child[parentFiber.childIndex].props = props
		parentFiber.child[parentFiber.childIndex].child = child
	}

	// Try to leverage data from previous render
	thisFiber = parentFiber.child[parentFiber.childIndex++]

	if (typeof type === 'function') { // if it's a custom component

		thisFiber.children = deepClone(child) // Need to deep clone because htm will change the content of it
		console.log('children saved', thisFiber.children)

		if (!parentFiber.isRoot && parentFiber.isDirty)
			thisFiber.isDirty = true

		if (thisFiber.isDirty) {
			console.log('result: dirty')
			currentFiber = thisFiber
			result = type({...props, children: thisFiber.children}) // process jsx of this component as well as it's children

			const itself = thisFiber.child.pop()
			if (itself) {
				console.log('done get itself of', type.name, itself.renderType, itself.renderProps, itself.renderChild) // All children of thisFiber is processed to pure html element, the last child is the component itself
				thisFiber.renderType = itself.renderType
				thisFiber.renderProps = itself.renderProps
				thisFiber.renderChild = itself.renderChild
			}
		} else {
			console.log('result: clean, checking childs...')
			thisFiber.child.forEach((c) => {
				if (typeof c.type === 'function' && c.isDirty) {
					console.log('found dirty child', c.type.name)
					currentFiber = c
					c.type({...c.props, children: c.children})
				}
			})
			result = thisFiber
		}

		currentFiber = parentFiber // Restore parent fiber to process siblings of thisFiber

	} else {
		thisFiber.renderProps = props
		thisFiber.renderType = type
		thisFiber.renderChild = child
		result = thisFiber
	}

	return result
}

export const html = htm.bind(createElement)

function resetFiber(fiber: Fiber) {
	fiber.childIndex = 0
	fiber.stateIndex = 0
	fiber.effectIndex = 0
	fiber.memoIndex = 0
	fiber.isDirty = false

	fiber.child.forEach(child => {
		if (typeof child === "object") {
			resetFiber(child)
		}
	})
}

function runEffects(fiber: Fiber, isLayout = false) {
	// Called in a bottom-up fashion, run children's effects first
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

function cleanUpEffects(fiber: Fiber) {
	// Called in a bottom-up fashion, run children's effects first
	fiber.child.forEach(child => {
		if (typeof child === "object") {
			cleanUpEffects(child)
		}
	})

	for (let i = 0; i < fiber.effects.length; i++) {
		fiber.effects[i].cleanup?.()
	}
}

function rerender() {
	// Batch update state changes
	// if (batchUpdate.length === 0) return
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
	const result = (rootFiber.type as Function)({})
	resetFiber(rootFiber) // Reset fiber to prepare for next render
	console.log = originalConsoleLog

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	const newRootElement = rootElement.cloneNode()
	newRootElement.appendChild(result.toDOMElement())
	morphdom(rootElement, newRootElement)

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

	rootFiber = createFiber(() => html`<${component}/>`)
	rootFiber.isRoot = true

	rerender()
}

// -----------------------------------------------------------------------------
// Hooks implementation
// -----------------------------------------------------------------------------

export function useState<T = Exclude<any, Function>>(initialValue: T): [T, (newValue: T | ((prevState: T) => T)) => void] {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = currentFiber.stateIndex++ // this change overtime too

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
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = currentFiber.effectIndex++ // this change overtime too

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
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = currentFiber.memoIndex++ // this change overtime too

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
