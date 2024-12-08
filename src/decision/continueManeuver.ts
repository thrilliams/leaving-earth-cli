import type { Immutable } from "leaving-earth";
import {
	getComponent,
	getComponentDefinition,
	getManeuver,
	getManeuverDuration,
	getSpacecraft,
	getSpacecraftMass,
	getTotalThrustOfRockets,
	modifyManeuverDifficultyAndDuration,
} from "leaving-earth/helpers";
import type {
	ContinueManeuverChoice,
	ContinueManeuverDecision,
	Model,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

export async function continueManeuver(
	model: Immutable<Model>,
	decision: Immutable<ContinueManeuverDecision>
): Promise<ContinueManeuverChoice> {
	const { proceed } = await prompts(
		{
			type: "confirm",
			name: "proceed",
			message: "proceed with maneuver?",
			initial: true,
		},
		{
			onCancel: () => true,
		}
	);

	if (proceed === undefined) return continueManeuver(model, decision);

	if (!proceed)
		return {
			type: "continue_maneuver",
			proceed,
		};

	return pickDurationModifier(model, decision);
}

async function pickDurationModifier(
	model: Immutable<Model>,
	decision: Immutable<ContinueManeuverDecision>
): Promise<ContinueManeuverChoice> {
	const maneuver = getManeuver(model, decision.maneuverID);
	const profile = maneuver.profiles[decision.profileIndex];
	const maneuverDuration = getManeuverDuration(
		model,
		decision.maneuverID,
		decision.profileIndex
	);

	let durationModifier: number | undefined = undefined;
	if (maneuverDuration !== undefined) {
		let { selectedDurationModifier } = await prompts({
			type: "number",
			name: "selectedDurationModifier",
			message: "select duration modifier (none)",
			initial: decision.durationModifier,
			onRender(this: any) {
				this.value =
					this.value === undefined
						? decision.durationModifier
						: this.value;

				const { duration, difficulty } =
					modifyManeuverDifficultyAndDuration(
						maneuverDuration || 0,
						profile.difficulty || 0,
						this.value
					);

				this.msg = `select duration modifier (Y${duration} D${difficulty})`;
			},
		});

		if (selectedDurationModifier === undefined)
			return continueManeuver(model, decision);

		durationModifier = selectedDurationModifier;
	}

	return pickRockets(model, decision, durationModifier);
}

async function pickRockets(
	model: Immutable<Model>,
	decision: Immutable<ContinueManeuverDecision>,
	durationModifier?: number
): Promise<ContinueManeuverChoice> {
	const spacecraft = getSpacecraft(model, decision.spacecraftID);
	const choices: prompts.Choice[] = [];
	for (const componentID of spacecraft.componentIDs) {
		if (decision.spentRocketIDs.includes(componentID)) continue;

		const component = getComponent(model, componentID);

		const definition = getComponentDefinition(model, component.type);
		if (definition.type !== "rocket" && definition.type !== "ion_thruster")
			continue;

		choices.push({
			title: stringifyComponent(model, componentID, { rocketInfo: true }),
			value: componentID,
			disabled: component.damaged,
			selected: decision.rocketIDs.includes(componentID),
		});
	}

	const maneuver = getManeuver(model, decision.maneuverID);
	const profile = maneuver.profiles[decision.profileIndex];
	const maneuverDuration = getManeuverDuration(
		model,
		decision.maneuverID,
		decision.profileIndex
	);

	const { duration, difficulty } = modifyManeuverDifficultyAndDuration(
		maneuverDuration || 0,
		profile.difficulty || 0,
		durationModifier || 0
	);

	const mass = getSpacecraftMass(model, decision.spacecraftID);

	let rocketIDs = [];
	if (choices.length > 0) {
		const { selectedRocketIDs } = await prompts({
			type: "autocompleteMultiselect",
			name: "selectedRocketIDs",
			message: "select rockets",
			choices,
			instructions: false,
			onRender(this: any) {
				const generatedThrust = getTotalThrustOfRockets(
					model,
					this.value
						.filter((e: prompts.Choice) => e.selected)
						.map((e: prompts.Choice) => e.value),
					duration
				);

				this.msg = `select rockets; selected ${
					generatedThrust + decision.generatedThrust
				} thrust of ${difficulty * mass} required`;
			},
		});

		if (selectedRocketIDs === undefined) {
			if (maneuverDuration !== undefined)
				return pickDurationModifier(model, decision);
			return continueManeuver(model, decision);
		}

		rocketIDs = selectedRocketIDs;
	}

	if (
		getTotalThrustOfRockets(model, rocketIDs, duration) +
			decision.generatedThrust <
		difficulty * mass
	) {
		console.log("insufficient thrust generated");
		if (maneuverDuration !== undefined)
			return pickDurationModifier(model, decision);
		return continueManeuver(model, decision);
	}

	return {
		type: "continue_maneuver",
		proceed: true,
		durationModifier: durationModifier || decision.durationModifier,
		rocketIDs,
	};
}
