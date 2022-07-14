import {useEffect, useState, html, render} from "./src/index.mjs";

function Test2() {
    return html`<div>Test2</div>`
}

function Test(props) {
    const [count, setCount] = useState(props.count);

    function increaseCount() {
        setCount(count => {
            return count+1
        })
    }

    useEffect(() => {
        console.log('Inner count updated', count)
    }, [count])

    useEffect(() => {
        setCount(props.count)
    }, [props.count])

    useEffect(() =>{
        const id = setInterval(function log() {
            // console.log(`Inner count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
            ${props.text}<br/>
            <a>${count}</a><br/>
            <button onclick=${increaseCount}>Increase inner</button><br/>
            <${Test2}/>
        </div>
    `
}

function App() {
    const [count, setCount] = useState(100);
    const [count2, setCount2] = useState(100);

    function increaseCount() {
        setCount(count => {
            return count+100
        })
    }

    function increaseCount2() {
        setCount2(count => {
            return count+100
        })
    }

    useEffect(() => {
        console.log('Outer count updated', count)
    }, [count])

    useEffect(() =>{
        const id = setInterval(function log() {
            console.log(`Outer count is: ${count}`);
        }, 2000);
        return function() {
            clearInterval(id);
        }
    }, [count]);

    return html`
        <div>
            <a>${count}</a><br/>
            <a>${count2}</a><br/>
            <button onclick=${increaseCount}>Increase outer</button><br/>
            <button onclick=${increaseCount2}>Increase outer 2</button><br/>
            <${Test} count=${count} text="Test component 1"/>
            <${Test} count=${count} text="Test component 2"/>
        </div>
    `
}

render(App, document.getElementById("root"))
