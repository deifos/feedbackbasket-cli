import {
  PARITY_EXEMPTIONS,
  PRODUCT_OPERATIONS,
  type ProductOperationId,
} from 'feedbackbasket-agent-contract';

export const CLI_CAPABILITIES = PRODUCT_OPERATIONS.map((operation) => ({
  operationId: operation.id as ProductOperationId,
  commands: operation.cli.commands,
})) as readonly { operationId: ProductOperationId; commands: readonly string[] }[];

export const CLI_EXEMPTIONS = PARITY_EXEMPTIONS.filter(({ surface }) => surface === 'cli');
