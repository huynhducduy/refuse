import htm from '../node_modules/htm/dist/htm.mjs';

let rootElement, rootFiber, currentFiber;
let batchUpdate = []

function Fiber({component}, isRoot) {
    this.isRoot = isRoot
    this.symbol = Symbol(component.name)
    this.component = component
    this.props = {}
    this.child = []
    this.childIndex = 0
    this.isDirty = true
    this.state = []
    this.stateIndex = 0
    this.effects = []
    this.effectIndex = 0
    this.htmProps = {}
    this.htmChild = []
}

function h(type, htmProps, ...htmChild) {
    if (this?.[0]) this[0] = 3 // Disable caching

    if (typeof type === 'function') { // if it's a custom component
        const parentFiber = currentFiber // Saved for later use

        if (!currentFiber.child[currentFiber.childIndex]) { // Initialize the child If the child is not initialized
            currentFiber.child[currentFiber.childIndex] ??= new Fiber({
                component: type
            })
        }

        const thisFiber = currentFiber.child[currentFiber.childIndex++]
        // Update the attributes of the fiber
        thisFiber.props = {...htmProps, child: htmChild}
        thisFiber.htmProps = htmProps
        thisFiber.htmChild = htmChild

        currentFiber = thisFiber // make it the parent of it's child

        if (!parentFiber.isRoot && parentFiber.isDirty)
            thisFiber.isDirty = true

        let result;
        console.log('checking', thisFiber.symbol)
        if (thisFiber.isDirty) {
            console.log('result: dirty')
            result = type(thisFiber.props) // process child of thisFiber
            thisFiber.isDirty = false
        } else {
            console.log('result: not dirty')
            console.log('starting process child')
            result = type(thisFiber.props) // process child of thisFiber
            // TODO: find method to process child without running it again
        }
        currentFiber = parentFiber // Restore parent fiber to process siblings of thisFiber
        return result
    }
    return {
        type,
        htmProps,
        htmChild,
        toDOMElement: () => {
            const element = document.createElement(type) // create element of type 'type'

            for (let key in htmProps) {
                if (typeof htmProps[key] !== "function") {
                    element.setAttribute(key, htmProps[key]) // add attributes to element
                } else {
                    element.addEventListener(key.slice(2), htmProps[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
                }
            }

            htmChild.forEach(child => {
                if (typeof child !== "object") {
                    element.innerHTML += child // add text to element
                } else {
                    element.appendChild(child.toDOMElement()) // add child element to element
                }
            })

            return element
        }
    }
}

export const html = htm.bind(h)

function resetFiber(fiber) {
    fiber.childIndex = 0
    fiber.stateIndex = 0
    fiber.effectIndex = 0

    fiber.child.forEach(child => resetFiber(child, fiber.isDirty))
}
function runningEffects(fiber) {
    fiber.child.forEach(child => runningEffects(child))

    for (let i = 0; i < fiber.effects.length; i++) {
        if (fiber.effects[i].run) {
            fiber.effects[i].cleanup?.()
            fiber.effects[i].cleanup = fiber.effects[i].callback()
            fiber.effects[i].run = false
        }
    }
}

export function render(component, element) {
    if (element) rootElement ??= element;
    if (component) rootFiber ??= new Fiber({
        component: () => html`<${component}/>`,
    }, true)

    while (batchUpdate.length) {
        batchUpdate.pop()()
    }

    console.log('@@@ render')

    currentFiber = rootFiber;
    resetFiber(rootFiber)

    // requestAnimationFrame(() => {
    rootElement.innerHTML = ''
    rootElement.appendChild(rootFiber.component().toDOMElement())

    runningEffects(rootFiber)
    // });
}

export function useState(initialValue) {
    const thisFiber = currentFiber // because currentFiber change overtime, we must preserve it inside useState
    const thisIndex = currentFiber.stateIndex++ // this change overtime too

    thisFiber.state[thisIndex] ??= initialValue

    function setState(newState) {
        if (!batchUpdate.length) setTimeout(render, 0)

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

export function useEffect(callback, deps) {
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
        thisFiber.effects[thisIndex] ??= {}
        thisFiber.effects[thisIndex].deps = deps
        thisFiber.effects[thisIndex].callback = callback
        thisFiber.effects[thisIndex].run = true
    }
}
