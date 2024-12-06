import type { Immutable } from "leaving-earth";
import type { Choice, Decision, Model } from "leaving-earth/model";
import { takeAction } from "./decision/takeAction";
import { discardOutcome } from "./decision/discardOutcome";
import { continueManeuver } from "./decision/continueManeuver";
import { revealLocation } from "./decision/revealLocation";
import { encounterLanding } from "./decision/encounterLanding";
import { damageComponent } from "./decision/damageComponent";
import { assignAstronauts } from "./decision/assignAstronauts";
import { lifeSupport } from "./decision/lifeSupport";
import { turnInValuableSample } from "./decision/turnInValuableSample";
import { turnInAlienSample } from "./decision/turnInAlienSample";

export async function promptForDecision(
	model: Immutable<Model>,
	decision: Immutable<Decision>
): Promise<Choice> {
	if (decision.type === "take_action") {
		const choice = await takeAction(model, decision);
		if (choice === null) throw "action aborted.";
		return choice;
	}

	if (decision.type === "discard_outcome")
		return discardOutcome(model, decision);
	if (decision.type === "continue_maneuver")
		return continueManeuver(model, decision);
	if (decision.type === "reveal_location")
		return revealLocation(model, decision);
	if (decision.type === "encounter_landing")
		return encounterLanding(model, decision);
	if (decision.type === "damage_component")
		return damageComponent(model, decision);
	if (decision.type === "assign_astronauts")
		return assignAstronauts(model, decision);

	if (decision.type === "cooperate") throw "how";

	if (decision.type === "life_support") return lifeSupport(model, decision);
	if (decision.type === "turn_in_valuable_sample")
		return turnInValuableSample(model, decision);
	if (decision.type === "turn_in_alien_sample")
		return turnInAlienSample(model, decision);

	throw "unexpected decision type: " + decision.type;
}
