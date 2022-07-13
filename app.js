import htm from '/node_modules/htm/dist/htm.mjs';

function h(type, props, ...children) {
    if (typeof type === 'function') { // if it's a custom component
        return type({...props, children})
    }
    return {
        type,
        props,
        children,
        toDOMElement: function() {

            const element = document.createElement(type) // create element of type 'type'

            for (let key in props) {
                if (typeof props[key] !== "function") {
                    element.setAttribute(key, props[key]) // add attributes to element
                } else {
                    element.addEventListener(key.slice(2), props[key]) // remove first 2 characters of attribute name (which is "on") to make it a valid event name then add it to the element
                }
            }

            children.forEach(child => {
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

const html = htm.bind(h)

function render(component, element) {
    // Inner state is stale somehow
    // const newElement = component().toDOMElement()
    // element.innerHTML = ''
    // element.appendChild(newElement)
    // Okay
    // console.log(component()) // Cmt this line and it renders twice
    // element.innerHTML = ''
    // element.appendChild(component().toDOMElement())
    // Solution
    requestAnimationFrame(() => {
        element.innerHTML = ''
        element.appendChild(component().toDOMElement())
    });
    // The problem cause because there are multiple render signal called, and they are nested, so that the first signal called is what really make the output
    // render 1 -> call render 2 (by .toDOMElement method) -> apply render 2 -> apply render 1 -> crash things
    // requestAnimationFrame make sure thing are rendered in the right order, but we need to implement batch update, defer effect as well
}


function createUseState(state, markDirty) {
    return function(stateName, initialValue) {
        state[stateName] ??= initialValue;

        function setState(newValue) {
            if (typeof newValue === 'function')
                newValue = newValue(state[stateName])
            if (state[stateName] !== newValue) {
                state[stateName] = newValue
                markDirty()
            }
        }

        return [
            state[stateName],
            setState
        ]
    }
}

function createUseEffect(effects) {
    return function(effectName, effect, effectCond) {
        if (!effects[effectName]) effects[effectName] = {}
        if (effects[effectName].cond !== JSON.stringify(effectCond)) {
            effects[effectName].cond = JSON.stringify(effectCond)
            effects[effectName].cleanup?.()
            effects[effectName].cleanup = effect()
        }
    }
}

function createComponent(render) {

    // Make the component as dirty in the component tree if there are some state change
    function markDirty() {
        // TODO: to be updated: reconciliation algorithm
        renderEverything()
    }

    const state = {}
    const effects = {}
    const useState = createUseState(state, markDirty)
    const useEffect = createUseEffect(effects)

    return function (props) {
        return render({useState, useEffect, props})
    }
}

const Test = createComponent(({useState, useEffect, props}) => {
    const [count, setCount] = useState('count', props.count);

    function increaseCount() {
        setCount(count => {
            return count+1
        })
    }

    useEffect('countUpdated', () => {
        console.log('Inner count updated', count)
    }, [count])

    useEffect('countPropUpdated', () => {
        setCount(props.count)
    }, [props.count])

    useEffect('testCount', () =>{
        const id = setInterval(function log() {
            console.log(`Inner count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
            Begin Test component ------ <br/>
            ${props.children[1]}<br/>
            Props: ${props.hihi}<br/>
            Outer: ${props.count}<br/>
            Inner: ${count}<br/>
            <button onclick=${increaseCount}>Increase inner</button><br/>
            ${props.children[0]}
        </div>
    `
})

const App = createComponent(({useState, useEffect}) => {

    const [count, setCount] = useState('count', 0);

    function increaseCount() {
        setCount(count => {
            return count+1
        })
    }

    useEffect('countUpdated', () => {
        console.log('Outer count updated', count)
    }, [count])

    useEffect('testCount', () =>{
        const id = setInterval(function log() {
            console.log(`Outer count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
            <a href="/">${count}</a><br/>
            <button onclick=${increaseCount} ahihi="ahoho">Increase outer</button><br/>
            <${Test} count=${count} hihi="hihi laksjdhfakl">
                <span>children prop 1</span>
                <span>children prop 2</span>
            <//>
        </div>
    `
})

function renderEverything() {
    render(App, document.getElementById("root"));
}

renderEverything()
