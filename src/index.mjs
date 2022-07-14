import htm from '../node_modules/htm/dist/htm.mjs';

let rootElement, rootFiber, currentFiber;

function Fiber({component, child, state, props}) {
    this.symbol = Symbol(component.name)
    this.component = component
    this.props = props
    this.child = child || []
    this.childIndex = 0
    this.isDirty = true
    this.state = []
    this.stateIndex = 0
    this.effects = []
    this.effectIndex = 0
}

function h(type, props, ...child) {
    this[0] = 3 // Disable caching

    if (typeof type === 'function') { // if it's a custom component
        // TODO: Compare old fiber with new fiber (compare prop, type,...)
        let thisFiber = currentFiber.child[currentFiber.childIndex] ?? new Fiber({ component: type })

        const lastParentFiber = currentFiber // Saved for later

        currentFiber.child[currentFiber.childIndex++] = thisFiber
        currentFiber = thisFiber
        const r = type({...props, child}) // process child of thisFiber

        currentFiber = lastParentFiber // Restore parent fiber to process siblings of thisFiber
        return r
    }
    return {
        toDOMElement: function() {

            const element = document.createElement(type) // create element of type 'type'

            for (let key in props) {
                if (typeof props[key] !== "function") {
                    element.setAttribute(key, props[key]) // add attributes to element
                } else {
                    element.addEventListener(key.slice(2), props[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
                }
            }

            child.forEach(child => {
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

function resetFiberIndexes(fiber) {
    fiber.childIndex = 0
    fiber.stateIndex = 0
    fiber.effectIndex = 0

    fiber.child.forEach(child => resetFiberIndexes(child))
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
    if (component) rootFiber ??= new Fiber({component})

    currentFiber = rootFiber;
    resetFiberIndexes(rootFiber)

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
        if (typeof newState === 'function') {
            newState = newState(thisFiber.state[thisIndex])
        }

        if (thisFiber.state[thisIndex] !== newState) {
            thisFiber.state[thisIndex] = newState
            thisFiber.isDirty = true
            render()
        }
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
