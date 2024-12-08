import type { Immutable } from "leaving-earth";
import {
	getAgency,
	getComponent,
	getComponentDefinition,
	getLocation,
	getManeuver,
	getManeuverDuration,
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
		for (let i = 0; i < maneuver.profiles.length; i++) {
			let disabled = false;

			const profile = maneuver.profiles[i];
			if (profile.slingshot) {
				const window = model.maneuverWindows[profile.slingshot];
				if (window === undefined)
					throw new Error("maneuver window not defined");
				disabled =
					(model.year - window.firstYear) % window.interval === 0;
			}

			choices.push({
				title: stringifyManeuver(model, maneuverID, i),
				value: [maneuverID, i],
				disabled,
			});
		}
	}

	const { maneuver } = await prompts({
		type: "select",
		name: "maneuver",
		message: "select maneuver",
		choices,
	});

	if (maneuver === undefined) return performManeuver(model, decision);
	const [maneuverID, profileIndex] = maneuver;

	return pickDurationModifier(
		model,
		decision,
		spacecraftID,
		maneuverID,
		profileIndex
	);
}

async function pickDurationModifier(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>,
	spacecraftID: SpacecraftID,
	maneuverID: ManeuverID,
	profileIndex: number
): Promise<PerformManeuverActionChoice | null> {
	const maneuver = getManeuver(model, maneuverID);
	const profile = maneuver.profiles[profileIndex];
	const maneuverDuration = getManeuverDuration(
		model,
		maneuverID,
		profileIndex
	);

	let durationModifier = 0;
	if (maneuverDuration !== undefined) {
		const { selectedDurationModifier } = await prompts({
			type: "number",
			name: "selectedDurationModifier",
			message: "select duration modifier (none)",
			onRender(this: any) {
				this.value = this.value || 0;

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
			return pickManeuver(model, decision, spacecraftID);

		durationModifier = selectedDurationModifier;
	}

	return pickRockets(
		model,
		decision,
		spacecraftID,
		maneuverID,
		profileIndex,
		durationModifier
	);
}

async function pickRockets(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>,
	spacecraftID: SpacecraftID,
	maneuverID: ManeuverID,
	profileIndex: number,
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
	const profile = maneuver.profiles[profileIndex];
	const maneuverDuration = getManeuverDuration(
		model,
		maneuverID,
		profileIndex
	);
	const { duration, difficulty } = modifyManeuverDifficultyAndDuration(
		maneuverDuration || 0,
		profile.difficulty || 0,
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
			if (maneuverDuration !== undefined)
				return pickDurationModifier(
					model,
					decision,
					spacecraftID,
					maneuverID,
					profileIndex
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
			profileIndex,
			durationModifier
		);
	}

	return {
		type: "take_action",
		action: "perform_maneuver",
		maneuverID,
		profileIndex,
		spacecraftID,
		durationModifier,
		rocketIDs,
	};
}
