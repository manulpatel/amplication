import { plural } from "pluralize";
import { camelCase } from "camel-case";
import { paramCase } from "param-case";
import flatten from "lodash.flatten";
import * as winston from "winston";
import { Entity, Module } from "../../types";
import { validateEntityName } from "../../util/entity";
import { DTOs } from "./create-dtos";
import { createServiceModules } from "./service/create-service";
import { createControllerModules } from "./controller/create-controller";
import { createModule } from "./module/create-module";
import { createControllerSpecModule } from "./test/create-controller-spec";
import { createResolverModule } from "./resolver/create-resolver";

export async function createResourcesModules(
  entities: Entity[],
  dtos: DTOs,
  logger: winston.Logger
): Promise<Module[]> {
  const resourceModuleLists = await Promise.all(
    entities.map((entity) => createResourceModules(entity, dtos, logger))
  );
  const resourcesModules = flatten(resourceModuleLists);
  return resourcesModules;
}

async function createResourceModules(
  entity: Entity,
  dtos: DTOs,
  logger: winston.Logger
): Promise<Module[]> {
  const entityType = entity.name;

  validateEntityName(entityType);

  logger.info(`Creating ${entityType}...`);
  const entityName = camelCase(entityType);
  const resource = paramCase(plural(entityName));

  const serviceModules = await createServiceModules(
    entityName,
    entityType,
    entity
  );

  const [serviceModule] = serviceModules;

  const controllerModules = await createControllerModules(
    resource,
    entityName,
    entityType,
    serviceModule.path,
    entity,
    dtos
  );

  const [controllerModule] = controllerModules;
  const resolverModule = await createResolverModule(
    entityName,
    entityType,
    serviceModule.path,
    entity,
    dtos
  );

  const resourceModule = await createModule(
    entityName,
    entityType,
    serviceModule.path,
    controllerModule.path,
    resolverModule.path
  );

  const testModule = await createControllerSpecModule(
    resource,
    entity,
    entityType,
    serviceModule.path,
    controllerModule.path
  );

  return [
    ...serviceModules,
    ...controllerModules,
    resolverModule,
    resourceModule,
    testModule,
  ];
}
