import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	doesSpacecraftHaveWorkingProbeOrCapsule,
	getAgency,
	getComponent,
	getLocation,
	getSpacecraft,
	getSurveyableLocations,
	isComponentOfType,
} from "leaving-earth/helpers";
import type {
	Model,
	SpacecraftID,
	SurveyLocationActionChoice,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent, stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsThatCanSurvey(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.years > 0) continue;

		const surveyableLocationIDs = getSurveyableLocations(
			model,
			spacecraft.locationID
		);

		const explorableLocationID = surveyableLocationIDs.find((id) => {
			const location = getLocation(model, id);
			if (location.explorable) return true;
		});

		if (explorableLocationID !== undefined)
			spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canSurveyLocation(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	if (!doesAgencyHaveAdvancement(model, decision.agencyID, "surveying"))
		return false;

	const spacecraftIDsThatCanSurvey = getSpacecraftIDsThatCanSurvey(
		model,
		decision
	);
	return spacecraftIDsThatCanSurvey.length > 0;
}

export async function surveyLocation(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<SurveyLocationActionChoice | null> {
	const spacecraftChoices: prompts.Choice[] = [];
	const spacecraftIDsThatCanSurvey = getSpacecraftIDsThatCanSurvey(
		model,
		decision
	);
	for (const spacecraftID of spacecraftIDsThatCanSurvey) {
		spacecraftChoices.push({
			title: stringifySpacecraft(model, spacecraftID, false, true),
			value: spacecraftID,
			disabled: !doesSpacecraftHaveWorkingProbeOrCapsule(
				model,
				spacecraftID
			),
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select a spacecraft",
		choices: spacecraftChoices,
	});

	if (spacecraftID === undefined) return null;

	const spacecraft = getSpacecraft(model, spacecraftID);

	const probeOrCapsuleChoices: prompts.Choice[] = [];
	for (const componentID of spacecraft.componentIDs) {
		const component = getComponent(model, componentID);
		if (component.damaged) continue;

		if (
			!isComponentOfType(model, component, "probe") &&
			!isComponentOfType(model, component, "capsule")
		)
			continue;

		probeOrCapsuleChoices.push({
			title: stringifyComponent(model, componentID),
			value: componentID,
			disabled: model.expansions.includes("outer_planets")
				? component.surveyedThisTurn
				: false,
		});
	}

	const { componentID } = await prompts({
		type: "select",
		name: "componentID",
		message: "select a probe or capsule",
		choices: probeOrCapsuleChoices,
	});

	const surveyableLocationIDs = getSurveyableLocations(
		model,
		spacecraft.locationID
	);
	const locationChoices: prompts.Choice[] = [];
	for (const locationID of surveyableLocationIDs) {
		const location = getLocation(model, locationID);
		locationChoices.push({
			title:
				locationID +
				(location.explorable && location.revealed ? " (revealed)" : ""),
			value: locationID,
		});
	}

	const { locationID } = await prompts({
		type: "select",
		name: "locationID",
		message: "select a location",
		choices: locationChoices,
	});

	if (locationID === undefined) return surveyLocation(model, decision);

	return {
		type: "take_action",
		action: "survey_location",
		spacecraftID,
		locationID,
		componentID,
	};
}
