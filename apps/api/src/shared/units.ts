import { Prisma } from '@bakeflow/database';
import { AppError } from './errors.js';
const definitions = { KG: ['mass', 1000], G: ['mass',1], L:['volume',1000], ML:['volume',1], UNIT:['count',1] } as const;
export type Unit = keyof typeof definitions;
export function convert(quantity: Prisma.Decimal.Value, from: Unit, to: Unit) {
 if(definitions[from][0] !== definitions[to][0]) throw new AppError(422,'INCOMPATIBLE_UNIT','Unidades incompatíveis.');
 return new Prisma.Decimal(quantity).mul(definitions[from][1]).div(definitions[to][1]);
}
