import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	doesSpacecraftHaveWorkingProbeOrCapsule,
	getAgency,
	getLocation,
	getSpacecraft,
	getSurveyableLocations,
} from "leaving-earth/helpers";
import type {
	Model,
	SpacecraftID,
	SurveyLocationActionChoice,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsThatCanSurvey(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
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
	};
}
