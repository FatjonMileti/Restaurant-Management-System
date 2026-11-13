import type { AiConfig } from '../config.js';
import type { KnowledgeService } from '../rag/knowledgeService.js';
import { ToolRegistry } from '../toolRegistry.js';
import { createAvailabilityTool } from './availabilityTool.js';
import { createOrderDraftTool, createReservationDraftTool } from './draftTools.js';
import { createKnowledgeTool } from './knowledgeTool.js';
import { getMenuItemDetailsTool, searchMenuTool } from './menuTools.js';
import { createRestaurantInformationTool } from './restaurantTools.js';

export interface ToolRegistryDependencies {
  config: AiConfig;
  knowledge: KnowledgeService | null;
}

export const createToolRegistry = (deps: ToolRegistryDependencies): ToolRegistry => {
  const { config, knowledge } = deps;
  const registry = new ToolRegistry({ timeoutMs: config.toolTimeoutMs });

  registry
    .register(searchMenuTool)
    .register(getMenuItemDetailsTool)
    .register(createRestaurantInformationTool(config.restaurantTimeZone))
    .register(
      createAvailabilityTool({
        timeZone: config.restaurantTimeZone,
        maxPartySize: config.maxPartySize,
      }),
    )
    .register(createKnowledgeTool(knowledge))
    .register(createOrderDraftTool({ draftTtlMs: config.draftTtlMs }))
    .register(
      createReservationDraftTool({
        timeZone: config.restaurantTimeZone,
        maxPartySize: config.maxPartySize,
        draftTtlMs: config.draftTtlMs,
      }),
    );

  return registry;
};
