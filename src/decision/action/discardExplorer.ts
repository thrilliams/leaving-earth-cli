import type { Immutable } from "leaving-earth";
import {
	getAgency,
	getComponent,
	getComponentDefinition,
} from "leaving-earth/helpers";
import type {
	Model,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import type { DiscardExplorerActionChoice } from "../../../../leaving-earth/src/state/choice/choiceTypes/actionTypes/DiscardExplorerActionChoice";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getSpacecraftIDsThatCanBeDiscarded(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const spacecraftIDs = [];
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.years > 0) continue;
		if (spacecraft.componentIDs.length !== 1) continue;

		let onlyExplorer = true;
		for (let i = 0; i < spacecraft.componentIDs.length; i++) {
			const componentID = spacecraft.componentIDs[i];
			const component = getComponent(model, componentID);
			const definition = getComponentDefinition(model, component.type);
			if (definition.type !== "explorer") onlyExplorer = false;
		}

		if (!onlyExplorer) continue;

		let matchingExplorerMission = false;
		for (const mission of model.missions) {
			if (mission.type !== "discard_explorer") continue;
			if (mission.locationID !== spacecraft.locationID) continue;
			matchingExplorerMission = true;
		}

		if (!matchingExplorerMission) continue;

		spacecraftIDs.push(spacecraft.id);
	}

	return spacecraftIDs;
}

export function canDiscardExplorer(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const spacecraftIDsThatCanBeDiscarded = getSpacecraftIDsThatCanBeDiscarded(
		model,
		decision
	);
	return spacecraftIDsThatCanBeDiscarded.length > 0;
}

export async function discardExplorer(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<DiscardExplorerActionChoice | null> {
	const spacecraftChoices: prompts.Choice[] = [];
	const spacecraftIDsThatCanSurvey = getSpacecraftIDsThatCanBeDiscarded(
		model,
		decision
	);

	for (const spacecraftID of spacecraftIDsThatCanSurvey) {
		spacecraftChoices.push({
			title: stringifySpacecraft(model, spacecraftID, false, true),
			value: spacecraftID,
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select a spacecraft",
		choices: spacecraftChoices,
	});

	if (spacecraftID === undefined) return null;
	return {
		type: "take_action",
		action: "discard_explorer",
		spacecraftID,
	};
}
