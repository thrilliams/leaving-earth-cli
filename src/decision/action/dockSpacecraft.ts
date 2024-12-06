import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	getAgency,
	getLocation,
	getSpacecraft,
} from "leaving-earth/helpers";
import type {
	DockSpacecraftActionChoice,
	Model,
	SpacecraftID,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

function getDockableSpacecraftIDs(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): SpacecraftID[] {
	const dockableSpacecraftIDs = new Set<SpacecraftID>();

	const agency = getAgency(model, decision.agencyID);
	for (let i = 0; i < agency.spacecraft.length; i++) {
		const spacecraft = agency.spacecraft[i];
		if (spacecraft.years > 0) continue;
		const location = getLocation(model, spacecraft.locationID);
		if (location.noRendezvousOrRepair) continue;
		const otherSpacecraft = agency.spacecraft
			.slice(i + 1)
			.find(
				({ locationID, years }) =>
					years === 0 && locationID === spacecraft.locationID
			);
		if (!otherSpacecraft) continue;

		dockableSpacecraftIDs.add(spacecraft.id);
		dockableSpacecraftIDs.add(otherSpacecraft.id);
	}

	return Array.from(dockableSpacecraftIDs);
}

export function canDockSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	if (!doesAgencyHaveAdvancement(model, decision.agencyID, "rendezvous"))
		return false;

	const dockableSpacecraftIDs = getDockableSpacecraftIDs(model, decision);
	return dockableSpacecraftIDs.length > 0;
}

export async function dockSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<DockSpacecraftActionChoice | null> {
	const firstSpacecraftChoices: prompts.Choice[] = [];
	for (const spacecraftID of getDockableSpacecraftIDs(model, decision)) {
		firstSpacecraftChoices.push({
			title: stringifySpacecraft(model, spacecraftID, true, false),
			value: spacecraftID,
		});
	}

	const { firstSpacecraftID } = await prompts({
		type: "select",
		name: "firstSpacecraftID",
		message: "select the first spacecraft",
		choices: firstSpacecraftChoices,
	});

	if (firstSpacecraftID === undefined) return null;

	const agency = getAgency(model, decision.agencyID);
	const firstSpacecraft = getSpacecraft(model, firstSpacecraftID);
	const secondSpacecraftChoices: prompts.Choice[] = [];
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.id === firstSpacecraft.id) continue;
		if (spacecraft.years > 0) continue;
		if (spacecraft.locationID !== firstSpacecraft.locationID) continue;
		secondSpacecraftChoices.push({
			title: stringifySpacecraft(model, spacecraft.id, true, false),
			value: spacecraft.id,
		});
	}

	const { secondSpacecraftID } = await prompts({
		type: "select",
		name: "secondSpacecraftID",
		message: "select the second spacecraft",
		choices: secondSpacecraftChoices,
	});

	if (secondSpacecraftID === undefined)
		return dockSpacecraft(model, decision);

	return {
		type: "take_action",
		action: "dock_spacecraft",
		firstSpacecraftID,
		secondSpacecraftID,
	};
}
