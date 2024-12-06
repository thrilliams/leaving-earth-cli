import type { Immutable } from "leaving-earth";
import {
	getAgency,
	getComponent,
	getComponentDefinition,
	getLocation,
	getManeuver,
	getSpacecraft,
	getSpacecraftMass,
	getTotalThrustOfRockets,
	modifyManeuverDifficultyAndDuration,
} from "leaving-earth/helpers";
import type {
	ManeuverID,
	Model,
	PerformManeuverActionChoice,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import {
	stringifyComponent,
	stringifyManeuver,
	stringifySpacecraft,
} from "../stringifiers";

export function canPerformManeuver(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.years === 0) return true;
	}
	return false;
}

export async function performManeuver(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<PerformManeuverActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		choices.push({
			title: stringifySpacecraft(model, spacecraft.id, true, true),
			value: spacecraft.id,
			disabled: spacecraft.years !== 0,
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select spacecraft",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return pickManeuver(model, decision, spacecraftID);
}

async function pickManeuver(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>,
	spacecraftID: SpacecraftID
): Promise<PerformManeuverActionChoice | null> {
	const spacecraft = getSpacecraft(model, spacecraftID);
	const location = getLocation(model, spacecraft.locationID);
	const choices: prompts.Choice[] = [];
	for (const maneuver of location.maneuvers) {
		const maneuverID: ManeuverID = `${location.id}_to_${maneuver.destinationID}`;
		choices.push({
			title: stringifyManeuver(model, maneuverID),
			value: maneuverID,
		});
	}

	const { maneuverID } = await prompts({
		type: "select",
		name: "maneuverID",
		message: "select maneuver",
		choices,
	});

	if (maneuverID === undefined) return performManeuver(model, decision);

	return pickDurationModifier(model, decision, spacecraftID, maneuverID);
}

async function pickDurationModifier(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>,
	spacecraftID: SpacecraftID,
	maneuverID: ManeuverID
): Promise<PerformManeuverActionChoice | null> {
	const maneuver = getManeuver(model, maneuverID);
	let durationModifier = 0;
	if (maneuver.duration !== undefined) {
		const { selectedDurationModifier } = await prompts({
			type: "number",
			name: "selectedDurationModifier",
			message: "select duration modifier (none)",
			onRender(this: any) {
				this.value = this.value || 0;

				const { duration, difficulty } =
					modifyManeuverDifficultyAndDuration(
						maneuver.duration || 0,
						maneuver.difficulty || 0,
						this.value
					);

				this.msg = `select duration modifier (Y${duration} D${difficulty})`;
			},
		});

		if (selectedDurationModifier === undefined)
			return pickManeuver(model, decision, spacecraftID);

		durationModifier = selectedDurationModifier;
	}

	return pickRockets(
		model,
		decision,
		spacecraftID,
		maneuverID,
		durationModifier
	);
}

async function pickRockets(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>,
	spacecraftID: SpacecraftID,
	maneuverID: ManeuverID,
	durationModifier: number
): Promise<PerformManeuverActionChoice | null> {
	const spacecraft = getSpacecraft(model, spacecraftID);
	const choices: prompts.Choice[] = [];
	for (const componentID of spacecraft.componentIDs) {
		const component = getComponent(model, componentID);

		const definition = getComponentDefinition(model, component.type);
		if (definition.type !== "rocket" && definition.type !== "ion_thruster")
			continue;

		choices.push({
			title: stringifyComponent(model, componentID, { rocketInfo: true }),
			value: componentID,
			disabled: component.damaged,
		});
	}

	const maneuver = getManeuver(model, maneuverID);
	const { duration, difficulty } = modifyManeuverDifficultyAndDuration(
		maneuver.duration || 0,
		maneuver.difficulty || 0,
		durationModifier
	);

	const mass = getSpacecraftMass(model, spacecraftID);

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

				this.msg = `select rockets; selected ${generatedThrust} thrust of ${
					difficulty * mass
				} required`;
			},
		});

		if (selectedRocketIDs === undefined) {
			if (maneuver.duration !== undefined)
				return pickDurationModifier(
					model,
					decision,
					spacecraftID,
					maneuverID
				);

			return pickManeuver(model, decision, spacecraftID);
		}

		rocketIDs = selectedRocketIDs;
	}

	if (
		getTotalThrustOfRockets(model, rocketIDs, duration) <
		difficulty * mass
	) {
		console.log("insufficient thrust generated");
		return pickRockets(
			model,
			decision,
			spacecraftID,
			maneuverID,
			durationModifier
		);
	}

	return {
		type: "take_action",
		action: "perform_maneuver",
		maneuverID,
		spacecraftID,
		durationModifier,
		rocketIDs,
	};
}
