import type { Immutable } from "leaving-earth";
import {
	doesAgencyHaveAdvancement,
	getAgency,
	getComponentDefinition,
} from "leaving-earth/helpers";
import type {
	BuyComponentActionChoice,
	ComponentDefinitionID,
	Model,
	TakeActionDecision,
} from "leaving-earth/model";
import prompts from "prompts";
import { stringifyComponentDefinition } from "../stringifiers";

function getBuyableComponents(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
) {
	const agency = getAgency(model, decision.agencyID);
	const buyableRecord: Partial<Record<ComponentDefinitionID, boolean>> = {};

	for (const definition of Object.values(model.componentDefinitions)) {
		// definitions without costs can't be bought
		if (!("cost" in definition)) continue;

		buyableRecord[definition.id] = false;

		if (definition.cost > agency.funds) continue;

		if (
			"advancementID" in definition &&
			definition.advancementID &&
			!doesAgencyHaveAdvancement(
				model,
				decision.agencyID,
				definition.advancementID
			)
		)
			continue;

		buyableRecord[definition.id] = true;
	}

	return buyableRecord;
}

export function canBuyComponent(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): boolean {
	const buyableRecord = getBuyableComponents(model, decision);
	return Object.values(buyableRecord).some((buyable) => buyable);
}

export async function buyComponent(
	model: Immutable<Model>,
	decision: Immutable<TakeActionDecision>
): Promise<BuyComponentActionChoice | null> {
	const choices: prompts.Choice[] = [];
	for (const [definitionID, buyable] of Object.entries(
		getBuyableComponents(model, decision)
	)) {
		const definition = getComponentDefinition(
			model,
			definitionID as ComponentDefinitionID
		);

		choices.push({
			title: `${stringifyComponentDefinition(model, definition.id, {
				rocketInfo: true,
				capsuleInfo: true,
			})}, $${"cost" in definition ? definition.cost : -1}`,
			value: definitionID,
			disabled: !buyable,
		});
	}

	const agency = getAgency(model, decision.agencyID);
	const { componentDefinitionID } = await prompts({
		type: "select",
		name: "componentDefinitionID",
		message: `select a component to buy. you have $${agency.funds}`,
		choices,
		initial: 0,
	});

	if (componentDefinitionID === undefined) return null;

	return {
		type: "take_action",
		action: "buy_component",
		componentDefinitionID,
	};
}
