import type { Immutable } from "leaving-earth";
import { doesAgencyHaveAdvancement, getAgency } from "leaving-earth/helpers";
import type {
	Model,
	TakeActionChoice,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";

export function canResearchAdvancement(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const agency = getAgency(model, decision.agencyID);
	if (agency.funds < 10) return false;

	for (const definition of Object.values(model.advancementDefinitions)) {
		if (!doesAgencyHaveAdvancement(model, decision.agencyID, definition.id))
			return true;
	}

	return false;
}

export async function researchAdvancement(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<TakeActionChoice | null> {
	const choices: prompts.Choice[] = [];
	for (const definition of Object.values(model.advancementDefinitions)) {
		choices.push({
			title: definition.id,
			value: definition.id,
			disabled: doesAgencyHaveAdvancement(
				model,
				decision.agencyID,
				definition.id
			),
		});
	}

	const agency = getAgency(model, decision.agencyID);
	const { advancementID } = await prompts({
		type: "select",
		name: "advancementID",
		message: `select an advancement to research. you have $${agency.funds}`,
		choices,
		initial: 0,
	});

	if (advancementID === undefined) return null;

	return {
		type: "take_action",
		action: "research_advancement",
		advancementID,
	};
}
