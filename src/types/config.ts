import type { Severity } from './issue';
import type { VueDoctorPlugin } from './plugin';

export interface VueDoctorConfig {
    rules?: Record<string, Severity | 'off'>;

    plugins?: VueDoctorPlugin[];

    failOnWarning?: boolean;
}
