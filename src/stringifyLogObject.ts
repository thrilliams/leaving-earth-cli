import kleur from "kleur";
import type { Immutable, LogObject } from "laika-engine";
import { getStateByID } from "leaving-earth";
import type { LogObjectContext } from "leaving-earth/model";
import { LRUCache } from "lru-cache";
import type { Game } from "../../leaving-earth/src/game";
import {
	stringifyComponent,
	stringifySpacecraft,
} from "./decision/stringifiers";

const cache = new LRUCache<string, Game["state"]>({
	// allow up to 5MB of games to be cached at a time
	// this is mostly a development shorthand, in production we'd want to use a number determined at time of writing rather than at runtime
	maxSize: 5 * 1024 * 1024,
	// calculate size based on length of json (slow)
	sizeCalculation(state) {
		const stateJson = JSON.stringify(state);
		const stateBlob = new Blob([stateJson]);
		return stateBlob.size;
	},
});

function getStateWithCache(
	game: Game,
	logObject: Immutable<LogObject<LogObjectContext>>
) {
	const state =
		cache.get(logObject.historyObjectID) ||
		getStateByID(game, logObject.historyObjectID, logObject.side);
	if (state === null) throw "invalid history object ID";
	if (!cache.has(logObject.historyObjectID))
		cache.set(logObject.historyObjectID, state);
	return state;
}

function stringifyLogObjectContext(
	state: Game["state"],
	context: Immutable<LogObjectContext>
) {
	if (context[0] === "number") return context[1];
	if (context[0] === "string") return context[1];

	if (context[0] === "agency") return `agency ${context[1]}`;
	if (context[0] === "spacecraft")
		return stringifySpacecraft(state.model, context[1], true, true);
	if (context[0] === "component")
		return stringifyComponent(state.model, context[1], {
			spacecraftInfo: true,
			rocketInfo: true,
			capsuleInfo: true,
		});
	if (context[0] === "location") return context[1];
	if (context[0] === "outcome") {
		if (context[1] === "success") return kleur.green("success");
		if (context[1] === "minor_failure")
			return kleur.yellow("minor failure");
		if (context[1] === "major_failure") return kleur.red("major failure");
	}
	if (context[0] === "advancement") return context[1];
	if (context[0] === "maneuver") return `${context[1]}/${context[2]}`;
	if (context[0] === "mission") return context[1];

	// unknown context type fallback
	return `${context[0]}, ${context[1]}`;
}

export function stringifyLogObject(
	game: Game,
	logObject: Immutable<LogObject<LogObjectContext>>
) {
	let output = logObject.stringParts[0];

	const state = getStateWithCache(game, logObject);

	const remainingStringParts = logObject.stringParts.slice(1);
	const remainingContext = logObject.context.slice();
	for (const stringPart of remainingStringParts) {
		const context = remainingContext.shift()!;
		output += kleur.underline(stringifyLogObjectContext(state, context));
		output += stringPart;
	}

	return output;
}
