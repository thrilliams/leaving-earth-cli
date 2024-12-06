import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	getAdvancement,
} from "leaving-earth/helpers";
import type {
	Model,
	TurnInAlienSampleChoice,
	TurnInAlienSampleDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponent } from "./stringifiers";

export async function turnInAlienSample(
	model: Immutable<Model>,
	decision: Immutable<TurnInAlienSampleDecision>
): Promise<TurnInAlienSampleChoice> {
	const choices: prompts.Choice[] = [];
	for (const definition of Object.values(model.advancementDefinitions)) {
		if (
			doesAgencyHaveAdvancement(model, decision.agencyID, definition.id)
		) {
			const advancement = getAdvancement(
				model,
				decision.agencyID,
				definition.id
			);
			if (advancement.outcomes.length === 0) continue;

			choices.push({
				title: `${definition.id} (${advancement.outcomes.length} outcomes)`,
				value: definition.id,
			});
		} else {
			choices.push({
				title: definition.id,
				value: definition.id,
			});
		}
	}

	const { advancementID } = await prompts({
		type: "select",
		name: "advancementID",
		message: `turn in ${stringifyComponent(model, decision.sampleID, {
			rocketInfo: true,
		})} for an advancement? (cancel to decline)`,
		choices,
	});

	if (advancementID === undefined)
		return {
			type: "turn_in_alien_sample",
			turnIn: false,
		};

	return {
		type: "turn_in_alien_sample",
		turnIn: true,
		advancementID,
	};
}
