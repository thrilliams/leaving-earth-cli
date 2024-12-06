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
		choices: [{ title: "mercury mini-expansion", value: "mercury" }],
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
				title: "easy (5 easy missions)",
				value: "easy",
			},
			{
				title: "normal (4 easy and 2 medium missions)",
				value: "normal",
			},
			{
				title: "hard (3 easy, 3 medium, and 2 hard missions)",
				value: "hard",
			},
			{
				title: "very hard (1 easy, 4 medium, and 4 hard missions)",
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

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "research_advancement",
// 	advancementID: "atlas_rockets",
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "research_advancement",
// 	advancementID: "ion_thrusters",
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "buy_component",
// 	componentDefinitionID: "atlas_rocket",
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "end_turn",
// 	pass: true,
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "buy_component",
// 	componentDefinitionID: "atlas_rocket",
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "buy_component",
// 	componentDefinitionID: "ion_thruster",
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "assemble_spacecraft",
// 	componentIDs: [1, 2, 3],
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "perform_maneuver",
// 	maneuverID: "earth_to_suborbital_flight",
// 	spacecraftID: 4,
// 	durationModifier: 0,
// 	rocketIDs: [1],
// });

// reduceChoice(game, {
// 	type: "discard_outcome",
// 	discard: true,
// });

// reduceChoice(game, {
// 	type: "continue_maneuver",
// 	proceed: true,
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "perform_maneuver",
// 	maneuverID: "suborbital_flight_to_earth_orbit",
// 	spacecraftID: 4,
// 	durationModifier: 0,
// 	rocketIDs: [2],
// });

// reduceChoice(game, {
// 	type: "discard_outcome",
// 	discard: false,
// });

// reduceChoice(game, {
// 	type: "continue_maneuver",
// 	proceed: true,
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "perform_maneuver",
// 	maneuverID: "earth_orbit_to_inner_transfer",
// 	spacecraftID: 4,
// 	durationModifier: 0,
// 	rocketIDs: [3],
// });

// reduceChoice(game, {
// 	type: "discard_outcome",
// 	discard: false,
// });

// reduceChoice(game, {
// 	type: "continue_maneuver",
// 	proceed: true,
// });

// reduceChoice(game, {
// 	type: "take_action",
// 	action: "end_turn",
// 	pass: true,
// });

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