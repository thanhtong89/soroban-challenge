import React from 'react';
import { format } from 'react-string-format';
import './App.css';
import beep from "./beep.mp3";
import Speech from 'speak-tts';

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
            numCount: 5,
            numDigits: 1,
            total_ms: 10000,
            numbers : null,
            currDisplay: "",
            answer : "",
            // READY -> PLAYING -> ANSWER -> READY. Transition via spacebar.
            state : "READY",
			
			soundOption: "beep", // choose between "beep" and "tts"
			speechRate: 1,
        };
        this.handleButton = this.handleButton.bind(this);
        this.handleChangeNumCount = this.handleChangeNumCount.bind(this);
        this.handleChangeNumDigits = this.handleChangeNumDigits.bind(this);
        this.handleChangeTotalSecs = this.handleChangeTotalSecs.bind(this);
        this.handleChangeSoundOption = this.handleChangeSoundOption.bind(this);
        this.handleChangeSpeechRate = this.handleChangeSpeechRate.bind(this);
        this.beepSound = new Audio(beep);
		this.speech = new Speech()
    }
    saveCurrentSettings() {
        localStorage.setItem("numcount", this.state.numCount);
        localStorage.setItem("numdigits", this.state.numDigits);
        localStorage.setItem("total_ms", this.state.total_ms);
        localStorage.setItem("soundOption", this.state.soundOption);
        localStorage.setItem("speechRate", this.state.speechRate);
    }
    loadSavedSettings() {
        this.setState({
            numCount: localStorage.getItem("numcount") || 5,
            numDigits : localStorage.getItem("numdigits") || 1,
            total_ms: localStorage.getItem("total_ms") || 10000,
            soundOption: localStorage.getItem("soundOption") || "beep",
            speechRate: localStorage.getItem("speechRate") || 1,
        });
    }
    componentDidMount() {
		this.speech.init({
			'volume' : '1',
			'language' : 'en-GB',
		})
        this.loadSavedSettings();
    }
    advanceState() {
        switch (this.state.state) {
            case 'READY':
                console.log(`Advancing from READY state... numCount=${this.state.numCount}`);
                // saves to local storage our current settings
                this.saveCurrentSettings();
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
		this.speech.setRate(this.state.speechRate);
		this.speech.setVoice("Karen");
        for (var number of numbers) {
            this.setState({currDisplay : number});
			if (this.state.soundOption === "beep") {	
				this.beepSound.play();
			} else {
				//TODO: figure out correct speech rate to be able to fit into the alloted time per number
				this.speech
					.speak({text: number.toString()})
					.then(data => {
						console.log("Got data ", data);
					}).catch(e => {
						console.log("Got error", e);
					});
			}
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

	handleChangeSoundOption(event) {
		this.setState({
			soundOption : event.target.value,
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
	handleChangeSpeechRate(event) {
        this.setState({
            speechRate: event.target.value,
        });
	}
 render() {
        const answer = this.state.answer;
        let buttonTitle = "PLAY!";
        if (this.state.state === "PLAYING") {
            buttonTitle = "STOP";
        }

        let numCountOptions = [];
        for (var i = 1; i < 21; i++) {
            numCountOptions.push(<option key={i}>{i}</option>)
        }
        let numDigitsOptions = [];
        for (i = 1; i < 11; i++) {
            numDigitsOptions.push(<option key={i}>{i}</option>)
        }
        let timeSecsOptions = [];
        for (i = 1; i < 31; i++) {
            timeSecsOptions.push(<option key={i}>{i}</option>)
        }
		let speechRateOptions = [];
        for (i = 0; i < 9; i++) {
            speechRateOptions.push(<option key={1 + 0.25*i}>{1 + 0.25*i}</option>)
        }
        return (
            <div>
                <h1>The Soroban Challenge!</h1>
                <div className="settings">
                    <label>Number count:
                        <select name="numCount" value={this.state.numCount} onChange={this.handleChangeNumCount}>
                            {numCountOptions}
                        </select>
                    </label>
                    <label>Number of digits:
                        <select name="numDigits" value={this.state.numDigits} onChange={this.handleChangeNumDigits}>
                            {numDigitsOptions}
                        </select>
                    </label>
                    <label>Total time (secs):
                        <select name="total_secs" value={this.state.total_ms/1000} onChange={this.handleChangeTotalSecs}>
                            {timeSecsOptions}
                        </select>
                    </label>
					<div className="sound-options">Sound option:
						<label>
							<input type="radio" value="beep" checked={this.state.soundOption === "beep"} onChange={this.handleChangeSoundOption}/>
							beep
						</label>
						<label>
							<input type="radio" value="speech" checked={this.state.soundOption === "speech"} onChange={this.handleChangeSoundOption}/>
							speech
						</label>
					</div>
					<label>Speech rate:
							<select name="speechRate" value={this.state.speechRate} onChange={this.handleChangeSpeechRate}>
							{speechRateOptions}
							</select>
					</label>
                </div>
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
