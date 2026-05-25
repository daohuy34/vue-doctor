import type { Severity } from './issue';
import type { VueDoctorPlugin } from './plugin';

export type RuleOptions = Record<string, Record<string, unknown>>;

export interface VueDoctorConfig {
    rules?: Record<string, Severity | 'off'>;

    ruleOptions?: RuleOptions;

    plugins?: VueDoctorPlugin[];

    failOnWarning?: boolean;
}
