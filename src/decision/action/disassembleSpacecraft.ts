import type { Immutable } from "leaving-earth";
import { getAgency } from "leaving-earth/helpers";
import type {
	DisassembleSpacecraftActionChoice,
	Model,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifySpacecraft } from "../stringifiers";

export function canDisassembleSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		if (spacecraft.locationID === "earth") return true;
	}

	return false;
}

export async function disassembleSpacecraft(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<DisassembleSpacecraftActionChoice | null> {
	const choices: prompts.Choice[] = [];
	const agency = getAgency(model, decision.agencyID);
	for (const spacecraft of agency.spacecraft) {
		choices.push({
			title: stringifySpacecraft(model, spacecraft.id, true),
			value: spacecraft.id,
			disabled: spacecraft.locationID !== "earth",
		});
	}

	const { spacecraftID } = await prompts({
		type: "select",
		name: "spacecraftID",
		message: "select spacecraft",
		choices,
	});

	if (spacecraftID === undefined) return null;

	return {
		type: "take_action",
		action: "disassemble_spacecraft",
		spacecraftID,
	};
}
