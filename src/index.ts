import { createInitialGameState, reduceChoice } from "leaving-earth";
import { promptForDecision } from "./promptForDecision";
import { stringifyLogObject } from "./stringifyLogObject";
import prompts from "prompts";
import {
	easySetup,
	hardSetup,
	normalSetup,
	veryHardSetup,
} from "leaving-earth/helpers";

const { expansions, allMissions, missionSetup } = await prompts([
	{
		type: "multiselect",
		name: "expansions",
		message: "select expansions",
		choices: [
			{ title: "mercury mini-expansion", value: "mercury" },
			{ title: "outer planets", value: "outer_planets" },
		],
		instructions: false,
	},
	{
		type: "confirm",
		name: "allMissions",
		message: "play with all available missions?",
		initial: false,
	},
	{
		type: (prev) => (prev ? null : "select"),
		name: "missionSetup",
		message: "select a difficulty preset",
		choices: [
			{
				title: "easy (5 easy missions, 3 non-explorable)",
				value: "easy",
			},
			{
				title: "normal (4 easy and 2 medium missions, 4 non-explorable)",
				value: "normal",
			},
			{
				title: "hard (3 easy, 3 medium, and 2 hard missions, 5 non-explorable)",
				value: "hard",
			},
			{
				title: "very hard (1 easy, 4 medium, and 4 hard missions, 6 non-explorable)",
				value: "veryHard",
			},
		],
	},
]);

const game = createInitialGameState({
	expansions,
	missionSetup: allMissions
		? "all"
		: missionSetup === "easy"
		? easySetup
		: missionSetup === "normal"
		? normalSetup
		: missionSetup === "hard"
		? hardSetup
		: veryHardSetup,
});

console.dir(game.state.model, { depth: null });

let lastLogLength = 0;
while (game.state.decision.type !== "none") {
	if (game.state.log.length > lastLogLength) {
		for (const logObject of game.state.log.slice(lastLogLength))
			console.log(stringifyLogObject(game, logObject));
		lastLogLength = game.state.log.length;
	}

	const choice = await promptForDecision(
		game.state.model,
		game.state.decision
	);

	reduceChoice(game, choice);
}
