import React from 'react';
import { format } from 'react-string-format';
import './App.css';
import beep from "./beep.mp3";

class NumberDisplay extends React.Component {
    render() {
        return (
            <div>
            <p className="number-display">{this.props.value}</p>
            </div>
        )
    }
}

class SorobanGame extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            numCount: 10,
            numDigits: 2,
            numbers : null,
            total_ms: 10000,
            currDisplay: "",
			answer : "",
            // READY -> PLAYING -> ANSWER -> READY. Transition via spacebar.
            state : "READY",
        };
		this.handleButton = this.handleButton.bind(this);
		this.handleChangeNumCount = this.handleChangeNumCount.bind(this);
		this.handleChangeNumDigits = this.handleChangeNumDigits.bind(this);
		this.handleChangeTotalSecs = this.handleChangeTotalSecs.bind(this);
		this.beepSound = new Audio(beep);
    }
    advanceState() {
		switch (this.state.state) {
			case 'READY':
				console.log(`Advancing from READY state... numCount=${this.state.numCount}`);
				// generates new problem and start flashing
				const numbers = this.getRandomNumbers(this.state.numCount, this.state.numDigits);
				this.setState({
					state : 'PLAYING',
					numbers : numbers,
					answer : "",
				});
				this.startFlash(this.state.total_ms, numbers);
				break;
			case 'PLAYING':
				console.log("Advancing from PLAYING state...");
				// stops flashing, show full sequence + answer at bottom
				this.setState({state : 'READY'});
                this.displayResult();	
				break;
            default:
                break;

		}
    }

	sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}

	async startFlash(total_ms, numbers) {
		console.log(`Starting Flashing with delay ${total_ms} and numbers ${numbers}`);
		const timePerNumber = total_ms / numbers.length;
		const displayTime = timePerNumber * 0.9
		for (var number of numbers) {
			this.setState({currDisplay : number});
			this.beepSound.play();
			setTimeout(() => {this.setState({currDisplay: ""});}, displayTime);
			await this.sleep(timePerNumber);
			if (this.state.state !== "PLAYING") {
				// user canceled current game -- abort flashing!
				console.log("breaking...");
				return;
			}
		}
		console.log("Done!");
        if (this.state.state === "PLAYING") {
            this.advanceState();
        }
	}

	displayResult() {
		// displays full number list and final result
		const answer = format("{0} = {1}", this.state.numbers.join(" + "), this.getSum(this.state.numbers));
		this.setState({
			answer:answer,
			currDisplay : "",
		});
	}

    handleButton() {
			this.advanceState();
    }
    
    getRandomInt(max) {
        return Math.floor(Math.random() * max)
    }

    getSum(numbers) {
        return numbers.reduce((sum, x) => sum + x)
    }

    getRandomNumbers(numCount, numDigits) {
        const maxIncr = 9 * Math.pow(10, numDigits-1)
        const minInt = Math.pow(10, numDigits-1)
        const numbers = [];
        for (var i = 0; i < numCount; i++) {
            const n = minInt + this.getRandomInt(maxIncr)
            numbers.push(n);
        }
        return numbers
    }

	handleChangeNumCount(event) {
		this.setState({
			numCount : event.target.value,
		});	
	}
	handleChangeNumDigits(event) {
		this.setState({
			numDigits: event.target.value,
		});
	}
   	handleChangeTotalSecs(event) {
		this.setState({
			total_ms: event.target.value*1000,
		});
	}
 render() {
		const answer = this.state.answer;
        let buttonTitle = "PLAY!";
        if (this.state.state === "PLAYING") {
            buttonTitle = "STOP";
        }
        return (
            <div>
				<h1>The Soroban Challenge!</h1>
				<label>
					Number count: {this.state.numCount}
					<input type="range" min="1" max="100" value={this.state.numCount} onChange={this.handleChangeNumCount}/>
				</label>
				<label>
					Number of Digits: {this.state.numDigits}
					<input type="range" min="1" max="10" value={this.state.numDigits} onChange={this.handleChangeNumDigits}/>
				</label>
				<label>
					Total time (in seconds): {this.state.total_ms/1000}
					<input type="range" min="1" max="30" value={this.state.total_ms / 1000} onChange={this.handleChangeTotalSecs}/>
				</label>
                <div>
                <button className="main-button" onClick={this.handleButton}>{buttonTitle}</button>
                </div>
				<NumberDisplay value={this.state.currDisplay}/>
				<div className="answer">{answer}</div>
            </div>
        );
    }
}

function App() {
  return (
    <div className="App">
      <SorobanGame />
    </div>
  );
}

export default App;
