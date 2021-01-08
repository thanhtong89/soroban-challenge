import React from 'react';
import { format } from 'react-string-format';
import './App.css';
import UIfx from 'uifx';
import beep from "./blip.wav";
import Speech from 'speak-tts';
import { Textfit } from 'react-textfit';

class NumberDisplay extends React.Component {
    render() {
        return (
			<Textfit className="number-display" mode="single" max={400}>
				{this.props.value}
			</Textfit>
        )
    }
}

function Leaderboard(props) {
	return  (
		<div className="scoreTable" style={props.scores !== null && props.scores.length > 0 ? {} : {display: "none"}}>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Score</th>
						<th>Attempts</th>
					</tr>
				</thead>
				<tbody>
				{
					props.scores.map(scoreEntry => {
						const {name, score, attempts} = scoreEntry;
						return (
							<tr>
								<td>{name}</td>
								<td>{score}</td>
								<td>{attempts}</td>
							</tr>
						)
					})
				}
				</tbody>
				<tfoot>
					<tr>
						<th colSpan="3">{props.tableName}</th>
					</tr>
				</tfoot>
			</table>
		</div>
	)
}

// displays both previous month's scoreboard and current scoreboard.
function Scoreboard(props) {
	return (
 		<div id="scoreboard" style={props.style} vertical layout>
			<div>
				<label className="player-name"> Enter your name here:
					<input className="player-name" type="text" value={props.playerName} disabled={props.disableValue} onChange={props.handleChangePlayerName}/>
				</label>
			</div>
			<div id="leaderboards">
				<Leaderboard
					scores={props.prevTopScores}
					tableName="last month's top 10"
				/>
				<Leaderboard
					scores={props.currTopScores}
					tableName="current month's top 10"
				/>
			</div>
			<div>
				<label> Next scoreboard reset : {props.resetDate.toUTCString()}
				</label>
			</div>
		</div>
 	)
}

function GameMode(props) {
	return (
		<div className="settings">Game mode:
			<label>
				<input type="radio" value="practice" checked={props.gameMode === "practice"} onChange={props.handleChangeModeOption}/>
				practice
			</label>
			<label>
				<input type="radio" value="tournament" checked={props.gameMode === "tournament"} onChange={props.handleChangeModeOption}/>
				tournament
			</label>
		</div>
	)
}

function Settings(props) {
	return (
	<div className="settings">
			<label>Number count:
				<select name="numCount" value={props.numCount} onChange={props.handleChangeNumCount}>
					{props.numCountOptions}
				</select>
			</label>
			<label>Number of digits:
				<select name="numDigits" value={props.numDigits} onChange={props.handleChangeNumDigits}>
					{props.numDigitsOptions}
				</select>
			</label>
			<label>Total time (secs):
				<select name="total_secs" value={props.total_ms/1000} onChange={props.handleChangeTotalSecs}>
					{props.timeSecsOptions}
				</select>
			</label>
			<div className="sound-options">Sound option:
				<label>
					<input type="radio" value="beep" checked={props.soundOption === "beep"} onChange={props.handleChangeSoundOption}/>
					beep
				</label>
				<label>
					<input type="radio" value="speech" disabled={props.speech === null} checked={props.soundOption === "speech"} onChange={props.handleChangeSoundOption}/>
					speech
				</label>
			</div>
			<label>Speech rate:
					<select name="speechRate" value={props.speechRate} onChange={props.handleChangeSpeechRate}>
					{props.speechRateOptions}
					</select>
			</label>
			<label>Speech voice:
					<select name="speechVoice" value={props.speechVoiceIndex} onChange={props.handleChangeSpeechVoice}>
					{props.speechVoiceOptions}
					</select>
			</label>

	 </div>
	)
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
			speechVoiceIndex : 0,

            mode : "practice", // PRACTICE | TOURNAMENT
            //tournament-only variables
            round : 0,
            score : 0,
            scorePerRound : 5, // calculated dynamically from other factors
			prevTopScores : [{name:"snk", score: 1, attempts: 1}], // tracked by the server
			topScores : [{name: "moo", score: 2, attempts: 2}], // tracked by the server, returned when submitting new scores
			playerName: "groot",
			resetDate : new Date(), // time at which the scoreboard will reset
        };
        this.roundMax = 3;
        this.handleButton = this.handleButton.bind(this);
		this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleChangeNumCount = this.handleChangeNumCount.bind(this);
        this.handleChangeNumDigits = this.handleChangeNumDigits.bind(this);
        this.handleChangeTotalSecs = this.handleChangeTotalSecs.bind(this);
        this.handleChangeSoundOption = this.handleChangeSoundOption.bind(this);
        this.handleChangeSpeechRate = this.handleChangeSpeechRate.bind(this);
        this.handleChangeSpeechVoice = this.handleChangeSpeechVoice.bind(this);
        this.handleChangeModeOption = this.handleChangeModeOption.bind(this);
		this.handleChangePlayerName = this.handleChangePlayerName.bind(this);

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
		} catch(error) { console.log("Got error initializing speech: ", error); }
		this.availableVoices = [];
    }
    saveCurrentSettings() {
        localStorage.setItem("numcount", this.state.numCount);
        localStorage.setItem("numdigits", this.state.numDigits);
        localStorage.setItem("total_ms", this.state.total_ms);
        localStorage.setItem("soundOption", this.state.soundOption);
        localStorage.setItem("speechRate", this.state.speechRate);
        localStorage.setItem("speechVoiceIndex", this.state.speechVoiceIndex);
        localStorage.setItem("mode", this.state.mode);
        localStorage.setItem("playerName", this.state.playerName);
    }
    loadSavedSettings() {
        this.setState({
            numCount: localStorage.getItem("numcount") || 5,
            numDigits : localStorage.getItem("numdigits") || 1,
            total_ms: localStorage.getItem("total_ms") || 10000,
            soundOption: localStorage.getItem("soundOption") || "beep",
            speechRate: localStorage.getItem("speechRate") || 1,
            speechVoiceIndex: localStorage.getItem("speechVoiceIndex") || 0,
            mode : localStorage.getItem("mode") || "practice",
            playerName : localStorage.getItem("playerName") || "groot",
        }, this.updateScorePerRound);
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
		document.addEventListener("keydown", this.handleKeyPress, false);
		this.getTopScores().then(latestScores => this.updateTopScores(latestScores, "current"));
		this.getPrevTopScores().then(latestScores => this.updateTopScores(latestScores, "prev"));
		this.getResetDate().then(resp => this.setState({resetDate: new Date(resp.nextResetDate)}));
    }
	componentWillUnmount() {
		document.removeEventListener("keydown", this.handleKeyPress, false);
	}

    transition(epoch) {
        var newState = null;
        console.log(`Transitioning from state ${this.state.state} at epoch ${epoch}`);
        switch (this.state.state) {
            case 'READY':
                if (this.state.mode === "practice") {
                    newState = "PLAYING";
                } else {
                    newState = "PLAYING_TOURNAMENT";
                }
            break;
            case 'PLAYING':
                newState = "READY";
            break;
            case 'PLAYING_TOURNAMENT':
                newState = "READY";
            break;
            default:
                console.log(`INVALID state! ${this.state.state}`);
                return;
        }
        this.setState({
            state : newState,
            epoch : epoch,
        });
        console.log(`State being set to ${newState}`);
        this.handleState(newState, epoch);

    }

    async handleState(state, epoch) {
        console.log(`Handle State ${state} at epoch ${epoch}`);
        switch (state) {
            case 'READY':
            break;
            case 'PLAYING':
                this.setState({
                    answer : "",
                });

                // generates new problem and start flashing
                const numbers = this.getRandomNumbers(this.state.numCount, this.state.numDigits);
                await this.startFlash(this.state.total_ms, numbers, epoch);
                if (this.state.state === "PLAYING" && epoch === this.state.epoch) {
                    this.displayResult(numbers);
                    this.transition(epoch);
                }
                break;
            case 'PLAYING_TOURNAMENT':
                this.setState({
                    round : 0,
                    score : 0,
                });
                var score = 0;
                for (var i = 1; i <= this.roundMax; i++) {
                    console.log(`Round ${i}`);
                    epoch = Date.now();
                    const numbers = this.getRandomNumbers(this.state.numCount, this.state.numDigits);
                    await this.startFlash(this.state.total_ms, numbers, epoch);
                    if (epoch < this.state.epoch) {
                        return;
                    }
                    const answer = this.promptAnswer();
                    const sum = this.getSum(numbers);
                    if (answer === sum) {
                        alert("You got it!");
                        score = score + this.state.scorePerRound;
                    } else {
                        const equation = format("{0} = {1}", numbers.join(" + "), sum);
                        alert(`Sorry -- the correct answer is: ${equation}`);
                    }
                    this.setState({
                        round: i,
                        score: score,
                    });
                }
                if (epoch >= this.state.epoch) {
                    console.log("Done with tournament run! Transitioning back");
                    const scoreData = await this.submitScore(score);
					console.log("Current top scores: ", scoreData);
					this.updateTopScores(scoreData, "current");
                    this.transition(epoch);
                }
                break;

            default:
                console.log(`Handling invalid state ${this.state.state}`);
                break;
        };
    }

	async getResetDate() {
		const requestOptions = {
			method: 'GET',
		};
		var response = await fetch('https://soroban.tongpham.com/api/reset-date', requestOptions);
		return response.json();
	}

	async getTopScores() {
		const requestOptions = {
			method: 'GET',
		};
		var response = await fetch('https://soroban.tongpham.com/api/scores', requestOptions);
		return response.json();
	}

	async getPrevTopScores() {
		const requestOptions = {
			method: 'GET',
		};
		var response = await fetch('https://soroban.tongpham.com/api/scores/prev', requestOptions);
		return response.json();
	}


	updateTopScores(scoreData, whichScore) {
		// convert dict into list and sort descending
		var scoreList = [];
		Object.keys(scoreData.top_scores).forEach(name => {
			scoreList.push({name: name, score: scoreData.top_scores[name].score, attempts: scoreData.top_scores[name].attempts});
		});
		scoreList.sort((a,b) => b.score - a.score);
		console.log(`Setting ${whichScore} topScores = `, scoreList);
		if (whichScore === "current") {
			this.setState({
				topScores: scoreList,
			});
		}
		else {
			this.setState({
				prevTopScores: scoreList,
			});
		}

	}

    async submitScore(score) {
        alert(`Your score for this tournament run is ${score}!`);
		const requestOptions = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({name: this.state.playerName, score: score}),
		};
		var response = await fetch('https://soroban.tongpham.com/api/scores', requestOptions);
		return response.json();
    }

    updateScorePerRound() {
        // depending on how hard the current settings are we award the appropriate amount of points
        const numCountFactor = Math.pow(this.state.numCount, 3)
        const numDigitsFactor = Math.pow(this.state.numDigits, 2.3)
        const timeFactor = 1000 / this.state.total_ms;
        console.log(numCountFactor, numDigitsFactor, timeFactor);
        this.setState({
            scorePerRound: Math.ceil(numCountFactor * numDigitsFactor * timeFactor),
        });
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
        if (voice !== undefined) {
            this.speech.setLanguage(voice.lang);
            this.speech.setVoice(voice.name);
        }
        for (var number of numbers) {
            this.setState({currDisplay : number});
			if (this.state.soundOption === "beep") {
				this.beepSound.play();
			} else {
				//TODO: figure out correct speech rate to be able to fit into the alloted time per number
                if (this.speech !== null) {
                    this.speech
                        .speak({text: number.toString()})
                        .then(data => {
                            console.log("Got data ", data);
                        }).catch(e => {
                            console.log("Got error", e);
                        });
                }
			}
            setTimeout(() => {this.setState({currDisplay: ""});}, displayTime);
            await this.sleep(timePerNumber);
			// stop this run if we noticed that a new game has started
            if (epoch < this.state.epoch) {
                // user canceled current game -- abort flashing!
                console.log("breaking...");
                break;
            }
        }
        console.log("Done!");
    }

    promptAnswer() {
        var answer;
        while (true) {
            answer = Number(prompt("What is the answer?"));
            if (!isNaN(answer)) {
                break;
            }
        }
        return answer;
    }

    displayResult(numbers) {
        // displays full number list and final result
        const answer = format("{0} = {1}", numbers.join(" + "), this.getSum(numbers));
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
	handleKeyPress(event) {
		if (event.code === "Space" && document.activeElement !== document.getElementById("main-button")) {
			this.handleButton();
		}
	}
    handleButton() {
			// cannot proceed until playerName is filled
			if (this.state.playerName.length === 0) {
				alert("Please provide your player name");
				return;
			}
            this.saveCurrentSettings()
            const epoch = Date.now();
            this.transition(epoch);
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
        }, this.updateScorePerRound);
    }
    handleChangeNumDigits(event) {
        this.setState({
            numDigits: event.target.value,
        }, this.updateScorePerRound);
    }
    handleChangeTotalSecs(event) {
        this.setState({
            total_ms: event.target.value*1000,
        }, this.updateScorePerRound);
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
    handleChangeModeOption(event) {
        this.setState({
            mode : event.target.value,
        });
    }

	handleChangePlayerName(event) {
		this.setState({
			playerName: event.target.value,
		})
	}
 render() {
        const answer = this.state.answer;
        let buttonTitle = "PLAY!";
        if (this.state.state !== "READY") {
            buttonTitle = "STOP";
		}

        let numCountOptions = [];
        for (var i = 3; i < 21; i++) {
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
		const renderSettings = () => {
		return (<Settings
			numCount={this.state.numCount}
			handleChangeNumCount={this.handleChangeNumCount}
			numCountOptions={numCountOptions}
			numDigits={this.state.numDigits}
			handleChangeNumDigits={this.handleChangeNumDigits}
			numDigitsOptions={numDigitsOptions}
			total_ms={this.state.total_ms}
			handleChangeTotalSecs={this.handleChangeTotalSecs}
			timeSecsOptions={timeSecsOptions}
			soundOption={this.state.soundOption}
			handleChangeSoundOption={this.handleChangeSoundOption}
			speechRate={this.state.speechRate}
			handleChangeSpeechRate={this.handleChangeSpeechRate}
			speechRateOptions={speechRateOptions}
			speechVoiceIndex={this.state.speechVoiceIndex}
			handleChangeSpeechVoice={this.handleChangeSpeechVoice}
			speechVoiceOptions={speechVoiceOptions}
		/>);
		}
        var modeDisplay = "Set up your practice with the options above, then click the Start button or press Spacebar to begin.";
		var scoreboardStyle = {display: "none"};
        if (this.state.mode === "tournament") {
            modeDisplay = `Tournament: Round ${this.state.round} / ${this.roundMax}. Score: ${this.state.score}`;
			scoreboardStyle = {};
        }
		const scorePerRoundDisplay = `Score per round for current settings: ${this.state.scorePerRound}`;
     return (
            <div>
                <h1>The Soroban Challenge!</h1>
				<GameMode
					gameMode={this.state.mode}
					handleChangeModeOption={this.handleChangeModeOption}
				/>
				<Scoreboard
					style={scoreboardStyle}
					prevTopScores={this.state.prevTopScores}
					currTopScores={this.state.topScores}
					playerName={this.state.playerName}
					handleChangePlayerName={this.handleChangePlayerName}
					disableValue={this.state.state === "READY" ? "" : "disabled"}
					resetDate={this.state.resetDate}
				/>
				{renderSettings()}
				<h3>{scorePerRoundDisplay}</h3>
				<h3>{modeDisplay}</h3>
                <div id="main-area">
					<div>
						<button id="main-button" className="main-button" disabled={this.state.state === "STOPPING"} onClick={this.handleButton}>{buttonTitle}</button>
					</div>
					<NumberDisplay value={this.state.currDisplay}/>
					<div className="answer">{answer}</div>
				</div>
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
