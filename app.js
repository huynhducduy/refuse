import {createComponent, html, render} from "./src/index.mjs";

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
            // console.log(`Inner count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
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
            // console.log(`Outer count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
            <a href="/">${count}</a><br/>
            <button onclick=${increaseCount} ahihi="ahoho">Increase outer</button><br/>
            <${Test} count=${count} hihi="Test component 1">
                <span>children prop 1</span>
                <span>children prop 2</span>
            <//>
        </div>
    `
})

render(() => html`<${App}/>`, document.getElementById("root"))
