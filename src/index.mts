// @ts-ignore
import htm from '../node_modules/htm/dist/htm.mjs';

let rootElement: HTMLElement, rootFiber: Fiber, currentFiber: Fiber
let batchUpdate: Function[] = []

interface FunctionalComponent {
	(props: Fiber['props']): Fiber
}

interface Fiber {
	[x: string]: any;
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
	}[]
	effectIndex: number
	// Data that use to create DOM element
	renderType?: string
	renderProps?: Record<string, any>
	renderChild?: Fiber[]
	toDOMElement: () => HTMLElement
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
		toDOMElement: toDOMElement,
	}
}

function createElement(type: Fiber["type"], props: Fiber["props"], ...child: Fiber["child"]): Fiber {
	// @ts-ignore
	this[0] = 3; // disable cache

	const parentFiber = currentFiber // Saved for later use
	let thisFiber, result;

	// console.log("Processing: type", type, "props", props, "child", child)

	if (!parentFiber.child[parentFiber.childIndex] || parentFiber.child[parentFiber.childIndex].type !== type) { // Initialize the child If the child is not initialized or not the old child
		parentFiber.child[parentFiber.childIndex] = createFiber(type, props, child)
	}

	// if (!parentFiber.isRoot) {
	// 	parentFiber.child[parentFiber.childIndex].props = props
	// 	parentFiber.child[parentFiber.childIndex].child = child
	// }

	// Try to leverage data from previous render
	thisFiber = parentFiber.child[parentFiber.childIndex++]

	if (typeof type === 'function') { // if it's a custom component
		if (!parentFiber.isRoot && parentFiber.isDirty)
			thisFiber.isDirty = true

		if (thisFiber.isDirty) {
			// console.log('result: dirty')
			currentFiber = thisFiber
			result = type({...props, children: child}) // process jsx of this component as well as it's children

			const itself = thisFiber.child.pop()
			// console.log('done get itself of', thisFiber.type.name, itself.renderType, itself.renderProps, itself.renderChild) // All children of thisFiber is processed to pure html element, the last child is the component itself
			if (itself) {
				thisFiber.renderType = itself.renderType
				thisFiber.renderProps = itself.renderProps
				thisFiber.renderChild = itself.renderChild
			}
		} else {
			// console.log('result: clean')
			thisFiber.child.forEach((child) => {
				if (typeof child.type === 'function' && child.isDirty) {
					currentFiber = child
					child.type({...child.props, children: child.child})
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
	fiber.isDirty = false

	fiber.child.forEach(child => {
		if (typeof child === "object") {
			resetFiber(child)
		}
	})
}

function runningEffects(fiber: Fiber) {
	// Called in a bottom-up fashion, run children's effects first
	fiber.child.forEach(child => {
		if (typeof child === "object") {
			runningEffects(child)
		}
	})

	for (let i = 0; i < fiber.effects.length; i++) {
		if (fiber.effects[i].run) {
			fiber.effects[i].cleanup?.()
			fiber.effects[i].cleanup = fiber.effects[i].callback()
			fiber.effects[i].run = false
		}
	}
}

function rerender() {
	// Batch update state changes
	while (batchUpdate.length) {
		batchUpdate.pop()!()
	}

	// Render phase, and schedule effects to run later
	currentFiber = rootFiber;
	const result = (rootFiber.type as Function)({})
	resetFiber(rootFiber) // Reset fiber to prepare for next render

	// Reconciliation phase: tree diffing: find out what changed, what component to mount and to unmount
	// https://reactjs.org/docs/reconciliation.html

	// Commit phase: commit changes to real DOM
	rootElement.innerHTML = ''
	rootElement.appendChild(result.toDOMElement())

	// Layout Effects goes here and block browser paint
	// After running all layout effects at once, if changes are made, trigger re-render again before browser paint
	// using requestAnimationFrame

	// Run effects and cleanup effects of unmounted components
	// 1: if no changes are made in layout effects: run after browser painted to the screen
	// 2: if changes are made in layout effects: run before browser paint
	runningEffects(rootFiber)

	console.log(rootFiber)
}


export function render(component: FunctionalComponent, element: HTMLElement) {
	rootElement = element;

	rootFiber = createFiber(() => html`<${component}/>`)
	rootFiber.isRoot = true

	rerender()
}

export function useState<T = any>(initialValue: T): [T, (newValue: T) => void] {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = currentFiber.stateIndex++ // this change overtime too

	thisFiber.state[thisIndex] ??= initialValue

	function setState(newState: T) {

		if (!batchUpdate.length) setTimeout(rerender, 0)

		batchUpdate.push(function() {
			if (typeof newState === 'function') {
				newState = newState(thisFiber.state[thisIndex])
			}

			if (thisFiber.state[thisIndex] !== newState) {
				thisFiber.state[thisIndex] = newState
				thisFiber.isDirty = true
			}
		})
	}

	return [thisFiber.state[thisIndex], setState]
}

export function useEffect(callback: () => () => {}, deps: any[]) {
	const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
	const thisIndex = currentFiber.effectIndex++ // this change overtime too

	let run = false;

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
		}
	}
}
