import {Fragment, memo, useMemo, useCallback, useEffect, useState, useLayoutEffect, html, render, useRef} from "./src/index.mjs";

const Test2 = memo(function Test2() {

	console.log('Test2 called')

	return html`
		<div>Test2 (static component) ${Math.random()}</div>
	`
})

interface TestProps {
	count: number
	text: string
	children: string[]
}

function Test(props: TestProps) {

	console.log('Test called with props:', props)

	if (!props.children[0]) props.children[0] = 'Default children'

	const [count, setCount] = useState(props.count);

	const someNumber = useMemo(() => {
		console.log('recalculating someNumber')
		return props.count+9
	}, [props.count])

	const someFunction = useCallback(() => {
		console.log('someFunction changed', props.count)
	}, [props.count])

	const neverChange = useRef(Math.random())

	useEffect(() => {
		someFunction()
	}, [someFunction])

	function increaseCount() {
		setCount(count => {
			return count+1
		})
	}

	useLayoutEffect(() => {
		setCount(999);
		console.log('This is layout effect')
	}, [])

	useEffect(() => {
		console.log('Inner count updated', count)
		return () => {
			console.log('Inner count cleanup', count)
		}
	}, [count])

	// useEffect(() => { // Sync props.count to inner state
	//     setCount(props.count)
	// 	console.log('Inner count updated from props', props.count)
	// }, [props.count])

	// useEffect(() =>{
	//     const id = setInterval(function log() {
	//         console.log(`Inner count is: ${count}`);
	//     }, 2000);
	//     return function() {
	//         clearInterval(id);
	//     }
	// }, [count]);

	return html`
		<div style="border: 5px solid red">
			<div>${props.text}</div>
			<div>${count}</div>
			<div>${someNumber}</div>
			<div>${props.children}</div>
			<div>Will never change: ${neverChange.current}</div>
			<button onclick=${increaseCount}>+ inner</button>
			<${Test2}/>
		</div>
	`
}

function App() {

	console.log('App called')

	const [count, setCount] = useState(100);
	const [count2, setCount2] = useState(100);

	function increaseCount() {
		setCount(count => {
			return count+100
		})
	}

	function decreaseCount() {
		setCount(count => {
			return count-100
		})
	}

	function increaseCount2() {
		setCount2(count => {
			return count+100
		})
	}

	function increaseCount3() {
		setCount(count => {
			return count+50
		})
		setCount(count => {
			return count+50
		})
		setCount2(count => {
			return count+100
		})
	}

	useEffect(() => {
		console.log('Outer count updated', count)
		return () => {
			console.log('Outer count cleanup', count)
		}
	}, [count])

	// useEffect(() =>{
	//     const id = setInterval(function log() {
	//         console.log(`Outer count is: ${count}`);
	//     }, 2000);
	//     return function() {
	//         clearInterval(id);
	//     }
	// }, [count]);

	return html`
		<div style="border: 5px solid blue">
			<${Test} count=${count} text="Test component 1 (outer as prop)">
				Test component 1 children 1 ${count}
			</${Test}>
			<div>Outer: ${count}</div>
			${[1,2,3].map(i => html`<div>Map ${i}</div>`)}
			<div>Outer 2: ${count2}</div>
			<${Fragment}>
				<button onclick=${increaseCount}>+ outer</button>
				<button onclick=${decreaseCount}>- outer</button>
				<button onclick=${increaseCount2}>+ outer 2</button>
				<button onclick=${increaseCount3}>+ both outer</button>
			</${Fragment}>
			<${Fragment}>
				Single-line text
			</${Fragment}>
			<${count > 300 && Test} count=${count2} text="Test component 2 (outer2 as prop)"/>
		</div>
	`
}

render(App, document.getElementById("root"))
