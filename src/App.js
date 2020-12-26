import React from 'react';
import { format } from 'react-string-format';
import './App.css';
import UIfx from 'uifx';
import beep from "./blip.wav";
import Speech from 'speak-tts';
import { Textfit } from 'react-textfit';

const inlineStyle = {
    height: 600,
};

class NumberDisplay extends React.Component {
    render() {
        return (
//            <div>
//            <p className="number-display">{this.props.value}</p>
//            </div>
			<Textfit className="number-display" mode="single" style={inlineStyle} max={500}>
				{this.props.value}
			</Textfit>
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
            // READY -> PLAYING -> STOPPING -> READY
            state : "READY",
			epoch: 0,

			soundOption: "beep", // choose between "beep" and "tts"
			speechRate: 1,
			speechVoiceIndex : "",
        };
        this.handleButton = this.handleButton.bind(this);
        this.handleChangeNumCount = this.handleChangeNumCount.bind(this);
        this.handleChangeNumDigits = this.handleChangeNumDigits.bind(this);
        this.handleChangeTotalSecs = this.handleChangeTotalSecs.bind(this);
        this.handleChangeSoundOption = this.handleChangeSoundOption.bind(this);
        this.handleChangeSpeechRate = this.handleChangeSpeechRate.bind(this);
        this.handleChangeSpeechVoice = this.handleChangeSpeechVoice.bind(this);
        this.beepSound = new UIfx (
			beep,
			{
				volume : 1,
				throttleMs: 20,
			}
		);
		this.speech = null;
		try {
			this.speech = new Speech()
		} catch(error) {
			console.log("Got error initializing speech: ", error);
		}
		this.availableVoices = [];
    }
    saveCurrentSettings() {
        localStorage.setItem("numcount", this.state.numCount);
        localStorage.setItem("numdigits", this.state.numDigits);
        localStorage.setItem("total_ms", this.state.total_ms);
        localStorage.setItem("soundOption", this.state.soundOption);
        localStorage.setItem("speechRate", this.state.speechRate);
        localStorage.setItem("speechVoiceIndex", this.state.speechVoiceIndex);
    }
    loadSavedSettings() {
        this.setState({
            numCount: localStorage.getItem("numcount") || 5,
            numDigits : localStorage.getItem("numdigits") || 1,
            total_ms: localStorage.getItem("total_ms") || 10000,
            soundOption: localStorage.getItem("soundOption") || "beep",
            speechRate: localStorage.getItem("speechRate") || 1,
            speechVoiceIndex: localStorage.getItem("speechVoiceIndex") || this.availableVoices[0].name,
        });
    }
    componentDidMount() {
		this.speech.init({
			'volume' : '1',
			'language' : 'en-GB',
		}).then(data => {
			data.voices.forEach( voice => {
				this.availableVoices.push(voice);
			});
			this.loadSavedSettings();
		});
    }
    async advanceState() {
		const epoch = Date.now();
		console.log("Epoch = ", epoch);
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
					epoch: epoch,
                });
                await this.startFlash(this.state.total_ms, numbers, epoch);
				// go forth back to READY state again
				if (this.state.state === "PLAYING" && epoch === this.state.epoch) {
					// this happens when user lets the displaying sequence finish on its own
					// so we automatically kick in the next state of the game.
					this.advanceState();
				}
                break;
            case 'PLAYING':
                console.log("Advancing from PLAYING state...");
                this.displayResult();
				this.setState({
					state: "READY",
					epoch: epoch,
				});
				console.log("BACK to ready");

                break;
            default:
                break;
        }
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startFlash(total_ms, numbers, epoch) {
		// grabs lock to indicate we're displaying the current problem
        console.log(`Starting Flashing with delay ${total_ms} and numbers ${numbers} at epoch ${epoch}`);
        const timePerNumber = total_ms / numbers.length;
        const displayTime = timePerNumber * 0.9;
		this.speech.setRate(this.state.speechRate);

		const voice = this.availableVoices[this.state.speechVoiceIndex];
		this.speech.setLanguage(voice.lang);
		this.speech.setVoice(voice.name);
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
			// stop this run if we noticed that a new game has started
			console.log(epoch, " vs ", this.state.epoch);
            if (epoch < this.state.epoch) {
                // user canceled current game -- abort flashing!
                console.log("breaking...");
                break;
            }
        }
        console.log("Done!");
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
	handleChangeSpeechVoice(event) {
        this.setState({
            speechVoiceIndex: event.target.value,
        });
	}
 render() {
        const answer = this.state.answer;
        let buttonTitle = "PLAY!";
        if (this.state.state === "PLAYING") {
            buttonTitle = "STOP";
        } else if (this.state.state === "STOPPING") {
			buttonTitle = "STOPPING...";
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
        for (i = 0; i < 17; i++) {
            speechRateOptions.push(<option key={1 + 0.25*i}>{1 + 0.25*i}</option>)
        }
   		let speechVoiceOptions = [];
		for (i = 0; i < this.availableVoices.length; i++) {
        	const voice = this.availableVoices[i];
            speechVoiceOptions.push(<option key={i} value={i}>{voice.name} ({voice.lang})</option>)
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
							<input type="radio" value="speech" disabled={this.speech === null} checked={this.state.soundOption === "speech"} onChange={this.handleChangeSoundOption}/>
							speech
						</label>
					</div>
					<label>Speech rate:
							<select name="speechRate" value={this.state.speechRate} onChange={this.handleChangeSpeechRate}>
							{speechRateOptions}
							</select>
					</label>
   					<label>Speech voice:
							<select name="speechVoice" value={this.state.speechVoiceIndex} onChange={this.handleChangeSpeechVoice}>
							{speechVoiceOptions}
							</select>
					</label>
             </div>
                <div>
                    <button className="main-button" disabled={this.state.state === "STOPPING"} onClick={this.handleButton}>{buttonTitle}</button>
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
