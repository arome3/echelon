/**
 * Reputation-Gated Permission Components
 *
 * Components for ERC-7715 reputation-based dynamic permission scaling.
 * These integrate with the ReputationGateEnforcer smart contract to provide
 * progressive trust building for AI agents.
 */

export { ReputationMeter, type ReputationMeterProps } from './ReputationMeter';
export { ScalingProjectionChart, type ScalingProjectionChartProps } from './ScalingProjectionChart';
export {
  ReputationGatedPermission,
  type ReputationGatedPermissionProps,
  type PermissionParams
} from './ReputationGatedPermission';
